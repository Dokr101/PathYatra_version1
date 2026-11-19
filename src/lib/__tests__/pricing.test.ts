import { describe, expect, it } from 'vitest'
import type { Destination, RouteOption } from '../../types'
import { buildCostBreakdown, estimateNights, repricePlan } from '../pricing'

/**
 * The budget planner is pure arithmetic with a few load-bearing constants:
 * nightly rates per band, the 4,800/day baseline that scales local costs, and
 * the 4,500/day fallback used when the API has no cost for a destination.
 * These tests pin the numbers, so a refactor that changes a rounding step or a
 * multiplier fails here instead of quietly misquoting travellers.
 */

const destination = (overrides: Partial<Destination> = {}): Destination => ({
  slug: 'test-place',
  name: 'Test Place',
  province: 'Bagmati',
  district: 'Kathmandu',
  category: 'adventure',
  tagline: '',
  summary: '',
  overview: [],
  history: '',
  highlights: [],
  activities: [],
  food: [],
  essentials: [],
  bestMonths: [3, 10],
  difficulty: 'Moderate',
  minDays: 2,
  maxDays: 10,
  costPerDay: 4800,
  lat: 27.7,
  lng: 85.3,
  scene: { kind: 'peaks', sky: 'clear', seed: 1 },
  enRoute: [],
  nearby: [],
  ...overrides,
})

const route = (overrides: Partial<RouteOption> = {}): RouteOption => ({
  type: 'scenic',
  label: 'Scenic',
  headline: '',
  distanceKm: 200,
  hours: 6,
  costPerPerson: 1500,
  mode: 'Bus',
  roads: [],
  stops: [],
  tradeoff: '',
  ...overrides,
})

const baseInput = {
  destination: destination(),
  days: 4,
  travelers: 2,
  route: route(),
  activitySpend: 2000,
  budget: 200_000,
} as const

const linePerPerson = (build: ReturnType<typeof buildCostBreakdown>, key: string) =>
  build.lines.find((line) => line.key === key)?.perPerson

describe('estimateNights', () => {
  it('counts nights as days minus one, never less than one', () => {
    expect(estimateNights(1)).toBe(1)
    expect(estimateNights(2)).toBe(1)
    expect(estimateNights(5)).toBe(4)
  })
})

describe('buildCostBreakdown bands', () => {
  it('prices a budget trip at the 4,800/day baseline', () => {
    const breakdown = buildCostBreakdown({ ...baseInput, accommodation: 'budget' })

    expect(linePerPerson(breakdown, 'transport')).toBe(3000) // 1,500 each way × 2 people are per person: ×2
    expect(linePerPerson(breakdown, 'accommodation')).toBe(3600) // 3 nights × 1,200 × scale 1
    expect(linePerPerson(breakdown, 'food')).toBe(3600) // 4 days × 900
    expect(linePerPerson(breakdown, 'activities')).toBe(4304) // 2,000 + 4,800 × 0.12 × 4
    expect(linePerPerson(breakdown, 'permits')).toBe(0)

    expect(linePerPerson(breakdown, 'misc')).toBe(725) // 5% of 14,504
    expect(breakdown.contingency).toBe(1218) // 8% of 15,229
    expect(breakdown.perPerson).toBe(16_447)
    expect(breakdown.group).toBe(32_894)
    expect(breakdown.remaining).toBe(167_106)
    expect(breakdown.verdict).toBe('comfortable')
  })

  it('prices a mid-range trip higher than budget and lower than comfort', () => {
    const budget = buildCostBreakdown({ ...baseInput, accommodation: 'budget' })
    const mid = buildCostBreakdown({ ...baseInput, accommodation: 'mid' })
    const comfort = buildCostBreakdown({ ...baseInput, accommodation: 'comfort' })

    expect(budget.perPerson).toBeLessThan(mid.perPerson)
    expect(mid.perPerson).toBeLessThan(comfort.perPerson)

    expect(linePerPerson(mid, 'accommodation')).toBe(10_500) // 3 nights × 3,500
    expect(linePerPerson(mid, 'food')).toBe(6400) // 4 days × 1,600
    expect(mid.perPerson).toBe(27_447)

    expect(linePerPerson(comfort, 'accommodation')).toBe(27_000) // 3 nights × 9,000
    expect(linePerPerson(comfort, 'food')).toBe(11_200) // 4 days × 2,800
    expect(comfort.perPerson).toBe(51_601)
  })

  it('scales local costs from the 4,800/day baseline and clamps at 0.8× and 1.9×', () => {
    const baseline = buildCostBreakdown({ ...baseInput, accommodation: 'budget' })
    expect(linePerPerson(baseline, 'accommodation')).toBe(3600)

    const cheap = buildCostBreakdown({
      ...baseInput,
      destination: destination({ costPerDay: 1000 }),
      accommodation: 'budget',
    })
    expect(linePerPerson(cheap, 'accommodation')).toBe(2880) // 3,600 × 0.8 floor
    expect(linePerPerson(cheap, 'food')).toBe(3348) // 3,600 × (0.65 + 0.35 × 0.8)
    expect(cheap.perPerson).toBe(13_276)

    const expensive = buildCostBreakdown({
      ...baseInput,
      destination: destination({ costPerDay: 10_000 }),
      accommodation: 'budget',
    })
    expect(linePerPerson(expensive, 'accommodation')).toBe(6840) // 3,600 × 1.9 ceiling
    expect(expensive.perPerson).toBe(24_238)
  })

  it('treats the 4,500/day API fallback as 0.9375× of the baseline', () => {
    const breakdown = buildCostBreakdown({
      ...baseInput,
      destination: destination({ costPerDay: 4500 }),
      accommodation: 'budget',
    })

    expect(linePerPerson(breakdown, 'accommodation')).toBe(3375) // 3,600 × 0.9375
    expect(linePerPerson(breakdown, 'food')).toBe(3521) // 3,600 × 0.978125
    expect(breakdown.perPerson).toBe(15_940)
  })

  it('adds a permit line only when the destination has one', () => {
    const withPermit = buildCostBreakdown({
      ...baseInput,
      accommodation: 'budget',
      destination: destination({ permit: { name: 'TIMS', cost: 2000 } }),
    })
    expect(linePerPerson(withPermit, 'permits')).toBe(2000)

    // 2,000 per person flows through misc (5%) and contingency (8%), then × 2 travellers.
    // subtotal 16,504 → misc 825 → before 17,329 → contingency 1,386 → per person 18,715.
    expect(withPermit.perPerson).toBe(18_715)
    expect(withPermit.group).toBe(37_430)
    expect(withPermit.group - buildCostBreakdown({ ...baseInput, accommodation: 'budget' }).group).toBe(4536)
  })
})

describe('verdict bands', () => {
  it('classifies the budget ratio against the 75% / 100% / 115% thresholds', () => {
    const base = buildCostBreakdown({ ...baseInput, accommodation: 'mid' })
    const spend = (budget: number) =>
      buildCostBreakdown({ ...baseInput, accommodation: 'mid', budget }).verdict

    expect(spend(Math.ceil(base.group / 0.75))).toBe('comfortable')
    expect(spend(base.group)).toBe('on-track')
    expect(spend(Math.floor(base.group * 0.9))).toBe('tight')
    expect(spend(Math.floor(base.group * 0.7))).toBe('over')
  })
})

describe('repricePlan', () => {
  it('is the same calculation as buildCostBreakdown', () => {
    const direct = buildCostBreakdown({ ...baseInput, accommodation: 'mid' })
    const repriced = repricePlan(
      baseInput.destination,
      baseInput.days,
      baseInput.travelers,
      'mid',
      baseInput.route,
      baseInput.activitySpend,
      baseInput.budget,
    )

    expect(repriced).toEqual(direct)
  })
})
