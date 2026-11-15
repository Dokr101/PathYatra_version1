import type { Category, Destination } from '../types'
import { adventureDestinations } from './destinations.adventure'
import { sacredDestinations } from './destinations.sacred'
import { lakeDestinations } from './destinations.lakes'
import { wildlifeDestinations } from './destinations.wildlife'
import { CATEGORIES } from './taxonomy'

export const DESTINATIONS: Destination[] = [
  ...adventureDestinations,
  ...sacredDestinations,
  ...lakeDestinations,
  ...wildlifeDestinations,
]

export const DESTINATION_MAP: Record<string, Destination> = Object.fromEntries(
  DESTINATIONS.map((d) => [d.slug, d]),
)

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  Category,
  (typeof CATEGORIES)[number]
>

export function getDestination(slug: string | undefined): Destination | undefined {
  return slug ? DESTINATION_MAP[slug] : undefined
}

export function destinationsByCategory(category: Category): Destination[] {
  return DESTINATIONS.filter((d) => d.category === category)
}

export const HIDDEN_GEMS = DESTINATIONS.filter((d) => d.hiddenGem)

export function isGoodMonth(destination: Destination, month: number): boolean {
  return destination.bestMonths.includes(month)
}

export function searchDestinations(query: string): Destination[] {
  const q = query.trim().toLowerCase()
  if (!q) return DESTINATIONS
  return DESTINATIONS.filter((d) => {
    const haystack = [
      d.name,
      d.district,
      d.province,
      d.tagline,
      d.summary,
      CATEGORY_MAP[d.category].label,
      ...d.activities,
      ...d.highlights,
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

export function destinationsInSeason(month: number): Destination[] {
  return DESTINATIONS.filter((d) => d.bestMonths.includes(month))
}

export const POPULAR_SLUGS = [
  'everest-base-camp',
  'pokhara',
  'kathmandu-heritage',
  'chitwan',
  'annapurna-circuit',
  'lumbini',
]

export function popularDestinations(): Destination[] {
  return POPULAR_SLUGS.map((slug) => DESTINATION_MAP[slug]).filter(Boolean)
}

export function relatedDestinations(destination: Destination, count = 3): Destination[] {
  const explicit = destination.nearby.map((slug) => DESTINATION_MAP[slug]).filter(Boolean)
  if (explicit.length >= count) return explicit.slice(0, count)
  const sameCategory = DESTINATIONS.filter(
    (d) => d.category === destination.category && d.slug !== destination.slug && !explicit.includes(d),
  )
  return [...explicit, ...sameCategory].slice(0, count)
}

export function averageCostPerDay(destination: Destination): number {
  return destination.costPerDay
}
