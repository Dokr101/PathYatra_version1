import { useCallback, useEffect, useState } from 'react'
import type { Category, Difficulty, Destination, SceneKind } from '../types'
import { DESTINATION_MAP, DESTINATIONS } from '../data/destinations'
import { apiRequest } from './api'

interface ApiTravelInfo {
  id: string
  title: string
  category: string | null
  content: string
  sourceName: string | null
  sourceUrl: string | null
  lastVerifiedAt: string | null
  validFrom: string | null
  validUntil: string | null
  statusLabel: 'VERIFIED' | 'ESTIMATE' | 'GENERAL_GUIDANCE'
}

interface ApiPlace {
  id: string
  name: string
  type: 'HOTEL' | 'RESTAURANT'
  description: string | null
  address: string | null
  phone: string | null
  website: string | null
  priceRange: string | null
}

export interface ApiDestination {
  id: string
  name: string
  slug: string
  province: string | null
  district: string | null
  shortDescription: string | null
  overview: string | null
  highlights: string | null
  localFood: string | null
  travelEssentials: string | null
  bestSeason: string | null
  recommendedDurationDays: number | null
  difficultyLevel: string
  costPerPersonPerDay: number | null
  latitude: number | null
  longitude: number | null
  imagePath: string | null
  status: string
  coverImageUrl: string | null
  category: { id: string; name: string; slug: string }
  images: { id: string; url: string; isCover: boolean; altText: string | null }[]
  activities: { id: string; name: string; type: string }[]
  places: ApiPlace[]
  travelInfo: ApiTravelInfo[]
  reviewCount: number
  averageRating: number | null
}

const CATEGORY_SLUGS: Category[] = ['adventure', 'sacred', 'lakes', 'wildlife']

const SCENES: Record<Category, { kind: SceneKind; sky: 'dawn' | 'clear' | 'dusk' | 'night' | 'alpine' }> = {
  adventure: { kind: 'peaks', sky: 'alpine' },
  sacred: { kind: 'temple', sky: 'dawn' },
  lakes: { kind: 'lake', sky: 'clear' },
  wildlife: { kind: 'jungle', sky: 'dawn' },
}

function categoryFromSlug(slug: string): Category {
  return CATEGORY_SLUGS.includes(slug as Category) ? (slug as Category) : 'adventure'
}

function lines(value: string | null): string[] {
  if (!value) return []
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function paragraphs(value: string | null): string[] {
  if (!value) return []
  return value
    .split(/\n{2,}/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function difficulty(value: string): Difficulty {
  const clean = value.toLowerCase()
  if (clean === 'moderate') return 'Moderate'
  if (clean === 'challenging') return 'Challenging'
  if (clean === 'difficult') return 'Difficult'
  return 'Easy'
}

function hashSeed(slug: string): number {
  let hash = 0
  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash * 31 + slug.charCodeAt(index)) % 997
  }
  return hash
}

/**
 * Maps an API destination onto the richer local editorial shape. Content the
 * admin has filled in wins; otherwise the bundled editorial copy is kept, so
 * publishing a new destination still produces a complete page.
 */
export function toDestination(api: ApiDestination): Destination {
  const base = DESTINATION_MAP[api.slug]
  const category = categoryFromSlug(api.category.slug)
  const scene = base?.scene ?? { ...SCENES[category], seed: hashSeed(api.slug) }
  const minDays = api.recommendedDurationDays ?? base?.minDays ?? 2
  const maxDays = Math.max(minDays, base?.maxDays ?? minDays + 1)
  const uploaded = api.images.find((image) => image.isCover)?.url ?? null

  return {
    ...(base ?? {
      hiddenGem: false,
      enRoute: [],
      nearby: [],
      history: '',
      permit: undefined,
      altitude: undefined,
      bestMonths: [3, 4, 5, 10, 11],
      scene,
      minDays,
      maxDays,
      costPerDay: api.costPerPersonPerDay ?? 4500,
      difficulty: difficulty(api.difficultyLevel),
      food: [],
      essentials: [],
      overview: [],
      highlights: [],
      activities: [],
      tagline: '',
      summary: '',
      province: '',
      district: '',
      category,
      name: api.name,
      slug: api.slug,
      lat: 0,
      lng: 0,
    }),
    name: api.name,
    slug: api.slug,
    province: api.province ?? base?.province ?? '',
    district: api.district ?? base?.district ?? '',
    category,
    tagline: api.shortDescription ?? base?.tagline ?? '',
    summary: api.shortDescription ?? base?.summary ?? '',
    overview: paragraphs(api.overview).length > 0 ? paragraphs(api.overview) : (base?.overview ?? []),
    highlights: lines(api.highlights).length > 0 ? lines(api.highlights) : (base?.highlights ?? []),
    activities:
      api.activities.length > 0 ? api.activities.map((activity) => activity.name) : (base?.activities ?? []),
    food: lines(api.localFood).length > 0 ? lines(api.localFood) : (base?.food ?? []),
    essentials:
      lines(api.travelEssentials).length > 0
        ? lines(api.travelEssentials)
        : (base?.essentials ?? []),
    difficulty: difficulty(api.difficultyLevel),
    minDays,
    maxDays,
    costPerDay: api.costPerPersonPerDay ?? base?.costPerDay ?? 4500,
    lat: api.latitude ?? base?.lat ?? 0,
    lng: api.longitude ?? base?.lng ?? 0,
    scene,
    uploadedCoverUrl: uploaded,
    fallbackImageUrl: api.imagePath || api.coverImageUrl,
    travelInfo: api.travelInfo.map((info) => ({
      id: info.id,
      title: info.title,
      category: info.category,
      content: info.content,
      sourceName: info.sourceName,
      sourceUrl: info.sourceUrl,
      lastVerifiedAt: info.lastVerifiedAt,
      validFrom: info.validFrom,
      validUntil: info.validUntil,
      statusLabel: info.statusLabel,
    })),
    places: api.places,
  }
}

let cache: Destination[] | null = null
let pending: Promise<Destination[]> | null = null

async function fetchDestinations(): Promise<Destination[]> {
  if (cache) return cache
  if (!pending) {
    pending = apiRequest<ApiDestination[]>('/destinations')
      .then((items) => {
        cache = items.map(toDestination)
        return cache
      })
      .catch((error: unknown) => {
        pending = null
        throw error
      })
  }
  return pending
}

export function clearPublicDestinationsCache() {
  cache = null
  pending = null
}

/**
 * Live published destinations from the API, with bundled editorial content
 * merged in. Falls back to the local list if the API is unreachable, so the
 * public site keeps working during API downtime.
 */
export function usePublicDestinations() {
  const [destinations, setDestinations] = useState<Destination[]>(() => cache ?? DESTINATIONS)
  const [loading, setLoading] = useState(!cache)
  const [error, setError] = useState<string | null>(null)
  const [requestNumber, setRequestNumber] = useState(0)

  const retry = useCallback(() => {
    clearPublicDestinationsCache()
    setError(null)
    setLoading(true)
    setRequestNumber((previous) => previous + 1)
  }, [])

  useEffect(() => {
    if (cache) {
      setDestinations(cache)
      setLoading(false)
      return
    }
    let active = true
    fetchDestinations()
      .then((items) => {
        if (active) {
          setDestinations(items)
          setError(null)
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'The live destination service returned an unexpected response.',
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [requestNumber])

  return { destinations, loading, error, retry }
}
