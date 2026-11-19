import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { ApiError, asyncHandler, parseBody } from '../../lib/api-error.js'
import { param } from '../../lib/params.js'
import { travelInfoSchema } from '../../schemas/admin.js'
import {
  listMeta,
  pagination,
  queryString,
  searchTerm,
  writeAudit,
} from '../../lib/admin.js'
import { getUserId } from '../../middleware/auth.js'

export const adminTravelInfoRouter = Router()

const include = {
  destination: { select: { id: true, name: true, slug: true } },
}

adminTravelInfoRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = pagination(req)
    const q = searchTerm(req)
    const destinationId = queryString(req, 'destinationId')
    const status = queryString(req, 'status')
    const statusLabel = queryString(req, 'statusLabel')

    const where = {
      ...(q ? { OR: [{ title: { contains: q } }, { content: { contains: q } }] } : {}),
      ...(destinationId ? { destinationId } : {}),
      ...(status ? { status: status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' } : {}),
      ...(statusLabel
        ? { statusLabel: statusLabel as 'VERIFIED' | 'ESTIMATE' | 'GENERAL_GUIDANCE' }
        : {}),
    }

    const [items, total] = await Promise.all([
      prisma.travelInfo.findMany({
        where,
        include,
        orderBy: { updatedAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      prisma.travelInfo.count({ where }),
    ])

    res.json({ items, ...listMeta(total, page) })
  }),
)

adminTravelInfoRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = parseBody(travelInfoSchema, req.body)
    const destination = await prisma.destination.findUnique({ where: { id: data.destinationId } })
    if (!destination) throw new ApiError(400, 'Destination not found')

    const info = await prisma.travelInfo.create({
      data: { ...data, status: data.status ?? 'DRAFT' },
      include,
    })
    await writeAudit({
      adminId: getUserId(req),
      action: 'travelInfo.create',
      entityType: 'TravelInfo',
      entityId: info.id,
      summary: `Added travel information “${info.title}”`,
    })
    res.status(201).json(info)
  }),
)

adminTravelInfoRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = param(req, 'id')
    const existing = await prisma.travelInfo.findUnique({ where: { id } })
    if (!existing) throw new ApiError(404, 'Travel information not found')
    const data = parseBody(travelInfoSchema.partial(), req.body)
    if (data.destinationId) {
      const destination = await prisma.destination.findUnique({ where: { id: data.destinationId } })
      if (!destination) throw new ApiError(400, 'Destination not found')
    }
    const info = await prisma.travelInfo.update({ where: { id }, data, include })
    await writeAudit({
      adminId: getUserId(req),
      action: 'travelInfo.update',
      entityType: 'TravelInfo',
      entityId: id,
      summary: `Updated travel information “${info.title}”`,
    })
    res.json(info)
  }),
)

adminTravelInfoRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = param(req, 'id')
    const existing = await prisma.travelInfo.findUnique({ where: { id } })
    if (!existing) throw new ApiError(404, 'Travel information not found')
    await prisma.travelInfo.delete({ where: { id } })
    await writeAudit({
      adminId: getUserId(req),
      action: 'travelInfo.delete',
      entityType: 'TravelInfo',
      entityId: id,
      summary: `Deleted travel information “${existing.title}”`,
    })
    res.json({ ok: true })
  }),
)
