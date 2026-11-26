import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  Accommodation,
  Pace,
  PlanStage,
  Review,
  Transport,
  TravelStyle,
  TripExpense,
  TripPlan,
} from '../types'
import { SEED_REVIEWS } from '../data/content'
import {
  apiErrorMessage,
  apiRequest,
  ApiRequestError,
  authApi,
  isAbortError,
  favoritesApi,
  itinerariesApi,
  reviewsApi,
  type ApiItinerary,
  type ApiUser,
  type UserRole,
} from '../lib/api'
import { mergeRemoteTrips, planToItineraryBody } from '../lib/tripSync'
import { clearPublicDestinationsCache, publicDestinationIdMap } from '../lib/publicDestinations'
import { loadJSON, removeKey, saveJSON } from '../lib/storage'
import { passwordPolicyErrors } from '../lib/password'

/** Response shape shared by /auth/me, /auth/login and /auth/register. */
type AuthResponse = { user: ApiUser }
type SignInResult = { ok: boolean; error?: string; fields?: Record<string, string>; user?: ApiUser }

export interface User {
  id?: string
  role?: UserRole
  name: string
  email: string
  phone?: string
  homeCity: string
  province: string
  startPoint: string
}

export interface ProfilePrefs {
  style: TravelStyle
  pace: Pace
  transport: Transport
  accommodation: Accommodation
  interests: string[]
  startPoint: string
}

export type ReviewInput = Omit<
  Review,
  'id' | 'helpful' | 'verified' | 'status' | 'serverId' | 'syncState'
>

export interface AuthRequest {
  reason?: string
  next?: string
  pendingWishlist?: string
}

interface AppValue {
  user: User | null
  /** False until the session cookie has been checked against /auth/me. */
  authReady: boolean
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string; fields?: Record<string, string>; user?: ApiUser }>
  signUp: (user: User, password: string) => Promise<{ ok: boolean; error?: string; fields?: Record<string, string> }>
  signOut: () => void
  updateUser: (patch: Partial<User>) => void
  authRequest: AuthRequest | null
  openAuth: (reason?: string, next?: string, pendingWishlist?: string) => void
  closeAuth: () => void
  wishlist: string[]
  toggleWishlist: (slug: string) => void
  /** Set when the wishlist could not be synced with /api/favorites. */
  wishlistSyncError: string | null
  retryWishlistSync: () => void
  trips: TripPlan[]
  saveTrip: (plan: TripPlan) => void
  updateTrip: (plan: TripPlan) => void
  deleteTrip: (id: string) => void
  duplicateTrip: (id: string) => void
  setTripStatus: (id: string, status: PlanStage) => void
  reviews: Review[]
  /** This traveller's own submissions, newest first (pending or published). */
  myReviews: Review[]
  submitReview: (review: ReviewInput) => Promise<{ ok: boolean; error?: string }>
  reviewSyncError: string | null
  retryReviewsSync: () => void
  voteHelpful: (id: string) => void
  votedReviews: string[]
  compare: string[]
  toggleCompare: (slug: string) => void
  clearCompare: () => void
  prefs: ProfilePrefs
  setPrefs: (patch: Partial<ProfilePrefs>) => void
  toast: string | null
  notify: (message: string) => void
  checklist: Record<string, string[]>
  toggleChecklist: (tripId: string, item: string) => void
  expenses: Record<string, TripExpense[]>
  addExpense: (tripId: string, expense: Omit<TripExpense, 'id'>) => void
  removeExpense: (tripId: string, expenseId: string) => void
}

const AppContext = createContext<AppValue | null>(null)

const DEFAULT_PREFS: ProfilePrefs = {
  style: 'mixed',
  pace: 'balanced',
  transport: 'mixed',
  accommodation: 'mid',
  interests: ['viewpoints', 'food', 'culture'],
  startPoint: 'kathmandu',
}

const DEFAULT_USER: User = {
  name: '',
  email: '',
  homeCity: 'Kathmandu',
  province: 'Bagmati',
  startPoint: 'kathmandu',
}

const DELETED_TRIPS_KEY = 'deletedTrips'
const WISHLIST_OPS_KEY = 'wishlistOps'

/** Favourite changes that still have to reach /api/favorites. */
type WishlistOps = Record<string, 'add' | 'remove'>

/** Server ids whose DELETE has not reached the API yet. */
function queueServerDelete(serverId: string) {
  const current = loadJSON<string[]>(DELETED_TRIPS_KEY, [])
  if (!current.includes(serverId)) saveJSON(DELETED_TRIPS_KEY, [...current, serverId])
}

function mergeAccount(account: ApiUser, previous?: User | null): User {
  return {
    ...DEFAULT_USER,
    ...previous,
    id: account.id,
    role: account.role,
    name: account.fullName,
    email: account.email,
  }
}

function authError(error: unknown): { error: string; fields?: Record<string, string> } {
  if (error instanceof ApiRequestError) {
    return { error: error.message, fields: error.fields }
  }
  return { error: 'Something went wrong. Please try again.' }
}

export function AppProvider({ children }: { children: ReactNode }) {
  // The JWT lives in an HttpOnly cookie the browser sends for us. Only the
  // non-secret profile cache stays in localStorage, for an instant first paint.
  const [user, setUser] = useState<User | null>(() => loadJSON<User | null>('user', null))
  const [authReady, setAuthReady] = useState(false)
  /** Identity of the signed-in account; effects key off this, not the profile object. */
  const signedInId = user?.id
  const [wishlist, setWishlist] = useState<string[]>(() => loadJSON('wishlist', []))
  const [wishlistSyncError, setWishlistSyncError] = useState<string | null>(null)
  const [reviewSyncError, setReviewSyncError] = useState<string | null>(null)
  const [trips, setTrips] = useState<TripPlan[]>(() => loadJSON('trips', []))
  const [userReviews, setUserReviews] = useState<Review[]>(() => loadJSON('reviews', []))
  const [votedReviews, setVotedReviews] = useState<string[]>(() => loadJSON('votes', []))
  const [compare, setCompare] = useState<string[]>(() => loadJSON('compare', []))
  const [prefs, setPrefsState] = useState<ProfilePrefs>(() => loadJSON('prefs', DEFAULT_PREFS))
  const [checklist, setChecklist] = useState<Record<string, string[]>>(() => loadJSON('checklist', {}))
  const [expenses, setExpenses] = useState<Record<string, TripExpense[]>>(() => loadJSON('expenses', {}))
  const [authRequest, setAuthRequest] = useState<AuthRequest | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /**
   * Aborts the account sync of the session that is ending, so a response fetched
   * with the old cookie can never be written into the next account's state.
   * Null between sessions: the first sync of a session creates a fresh one.
   */
  const syncAbortRef = useRef<AbortController | null>(null)
  // Mirrors so async sync work always sees the latest trips, token and account.
  const tripsRef = useRef(trips)
  const userIdRef = useRef(user?.id)
  /** Whether a session cookie is expected to be valid, without exposing the token. */
  const signedInRef = useRef(false)
  const wishlistRef = useRef(wishlist)
  const userReviewsRef = useRef(userReviews)

  useEffect(() => {
    tripsRef.current = trips
  }, [trips])

  useEffect(() => {
    wishlistRef.current = wishlist
  }, [wishlist])

  useEffect(() => {
    userReviewsRef.current = userReviews
  }, [userReviews])

  useEffect(() => {
    userIdRef.current = user?.id
    signedInRef.current = Boolean(user)
  }, [user])

  const notify = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => saveJSON('user', user), [user])

  // One probe decides authReady: the cookie is HttpOnly, so /auth/me is the only
  // way to know whether a session exists. The cached profile keeps the first
  // paint stable; only a rejected cookie ends the session.
  useEffect(() => {
    let active = true
    // Older builds stored the JWT here. Purge it — nothing should read it again.
    removeKey('authToken')

    apiRequest<AuthResponse>('/auth/me')
      .then((result) => {
        if (active) setUser((previous) => mergeAccount(result.user, previous))
      }).catch((error: unknown) => {
        if (!active) return
        if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
          setUser(null)
          notify(
            error.status === 401
              ? 'Your session expired. Your saved trips are still on this device; sign in again to continue.'
              : 'Your account no longer has access. Your saved trips are still on this device.',
          )
        }
      })
      .finally(() => {
        if (active) setAuthReady(true)
      })
    return () => {
      active = false
    }
  }, [notify])
  useEffect(() => saveJSON('wishlist', wishlist), [wishlist])
  useEffect(() => saveJSON('trips', trips), [trips])
  useEffect(() => saveJSON('reviews', userReviews), [userReviews])
  useEffect(() => saveJSON('votes', votedReviews), [votedReviews])
  useEffect(() => saveJSON('compare', compare), [compare])
  useEffect(() => saveJSON('prefs', prefs), [prefs])
  useEffect(() => saveJSON('checklist', checklist), [checklist])
  useEffect(() => saveJSON('expenses', expenses), [expenses])

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const openAuth = useCallback((reason?: string, next?: string, pendingWishlist?: string) => {
    setAuthRequest({ reason, next, pendingWishlist })
  }, [])

  const closeAuth = useCallback(() => setAuthRequest(null), [])

  const applyPending = useCallback(() => {
    if (authRequest?.pendingWishlist) {
      const slug = authRequest.pendingWishlist
      setWishlist((prev) => (prev.includes(slug) ? prev : [...prev, slug]))
    }
  }, [authRequest])

  const signIn = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<SignInResult> => {
      const clean = email.trim().toLowerCase()
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
        return { ok: false, error: 'Check the highlighted field.', fields: { email: 'Enter a valid email address.' } }
      }
      if (!password) {
        return { ok: false, error: 'Check the highlighted field.', fields: { password: 'Enter your password.' } }
      }

      try {
        // The API answers with Set-Cookie; the token never reaches JavaScript.
        const result = await apiRequest<AuthResponse>('/auth/login', {
          method: 'POST',
          body: { email: clean, password },
        })
        setUser((previous) => mergeAccount(result.user, previous))
        setAuthReady(true)
        applyPending()
        setAuthRequest(null)
        return { ok: true, user: result.user }
      } catch (error) {
        return { ok: false, ...authError(error) }
      }
    },
    [applyPending],
  )

  const signUp = useCallback(
    async (
      profile: User,
      password: string,
    ): Promise<{ ok: boolean; error?: string; fields?: Record<string, string> }> => {
      // One space between words, so the stored name never carries stray gaps.
      const fullName = profile.name.trim().replace(/\s+/g, ' ')
      const clean = profile.email.trim().toLowerCase()
      if (fullName.length < 2) {
        return { ok: false, error: 'Check the highlighted field.', fields: { fullName: 'Enter your full name.' } }
      }
      if (fullName.length > 80) {
        return {
          ok: false,
          error: 'Check the highlighted field.',
          fields: { fullName: 'Name must be 80 characters or fewer.' },
        }
      }
      // A person's name has letters (in any script), spaces, hyphens, apostrophes
      // and the occasional full stop — never digits or other symbols.
      if (!/^[\p{L}\p{M}][\p{L}\p{M} .,'’-]*$/u.test(fullName)) {
        return {
          ok: false,
          error: 'Check the highlighted field.',
          fields: { fullName: 'Use letters only — no numbers or symbols in your name.' },
        }
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
        return { ok: false, error: 'Check the highlighted field.', fields: { email: 'Enter a valid email address.' } }
      }
      const passwordErrors = passwordPolicyErrors(password)
      if (passwordErrors.length > 0) {
        return {
          ok: false,
          error: 'Check the highlighted field.',
          fields: { password: `Password needs: ${passwordErrors.join(', ')}.` },
        }
      }

      try {
        const result = await apiRequest<AuthResponse>('/auth/register', {
          method: 'POST',
          body: { fullName, email: clean, password },
        })
        setUser((previous) => ({
          ...mergeAccount(result.user, previous),
          name: fullName,
          email: clean,
          phone: profile.phone,
          homeCity: profile.homeCity,
          province: profile.province,
          startPoint: profile.startPoint,
        }))
        setPrefsState((prev) => ({ ...prev, startPoint: profile.startPoint }))
        applyPending()
        setAuthRequest(null)
        return { ok: true }
      } catch (error) {
        return { ok: false, ...authError(error) }
      }
    },
    [applyPending],
  )

  const signOut = useCallback(() => {
    // Everything that belongs to this session ends with it:
    //  - in-flight sync is aborted, so a late wishlist/trip/review response
    //    cannot land in the next account's state;
    //  - the module-level public catalogue cache is dropped, so the next
    //    session re-reads what the API currently publishes;
    //  - the toast timer is cleared, so no message outlives the session.
    syncAbortRef.current?.abort()
    syncAbortRef.current = null
    clearPublicDestinationsCache()
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = null
    // The server bumps tokenVersion and clears the HttpOnly cookie. Best effort:
    // signing out must still work if the API is unreachable.
    void authApi()
      .logout()
      .catch(() => undefined)
    setUser(null)
    setAuthReady(true)
    notify('Signed out. Your trips and saved places remain on this device.')
  }, [notify])

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  /** Sends queued favourite changes; keeps the queue for anything that fails. */
  const flushWishlistOps = useCallback(async (signal?: AbortSignal): Promise<boolean> => {
    const ops = loadJSON<WishlistOps>(WISHLIST_OPS_KEY, {})
    const entries = Object.entries(ops)
    if (!entries.length) return true

    const api = favoritesApi()
    let ids: Map<string, string> | null = null
    let ok = true

    for (const [slug, op] of entries) {
      // Signed out: leave the queue for the next session instead of sending
      // the previous account's changes with whatever cookie comes next.
      if (signal?.aborted) return false
      try {
        if (!ids) ids = await publicDestinationIdMap()
        const destinationId = ids.get(slug)
        if (!destinationId) {
          // Not published on the server (yet) — keep it local instead of failing forever.
          delete ops[slug]
          continue
        }
        if (op === 'add') await api.add(destinationId, { signal })
        else await api.remove(destinationId, { signal })
        delete ops[slug]
      } catch {
        ok = false
      }
    }

    if (Object.keys(ops).length) saveJSON(WISHLIST_OPS_KEY, ops)
    else removeKey(WISHLIST_OPS_KEY)
    return ok
  }, [])

  /** Pull the account wishlist, union it with this device, then push local extras. */
  const syncWishlist = useCallback(async () => {
    // Created lazily so the first sync of a session has a controller to abort.
    const signal = (syncAbortRef.current ??= new AbortController()).signal
    if (!signedInRef.current || signal.aborted) return
    const sessionUser = userIdRef.current
    try {
      await flushWishlistOps(signal)
      if (signal.aborted) return
      const remote = await favoritesApi().list({ signal })
      if (signal.aborted || userIdRef.current !== sessionUser) return

      const remoteSlugs = remote.map((favorite) => favorite.destination.slug)
      const ops = loadJSON<WishlistOps>(WISHLIST_OPS_KEY, {})
      const merged = [...new Set([...wishlistRef.current, ...remoteSlugs])].filter(
        (slug) => ops[slug] !== 'remove',
      )
      wishlistRef.current = merged
      setWishlist(merged)
      setWishlistSyncError(null)

      const missing = merged.filter((slug) => !remoteSlugs.includes(slug))
      if (missing.length) {
        const api = favoritesApi()
        const ids = await publicDestinationIdMap()
        if (signal.aborted) return
        for (const slug of missing) {
          if (signal.aborted) return
          const destinationId = ids.get(slug)
          if (!destinationId) continue
          try {
            await api.add(destinationId, { signal })
          } catch {
            if (signal.aborted) return
            setWishlistSyncError('Some favourites are saved on this device only. Sync will retry.')
          }
        }
      }
    } catch (error) {
      // An aborted sync is the session ending, not a failure to report.
      if (signal.aborted || isAbortError(error)) return
      setWishlistSyncError(apiErrorMessage(error))
    }
  }, [flushWishlistOps])

  const retryWishlistSync = useCallback(() => {
    setWishlistSyncError(null)
    void syncWishlist()
  }, [syncWishlist])

  const toggleWishlist = useCallback(
    (slug: string) => {
      if (!user) {
        const next = typeof window === 'undefined' ? '/explore' : window.location.pathname
        openAuth('Sign in to save destinations to your wishlist. We will keep this one ready for you.', next, slug)
        return
      }

      const saved = wishlistRef.current.includes(slug)
      const next = saved ? wishlistRef.current.filter((item) => item !== slug) : [...wishlistRef.current, slug]
      wishlistRef.current = next
      setWishlist(next)
      notify(saved ? 'Removed from your wishlist.' : 'Saved to your wishlist.')

      const ops = loadJSON<WishlistOps>(WISHLIST_OPS_KEY, {})
      ops[slug] = saved ? 'remove' : 'add'
      saveJSON(WISHLIST_OPS_KEY, ops)

      if (signedInRef.current) {
        void flushWishlistOps().then((ok) => {
          if (!ok) {
            setWishlistSyncError(
              'Wishlist changes are saved on this device. Sync will retry when the server is reachable.',
            )
          }
        })
      }
    },
    [flushWishlistOps, notify, openAuth, user],
  )

  /** Single writer for trips: keeps state and the sync ref identical. */
  const commitTrips = useCallback((updater: (prev: TripPlan[]) => TripPlan[]) => {
    const next = updater(tripsRef.current)
    tripsRef.current = next
    setTrips(next)
  }, [])

  const patchTrip = useCallback(
    (id: string, patch: Partial<TripPlan>) => {
      commitTrips((prev) => prev.map((trip) => (trip.id === id ? { ...trip, ...patch } : trip)))
    },
    [commitTrips],
  )

  /**
   * Mirrors one plan to /api/itineraries: POST the first time, PATCH once the
   * server id is known. Without a token (or when the API is down) the plan keeps
   * its syncState so the next sign-in or 'online' event retries it.
   */
  const pushPlan = useCallback(
    async (plan: TripPlan, signal?: AbortSignal) => {
      const owner = userIdRef.current
      if (!signedInRef.current || signal?.aborted || (plan.ownerId && owner && plan.ownerId !== owner)) {
        patchTrip(plan.id, { syncState: 'local' })
        return
      }

      patchTrip(plan.id, { syncState: 'syncing' })
      const api = itinerariesApi()
      try {
        const body = planToItineraryBody(plan)
        const saved = plan.serverId
          ? await api.update(plan.serverId, body, { signal })
          : await api.create(body, { signal })
        if (signal?.aborted) return
        patchTrip(plan.id, { serverId: saved.id, ownerId: owner, syncState: 'synced' })
      } catch {
        // Aborted means the session ended; the plan stays local for the next one.
        if (signal?.aborted) return
        patchTrip(plan.id, { syncState: 'error' })
      }
    },
    [patchTrip],
  )

  const saveTrip = useCallback(
    (plan: TripPlan) => {
      const next: TripPlan = {
        ...plan,
        ownerId: plan.ownerId ?? userIdRef.current,
        syncState: plan.syncState ?? 'local',
      }
      commitTrips((prev) =>
        prev.some((trip) => trip.id === next.id)
          ? prev.map((trip) => (trip.id === next.id ? next : trip))
          : [next, ...prev],
      )
      void pushPlan(next)
    },
    [commitTrips, pushPlan],
  )

  const updateTrip = useCallback(
    (plan: TripPlan) => {
      commitTrips((prev) => prev.map((trip) => (trip.id === plan.id ? plan : trip)))
      void pushPlan(plan)
    },
    [commitTrips, pushPlan],
  )

  const deleteTrip = useCallback(
    (id: string) => {
      const target = tripsRef.current.find((trip) => trip.id === id)
      commitTrips((prev) => prev.filter((trip) => trip.id !== id))
      notify('Itinerary deleted.')

      const serverId = target?.serverId
      if (!serverId) return
      if (!signedInRef.current) {
        queueServerDelete(serverId)
        return
      }
      itinerariesApi()
        .remove(serverId)
        .catch((error: unknown) => {
          if (!(error instanceof ApiRequestError && error.status === 404)) queueServerDelete(serverId)
        })
    },
    [commitTrips, notify],
  )

  const duplicateTrip = useCallback(
    (id: string) => {
      const source = tripsRef.current.find((trip) => trip.id === id)
      if (!source) return
      const copy: TripPlan = {
        ...source,
        id: `trip_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
        status: 'draft',
        title: `${source.title} (copy)`,
        serverId: undefined,
        syncState: 'local',
        ownerId: userIdRef.current,
      }
      commitTrips((prev) => [copy, ...prev])
      notify('Itinerary duplicated as a draft.')
      void pushPlan(copy)
    },
    [commitTrips, notify, pushPlan],
  )

  const setTripStatus = useCallback(
    (id: string, status: PlanStage) => {
      const current = tripsRef.current.find((trip) => trip.id === id)
      commitTrips((prev) => prev.map((trip) => (trip.id === id ? { ...trip, status } : trip)))
      notify(
        status === 'completed'
          ? 'Trip marked completed. It is now in your travel history.'
          : status === 'upcoming'
            ? 'Trip confirmed. You will find it under Upcoming.'
            : 'Moved back to drafts.',
      )
      if (current) void pushPlan({ ...current, status })
    },
    [commitTrips, notify, pushPlan],
  )

  const flushDeletedTrips = useCallback(async () => {
    const ids = loadJSON<string[]>(DELETED_TRIPS_KEY, [])
    if (!ids.length) return
    const pending: string[] = []
    for (const serverId of ids) {
      try {
        await itinerariesApi().remove(serverId)
      } catch (error) {
        if (!(error instanceof ApiRequestError && error.status === 404)) pending.push(serverId)
      }
    }
    if (pending.length) saveJSON(DELETED_TRIPS_KEY, pending)
    else removeKey(DELETED_TRIPS_KEY)
  }, [])

  /** Pull the account's itineraries, merge them, then push anything still local. */
  const syncTrips = useCallback(async () => {
    const signal = (syncAbortRef.current ??= new AbortController()).signal
    if (!signedInRef.current || signal.aborted) return
    const sessionUser = userIdRef.current
    const api = itinerariesApi()
    const ownsTrip = (trip: TripPlan) =>
      !trip.ownerId || !userIdRef.current || trip.ownerId === userIdRef.current

    // Push queued local work before pulling, so an offline edit is never
    // overwritten by the older server copy.
    for (const trip of tripsRef.current.filter((entry) => entry.syncState !== 'synced' && ownsTrip(entry))) {
      if (signal.aborted || userIdRef.current !== sessionUser) return
      await pushPlan(trip, signal)
    }

    if (signal.aborted) return
    await flushDeletedTrips()
    if (signal.aborted) return

    let remote: ApiItinerary[]
    try {
      remote = await api.list({ signal })
    } catch (error) {
      // Offline, API down or the session ended: keep local state; the 'online'
      // event retries.
      if (isAbortError(error)) return
      return
    }
    if (signal.aborted || userIdRef.current !== sessionUser) return

    tripsRef.current = mergeRemoteTrips(tripsRef.current, remote, userIdRef.current)
    setTrips(tripsRef.current)
  }, [flushDeletedTrips, pushPlan])

  // Pull once the cookie has been checked, and whenever the account changes.
  useEffect(() => {
    if (!signedInId || !authReady) return
    void syncTrips()
    void syncWishlist()
  }, [authReady, signedInId, syncTrips, syncWishlist])


  const reviews = useMemo(() => [...userReviews, ...SEED_REVIEWS], [userReviews])

  /** Sends one review to the API; the local copy stays either way. */
  const pushReview = useCallback(async (review: Review, signal?: AbortSignal) => {
    if (!signedInRef.current || signal?.aborted) return
    try {
      const ids = await publicDestinationIdMap()
      if (signal?.aborted) return
      const destinationId = ids.get(review.destinationSlug)
      if (!destinationId) {
        throw new ApiRequestError(400, 'This destination is not published on the server yet.')
      }
      const created = await reviewsApi().create(
        {
          destinationId,
          rating: review.rating,
          comment: review.text,
          travelDate: review.date,
        },
        { signal },
      )
      // The session ended while the review was in flight; the local copy keeps
      // syncState 'local' and goes up with the next sign-in.
      if (signal?.aborted) return
      setUserReviews((prev) =>
        prev.map((entry) =>
          entry.id === review.id
            ? { ...entry, id: created.id, serverId: created.id, status: 'pending', syncState: 'synced' }
            : entry,
        ),
      )
      setReviewSyncError(null)
    } catch (error) {
      if (signal?.aborted || isAbortError(error)) return
      setUserReviews((prev) =>
        prev.map((entry) => (entry.id === review.id ? { ...entry, syncState: 'error' } : entry)),
      )
      setReviewSyncError(apiErrorMessage(error))
    }
  }, [])

  const submitReview = useCallback(
    async (input: ReviewInput) => {
      const draft: Review = {
        ...input,
        id: `review_${Date.now().toString(36)}`,
        helpful: 0,
        verified: false,
        status: 'pending',
        syncState: 'local',
      }
      setUserReviews((prev) => [draft, ...prev])

      if (!signedInRef.current) {
        notify('Review saved on this device. Sign in to publish it to the community.')
        return { ok: true }
      }

      await pushReview(draft, syncAbortRef.current?.signal)
      notify('Review submitted. It stays private until a moderator approves it.')
      return { ok: true }
    },
    [notify, pushReview],
  )

  const retryReviewsSync = useCallback(() => {
    const signal = (syncAbortRef.current ??= new AbortController()).signal
    if (!signedInRef.current || signal.aborted) return
    setReviewSyncError(null)
    for (const review of userReviewsRef.current.filter((entry) => entry.syncState !== 'synced')) {
      void pushReview(review, signal)
    }
  }, [pushReview])

  // Reviews kept on the device go up as soon as a session exists.
  useEffect(() => {
    if (!signedInId || !authReady) return
    retryReviewsSync()
  }, [authReady, retryReviewsSync, signedInId])

  // The browser coming back online is the retry trigger for everything queued.
  useEffect(() => {
    const onOnline = () => {
      void syncTrips()
      void syncWishlist()
      retryReviewsSync()
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [retryReviewsSync, syncTrips, syncWishlist])

  const voteHelpful = useCallback(
    (id: string) => {
      if (!user) {
        openAuth('Sign in to vote on community reviews.')
        return
      }
      setVotedReviews((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
    },
    [openAuth, user],
  )

  const toggleCompare = useCallback(
    (slug: string) => {
      setCompare((prev) => {
        if (prev.includes(slug)) return prev.filter((item) => item !== slug)
        if (prev.length >= 3) {
          notify('You can compare up to three destinations. Remove one first.')
          return prev
        }
        return [...prev, slug]
      })
    },
    [notify],
  )

  const clearCompare = useCallback(() => setCompare([]), [])

  const setPrefs = useCallback((patch: Partial<ProfilePrefs>) => {
    setPrefsState((prev) => ({ ...prev, ...patch }))
  }, [])

  const toggleChecklist = useCallback((tripId: string, item: string) => {
    setChecklist((prev) => {
      const current = prev[tripId] ?? []
      const next = current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item]
      return { ...prev, [tripId]: next }
    })
  }, [])

  const addExpense = useCallback((tripId: string, expense: Omit<TripExpense, 'id'>) => {
    setExpenses((prev) => ({
      ...prev,
      [tripId]: [...(prev[tripId] ?? []), { ...expense, id: `exp_${Date.now().toString(36)}` }],
    }))
  }, [])

  const removeExpense = useCallback((tripId: string, expenseId: string) => {
    setExpenses((prev) => ({
      ...prev,
      [tripId]: (prev[tripId] ?? []).filter((expense) => expense.id !== expenseId),
    }))
  }, [])

  const value: AppValue = {
    user,
    authReady,
    signIn,
    signUp,
    signOut,
    updateUser,
    authRequest,
    openAuth,
    closeAuth,
    wishlist,
    toggleWishlist,
    wishlistSyncError,
    retryWishlistSync,
    trips,
    saveTrip,
    updateTrip,
    deleteTrip,
    duplicateTrip,
    setTripStatus,
    reviews,
    myReviews: userReviews,
    submitReview,
    reviewSyncError,
    retryReviewsSync,
    voteHelpful,
    votedReviews,
    compare,
    toggleCompare,
    clearCompare,
    prefs,
    setPrefs,
    toast,
    notify,
    checklist,
    toggleChecklist,
    expenses,
    addExpense,
    removeExpense,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppValue {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
