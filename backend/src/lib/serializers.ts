import type { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'

export function publicUser(user: {
  id: string
  fullName: string
  email: string
  role?: string
  createdAt: Date
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role ?? 'USER',
    createdAt: user.createdAt,
  }
}

export function roundRating(value: number): number {
  return Math.round(value * 10) / 10
}

export type RatingSummary = {
  averageRating: number | null
  reviewCount: number
}

/** A destination with no approved reviews yet. */
export const noRating: RatingSummary = { averageRating: null, reviewCount: 0 }

function summarise(average: number | null, count: number): RatingSummary {
  return { averageRating: average === null ? null : roundRating(average), reviewCount: count }
}

/**
 * Approved-review average and count for one destination. The database does the
 * averaging, so individual ratings never travel to Node.
 */
export async function ratingSummary(destinationId: string): Promise<RatingSummary> {
  const result = await prisma.review.aggregate({
    where: { destinationId, status: 'APPROVED' },
    _avg: { rating: true },
    _count: { _all: true },
  })
  return summarise(result._avg.rating, result._count._all)
}

/**
 * The same summary for a whole page in one grouped query, instead of one query
 * (or a full rating dump) per destination.
 */
export async function ratingSummaries(destinationIds: string[]): Promise<Map<string, RatingSummary>> {
  const summaries = new Map<string, RatingSummary>()
  if (destinationIds.length === 0) return summaries

  const rows = await prisma.review.groupBy({
    by: ['destinationId'],
    where: { destinationId: { in: destinationIds }, status: 'APPROVED' },
    _avg: { rating: true },
    _count: { _all: true },
  })
  for (const row of rows) {
    summaries.set(row.destinationId, summarise(row._avg.rating, row._count._all))
  }
  return summaries
}

export const destinationInclude = {
  category: true,
  images: { orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }] },
  activities: { where: { status: 'PUBLISHED' }, orderBy: { name: 'asc' } },
  places: { where: { status: 'PUBLISHED' }, orderBy: { name: 'asc' } },
  travelInfo: { where: { status: 'PUBLISHED' }, orderBy: { title: 'asc' } },
  _count: { select: { favorites: true, itineraries: true } },
} satisfies Prisma.DestinationInclude

export type DestinationWithMeta = Prisma.DestinationGetPayload<{
  include: typeof destinationInclude
}>

export function serializeDestination(destination: DestinationWithMeta, rating: RatingSummary) {
  const { _count, ...rest } = destination
  const cover = destination.images[0]
  return {
    ...rest,
    reviewCount: rating.reviewCount,
    averageRating: rating.averageRating,
    favoriteCount: _count.favorites,
    itineraryCount: _count.itineraries,
    coverImageUrl: cover?.url ?? destination.imagePath ?? null,
  }
}

export const itineraryInclude = {
  destination: {
    select: { id: true, name: true, slug: true, imagePath: true, province: true, district: true },
  },
  days: {
    orderBy: { dayNumber: 'asc' },
    include: { stops: { orderBy: { sortOrder: 'asc' } } },
  },
} satisfies Prisma.ItineraryInclude
