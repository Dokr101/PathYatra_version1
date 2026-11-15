import type { Prisma } from '@prisma/client'

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

export const destinationInclude = {
  category: true,
  images: { orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }] },
  activities: { where: { status: 'PUBLISHED' }, orderBy: { name: 'asc' } },
  places: { where: { status: 'PUBLISHED' }, orderBy: { name: 'asc' } },
  travelInfo: { where: { status: 'PUBLISHED' }, orderBy: { title: 'asc' } },
  reviews: { where: { status: 'APPROVED' }, select: { rating: true } },
  _count: { select: { favorites: true, itineraries: true } },
} satisfies Prisma.DestinationInclude

export type DestinationWithMeta = Prisma.DestinationGetPayload<{
  include: typeof destinationInclude
}>

export function serializeDestination(destination: DestinationWithMeta) {
  const { reviews, _count, ...rest } = destination
  const reviewCount = reviews.length
  const averageRating =
    reviewCount > 0
      ? roundRating(reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount)
      : null

  const cover = destination.images[0]
  return {
    ...rest,
    reviewCount,
    averageRating,
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
