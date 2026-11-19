import { Router } from 'express'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import multer from 'multer'
import { prisma } from '../../lib/prisma.js'
import { ApiError, asyncHandler, parseBody } from '../../lib/api-error.js'
import { param } from '../../lib/params.js'
import { detectImageType } from '../../lib/image-type.js'
import { uploadImage, destroyImage } from '../../services/cloudinary.js'
import { mediaUpdateSchema, reorderSchema } from '../../schemas/admin.js'
import {
  listMeta,
  pagination,
  queryString,
  reorderByIds,
  searchTerm,
  writeAudit,
} from '../../lib/admin.js'
import { getUserId } from '../../middleware/auth.js'

export const adminMediaRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, callback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.mimetype)) {
      callback(new ApiError(400, 'Only JPEG, PNG and WebP images are allowed'))
      return
    }
    callback(null, true)
  },
})

/**
 * Upload budget. The global limiter (300 requests / 15 min) would still allow
 * 3000 images per window at ten files a request; these caps make an upload
 * burst, or a stolen admin session, expensive to run against Cloudinary.
 */
const UPLOADS_PER_MINUTE = 5
const UPLOADS_PER_DAY = 50

const uploadLimiter = rateLimit({
  windowMs: 60_000,
  limit: UPLOADS_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  // Per admin, not per IP: two admins behind one office NAT keep their own budget.
  keyGenerator: (req) => (req.userId ? `admin:${req.userId}` : ipKeyGenerator(req.ip ?? '')),
  message: { error: 'Upload rate limit reached' },
})

/**
 * 24-hour cap counted from the audit trail, so it survives a restart and is
 * visible in the admin log rather than held in memory.
 */
const dailyUploadCap = asyncHandler(async (req, res, next) => {
  const adminId = getUserId(req)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const used = await prisma.auditLog.count({
    where: { adminId, action: 'media.upload', createdAt: { gte: since } },
  })
  if (used >= UPLOADS_PER_DAY) {
    throw new ApiError(
      429,
      `Daily upload limit reached (${UPLOADS_PER_DAY} uploads per 24 hours). Try again later.`,
    )
  }
  next()
})

const imageInclude = {
  destination: { select: { id: true, name: true, slug: true } },
}

adminMediaRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = pagination(req)
    const q = searchTerm(req)
    const destinationId = queryString(req, 'destinationId')

    const where = {
      ...(destinationId ? { destinationId } : {}),
      ...(q
        ? {
            OR: [
              { altText: { contains: q } },
              { caption: { contains: q } },
              { credit: { contains: q } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      prisma.destinationImage.findMany({
        where,
        include: imageInclude,
        orderBy: [{ createdAt: 'desc' }],
        skip: page.skip,
        take: page.take,
      }),
      prisma.destinationImage.count({ where }),
    ])

    res.json({ items, ...listMeta(total, page) })
  }),
)

adminMediaRouter.post(
  '/upload',
  // Both caps run before multer, so a refused upload never buffers its files.
  uploadLimiter,
  dailyUploadCap,
  upload.array('images', 10),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? []
    if (files.length === 0) {
      throw new ApiError(400, 'Choose at least one image to upload', {
        images: 'Choose at least one image',
      })
    }

    const destinationId = typeof req.body.destinationId === 'string' && req.body.destinationId
      ? req.body.destinationId
      : null
    if (destinationId) {
      const destination = await prisma.destination.findUnique({ where: { id: destinationId } })
      if (!destination) throw new ApiError(400, 'Destination not found')
    }

    const altText = typeof req.body.altText === 'string' ? req.body.altText.trim().slice(0, 200) : null
    const caption = typeof req.body.caption === 'string' ? req.body.caption.trim().slice(0, 300) : null
    const credit = typeof req.body.credit === 'string' ? req.body.credit.trim().slice(0, 160) : null
    const makeCover = req.body.isCover === 'true' || req.body.isCover === true

    const created = []
    for (const [index, file] of files.entries()) {
      const detected = detectImageType(file.buffer)
      if (!detected) {
        throw new ApiError(
          400,
          `“${file.originalname}” is not a real JPEG, PNG or WebP image.`,
        )
      }

      const result = await uploadImage(
        file.buffer,
        destinationId ? 'travel-destinations' : 'pathyatra/library',
        { altText: altText ?? undefined },
      )

      const image = await prisma.destinationImage.create({
        data: {
          destinationId,
          url: result.secure_url,
          publicId: result.public_id,
          altText,
          caption,
          credit,
          width: result.width,
          height: result.height,
          isCover: makeCover && index === 0,
        },
        include: imageInclude,
      })
      created.push(image)
    }

    if (makeCover && destinationId) {
      await prisma.destinationImage.updateMany({
        where: { destinationId, id: { not: created[0].id }, isCover: true },
        data: { isCover: false },
      })
    }

    await writeAudit({
      adminId: getUserId(req),
      action: 'media.upload',
      entityType: 'DestinationImage',
      entityId: created[0]?.id,
      summary: `Uploaded ${created.length} image${created.length === 1 ? '' : 's'}${destinationId ? ' for a destination' : ' to the library'}`,
    })

    res.status(201).json({ items: created })
  }),
)

adminMediaRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = param(req, 'id')
    const existing = await prisma.destinationImage.findUnique({ where: { id } })
    if (!existing) throw new ApiError(404, 'Image not found')

    const data = parseBody(mediaUpdateSchema.partial(), req.body)
    if (data.destinationId) {
      const destination = await prisma.destination.findUnique({ where: { id: data.destinationId } })
      if (!destination) throw new ApiError(400, 'Destination not found')
    }

    const image = await prisma.destinationImage.update({
      where: { id },
      data: {
        ...data,
        destinationId: data.destinationId === undefined ? undefined : data.destinationId || null,
      },
      include: imageInclude,
    })

    if (data.isCover && image.destinationId) {
      await prisma.destinationImage.updateMany({
        where: { destinationId: image.destinationId, id: { not: id } },
        data: { isCover: false },
      })
    }

    res.json(image)
  }),
)

adminMediaRouter.post(
  '/:id/cover',
  asyncHandler(async (req, res) => {
    const id = param(req, 'id')
    const image = await prisma.destinationImage.findUnique({ where: { id } })
    if (!image) throw new ApiError(404, 'Image not found')
    if (!image.destinationId) {
      throw new ApiError(400, 'Link this image to a destination before making it the cover')
    }

    await prisma.$transaction([
      prisma.destinationImage.updateMany({
        where: { destinationId: image.destinationId },
        data: { isCover: false },
      }),
      prisma.destinationImage.update({ where: { id }, data: { isCover: true } }),
    ])

    await writeAudit({
      adminId: getUserId(req),
      action: 'media.cover',
      entityType: 'DestinationImage',
      entityId: id,
      summary: 'Changed a destination cover image',
    })

    res.json({ ok: true })
  }),
)

adminMediaRouter.post(
  '/reorder',
  asyncHandler(async (req, res) => {
    const { ids } = parseBody(reorderSchema, req.body)
    await reorderByIds('destinationImage', ids)
    res.json({ ok: true })
  }),
)

adminMediaRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = param(req, 'id')
    const image = await prisma.destinationImage.findUnique({ where: { id } })
    if (!image) throw new ApiError(404, 'Image not found')

    await prisma.destinationImage.delete({ where: { id } })
    void destroyImage(image.publicId).catch(() => {
      // The record is gone; an orphaned asset in Cloudinary is not fatal.
    })

    await writeAudit({
      adminId: getUserId(req),
      action: 'media.delete',
      entityType: 'DestinationImage',
      entityId: id,
      summary: `Deleted image “${image.altText || image.publicId}”`,
    })

    res.json({ ok: true })
  }),
)
