import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { ApiError, asyncHandler, parseBody } from '../../lib/api-error.js'
import { param } from '../../lib/params.js'
import { activitySchema } from '../../schemas/admin.js'
import {
  listMeta,
  pagination,
  queryString,
  searchTerm,
  writeAudit,
} from '../../lib/admin.js'

export const adminActivitiesRouter = Router()

const include = {
  destination: { select: { id: true, name: true, slug: true } },
}

adminActivitiesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = pagination(req)
    const q = searchTerm(req)
    const destinationId = queryString(req, 'destinationId')
    const type = queryString(req, 'type')
    const status = queryString(req, 'status')

    const where = {
      ...(q ? { name: { contains: q } } : {}),
      ...(destinationId ? { destinationId } : {}),
      ...(type ? { type: type as 'ACTIVITY' | 'ATTRACTION' } : {}),
      ...(status ? { status: status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' } : {}),
    }

    const [items, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include,
        orderBy: { updatedAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      prisma.activity.count({ where }),
    ])

    res.json({ items, ...listMeta(total, page) })
  }),
)

adminActivitiesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = parseBody(activitySchema, req.body)
    const destination = await prisma.destination.findUnique({ where: { id: data.destinationId } })
    if (!destination) throw new ApiError(400, 'Destination not found')

    const activity = await prisma.activity.create({
      data: {
        ...data,
        status: data.status ?? 'DRAFT',
        costUpdatedAt: data.costEstimate != null ? (data.costUpdatedAt ?? new Date()) : data.costUpdatedAt,
      },
      include,
    })
    await writeAudit({
      adminId: req.userId!,
      action: 'activity.create',
      entityType: 'Activity',
      entityId: activity.id,
      summary: `Added ${activity.type.toLowerCase()} “${activity.name}”`,
    })
    res.status(201).json(activity)
  }),
)

adminActivitiesRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = param(req, 'id')
    const existing = await prisma.activity.findUnique({ where: { id } })
    if (!existing) throw new ApiError(404, 'Activity not found')
    const data = parseBody(activitySchema.partial(), req.body)
    if (data.destinationId) {
      const destination = await prisma.destination.findUnique({ where: { id: data.destinationId } })
      if (!destination) throw new ApiError(400, 'Destination not found')
    }
    const activity = await prisma.activity.update({
      where: { id },
      data: {
        ...data,
        costUpdatedAt:
          data.costEstimate !== undefined
            ? (data.costUpdatedAt ?? new Date())
            : data.costUpdatedAt,
      },
      include,
    })
    await writeAudit({
      adminId: req.userId!,
      action: 'activity.update',
      entityType: 'Activity',
      entityId: id,
      summary: `Updated ${activity.type.toLowerCase()} “${activity.name}”`,
    })
    res.json(activity)
  }),
)

adminActivitiesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = param(req, 'id')
    const existing = await prisma.activity.findUnique({ where: { id } })
    if (!existing) throw new ApiError(404, 'Activity not found')
    await prisma.activity.delete({ where: { id } })
    await writeAudit({
      adminId: req.userId!,
      action: 'activity.delete',
      entityType: 'Activity',
      entityId: id,
      summary: `Deleted activity “${existing.name}”`,
    })
    res.json({ ok: true })
  }),
)
