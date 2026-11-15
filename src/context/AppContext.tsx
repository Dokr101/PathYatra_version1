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
import { apiRequest, ApiRequestError, type ApiUser, type UserRole } from '../lib/api'
import { loadJSON, removeKey, saveJSON } from '../lib/storage'
import { passwordPolicyErrors } from '../lib/password'

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

export interface AuthRequest {
  reason?: string
  next?: string
  pendingWishlist?: string
}

interface AppValue {
  user: User | null
  token: string | null
  /** False while a stored token is being validated against /auth/me. */
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
  trips: TripPlan[]
  saveTrip: (plan: TripPlan) => void
  updateTrip: (plan: TripPlan) => void
  deleteTrip: (id: string) => void
  duplicateTrip: (id: string) => void
  setTripStatus: (id: string, status: PlanStage) => void
  reviews: Review[]
  addReview: (review: Omit<Review, 'id' | 'helpful' | 'verified'>) => void
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
  const [token, setToken] = useState<string | null>(() => loadJSON<string | null>('authToken', null))
  const [user, setUser] = useState<User | null>(() =>
    loadJSON<string | null>('authToken', null) ? loadJSON<User | null>('user', null) : null,
  )
  const [authReady, setAuthReady] = useState(() => !loadJSON<string | null>('authToken', null))
  const [wishlist, setWishlist] = useState<string[]>(() => loadJSON('wishlist', []))
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

  const notify = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => saveJSON('user', user), [user])

  useEffect(() => {
    if (token) saveJSON('authToken', token)
    else removeKey('authToken')
  }, [token])

  // Keep the cached profile when the API is unreachable; only a rejected token ends a session.
  useEffect(() => {
    if (!token) return undefined
    let active = true
    apiRequest<{ user: ApiUser }>('/auth/me', { token })
      .then((result) => {
        if (active) setUser((previous) => mergeAccount(result.user, previous))
      }).catch((error: unknown) => {
        if (!active) return
        if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
          setToken(null)
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
  }, [notify, token])
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
    ): Promise<{ ok: boolean; error?: string; fields?: Record<string, string>; user?: ApiUser }> => {
      const clean = email.trim().toLowerCase()
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
        return { ok: false, error: 'Check the highlighted field.', fields: { email: 'Enter a valid email address.' } }
      }
      if (!password) {
        return { ok: false, error: 'Check the highlighted field.', fields: { password: 'Enter your password.' } }
      }

      try {
        const result = await apiRequest<{ token: string; user: ApiUser }>('/auth/login', {
          method: 'POST',
          body: { email: clean, password },
        })
        setToken(result.token)
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
      const fullName = profile.name.trim()
      const clean = profile.email.trim().toLowerCase()
      if (fullName.length < 2) {
        return { ok: false, error: 'Check the highlighted field.', fields: { fullName: 'Enter your full name.' } }
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
        const result = await apiRequest<{ token: string; user: ApiUser }>('/auth/register', {
          method: 'POST',
          body: { fullName, email: clean, password },
        })
        setToken(result.token)
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
    setToken(null)
    setUser(null)
    setAuthReady(true)
    notify('Signed out. Your trips and saved places remain on this device.')
  }, [notify])

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const toggleWishlist = useCallback(
    (slug: string) => {
      if (!user) {
        const next = typeof window === 'undefined' ? '/explore' : window.location.pathname
        openAuth('Sign in to save destinations to your wishlist. We will keep this one ready for you.', next, slug)
        return
      }
      setWishlist((prev) => {
        const exists = prev.includes(slug)
        notify(exists ? 'Removed from your wishlist.' : 'Saved to your wishlist.')
        return exists ? prev.filter((item) => item !== slug) : [...prev, slug]
      })
    },
    [notify, openAuth, user],
  )

  const saveTrip = useCallback((plan: TripPlan) => {
    setTrips((prev) => {
      const exists = prev.some((trip) => trip.id === plan.id)
      return exists ? prev.map((trip) => (trip.id === plan.id ? plan : trip)) : [plan, ...prev]
    })
  }, [])

  const updateTrip = useCallback((plan: TripPlan) => {
    setTrips((prev) => prev.map((trip) => (trip.id === plan.id ? plan : trip)))
  }, [])

  const deleteTrip = useCallback(
    (id: string) => {
      setTrips((prev) => prev.filter((trip) => trip.id !== id))
      notify('Itinerary deleted.')
    },
    [notify],
  )

  const duplicateTrip = useCallback(
    (id: string) => {
      setTrips((prev) => {
        const source = prev.find((trip) => trip.id === id)
        if (!source) return prev
        const copy: TripPlan = {
          ...source,
          id: `trip_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          createdAt: new Date().toISOString(),
          status: 'draft',
          title: `${source.title} (copy)`,
        }
        return [copy, ...prev]
      })
      notify('Itinerary duplicated as a draft.')
    },
    [notify],
  )

  const setTripStatus = useCallback(
    (id: string, status: PlanStage) => {
      setTrips((prev) => prev.map((trip) => (trip.id === id ? { ...trip, status } : trip)))
      notify(
        status === 'completed'
          ? 'Trip marked completed. It is now in your travel history.'
          : status === 'upcoming'
            ? 'Trip confirmed. You will find it under Upcoming.'
            : 'Moved back to drafts.',
      )
    },
    [notify],
  )

  const reviews = useMemo(() => [...userReviews, ...SEED_REVIEWS], [userReviews])

  const addReview = useCallback(
    (review: Omit<Review, 'id' | 'helpful' | 'verified'>) => {
      const next: Review = {
        ...review,
        id: `review_${Date.now().toString(36)}`,
        helpful: 0,
        verified: false,
      }
      setUserReviews((prev) => [next, ...prev])
      notify('Review published. It is labelled as a community review.')
    },
    [notify],
  )

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
    token,
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
    trips,
    saveTrip,
    updateTrip,
    deleteTrip,
    duplicateTrip,
    setTripStatus,
    reviews,
    addReview,
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
