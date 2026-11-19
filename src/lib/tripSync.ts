import type { ApiItinerary } from './api'
import { addDays } from './format'
import type { PlanStage, TripBlock, TripDay, TripPlan } from '../types'

const STATUS: Record<string, PlanStage> = {
  draft: 'draft',
  upcoming: 'upcoming',
  completed: 'completed',
}

const SLOTS: TripBlock['time'][] = ['Morning', 'Afternoon', 'Evening']

function isoDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10)
}

function timeSlot(value: string): TripBlock['time'] {
  return SLOTS.find((slot) => slot.toLowerCase() === value.trim().toLowerCase()) ?? 'Morning'
}

function clip(value: string, max: number): string {
  return value.trim().slice(0, max)
}

/**
 * Maps the rich client TripPlan onto the API contract. Fields with relational
 * homes (title, dates, travellers, budget, status, days and stops) go into
 * columns; everything else rides along in the `clientPlan` JSON blob.
 */
export function planToItineraryBody(plan: TripPlan) {
  return {
    destinationSlug: plan.destinationSlug,
    title: clip(plan.title || 'Nepal itinerary', 140),
    startingPoint: clip(plan.originId, 140),
    startDate: plan.startDate,
    endDate: addDays(plan.startDate, Math.max(1, plan.days) - 1),
    numTravelers: plan.travelers,
    totalBudget: plan.budget,
    status: plan.status,
    clientPlan: JSON.stringify(plan),
    days: plan.itinerary.slice(0, 60).map((day) => ({
      dayNumber: Math.max(1, day.index),
      dayDate: day.date,
      notes: day.subtitle ? clip(day.subtitle, 4000) : null,
      stops: day.blocks.slice(0, 50).map((block, index) => ({
        timeSlot: clip(block.time, 40),
        title: clip(block.title || 'Stop', 140),
        description: block.note ? clip(block.note, 2000) : null,
        estimatedCost: Math.max(0, Math.round(block.cost ?? 0)),
        sortOrder: index,
      })),
    })),
  }
}

function parseClientPlan(raw: string | null): TripPlan | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<TripPlan> | null
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.id || !parsed.destinationSlug || !Array.isArray(parsed.itinerary)) return null
    return parsed as TripPlan
  } catch {
    return null
  }
}

const EMPTY_ROUTE: TripPlan['route'] = {
  type: 'scenic',
  label: 'Saved route',
  headline: 'Stored on your account',
  distanceKm: 0,
  hours: 0,
  costPerPerson: 0,
  mode: 'mixed',
  roads: [],
  stops: [],
  tradeoff: '',
}

/** Last-resort plan for records with no client blob (e.g. written by another tool). */
function fallbackPlan(server: ApiItinerary): TripPlan {
  const startDate = isoDate(server.startDate) ?? isoDate(server.createdAt) ?? new Date().toISOString().slice(0, 10)
  const itinerary: TripDay[] = server.days
    .slice()
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .map((day) => ({
      index: day.dayNumber,
      date: isoDate(day.dayDate) ?? startDate,
      title: day.notes ? clip(day.notes, 80) : `Day ${day.dayNumber}`,
      subtitle: day.notes ?? '',
      type: 'explore' as const,
      blocks: day.stops.map((stop) => ({
        time: timeSlot(stop.timeSlot),
        title: stop.title,
        note: stop.description ?? undefined,
        cost: stop.estimatedCost ?? 0,
        kind: 'stop' as const,
      })),
    }))

  return {
    id: `trip_${server.id}`,
    createdAt: isoDate(server.createdAt) ?? new Date().toISOString(),
    destinationSlug: server.destination.slug,
    originId: server.startingPoint ?? 'kathmandu',
    startDate,
    days: Math.max(1, itinerary.length),
    travelers: server.numTravelers || 1,
    budget: server.totalBudget ?? 0,
    style: 'mixed',
    pace: 'balanced',
    transport: 'mixed',
    accommodation: 'mid',
    interests: [],
    routeType: 'scenic',
    route: EMPTY_ROUTE,
    itinerary,
    costs: {
      lines: [],
      perPerson: 0,
      group: 0,
      budget: server.totalBudget ?? 0,
      remaining: server.totalBudget ?? 0,
      contingency: 0,
      verdict: 'on-track',
    },
    packing: [],
    notes: [],
    status: STATUS[server.status] ?? 'draft',
    title: server.title,
  }
}

/** Server record → local TripPlan. The blob keeps the rich plan; columns win for scalars. */
export function serverItineraryToPlan(
  server: ApiItinerary,
  existing?: TripPlan,
  ownerId?: string,
): TripPlan {
  const base = parseClientPlan(server.clientPlan) ?? existing ?? fallbackPlan(server)

  return {
    ...base,
    id: existing?.id ?? base.id,
    createdAt: base.createdAt || server.createdAt,
    destinationSlug: base.destinationSlug || server.destination.slug,
    title: server.title || base.title,
    status: STATUS[server.status] ?? base.status,
    startDate: isoDate(server.startDate) ?? base.startDate,
    travelers: server.numTravelers || base.travelers,
    budget: server.totalBudget ?? base.budget,
    serverId: server.id,
    ownerId: existing?.ownerId ?? ownerId,
    syncState: 'synced',
  }
}

/**
 * Server trips win on identity. Local-only trips are kept so they can be pushed;
 * trips another account owns are kept on the device instead of being dropped.
 */
export function mergeRemoteTrips(
  local: TripPlan[],
  remote: ApiItinerary[],
  currentUserId?: string,
): TripPlan[] {
  const localByServerId = new Map<string, TripPlan>()
  for (const trip of local) {
    if (trip.serverId) localByServerId.set(trip.serverId, trip)
  }

  const synced = remote.map((item) => serverItineraryToPlan(item, localByServerId.get(item.id), currentUserId))
  const remoteIds = new Set(remote.map((item) => item.id))

  const kept = local.filter((trip) => {
    if (!trip.serverId) return true
    if (remoteIds.has(trip.serverId)) return false
    return Boolean(currentUserId && trip.ownerId && trip.ownerId !== currentUserId)
  })

  return [...synced, ...kept].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}
