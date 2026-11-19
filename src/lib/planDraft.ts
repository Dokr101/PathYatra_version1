import type { Accommodation, Pace, RouteType, Transport, TravelStyle } from '../types'

/**
 * The four planner steps, kept in sessionStorage so a mid-wizard refresh or a
 * sign-in round trip does not wipe the answers.
 *
 * sessionStorage (not localStorage) is deliberate: the draft belongs to the tab
 * the traveller is planning in, and it should not leak into a shared machine
 * after the tab is closed.
 */
export const PLAN_DRAFT_KEY = 'pathyatra.planDraft'

export interface PlanDraft {
  destinationSlug: string
  originId: string
  startDate: string
  days: number
  travelers: number
  budget: number
  style: TravelStyle
  pace: Pace
  transport: Transport
  accommodation: Accommodation
  interests: string[]
  routeType: RouteType
  step: number
  savedAt?: string
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function loadPlanDraft(): PlanDraft | null {
  const store = storage()
  if (!store) return null
  try {
    const raw = store.getItem(PLAN_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PlanDraft>
    if (!parsed || typeof parsed.destinationSlug !== 'string' || parsed.destinationSlug === '') return null
    return {
      ...(parsed as PlanDraft),
      interests: Array.isArray(parsed.interests) ? parsed.interests.filter((item) => typeof item === 'string') : [],
      step: typeof parsed.step === 'number' ? Math.min(3, Math.max(0, Math.trunc(parsed.step))) : 0,
    }
  } catch {
    return null
  }
}

export function savePlanDraft(draft: PlanDraft): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(PLAN_DRAFT_KEY, JSON.stringify({ ...draft, savedAt: new Date().toISOString() }))
  } catch {
    // Private mode or a full quota: the wizard still works, it just will not survive a refresh.
  }
}
