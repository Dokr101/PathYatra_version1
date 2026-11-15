import type { Accommodation, CostBreakdown, CostLine, Destination, RouteOption } from '../types'
import { clamp } from './format'

const NIGHTLY: Record<Accommodation, number> = { budget: 1200, mid: 3500, comfort: 9000 }
const FOOD: Record<Accommodation, number> = { budget: 900, mid: 1600, comfort: 2800 }

export interface PricingInput {
  destination: Destination
  days: number
  travelers: number
  accommodation: Accommodation
  route: RouteOption
  activitySpend: number
  budget: number
}

export function estimateNights(days: number): number {
  return Math.max(1, days - 1)
}

export function buildCostBreakdown(input: PricingInput): CostBreakdown {
  const { destination, days, travelers, accommodation, route, activitySpend, budget } = input
  const nights = estimateNights(days)
  const scale = clamp(destination.costPerDay / 4800, 0.8, 1.9)

  const transportPerPerson = Math.round(route.costPerPerson * 2)
  const stayPerPerson = Math.round(nights * NIGHTLY[accommodation] * scale)
  const foodPerPerson = Math.round(days * FOOD[accommodation] * (0.65 + 0.35 * scale))
  const activitiesPerPerson = Math.round(activitySpend + destination.costPerDay * 0.12 * days)
  const permitsPerPerson = destination.permit?.cost ?? 0

  const lines: CostLine[] = [
    {
      key: 'transport',
      label: 'Transportation',
      perPerson: transportPerPerson,
      group: transportPerPerson * travelers,
      detail: `${route.mode} · ${route.distanceKm} km each way`,
    },
    {
      key: 'accommodation',
      label: 'Accommodation',
      perPerson: stayPerPerson,
      group: stayPerPerson * travelers,
      detail: `${nights} ${nights === 1 ? 'night' : 'nights'} · ${accommodation === 'budget' ? 'lodge or homestay' : accommodation === 'mid' ? 'comfortable teahouse or hotel' : 'best available locally'}`,
    },
    {
      key: 'food',
      label: 'Food',
      perPerson: foodPerPerson,
      group: foodPerPerson * travelers,
      detail: `Breakfast, lunch and dinner for ${days} ${days === 1 ? 'day' : 'days'}`,
    },
    {
      key: 'activities',
      label: 'Activities & entry fees',
      perPerson: activitiesPerPerson,
      group: activitiesPerPerson * travelers,
      detail: 'Planned activities, guides and monument entry',
    },
    {
      key: 'permits',
      label: 'Permits',
      perPerson: permitsPerPerson,
      group: permitsPerPerson * travelers,
      detail: destination.permit?.name ?? 'No permit required for this route',
    },
  ]

  const subtotal = lines.reduce((sum, line) => sum + line.perPerson, 0)
  const misc = Math.round(subtotal * 0.05)
  lines.push({
    key: 'misc',
    label: 'Miscellaneous',
    perPerson: misc,
    group: misc * travelers,
    detail: 'Water, snacks, tips and small surprises',
  })

  const beforeContingency = subtotal + misc
  const contingency = Math.round(beforeContingency * 0.08)
  const perPerson = beforeContingency + contingency
  const group = perPerson * travelers
  const remaining = budget - group
  const ratio = budget > 0 ? group / budget : 1

  const verdict: CostBreakdown['verdict'] =
    ratio <= 0.75 ? 'comfortable' : ratio <= 1 ? 'on-track' : ratio <= 1.15 ? 'tight' : 'over'

  return { lines, perPerson, group, budget, remaining, contingency, verdict }
}

export function repricePlan(
  destination: Destination,
  days: number,
  travelers: number,
  accommodation: Accommodation,
  route: RouteOption,
  activitySpend: number,
  budget: number,
): CostBreakdown {
  return buildCostBreakdown({ destination, days, travelers, accommodation, route, activitySpend, budget })
}

export const VERDICT_COPY: Record<CostBreakdown['verdict'], { label: string; note: string }> = {
  comfortable: {
    label: 'Comfortable',
    note: 'Your plan leaves room for upgrades, extra days or a proper buffer.',
  },
  'on-track': {
    label: 'On track',
    note: 'The estimate fits your budget with a small margin.',
  },
  tight: {
    label: 'Tight',
    note: 'This works only if prices hold. Consider one of the adjustments below.',
  },
  over: {
    label: 'Over budget',
    note: 'The estimate exceeds your budget. These changes would close the gap.',
  },
}

export interface SavingTip {
  title: string
  detail: string
  saving: number
}

export function savingTips(
  destination: Destination,
  days: number,
  travelers: number,
  accommodation: Accommodation,
  route: RouteOption,
  budget: number,
  breakdown: CostBreakdown,
): SavingTip[] {
  const tips: SavingTip[] = []
  const scale = clamp(destination.costPerDay / 4800, 0.8, 1.9)

  if (route.type !== 'budget') {
    const bus = Math.max(250, route.distanceKm * 2.4) * 2
    const saving = Math.max(0, Math.round((route.costPerPerson * 2 - bus) * travelers))
    if (saving > 0) {
      tips.push({
        title: 'Switch to public transport',
        detail: 'Buses and shared jeeps cut the biggest single line in the budget. Expect a slower, less flexible journey.',
        saving,
      })
    }
  }

  if (accommodation !== 'budget') {
    const saving = Math.round(estimateNights(days) * (NIGHTLY[accommodation] - NIGHTLY.budget) * scale * travelers)
    tips.push({
      title: 'Stay in lodges and homestays',
      detail: 'Teahouses and family homestays are clean, sociable and roughly a third of the mid-range price.',
      saving,
    })
  }

  const dayTrim = Math.round(breakdown.perPerson * 0.12 * Math.min(2, Math.max(1, days - 1)) * travelers)
  tips.push({
    title: 'Trim one day from the plan',
    detail: 'Removing a day saves accommodation, food and local transport without changing the route.',
    saving: dayTrim,
  })

  return tips.slice(0, 3)
}
