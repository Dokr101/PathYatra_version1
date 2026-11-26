import type { Accommodation, CostBreakdown, RouteType, TripDay, TripPlan } from '../types'
import { MY_LOCATION_ID } from './geolocation'

export interface SharedPlan {
  v: 1
  title: string
  destinationSlug: string
  originId: string
  originLabel?: string
  originLat?: number
  originLng?: number
  startDate: string
  days: number
  travelers: number
  budget: number
  routeType: RouteType
  accommodation: Accommodation
  itinerary: TripDay[]
  costs: Pick<CostBreakdown, 'perPerson' | 'group' | 'budget' | 'remaining' | 'verdict'>
  notes: string[]
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodePlan(plan: TripPlan): string {
  const shared: SharedPlan = {
    v: 1,
    title: plan.title,
    destinationSlug: plan.destinationSlug,
    originId: plan.originId,
    ...(plan.originId === MY_LOCATION_ID
      ? { originLabel: plan.originLabel, originLat: plan.originLat, originLng: plan.originLng }
      : {}),
    startDate: plan.startDate,
    days: plan.days,
    travelers: plan.travelers,
    budget: plan.budget,
    routeType: plan.routeType,
    accommodation: plan.accommodation,
    itinerary: plan.itinerary,
    costs: {
      perPerson: plan.costs.perPerson,
      group: plan.costs.group,
      budget: plan.costs.budget,
      remaining: plan.costs.remaining,
      verdict: plan.costs.verdict,
    },
    notes: plan.notes,
  }
  return toBase64Url(JSON.stringify(shared))
}

export function decodePlan(token: string): SharedPlan | null {
  try {
    const parsed = JSON.parse(fromBase64Url(token)) as SharedPlan
    if (parsed.v !== 1 || !parsed.destinationSlug || !Array.isArray(parsed.itinerary)) return null
    return parsed
  } catch {
    return null
  }
}

export function shareLink(plan: TripPlan): string {
  const token = encodePlan(plan)
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  return `${origin}/shared#${token}`
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}
