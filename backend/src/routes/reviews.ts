import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { ApiError, asyncHandler, parseBody } from '../lib/api-error.js'
import { param } from '../lib/params.js'
import { requireAuth } from '../middleware/auth.js'
import { createReviewSchema } from '../schemas/review.js'
import { roundRating } from '../lib/serializers.js'

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

    const reviews = await prisma.review.findMany({
      where: { destinationId: destination.id, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, fullName: true } } },
    })

    const reviewCount = reviews.length
    const averageRating =
      reviewCount > 0
        ? roundRating(reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount)
        : null

    res.json({ destination, reviewCount, averageRating, reviews })
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

    const review = await prisma.review.create({
      data: {
        userId: req.userId!,
        destinationId: destination.id,
        rating: data.rating,
        comment: data.comment ?? null,
        travelDate: data.travelDate ?? null,
      },
      include: { user: { select: { id: true, fullName: true } } },
    })

    res.status(201).json(review)
  }),
)
