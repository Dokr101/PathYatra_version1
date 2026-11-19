import { useCallback, useEffect, useState } from 'react'
import { isAbortError, reviewsApi, type ApiReview } from './api'
import type { Review } from '../types'

/** Server review → the local Review shape the UI renders. */
export function mapApiReview(review: ApiReview, destinationSlug: string): Review {
  return {
    id: review.id,
    author: review.user.fullName,
    home: '',
    category: 'Destination',
    subject: '',
    destinationSlug,
    rating: review.rating,
    date: (review.travelDate ?? review.createdAt).slice(0, 10),
    text: review.comment ?? '',
    helpful: 0,
    verified: false,
    status: 'approved',
    serverId: review.id,
    syncState: 'synced',
  }
}

/**
 * Approved reviews for one destination, with the same error/retry shape as
 * publicDestinations so the page can degrade gracefully when the API is down.
 */
export function useDestinationReviews(
  slug: string | undefined,
  options: { pageSize?: number } = {},
) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewCount, setReviewCount] = useState(0)
  const [averageRating, setAverageRating] = useState<number | null>(null)
  const [loading, setLoading] = useState(Boolean(slug))
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const pageSize = options.pageSize

  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  useEffect(() => {
    if (!slug) {
      setReviews([])
      setReviewCount(0)
      setAverageRating(null)
      setLoading(false)
      return undefined
    }
    let active = true
    const controller = new AbortController()
    setLoading(true)
    reviewsApi()
      .forDestination(slug, { pageSize, signal: controller.signal })
      .then((result) => {
        if (!active) return
        setReviews(result.items.map((review) => mapApiReview(review, slug)))
        setReviewCount(result.reviewCount)
        setAverageRating(result.averageRating)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (!active || isAbortError(cause)) return
        setError(cause instanceof Error ? cause.message : 'Could not load community reviews.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [attempt, pageSize, slug])

  return { reviews, reviewCount, averageRating, loading, error, retry }
}
