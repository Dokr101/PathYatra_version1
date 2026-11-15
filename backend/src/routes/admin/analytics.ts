import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { asyncHandler } from '../../lib/api-error.js'
import { queryString } from '../../lib/admin.js'

export const adminAnalyticsRouter = Router()

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function buildSeries(
  rows: { createdAt: Date }[],
  from: Date,
  to: Date,
): { date: string; count: number }[] {
  const buckets = new Map<string, number>()
  for (let cursor = startOfDay(from); cursor <= to; cursor = new Date(cursor.getTime() + 86_400_000)) {
    buckets.set(dayKey(cursor), 0)
  }
  for (const row of rows) {
    const key = dayKey(row.createdAt)
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }
  return [...buckets.entries()].map(([date, count]) => ({ date, count }))
}

adminAnalyticsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const toRaw = queryString(req, 'to')
    const fromRaw = queryString(req, 'from')
    const to = toRaw ? new Date(`${toRaw}T23:59:59.999Z`) : new Date()
    const from = fromRaw ? new Date(`${fromRaw}T00:00:00.000Z`) : new Date(to.getTime() - 29 * 86_400_000)

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      res.status(400).json({ error: 'Invalid date range' })
      return
    }

    const [
      categories,
      categoryGroups,
      reviewGroups,
      users,
      itineraries,
      destinationsInRange,
      reviewsInRange,
      tripsInRange,
    ] = await Promise.all([
      prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.destination.groupBy({ by: ['categoryId'], _count: { _all: true } }),
      prisma.review.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.user.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { createdAt: true } }),
      prisma.itinerary.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { createdAt: true } }),
      prisma.destination.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.review.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.itinerary.count({ where: { createdAt: { gte: from, lte: to } } }),
    ])

    const countsByCategory = new Map(categoryGroups.map((row) => [row.categoryId, row._count._all]))

    res.json({
      range: { from: dayKey(from), to: dayKey(to) },
      generatedAt: new Date().toISOString(),
      destinationsByCategory: categories.map((category) => ({
        id: category.id,
        name: category.name,
        count: countsByCategory.get(category.id) ?? 0,
      })),
      reviewsByStatus: Object.fromEntries(
        ['PENDING', 'APPROVED', 'HIDDEN'].map((status) => [
          status,
          reviewGroups.find((row) => row.status === status)?._count._all ?? 0,
        ]),
      ),
      usersOverTime: buildSeries(users, from, to),
      tripsOverTime: buildSeries(itineraries, from, to),
      inRange: {
        destinationsCreated: destinationsInRange,
        reviewsSubmitted: reviewsInRange,
        tripsCreated: tripsInRange,
      },
      totals: {
        destinations: await prisma.destination.count(),
        users: await prisma.user.count(),
        reviews: await prisma.review.count(),
        trips: await prisma.itinerary.count(),
      },
    })
  }),
)
