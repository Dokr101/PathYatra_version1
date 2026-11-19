import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { ApiError, asyncHandler, parseBody } from '../../lib/api-error.js'
import { param } from '../../lib/params.js'
import { placeSchema } from '../../schemas/admin.js'
import {
  listMeta,
  pagination,
  queryString,
  searchTerm,
  writeAudit,
} from '../../lib/admin.js'
import { getUserId } from '../../middleware/auth.js'

export const adminPlacesRouter = Router()

const include = {
  destination: { select: { id: true, name: true, slug: true } },
}

adminPlacesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = pagination(req)
    const q = searchTerm(req)
    const destinationId = queryString(req, 'destinationId')
    const type = queryString(req, 'type')
    const status = queryString(req, 'status')

    const where = {
      ...(q ? { OR: [{ name: { contains: q } }, { address: { contains: q } }] } : {}),
      ...(destinationId ? { destinationId } : {}),
      ...(type ? { type: type as 'HOTEL' | 'RESTAURANT' } : {}),
      ...(status ? { status: status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' } : {}),
    }

    const [items, total] = await Promise.all([
      prisma.place.findMany({
        where,
        include,
        orderBy: { updatedAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      prisma.place.count({ where }),
    ])

    res.json({ items, ...listMeta(total, page) })
  }),
)

adminPlacesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = parseBody(placeSchema, req.body)
    const destination = await prisma.destination.findUnique({ where: { id: data.destinationId } })
    if (!destination) throw new ApiError(400, 'Destination not found')

    const place = await prisma.place.create({
      data: { ...data, status: data.status ?? 'DRAFT' },
      include,
    })
    await writeAudit({
      adminId: getUserId(req),
      action: 'place.create',
      entityType: 'Place',
      entityId: place.id,
      summary: `Added ${place.type.toLowerCase()} “${place.name}”`,
    })
    res.status(201).json(place)
  }),
)

adminPlacesRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = param(req, 'id')
    const existing = await prisma.place.findUnique({ where: { id } })
    if (!existing) throw new ApiError(404, 'Place not found')
    const data = parseBody(placeSchema.partial(), req.body)
    if (data.destinationId) {
      const destination = await prisma.destination.findUnique({ where: { id: data.destinationId } })
      if (!destination) throw new ApiError(400, 'Destination not found')
    }
    const place = await prisma.place.update({ where: { id }, data, include })
    await writeAudit({
      adminId: getUserId(req),
      action: 'place.update',
      entityType: 'Place',
      entityId: id,
      summary: `Updated ${place.type.toLowerCase()} “${place.name}”`,
    })
    res.json(place)
  }),
)

adminPlacesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = param(req, 'id')
    const existing = await prisma.place.findUnique({ where: { id } })
    if (!existing) throw new ApiError(404, 'Place not found')
    await prisma.place.delete({ where: { id } })
    await writeAudit({
      adminId: getUserId(req),
      action: 'place.delete',
      entityType: 'Place',
      entityId: id,
      summary: `Deleted place “${existing.name}”`,
    })
    res.json({ ok: true })
  }),
)
