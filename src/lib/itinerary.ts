import type {
  Accommodation,
  Destination,
  Origin,
  Pace,
  RouteOption,
  RouteType,
  TravelStyle,
  Transport,
  TripBlock,
  TripDay,
  TripPlan,
} from '../types'
import { addDays, formatDate, monthIndex, shortName, todayISO } from './format'
import { buildRouteOptions, hoursLabel } from './route'
import { buildCostBreakdown } from './pricing'
import { MONTHS, SEASONS } from '../data/taxonomy'

export interface PlanDraft {
  destination: Destination
  origin: Origin
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
}

export interface CatalogItem {
  id: string
  title: string
  note?: string
  cost: number
  kind: TripBlock['kind']
}

const KEYWORD_COST: Array<[RegExp, number]> = [
  [/paraglid|bungee|rafting|zip-?lin|flight|skydiving|dolphin/i, 9000],
  [/safari|jeep/i, 4500],
  [/trek|hike|ascent|climb|pass|glacier|cave/i, 2500],
  [/boat|canoe|kayak|cycle|biking/i, 1200],
  [/museum|monastery|temple|palace|heritage|durbar|gompa|stupa/i, 500],
  [/food|dinner|lunch|breakfast|coffee|bakery|tea|curd|thali/i, 800],
  [/walk|stroll|market|bazaar|sunset|sunrise|viewpoint|garden|lake/i, 300],
]

function activityCost(title: string): number {
  for (const [pattern, cost] of KEYWORD_COST) {
    if (pattern.test(title)) return cost
  }
  return 900
}

const GENERIC_INTERESTS: Record<string, { title: string; note: string; cost: number }> = {
  viewpoints: { title: 'Golden-hour viewpoint drive', note: 'Ask locally for the clearest west-facing ridge.', cost: 900 },
  food: { title: 'Local food walk', note: 'Two or three family-run kitchens rather than one restaurant.', cost: 1200 },
  trekking: { title: 'Half-day trail from the village', note: 'A there-and-back route with a teahouse at the turn.', cost: 800 },
  'adventure-sports': { title: 'Adventure activity slot', note: 'Confirm operator licensing and insurance before paying.', cost: 7500 },
  culture: { title: 'Guided heritage walk', note: 'A licensed local guide changes what you notice.', cost: 1800 },
  photography: { title: 'Blue-hour photo walk', note: 'Tripod, warm layer, and a torch for the walk back.', cost: 0 },
  wildlife: { title: 'Guided nature walk', note: 'Early start, neutral colours, and a local naturalist.', cost: 2200 },
  shopping: { title: 'Craft and market browsing', note: 'Buy directly from makers where you can.', cost: 500 },
}

export function activityCatalog(destination: Destination, route?: RouteOption): CatalogItem[] {
  const items: CatalogItem[] = []
  const seen = new Set<string>()
  const push = (item: CatalogItem) => {
    const key = item.title.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    items.push(item)
  }

  destination.activities.forEach((title, index) => {
    push({ id: `act-${index}`, title, cost: activityCost(title), kind: 'activity' })
  })
  destination.highlights.forEach((title, index) => {
    push({ id: `hl-${index}`, title, note: 'A highlight worth building the day around.', cost: 0, kind: 'stop' })
  })
  ;(route?.stops ?? destination.enRoute).forEach((stop, index) => {
    push({ id: `stop-${index}`, title: stop.name, note: stop.note, cost: stop.cost, kind: 'stop' })
  })
  Object.entries(GENERIC_INTERESTS).forEach(([key, item]) => {
    push({ id: `int-${key}`, title: item.title, note: item.note, cost: item.cost, kind: 'activity' })
  })
  return items
}

const DAY_THEMES: Record<string, string[]> = {
  adventure: ['Acclimatise and wander', 'On the trail', 'The high point', 'Village day', 'Rest and repair'],
  sacred: ['Temples at first light', 'Old city lanes', 'Pilgrimage circuit', 'Craft and food', 'Quiet courtyards'],
  lakes: ['Still water morning', 'Ridge and viewpoint', 'A slow afternoon', 'Boats and cafés', 'Hills above the lake'],
  wildlife: ['Dawn in the grass', 'River and jungle', 'Village evening', 'Grassland birds', 'Tracks and signs'],
}

const PACE_BLOCKS: Record<Pace, number> = { relaxed: 2, balanced: 3, packed: 4 }
const TIMES: TripBlock['time'][] = ['Morning', 'Afternoon', 'Evening']

function stayFor(destination: Destination, accommodation: Accommodation): string {
  if (accommodation === 'comfort') return `Best available stay in ${destination.district}`
  if (accommodation === 'budget') {
    if ((destination.altitude ?? 0) > 2500) return 'Teahouse, shared bathroom'
    if (destination.category === 'wildlife') return 'Community homestay'
    return 'Family guesthouse'
  }
  if ((destination.altitude ?? 0) > 2500) return 'Teahouse with attached bathroom where available'
  if (destination.category === 'wildlife') return 'Jungle lodge near the park boundary'
  if (destination.category === 'sacred') return 'Heritage guesthouse in the old quarter'
  if (destination.category === 'lakes') return 'Lakeside guesthouse'
  return 'Comfortable local hotel'
}

function mealsFor(destination: Destination, dayIndex: number): string {
  const foods = destination.food
  if (!foods.length) return 'Local dal bhat and seasonal vegetables'
  return `Try ${foods[dayIndex % foods.length]} and ${foods[(dayIndex + 2) % foods.length]}`
}

function isLocalTrip(origin: Origin, destination: Destination): boolean {
  return origin.district.toLowerCase() === destination.district.toLowerCase()
}

function buildTravelBlocks(destination: Destination, origin: Origin, route: RouteOption): TripBlock[] {
  return [
    {
      time: 'Morning',
      title: `Depart ${origin.name} for ${shortName(destination.name)}`,
      note: `${route.distanceKm} km · about ${hoursLabel(route.hours)} · ${route.mode}`,
      cost: 0,
      kind: 'travel',
    },
    {
      time: 'Afternoon',
      title: route.stops.length ? `Stop at ${route.stops[0].name}` : `Arrive and check in`,
      note: route.stops.length
        ? route.stops[0].note
        : 'Set a slow first evening. Altitude and traffic both reward a gentle start.',
      cost: route.stops.length ? route.stops[0].cost : 0,
      kind: 'stop',
    },
    {
      time: 'Evening',
      title: destination.category === 'lakes' ? 'Lakeside walk and early dinner' : 'Settle in and eat local',
      cost: 500,
      kind: 'meal',
    },
  ]
}

function buildExploreBlocks(
  // Kept in the signature for symmetry with the other builders; this one never
  // reads it, the caller's catalog already carries the destination's activities.
  _destination: Destination,
  catalog: CatalogItem[],
  dayIndex: number,
  pace: Pace,
  offset: number,
): TripBlock[] {
  const count = PACE_BLOCKS[pace]
  const blocks: TripBlock[] = []
  for (let slot = 0; slot < count; slot += 1) {
    const cursor = (offset + dayIndex * count + slot) % catalog.length
    const item = catalog[cursor]
    blocks.push({
      time: TIMES[Math.min(slot, 2)],
      title: item.title,
      note: item.note,
      cost: item.cost,
      kind: item.kind,
    })
  }
  return blocks
}

export function generateTrip(draft: PlanDraft): TripPlan {
  const { destination, origin, days, travelers, budget, pace, accommodation, transport, routeType } = draft
  const route = buildRouteOptions(destination, origin, travelers, transport).find((r) => r.type === routeType)!
  const catalog = activityCatalog(destination, route)
  const local = isLocalTrip(origin, destination)
  const themes = DAY_THEMES[destination.category] ?? DAY_THEMES.sacred
  const highAltitude = (destination.altitude ?? 0) >= 3000
  const expedition = destination.difficulty === 'Challenging' || destination.difficulty === 'Difficult'

  const itinerary: TripDay[] = []
  let activityOffset = 0

  for (let i = 0; i < days; i += 1) {
    const date = addDays(draft.startDate || todayISO(), i)
    const isFirst = i === 0
    const isLast = i === days - 1
    const alt = destination.altitude
      ? Math.round(destination.altitude * (0.45 + 0.55 * (i / Math.max(1, days - 1))))
      : undefined

    if (isFirst && !local) {
      itinerary.push({
        index: i + 1,
        date,
        title: `${origin.name} → ${shortName(destination.name)}`,
        subtitle: route.label,
        type: 'travel',
        altitude: alt,
        blocks: buildTravelBlocks(destination, origin, route),
        stay: stayFor(destination, accommodation),
        meals: mealsFor(destination, i),
      })
      continue
    }

    if (expedition && i === 2 && days >= 5) {
      const safeItem = catalog[(activityOffset + 2) % catalog.length]
      itinerary.push({
        index: i + 1,
        date,
        title: 'Acclimatise and hold altitude',
        subtitle: 'A planned rest day is part of the route, not a delay',
        type: 'rest',
        altitude: alt,
        blocks: [
          {
            time: 'Morning',
            title: 'Short acclimatisation walk, then rest',
            note: 'Climb high, sleep low. Drink more water than feels necessary.',
            cost: 0,
            kind: 'rest',
          },
          {
            time: 'Afternoon',
            title: safeItem.title,
            note: safeItem.note ?? 'Keep it gentle and stay warm.',
            cost: safeItem.cost,
            kind: safeItem.kind,
          },
          {
            time: 'Evening',
            title: 'Early dinner and gear check',
            cost: 400,
            kind: 'meal',
          },
        ],
        stay: stayFor(destination, accommodation),
        meals: mealsFor(destination, i),
      })
      activityOffset += 2
      continue
    }

    if (isLast && !local && days >= 3) {
      const usedTitles = new Set(itinerary.flatMap((day) => day.blocks.map((block) => block.title)))
      const lightOption = catalog.find(
        (entry, index) =>
          index >= activityOffset % catalog.length && entry.cost <= 1200 && !usedTitles.has(entry.title),
      )
      const item = lightOption ?? catalog[activityOffset % catalog.length]
      itinerary.push({
        index: i + 1,
        date,
        title: 'Last morning, then homeward',
        subtitle: 'Leave enough daylight for the drive back',
        type: 'return',
        altitude: alt,
        blocks: [
          {
            time: 'Morning',
            title: item.title,
            note: item.note ?? 'One last thing before you pack.',
            cost: item.cost,
            kind: item.kind,
          },
          {
            time: 'Afternoon',
            title: `Return towards ${origin.name}`,
            note: `${route.distanceKm} km · about ${hoursLabel(route.hours)} on the same corridor`,
            cost: 0,
            kind: 'travel',
          },
        ],
        meals: mealsFor(destination, i),
      })
      activityOffset += 1
      continue
    }

    itinerary.push({
      index: i + 1,
      date,
      title: themes[(i + (local ? 1 : 0)) % themes.length],
      subtitle: local ? `${formatDate(date)} · ${destination.district}` : 'A full day without a long transfer',
      type: highAltitude ? 'trek' : 'explore',
      altitude: alt,
      blocks: buildExploreBlocks(destination, catalog, i, pace, activityOffset),
      stay: stayFor(destination, accommodation),
      meals: mealsFor(destination, i),
    })
    activityOffset += PACE_BLOCKS[pace]
  }

  const activitySpend = itinerary.reduce(
    (sum, day) => sum + day.blocks.filter((b) => b.kind !== 'travel').reduce((s, b) => s + b.cost, 0),
    0,
  )

  const costs = buildCostBreakdown({
    destination,
    days,
    travelers,
    accommodation,
    route,
    activitySpend,
    budget,
  })

  const travelMonth = monthIndex(draft.startDate || todayISO())
  const notes: string[] = []
  const season = SEASONS.find((s) => s.months.includes(travelMonth))
  if (season) notes.push(`${season.label}: ${season.note}`)
  if (!destination.bestMonths.includes(travelMonth)) {
    notes.push(`${MONTHS[travelMonth - 1]} sits outside the recommended window for this destination. Expect a real trade-off in weather or access.`)
  }
  if (highAltitude) {
    notes.push('Above 3,000 m, plan one acclimatisation day for roughly every 1,000 m of additional height and watch for headaches, nausea or breathlessness at rest.')
  }
  if (destination.permit) {
    notes.push(`${destination.permit.name}${destination.permit.note ? ` — ${destination.permit.note}` : ''}. Carry printed copies and check current fees locally.`)
  }
  notes.push('Distances, drive times and costs are planning estimates, not live traffic, road-closure or booking data. Verify road conditions and prices before you commit.')

  return {
    id: `trip_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    destinationSlug: destination.slug,
    originId: origin.id,
    startDate: draft.startDate || todayISO(),
    days,
    travelers,
    budget,
    style: draft.style,
    pace,
    transport,
    accommodation,
    interests: draft.interests,
    routeType,
    route,
    itinerary,
    costs,
    packing: packingList(destination, draft, travelMonth),
    notes,
    status: 'draft',
    title: `${shortName(destination.name)} · ${days} ${days === 1 ? 'day' : 'days'}`,
  }
}

export function packingList(destination: Destination, draft: PlanDraft, month: number): string[] {
  const altitude = destination.altitude ?? 0
  const items = new Set<string>([
    'Daypack with a rain cover',
    'Reusable water bottle or filter',
    'Sunscreen and sunglasses',
    'Small first-aid kit and personal medicine',
    'Power bank and charger',
    'Headtorch',
    'Printed copies of permits, insurance and bookings',
    'Enough cash for the whole route',
  ])
  if (altitude > 2000) {
    items.add('Warm fleece or down jacket')
    items.add('Thermal base layer')
    items.add('Wool hat and gloves')
  }
  if (altitude > 3500) {
    items.add('Four-season sleeping bag')
    items.add('Insulated mat or sleeping bag liner')
    items.add('Altitude medication only if prescribed')
  }
  if ([6, 7, 8, 9].includes(month)) {
    items.add('Proper rain shell and dry bag')
    items.add('Insect repellent')
    items.add('Quick-dry trousers')
  }
  if ([12, 1, 2].includes(month)) {
    items.add('Insulated jacket')
    items.add('Microspikes for icy trail sections')
    items.add('Extra wool socks')
  }
  if (destination.category === 'sacred') {
    items.add('Modest clothing that covers shoulders and knees')
    items.add('Shoes you can slip off easily')
  }
  if (destination.category === 'wildlife') {
    items.add('Neutral-coloured long sleeves')
    items.add('Binoculars')
    items.add('Insect repellent for dawn and dusk')
  }
  if (destination.category === 'adventure' || draft.style === 'adventure') {
    items.add('Broken-in trekking boots')
    items.add('Trekking poles')
  }
  if (destination.category === 'lakes' && altitude < 1500) {
    items.add('Quick-dry towel and swimwear')
  }
  if (draft.interests.includes('photography')) {
    items.add('Camera, spare battery and memory card')
  }
  if (draft.pace === 'packed') {
    items.add('A second pair of walking shoes')
  }
  return [...items]
}

export function regenerateDay(
  plan: TripPlan,
  destination: Destination,
  dayIndex: number,
  seed: number,
): TripPlan {
  const day = plan.itinerary[dayIndex]
  if (!day || day.type === 'travel' || day.type === 'return') return plan

  const catalog = activityCatalog(destination, plan.route)
  if (!catalog.length) return plan

  const count = PACE_BLOCKS[plan.pace]
  const blocks: TripBlock[] = []
  for (let slot = 0; slot < count; slot += 1) {
    const item = catalog[(seed * 3 + slot) % catalog.length]
    blocks.push({
      time: TIMES[Math.min(slot, 2)],
      title: item.title,
      note: item.note,
      cost: item.cost,
      kind: item.kind,
    })
  }
  const itinerary = plan.itinerary.map((d, i) => (i === dayIndex ? { ...d, blocks } : d))
  return recalculatePlan({ ...plan, itinerary }, destination)
}

export function addStop(plan: TripPlan, destination: Destination, dayIndex: number, item: CatalogItem): TripPlan {
  const itinerary = plan.itinerary.map((day, index) => {
    if (index !== dayIndex) return day
    const slot = TIMES[day.blocks.length % 3]
    return {
      ...day,
      blocks: [...day.blocks, { time: slot, title: item.title, note: item.note, cost: item.cost, kind: item.kind }],
    }
  })
  return recalculatePlan({ ...plan, itinerary }, destination)
}

export function removeBlock(plan: TripPlan, destination: Destination, dayIndex: number, blockIndex: number): TripPlan {
  const itinerary = plan.itinerary.map((day, index) => {
    if (index !== dayIndex) return day
    return { ...day, blocks: day.blocks.filter((_, b) => b !== blockIndex) }
  })
  return recalculatePlan({ ...plan, itinerary }, destination)
}

export function updateBlock(plan: TripPlan, destination: Destination, dayIndex: number, blockIndex: number, title: string): TripPlan {
  const itinerary = plan.itinerary.map((day, index) => {
    if (index !== dayIndex) return day
    return {
      ...day,
      blocks: day.blocks.map((block, b) => (b === blockIndex ? { ...block, title } : block)),
    }
  })
  return recalculatePlan({ ...plan, itinerary }, destination)
}

export function recalculatePlan(plan: TripPlan, destination: Destination): TripPlan {
  const activitySpend = plan.itinerary.reduce(
    (sum, day) => sum + day.blocks.filter((b) => b.kind !== 'travel').reduce((s, b) => s + b.cost, 0),
    0,
  )
  const costs = buildCostBreakdown({
    destination,
    days: plan.days,
    travelers: plan.travelers,
    accommodation: plan.accommodation,
    route: plan.route,
    activitySpend,
    budget: plan.budget,
  })
  return { ...plan, costs }
}

