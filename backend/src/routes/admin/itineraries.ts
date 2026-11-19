import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { ApiError, asyncHandler, parseBody } from '../../lib/api-error.js'
import { param } from '../../lib/params.js'
import { templateSchema, templateDaysSchema } from '../../schemas/admin.js'
import {
  listMeta,
  pagination,
  queryString,
  searchTerm,
  uniqueSlug,
  writeAudit,
} from '../../lib/admin.js'
import { getUserId } from '../../middleware/auth.js'

export const adminItinerariesRouter = Router()

const include = {
  destination: { select: { id: true, name: true, slug: true } },
  days: {
    orderBy: { dayNumber: 'asc' as const },
    include: { stops: { orderBy: { sortOrder: 'asc' as const } } },
  },
}

adminItinerariesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = pagination(req)
    const q = searchTerm(req)
    const destinationId = queryString(req, 'destinationId')
    const status = queryString(req, 'status')

    const where = {
      ...(q ? { OR: [{ title: { contains: q } }, { summary: { contains: q } }] } : {}),
      ...(destinationId ? { destinationId } : {}),
      ...(status ? { status: status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' } : {}),
    }

    const [items, total] = await Promise.all([
      prisma.itineraryTemplate.findMany({
        where,
        include,
        orderBy: { updatedAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      prisma.itineraryTemplate.count({ where }),
    ])

    res.json({ items, ...listMeta(total, page) })
  }),
)

adminItinerariesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = parseBody(templateSchema, req.body)
    if (data.destinationId) {
      const destination = await prisma.destination.findUnique({ where: { id: data.destinationId } })
      if (!destination) throw new ApiError(400, 'Destination not found')
    }
    const slug = await uniqueSlug(data.slug || data.title, (candidate) =>
      prisma.itineraryTemplate.findUnique({ where: { slug: candidate }, select: { id: true } }),
    )
    const template = await prisma.itineraryTemplate.create({
      data: {
        ...data,
        slug,
        destinationId: data.destinationId || null,
        status: data.status ?? 'DRAFT',
      },
      include,
    })
    await writeAudit({
      adminId: getUserId(req),
      action: 'template.create',
      entityType: 'ItineraryTemplate',
      entityId: template.id,
      summary: `Created itinerary template “${template.title}”`,
    })
    res.status(201).json(template)
  }),
)

adminItinerariesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const template = await prisma.itineraryTemplate.findUnique({
      where: { id: param(req, 'id') },
      include,
    })
    if (!template) throw new ApiError(404, 'Itinerary template not found')
    res.json(template)
  }),
)

adminItinerariesRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = param(req, 'id')
    const existing = await prisma.itineraryTemplate.findUnique({ where: { id } })
    if (!existing) throw new ApiError(404, 'Itinerary template not found')
    const data = parseBody(templateSchema.partial(), req.body)
    if (data.destinationId) {
      const destination = await prisma.destination.findUnique({ where: { id: data.destinationId } })
      if (!destination) throw new ApiError(400, 'Destination not found')
    }
    const slug =
      data.slug || data.title
        ? await uniqueSlug(
            data.slug || data.title || existing.title,
            (candidate) =>
              prisma.itineraryTemplate.findUnique({ where: { slug: candidate }, select: { id: true } }),
            id,
          )
        : existing.slug

    const template = await prisma.itineraryTemplate.update({
      where: { id },
      data: {
        ...data,
        slug,
        destinationId: data.destinationId === undefined ? undefined : data.destinationId || null,
      },
      include,
    })
    await writeAudit({
      adminId: getUserId(req),
      action: data.status === 'ARCHIVED' ? 'template.archive' : 'template.update',
      entityType: 'ItineraryTemplate',
      entityId: id,
      summary:
        data.status === 'ARCHIVED'
          ? `Archived itinerary template “${template.title}”`
          : `Updated itinerary template “${template.title}”`,
    })
    res.json(template)
  }),
)

adminItinerariesRouter.put(
  '/:id/days',
  asyncHandler(async (req, res) => {
    const id = param(req, 'id')
    const existing = await prisma.itineraryTemplate.findUnique({ where: { id } })
    if (!existing) throw new ApiError(404, 'Itinerary template not found')
    const { days } = parseBody(templateDaysSchema, req.body)

    await prisma.$transaction(async (tx) => {
      await tx.templateDay.deleteMany({ where: { templateId: id } })
      for (const [index, day] of days.entries()) {
        await tx.templateDay.create({
          data: {
            templateId: id,
            dayNumber: index + 1,
            title: day.title,
            description: day.description ?? null,
            stops: {
              create: (day.stops ?? []).map((stop, stopIndex) => ({
                timeSlot: stop.timeSlot ?? null,
                title: stop.title,
                description: stop.description ?? null,
                estimatedCost: stop.estimatedCost ?? null,
                sortOrder: stopIndex,
              })),
            },
          },
        })
      }
      await tx.itineraryTemplate.update({
        where: { id },
        data: { durationDays: days.length },
      })
    })

    const template = await prisma.itineraryTemplate.findUnique({ where: { id }, include })
    await writeAudit({
      adminId: getUserId(req),
      action: 'template.days',
      entityType: 'ItineraryTemplate',
      entityId: id,
      summary: `Updated the day-by-day plan for “${existing.title}” (${days.length} days)`,
    })
    res.json(template)
  }),
)

adminItinerariesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = param(req, 'id')
    const existing = await prisma.itineraryTemplate.findUnique({ where: { id } })
    if (!existing) throw new ApiError(404, 'Itinerary template not found')
    await prisma.itineraryTemplate.delete({ where: { id } })
    await writeAudit({
      adminId: getUserId(req),
      action: 'template.delete',
      entityType: 'ItineraryTemplate',
      entityId: id,
      summary: `Deleted itinerary template “${existing.title}”`,
    })
    res.json({ ok: true })
  }),
)
