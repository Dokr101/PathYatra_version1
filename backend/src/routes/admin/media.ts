import { Router } from 'express'
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
        destinationId ? 'pathyatra/destinations' : 'pathyatra/library',
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
      adminId: req.userId!,
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
      adminId: req.userId!,
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
      adminId: req.userId!,
      action: 'media.delete',
      entityType: 'DestinationImage',
      entityId: id,
      summary: `Deleted image “${image.altText || image.publicId}”`,
    })

    res.json({ ok: true })
  }),
)
