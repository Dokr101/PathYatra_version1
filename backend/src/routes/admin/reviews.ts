import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { ApiError, asyncHandler, parseBody } from '../../lib/api-error.js'
import { param } from '../../lib/params.js'
import { reviewModerationSchema } from '../../schemas/admin.js'
import {
  listMeta,
  pagination,
  queryString,
  searchTerm,
  writeAudit,
} from '../../lib/admin.js'

export const adminReviewsRouter = Router()

const include = {
  user: { select: { id: true, fullName: true, email: true } },
  destination: { select: { id: true, name: true, slug: true } },
}

adminReviewsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = pagination(req)
    const q = searchTerm(req)
    const status = queryString(req, 'status')
    const destinationId = queryString(req, 'destinationId')

    const baseWhere = {
      ...(q
        ? {
            OR: [
              { comment: { contains: q } },
              { user: { fullName: { contains: q } } },
              { destination: { name: { contains: q } } },
            ],
          }
        : {}),
      ...(destinationId ? { destinationId } : {}),
    }
    const where = {
      ...baseWhere,
      ...(status ? { status: status as 'PENDING' | 'APPROVED' | 'HIDDEN' } : {}),
    }

    const [items, total, counts] = await Promise.all([
      prisma.review.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      prisma.review.count({ where }),
      prisma.review.groupBy({ by: ['status'], where: baseWhere, _count: { _all: true } }),
    ])

    res.json({
      items,
      ...listMeta(total, page),
      statusCounts: Object.fromEntries(counts.map((row) => [row.status, row._count._all])),
    })
  }),
)

adminReviewsRouter.patch(
  '/:id/moderate',
  asyncHandler(async (req, res) => {
    const id = param(req, 'id')
    const existing = await prisma.review.findUnique({
      where: { id },
      include: { user: { select: { fullName: true } }, destination: { select: { name: true } } },
    })
    if (!existing) throw new ApiError(404, 'Review not found')

    const data = parseBody(reviewModerationSchema, req.body)
    const review = await prisma.review.update({
      where: { id },
      data: {
        status: data.status,
        moderationNote: data.moderationNote ?? null,
        moderatedAt: new Date(),
        moderatedById: req.userId!,
      },
      include,
    })

    await writeAudit({
      adminId: req.userId!,
      action: data.status === 'APPROVED' ? 'review.approve' : 'review.hide',
      entityType: 'Review',
      entityId: id,
      summary: `${data.status === 'APPROVED' ? 'Approved' : 'Hid'} a ${existing.rating}-star review by ${existing.user.fullName} for “${existing.destination.name}”`,
    })

    res.json(review)
  }),
)
