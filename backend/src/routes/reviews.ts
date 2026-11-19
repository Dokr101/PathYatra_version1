import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { ApiError, asyncHandler, parseBody } from '../lib/api-error.js'
import { param } from '../lib/params.js'
import { getUserId, requireAuth } from '../middleware/auth.js'
import { createReviewSchema, updateReviewSchema } from '../schemas/review.js'
import { roundRating } from '../lib/serializers.js'
import { plainText } from '../lib/sanitize.js'
import { listMeta, pagination } from '../lib/admin.js'

export const reviewsRouter = Router()

reviewsRouter.get(
  '/destinations/:slug/reviews',
  asyncHandler(async (req, res) => {
    const destination = await prisma.destination.findFirst({
      where: { slug: param(req, 'slug'), status: 'PUBLISHED' },
      select: { id: true, name: true, slug: true },
    })

    if (!destination) {
      throw new ApiError(404, 'Destination not found')
    }

    // One page of reviews, with the totals computed by the database: an
    // unbounded findMany over a popular destination was both a payload and a
    // CPU problem, and reducing in JS was O(n) per request.
    const page = pagination(req, { maxPageSize: 50 })
    const where = { destinationId: destination.id, status: 'APPROVED' as const }

    const [stats, reviews] = await prisma.$transaction([
      prisma.review.aggregate({ where, _avg: { rating: true }, _count: { _all: true } }),
      prisma.review.findMany({
        where,
        // id breaks ties so two pages cannot repeat or skip a row that shares
        // a timestamp.
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: page.skip,
        take: page.take,
        include: { user: { select: { id: true, fullName: true } } },
      }),
    ])

    const reviewCount = stats._count._all
    const averageRating =
      stats._avg.rating === null ? null : roundRating(stats._avg.rating)
    const meta = listMeta(reviewCount, page)

    res.json({
      destination,
      reviewCount,
      averageRating,
      items: reviews,
      page: meta.page,
      pageSize: meta.pageSize,
      totalPages: meta.totalPages,
    })
  }),
)

reviewsRouter.post(
  '/reviews',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = parseBody(createReviewSchema, req.body)

    const destination = await prisma.destination.findFirst({
      where: { id: data.destinationId, status: 'PUBLISHED' },
      select: { id: true },
    })

    if (!destination) {
      throw new ApiError(400, 'Validation failed', {
        destinationId: 'Destination not found',
      })
    }

    const existing = await prisma.review.findUnique({
      where: {
        userId_destinationId: { userId: getUserId(req), destinationId: destination.id },
      },
      select: { id: true },
    })

    if (existing) {
      throw new ApiError(409, 'You have already reviewed this destination', {
        destinationId: 'You have already reviewed this destination',
      })
    }

    // The unique index is the real guard: two simultaneous submits race past the
    // check above, and the second one is answered by the P2002 handler as 409.
    const review = await prisma.review.create({
      data: {
        userId: getUserId(req),
        destinationId: destination.id,
        rating: data.rating,
        // Tags are stripped on write so the database only ever holds text.
        comment: plainText(data.comment),
        travelDate: data.travelDate ?? null,
      },
      include: { user: { select: { id: true, fullName: true } } },
    })

    res.status(201).json(review)
  }),
)

/**
 * Edit your own review while it waits for moderation. Once an admin has approved
 * or hidden it, changes go through the admin routes so the public average cannot
 * be rewritten after the fact.
 */
reviewsRouter.patch(
  '/reviews/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = parseBody(updateReviewSchema, req.body)
    const id = param(req, 'id')

    const existing = await prisma.review.findFirst({
      where: { id, userId: getUserId(req) },
      select: { id: true, status: true },
    })

    // Scoped by userId: someone else's review is indistinguishable from a missing one.
    if (!existing) {
      throw new ApiError(404, 'Review not found')
    }

    if (existing.status !== 'PENDING') {
      throw new ApiError(409, 'Reviews can only be edited while they await moderation', {
        status: 'Ask an admin to change an approved review',
      })
    }

    const review = await prisma.review.update({
      where: { id: existing.id },
      data: {
        ...(data.rating !== undefined ? { rating: data.rating } : {}),
        ...(data.comment === undefined
          ? {}
          : { comment: data.comment === null ? null : plainText(data.comment) }),
        ...(data.travelDate === undefined ? {} : { travelDate: data.travelDate }),
      },
      include: { user: { select: { id: true, fullName: true } } },
    })

    res.json(review)
  }),
)

/**
 * Permanently remove your own review, whatever its status — this is the data
 * erasure path for a comment that accidentally contains personal details.
 * `deleteMany` keeps the owner filter in the same statement as the id.
 */
reviewsRouter.delete(
  '/reviews/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { count } = await prisma.review.deleteMany({
      where: { id: param(req, 'id'), userId: getUserId(req) },
    })

    if (count === 0) {
      throw new ApiError(404, 'Review not found')
    }

    res.status(204).end()
  }),
)
