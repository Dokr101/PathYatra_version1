import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { ApiError, asyncHandler, parseBody } from '../../lib/api-error.js'
import { param } from '../../lib/params.js'
import {
  listMeta,
  pagination,
  queryString,
  searchTerm,
  uniqueSlug,
  writeAudit,
} from '../../lib/admin.js'
import { destinationSchema } from '../../schemas/admin.js'

export const adminDestinationsRouter = Router()

const adminInclude = {
  category: true,
  images: { orderBy: [{ isCover: 'desc' as const }, { sortOrder: 'asc' as const }] },
  _count: { select: { itineraries: true, favorites: true, reviews: true } },
}

async function assertCategory(categoryId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!category) {
    throw new ApiError(400, 'Validation failed', { categoryId: 'Category not found' })
  }
}

adminDestinationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = pagination(req)
    const q = searchTerm(req)
    const status = queryString(req, 'status')
    const categoryId = queryString(req, 'categoryId')
    const province = queryString(req, 'province')
    const sort = queryString(req, 'sort') || 'updatedAt'
    const order: 'asc' | 'desc' = queryString(req, 'order') === 'asc' ? 'asc' : 'desc'

    const where = {
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { slug: { contains: q } },
              { district: { contains: q } },
              { province: { contains: q } },
            ],
          }
        : {}),
      ...(status ? { status: status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(province ? { province } : {}),
    }

    const orderBy =
      sort === 'name'
        ? { name: order }
        : sort === 'createdAt'
          ? { createdAt: order }
          : { updatedAt: order }

    const [items, total, provinces] = await Promise.all([
      prisma.destination.findMany({
        where,
        include: adminInclude,
        orderBy,
        skip: page.skip,
        take: page.take,
      }),
      prisma.destination.count({ where }),
      prisma.destination.findMany({
        where: { province: { not: null } },
        select: { province: true },
        distinct: ['province'],
        orderBy: { province: 'asc' },
      }),
    ])

    res.json({
      items,
      ...listMeta(total, page),
      provinces: provinces.map((row) => row.province).filter(Boolean),
    })
  }),
)

adminDestinationsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = parseBody(destinationSchema, req.body)
    await assertCategory(data.categoryId)

    const slug = await uniqueSlug(data.slug || data.name, (candidate) =>
      prisma.destination.findUnique({ where: { slug: candidate }, select: { id: true } }),
    )

    const destination = await prisma.destination.create({
      data: {
        ...data,
        slug,
        status: data.status ?? 'DRAFT',
      },
      include: adminInclude,
    })

    await writeAudit({
      adminId: req.userId!,
      action: 'destination.create',
      entityType: 'Destination',
      entityId: destination.id,
      summary: `Created destination “${destination.name}” as ${destination.status.toLowerCase()}`,
    })

    res.status(201).json(destination)
  }),
)

adminDestinationsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const destination = await prisma.destination.findUnique({
      where: { id: param(req, 'id') },
      include: adminInclude,
    })
    if (!destination) throw new ApiError(404, 'Destination not found')
    res.json(destination)
  }),
)

adminDestinationsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = param(req, 'id')
    const existing = await prisma.destination.findUnique({ where: { id } })
    if (!existing) throw new ApiError(404, 'Destination not found')

    const data = parseBody(destinationSchema.partial(), req.body)
    if (data.categoryId) await assertCategory(data.categoryId)

    let slug = existing.slug
    if (data.slug !== undefined || data.name) {
      slug = await uniqueSlug(
        data.slug || data.name || existing.name,
        (candidate) =>
          prisma.destination.findUnique({ where: { slug: candidate }, select: { id: true } }),
        id,
      )
    }

    const destination = await prisma.destination.update({
      where: { id },
      data: { ...data, slug },
      include: adminInclude,
    })

    const archived = data.status === 'ARCHIVED' && existing.status !== 'ARCHIVED'
    await writeAudit({
      adminId: req.userId!,
      action: archived ? 'destination.archive' : 'destination.update',
      entityType: 'Destination',
      entityId: id,
      summary: archived
        ? `Archived destination “${destination.name}”`
        : `Updated destination “${destination.name}”${data.status ? ` (${data.status.toLowerCase()})` : ''}`,
    })

    res.json(destination)
  }),
)

adminDestinationsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = param(req, 'id')
    const destination = await prisma.destination.findUnique({
      where: { id },
      include: { _count: { select: { itineraries: true, favorites: true } } },
    })
    if (!destination) throw new ApiError(404, 'Destination not found')

    if (destination._count.itineraries > 0) {
      throw new ApiError(
        409,
        `“${destination.name}” is referenced by ${destination._count.itineraries} saved trip(s). Archive it instead of deleting so those trips keep their destination.`,
        { destination: 'Archive this destination instead of deleting it' },
      )
    }

    await prisma.$transaction([
      prisma.review.deleteMany({ where: { destinationId: id } }),
      prisma.favorite.deleteMany({ where: { destinationId: id } }),
      prisma.destination.delete({ where: { id } }),
    ])
    await writeAudit({
      adminId: req.userId!,
      action: 'destination.delete',
      entityType: 'Destination',
      entityId: id,
      summary: `Deleted destination “${destination.name}”`,
    })

    res.json({ ok: true })
  }),
)
