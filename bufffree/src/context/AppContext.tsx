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
import { loadJSON, saveJSON } from '../lib/storage'

export interface User {
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
  signIn: (email: string, password: string, name?: string) => { ok: boolean; error?: string }
  signUp: (user: User, password: string) => { ok: boolean; error?: string }
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

function nameFromEmail(email: string): string {
  const base = email.split('@')[0] ?? 'Traveller'
  return base
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadJSON<User | null>('user', null))
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

  useEffect(() => saveJSON('user', user), [user])
  useEffect(() => saveJSON('wishlist', wishlist), [wishlist])
  useEffect(() => saveJSON('trips', trips), [trips])
  useEffect(() => saveJSON('reviews', userReviews), [userReviews])
  useEffect(() => saveJSON('votes', votedReviews), [votedReviews])
  useEffect(() => saveJSON('compare', compare), [compare])
  useEffect(() => saveJSON('prefs', prefs), [prefs])
  useEffect(() => saveJSON('checklist', checklist), [checklist])
  useEffect(() => saveJSON('expenses', expenses), [expenses])

  const notify = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

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
    (email: string, password: string, name?: string) => {
      const clean = email.trim().toLowerCase()
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return { ok: false, error: 'Enter a valid email address.' }
      if (password.length < 6) return { ok: false, error: 'Use at least six characters for the password.' }
      setUser((prev) => {
        if (prev && prev.email.toLowerCase() === clean) return prev
        return {
          ...DEFAULT_USER,
          email: clean,
          name: name?.trim() || nameFromEmail(clean),
        }
      })
      applyPending()
      setAuthRequest(null)
      return { ok: true }
    },
    [applyPending],
  )

  const signUp = useCallback(
    (profile: User, password: string) => {
      if (!profile.name.trim()) return { ok: false, error: 'Enter your name.' }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(profile.email.trim())) {
        return { ok: false, error: 'Enter a valid email address.' }
      }
      if (password.length < 6) return { ok: false, error: 'Use at least six characters for the password.' }
      setUser({ ...profile, email: profile.email.trim().toLowerCase() })
      setPrefsState((prev) => ({ ...prev, startPoint: profile.startPoint }))
      applyPending()
      setAuthRequest(null)
      return { ok: true }
    },
    [applyPending],
  )

  const signOut = useCallback(() => {
    setUser(null)
    setWishlist([])
    setTrips([])
    setCompare([])
    setPrefsState(DEFAULT_PREFS)
    setChecklist({})
    setExpenses({})
    notify('Signed out. Your saved trips were removed from this device.')
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
