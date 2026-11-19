export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN'
export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'HIDDEN'
export type ActivityType = 'ACTIVITY' | 'ATTRACTION'
export type PlaceType = 'HOTEL' | 'RESTAURANT'
export type TravelInfoStatus = 'VERIFIED' | 'ESTIMATE' | 'GENERAL_GUIDANCE'

export interface ApiUser {
  id: string
  fullName: string
  email: string
  role: UserRole
  createdAt: string
}

export class ApiRequestError extends Error {
  status: number
  fields?: Record<string, string>

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.fields = fields
  }
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

interface RequestOptions {
  method?: string
  body?: unknown
  /** Cancels the request when a hook's effect is torn down. */
  signal?: AbortSignal
}

/** True for an aborted fetch, so callers can stay quiet instead of showing an error. */
export function isAbortError(error: unknown): boolean {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'AbortError'
  }
  return error instanceof Error && error.name === 'AbortError'
}

/**
 * Minimal fetch wrapper for the PathYatra API. In development Vite proxies
 * /api to the Express server on :3001.
 *
 * Authentication rides on the HttpOnly session cookie, which the browser sends
 * automatically whenever `credentials: 'include'` is set — no token is ever held
 * in JS, localStorage or a header, so an XSS cannot steal the session.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' }
  if (options.body !== undefined) headers['content-type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? 'GET',
      headers,
      credentials: 'include',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiRequestError(0, 'Cannot reach the PathYatra server. Make sure the API is running.')
  }

  const text = await response.text()
  let payload: unknown = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = null
  }

  if (!response.ok) {
    const body = payload as { error?: string; fields?: Record<string, string> } | null
    const message =
      (body?.fields && Object.values(body.fields)[0]) || body?.error || `Request failed (${response.status})`
    throw new ApiRequestError(response.status, message, body?.fields)
  }

  return payload as T
}

/** Multipart upload (images only); the browser sets the boundary. */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  options: { signal?: AbortSignal } = {},
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { accept: 'application/json' },
      credentials: 'include',
      body: formData,
      signal: options.signal,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiRequestError(0, 'Cannot reach the PathYatra server.')
  }

  const text = await response.text()
  let payload: unknown = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = null
  }

  if (!response.ok) {
    const body = payload as { error?: string; fields?: Record<string, string> } | null
    throw new ApiRequestError(
      response.status,
      body?.error || `Upload failed (${response.status})`,
      body?.fields,
    )
  }
  return payload as T
}

export function apiErrorMessage(error: unknown): string {
  return error instanceof ApiRequestError
    ? error.message
    : error instanceof Error
      ? error.message
      : 'Something went wrong. Please try again.'
}

/* ------------------------------------------------------------------ */
/* Admin panel types                                                    */
/* ------------------------------------------------------------------ */

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface AdminCategory {
  id: string
  name: string
  slug: string
  description: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: { destinations: number }
}

export interface AdminImage {
  id: string
  destinationId: string | null
  destination?: { id: string; name: string; slug: string } | null
  url: string
  publicId: string
  altText: string | null
  caption: string | null
  credit: string | null
  isCover: boolean
  sortOrder: number
  width: number | null
  height: number | null
  createdAt: string
}

export interface AdminDestination {
  id: string
  categoryId: string
  category: AdminCategory
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
  status: ContentStatus
  createdAt: string
  updatedAt: string
  images: AdminImage[]
  _count: { itineraries: number; favorites: number; reviews: number }
}

export interface AdminActivity {
  id: string
  destinationId: string
  destination: { id: string; name: string; slug: string }
  name: string
  type: ActivityType
  description: string | null
  durationHours: number | null
  costEstimate: number | null
  costUpdatedAt: string | null
  difficulty: string | null
  bestSeason: string | null
  status: ContentStatus
  createdAt: string
  updatedAt: string
}

export interface AdminPlace {
  id: string
  destinationId: string
  destination: { id: string; name: string; slug: string }
  name: string
  type: PlaceType
  description: string | null
  address: string | null
  phone: string | null
  website: string | null
  priceRange: string | null
  amenities: string | null
  latitude: number | null
  longitude: number | null
  status: ContentStatus
  createdAt: string
  updatedAt: string
}

export interface TemplateStop {
  id?: string
  timeSlot: string | null
  title: string
  description: string | null
  estimatedCost: number | null
  sortOrder?: number
}

export interface TemplateDay {
  id?: string
  dayNumber: number
  title: string
  description: string | null
  stops: TemplateStop[]
}

export interface AdminTemplate {
  id: string
  destinationId: string | null
  destination: { id: string; name: string; slug: string } | null
  title: string
  slug: string
  summary: string | null
  difficulty: string | null
  durationDays: number
  estimatedCost: number | null
  status: ContentStatus
  createdAt: string
  updatedAt: string
  days: TemplateDay[]
}

export interface AdminTravelInfo {
  id: string
  destinationId: string
  destination: { id: string; name: string; slug: string }
  title: string
  category: string | null
  content: string
  sourceName: string | null
  sourceUrl: string | null
  lastVerifiedAt: string | null
  validFrom: string | null
  validUntil: string | null
  statusLabel: TravelInfoStatus
  status: ContentStatus
  createdAt: string
  updatedAt: string
}

export interface AdminReview {
  id: string
  rating: number
  comment: string | null
  travelDate: string | null
  status: ReviewStatus
  moderationNote: string | null
  moderatedAt: string | null
  createdAt: string
  user: { id: string; fullName: string; email: string }
  destination: { id: string; name: string; slug: string }
}

export interface AdminUser {
  id: string
  fullName: string
  email: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: { itineraries: number; reviews: number; favorites: number }
}

export interface AdminAuditLog {
  id: string
  adminId: string
  action: string
  entityType: string
  entityId: string | null
  summary: string
  createdAt: string
  admin: { id: string; fullName: string; email: string }
}

export interface AdminDashboard {
  counts: {
    destinations: number
    publishedDestinations: number
    draftDestinations: number
    archivedDestinations: number
    users: number
    trips: number
    pendingReviews: number
    activities: number
    templates: number
    images: number
  }
  recentActivity: AdminAuditLog[]
  attention: {
    drafts: { id: string; name: string; updatedAt: string }[]
    pendingReviews: {
      id: string
      rating: number
      createdAt: string
      user: { fullName: string }
      destination: { name: string; slug: string }
    }[]
    missingCovers: { id: string; name: string; updatedAt: string }[]
  }
  generatedAt: string
}

export interface AdminAnalytics {
  range: { from: string; to: string }
  generatedAt: string
  destinationsByCategory: { id: string; name: string; count: number }[]
  reviewsByStatus: Record<ReviewStatus, number>
  usersOverTime: { date: string; count: number }[]
  tripsOverTime: { date: string; count: number }[]
  inRange: { destinationsCreated: number; reviewsSubmitted: number; tripsCreated: number }
  totals: { destinations: number; users: number; reviews: number; trips: number }
}

export interface AdminSettings {
  id: string
  siteName: string
  contactEmail: string | null
  contactPhone: string | null
  featuredDestinationIds: string[]
  featuredDestinations: { id: string; name: string; slug: string }[]
  updatedAt: string
}

type AdminParams = Record<string, string | number | boolean | undefined | null>

function queryString(params?: AdminParams): string {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

/**
 * Every admin endpoint lives here so pages never hand-build URLs or headers.
 * The API verifies the session cookie and the ADMIN/SUPER_ADMIN role on each call.
 */
export function adminApi() {
  const request = <T>(path: string, options: RequestOptions = {}) =>
    apiRequest<T>(`/admin${path}`, options)

  return {
    dashboard: () => request<AdminDashboard>('/dashboard'),

    destinations: {
      list: (params?: AdminParams, signal?: AbortSignal) =>
        request<Paginated<AdminDestination> & { provinces: string[] }>(
          `/destinations${queryString(params)}`,
          { signal },
        ),
      get: (id: string) => request<AdminDestination>(`/destinations/${id}`),
      create: (body: unknown) =>
        request<AdminDestination>('/destinations', { method: 'POST', body }),
      update: (id: string, body: unknown) =>
        request<AdminDestination>(`/destinations/${id}`, { method: 'PATCH', body }),
      remove: (id: string) =>
        request<{ ok: true }>(`/destinations/${id}`, { method: 'DELETE' }),
    },

    media: {
      list: (params?: AdminParams, signal?: AbortSignal) =>
        request<Paginated<AdminImage>>(`/media${queryString(params)}`, { signal }),
      upload: (files: File[], meta: AdminParams) => {
        const form = new FormData()
        for (const file of files) form.append('images', file)
        for (const [key, value] of Object.entries(meta)) {
          if (value !== undefined && value !== null && value !== '') form.append(key, String(value))
        }
        return apiUpload<{ items: AdminImage[] }>('/admin/media/upload', form)
      },
      update: (id: string, body: unknown) =>
        request<AdminImage>(`/media/${id}`, { method: 'PATCH', body }),
      setCover: (id: string) =>
        request<{ ok: true }>(`/media/${id}/cover`, { method: 'POST' }),
      remove: (id: string) => request<{ ok: true }>(`/media/${id}`, { method: 'DELETE' }),
      reorder: (ids: string[]) =>
        request<{ ok: true }>('/media/reorder', { method: 'POST', body: { ids } }),
    },

    categories: {
      list: (params?: AdminParams, signal?: AbortSignal) =>
        request<{ items: AdminCategory[]; total: number }>(`/categories${queryString(params)}`, {
          signal,
        }),
      create: (body: unknown) =>
        request<AdminCategory>('/categories', { method: 'POST', body }),
      update: (id: string, body: unknown) =>
        request<AdminCategory>(`/categories/${id}`, { method: 'PATCH', body }),
      remove: (id: string) =>
        request<{ ok: true }>(`/categories/${id}`, { method: 'DELETE' }),
      reorder: (ids: string[]) =>
        request<{ ok: true }>('/categories/reorder', { method: 'POST', body: { ids } }),
    },

    activities: {
      list: (params?: AdminParams, signal?: AbortSignal) =>
        request<Paginated<AdminActivity>>(`/activities${queryString(params)}`, { signal }),
      create: (body: unknown) =>
        request<AdminActivity>('/activities', { method: 'POST', body }),
      update: (id: string, body: unknown) =>
        request<AdminActivity>(`/activities/${id}`, { method: 'PATCH', body }),
      remove: (id: string) =>
        request<{ ok: true }>(`/activities/${id}`, { method: 'DELETE' }),
    },

    places: {
      list: (params?: AdminParams, signal?: AbortSignal) =>
        request<Paginated<AdminPlace>>(`/places${queryString(params)}`, { signal }),
      create: (body: unknown) => request<AdminPlace>('/places', { method: 'POST', body }),
      update: (id: string, body: unknown) =>
        request<AdminPlace>(`/places/${id}`, { method: 'PATCH', body }),
      remove: (id: string) => request<{ ok: true }>(`/places/${id}`, { method: 'DELETE' }),
    },

    itineraries: {
      list: (params?: AdminParams, signal?: AbortSignal) =>
        request<Paginated<AdminTemplate>>(`/itineraries${queryString(params)}`, { signal }),
      get: (id: string) => request<AdminTemplate>(`/itineraries/${id}`),
      create: (body: unknown) =>
        request<AdminTemplate>('/itineraries', { method: 'POST', body }),
      update: (id: string, body: unknown) =>
        request<AdminTemplate>(`/itineraries/${id}`, { method: 'PATCH', body }),
      saveDays: (id: string, days: TemplateDay[]) =>
        request<AdminTemplate>(`/itineraries/${id}/days`, {
          method: 'PUT',
          body: { days },
        }),
      remove: (id: string) =>
        request<{ ok: true }>(`/itineraries/${id}`, { method: 'DELETE' }),
    },

    travelInfo: {
      list: (params?: AdminParams, signal?: AbortSignal) =>
        request<Paginated<AdminTravelInfo>>(`/travel-info${queryString(params)}`, { signal }),
      create: (body: unknown) =>
        request<AdminTravelInfo>('/travel-info', { method: 'POST', body }),
      update: (id: string, body: unknown) =>
        request<AdminTravelInfo>(`/travel-info/${id}`, { method: 'PATCH', body }),
      remove: (id: string) =>
        request<{ ok: true }>(`/travel-info/${id}`, { method: 'DELETE' }),
    },

    reviews: {
      list: (params?: AdminParams, signal?: AbortSignal) =>
        request<Paginated<AdminReview> & { statusCounts: Partial<Record<ReviewStatus, number>> }>(
          `/reviews${queryString(params)}`,
          { signal },
        ),
      moderate: (id: string, status: 'APPROVED' | 'HIDDEN', moderationNote?: string) =>
        request<AdminReview>(`/reviews/${id}/moderate`, {
          method: 'PATCH',
          body: { status, moderationNote },
        }),
    },

    users: {
      list: (params?: AdminParams, signal?: AbortSignal) =>
        request<Paginated<AdminUser> & { roleCounts: Partial<Record<UserRole, number>> }>(
          `/users${queryString(params)}`,
          { signal },
        ),
      setStatus: (id: string, isActive: boolean) =>
        request<AdminUser>(`/users/${id}/status`, { method: 'PATCH', body: { isActive } }),
      setRole: (id: string, role: UserRole) =>
        request<AdminUser>(`/users/${id}/role`, { method: 'PATCH', body: { role } }),
    },

    auditLogs: {
      list: (params?: AdminParams, signal?: AbortSignal) =>
        request<Paginated<AdminAuditLog> & { entityTypes: string[] }>(
          `/audit-logs${queryString(params)}`,
          { signal },
        ),
    },

    analytics: (params?: AdminParams) =>
      request<AdminAnalytics>(`/analytics${queryString(params)}`),
    settings: {
      get: () => request<AdminSettings>('/settings'),
      update: (body: unknown) =>
        request<AdminSettings>('/settings', { method: 'PATCH', body }),
      updateProfile: (body: { fullName: string; email: string }) =>
        request<{ user: ApiUser }>('/settings/profile', { method: 'PATCH', body }),
      changePassword: (body: {
        currentPassword: string
        newPassword: string
        confirmPassword: string
      }) => request<{ ok: true; token: string }>('/settings/password', { method: 'POST', body }),
    },
  }
}

export type AdminClient = ReturnType<typeof adminApi>

/* ------------------------------------------------------------------ */
/* Traveller itineraries                                                */
/* ------------------------------------------------------------------ */

export interface ApiItineraryStop {
  id: string
  timeSlot: string
  title: string
  description: string | null
  estimatedCost: number | null
  sortOrder: number
}

export interface ApiItineraryDay {
  id: string
  dayNumber: number
  dayDate: string | null
  notes: string | null
  stops: ApiItineraryStop[]
}

export interface ApiItinerary {
  id: string
  destinationId: string
  destination: { id: string; name: string; slug: string; imagePath: string | null; province: string | null; district: string | null }
  title: string
  startingPoint: string | null
  startDate: string | null
  endDate: string | null
  numTravelers: number
  totalBudget: number | null
  status: string
  clientPlan: string | null
  createdAt: string
  days: ApiItineraryDay[]
}

export interface ApiFavorite {
  id: string
  destinationId: string
  destination: { id: string; name: string; slug: string; province: string | null; district: string | null }
}

/** The signed-in traveller's wishlist (/api/favorites). */
export function favoritesApi() {
  return {
    list: (options: { signal?: AbortSignal } = {}) =>
      apiRequest<ApiFavorite[]>('/favorites', { signal: options.signal }),
    add: (destinationId: string, options: { signal?: AbortSignal } = {}) =>
      apiRequest<ApiFavorite>(`/favorites/${destinationId}`, {
        method: 'POST',
        signal: options.signal,
      }),
    remove: (destinationId: string, options: { signal?: AbortSignal } = {}) =>
      apiRequest<null>(`/favorites/${destinationId}`, {
        method: 'DELETE',
        signal: options.signal,
      }),
  }
}

export interface ApiReview {
  id: string
  rating: number
  comment: string | null
  travelDate: string | null
  status: ReviewStatus
  createdAt: string
  user: { id: string; fullName: string }
}

/** Community reviews: public reads per destination, authenticated writes. */
export function reviewsApi() {
  return {
    forDestination: (
      slug: string,
      options: { page?: number; pageSize?: number; signal?: AbortSignal } = {},
    ) =>
      apiRequest<{
        destination: { id: string; name: string; slug: string }
        reviewCount: number
        averageRating: number | null
        items: ApiReview[]
        page: number
        pageSize: number
        totalPages: number
      }>(`/destinations/${slug}/reviews${queryString({ page: options.page, pageSize: options.pageSize })}`, {
        signal: options.signal,
      }),
    create: (
      body: { destinationId: string; rating: number; comment?: string; travelDate?: string },
      options: { signal?: AbortSignal } = {},
    ) => apiRequest<ApiReview>('/reviews', { method: 'POST', body, signal: options.signal }),
  }
}

/**
 * Session endpoints for the signed-in traveller (/api/auth).
 * `logout` revokes every token issued for the account, so it is worth calling
 * even though the client drops its copy immediately afterwards.
 */
export function authApi() {
  return {
    logout: () => apiRequest<null>('/auth/logout', { method: 'POST' }),
    /** Extends the session cookie; every older token for the account stops working. */
    refresh: () => apiRequest<{ ok: true }>('/auth/refresh', { method: 'POST' }),
    changePassword: (body: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
      apiRequest<{ ok: true }>('/auth/password/change', { method: 'POST', body }),
  }
}

/** CRUD for the signed-in traveller's itineraries (/api/itineraries). */
export function itinerariesApi() {
  return {
    list: (options: { signal?: AbortSignal } = {}) =>
      apiRequest<ApiItinerary[]>('/itineraries', { signal: options.signal }),
    create: (body: unknown, options: { signal?: AbortSignal } = {}) =>
      apiRequest<ApiItinerary>('/itineraries', { method: 'POST', body, signal: options.signal }),
    update: (id: string, body: unknown, options: { signal?: AbortSignal } = {}) =>
      apiRequest<ApiItinerary>(`/itineraries/${id}`, {
        method: 'PATCH',
        body,
        signal: options.signal,
      }),
    remove: (id: string, options: { signal?: AbortSignal } = {}) =>
      apiRequest<null>(`/itineraries/${id}`, { method: 'DELETE', signal: options.signal }),
  }
}
