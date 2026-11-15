import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { asyncHandler } from '../../lib/api-error.js'

export const adminDashboardRouter = Router()

adminDashboardRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [
      totalDestinations,
      publishedDestinations,
      draftDestinations,
      archivedDestinations,
      totalUsers,
      totalTrips,
      pendingReviews,
      totalActivities,
      totalTemplates,
      totalImages,
      recentActivity,
      draftList,
      pendingReviewList,
      missingCovers,
    ] = await Promise.all([
      prisma.destination.count(),
      prisma.destination.count({ where: { status: 'PUBLISHED' } }),
      prisma.destination.count({ where: { status: 'DRAFT' } }),
      prisma.destination.count({ where: { status: 'ARCHIVED' } }),
      prisma.user.count(),
      prisma.itinerary.count(),
      prisma.review.count({ where: { status: 'PENDING' } }),
      prisma.activity.count(),
      prisma.itineraryTemplate.count(),
      prisma.destinationImage.count(),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { admin: { select: { fullName: true } } },
      }),
      prisma.destination.findMany({
        where: { status: 'DRAFT' },
        select: { id: true, name: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      prisma.review.findMany({
        where: { status: 'PENDING' },
        select: {
          id: true,
          rating: true,
          createdAt: true,
          user: { select: { fullName: true } },
          destination: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 5,
      }),
      prisma.destination.findMany({
        where: { status: 'PUBLISHED', images: { none: { isCover: true } }, imagePath: null },
        select: { id: true, name: true, updatedAt: true },
        orderBy: { name: 'asc' },
        take: 5,
      }),
    ])

    res.json({
      counts: {
        destinations: totalDestinations,
        publishedDestinations,
        draftDestinations,
        archivedDestinations,
        users: totalUsers,
        trips: totalTrips,
        pendingReviews,
        activities: totalActivities,
        templates: totalTemplates,
        images: totalImages,
      },
      recentActivity,
      attention: {
        drafts: draftList,
        pendingReviews: pendingReviewList,
        missingCovers,
      },
      generatedAt: new Date().toISOString(),
    })
  }),
)
