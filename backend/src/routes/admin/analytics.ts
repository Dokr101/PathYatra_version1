import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { ApiError, asyncHandler } from '../../lib/api-error.js'
import { queryString } from '../../lib/admin.js'

export const adminAnalyticsRouter = Router()

const DAY_MS = 86_400_000
/** One year plus the leap day: the series is built day by day, so it needs a ceiling. */
const MAX_RANGE_MS = 366 * DAY_MS
const MAX_SERIES_DAYS = 366
const MIN_YEAR = 2000

/** UTC midnight: bucketed keys come from toISOString(), so mixing local
 * midnight in added a phantom first day on servers outside UTC. */
function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
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
  let days = 0
  for (let cursor = startOfDay(from); cursor <= to; cursor = new Date(cursor.getTime() + DAY_MS)) {
    buckets.set(dayKey(cursor), 0)
    days += 1
    // Defence in depth: the route rejects long ranges, and the loop itself
    // cannot be made to spin even if a future caller forgets to.
    if (days > MAX_SERIES_DAYS) break
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
      throw new ApiError(400, 'Invalid date range')
    }

    const thisYear = new Date().getUTCFullYear()
    const yearInRange = (date: Date) => date.getUTCFullYear() >= MIN_YEAR && date.getUTCFullYear() <= thisYear
    if (!yearInRange(from) || !yearInRange(to)) {
      throw new ApiError(400, `Choose dates between ${MIN_YEAR} and ${thisYear}`)
    }

    if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
      throw new ApiError(400, 'Date range must be 365 days or fewer')
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
      totalDestinations,
      totalUsers,
      totalReviews,
      totalTrips,
    ] = await Promise.all([
      prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.destination.groupBy({ by: ['categoryId'], _count: { _all: true } }),
      prisma.review.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.user.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { createdAt: true } }),
      prisma.itinerary.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { createdAt: true } }),
      prisma.destination.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.review.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.itinerary.count({ where: { createdAt: { gte: from, lte: to } } }),
      // The all-time totals ride the same round-trip batch instead of four
      // sequential counts after it.
      prisma.destination.count(),
      prisma.user.count(),
      prisma.review.count(),
      prisma.itinerary.count(),
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
        destinations: totalDestinations,
        users: totalUsers,
        reviews: totalReviews,
        trips: totalTrips,
      },
    })
  }),
)
