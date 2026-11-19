import type { Destination, EnRouteStop, Origin, RouteOption, RouteType, Transport } from '../types'
import { hasLocation } from './format'

const EARTH_RADIUS_KM = 6371

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat1 = (aLat * Math.PI) / 180
  const lat2 = (bLat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

const FLIGHT_HUBS: Record<string, { airport: string; minutes: number; fare: number }> = {
  'everest-base-camp': { airport: 'Lukla (LUA)', minutes: 35, fare: 12000 },
  pokhara: { airport: 'Pokhara (PKR)', minutes: 30, fare: 5000 },
  chitwan: { airport: 'Bharatpur (BHR)', minutes: 25, fare: 5500 },
  lumbini: { airport: 'Bhairahawa (BWA)', minutes: 45, fare: 7000 },
  'koshi-tappu': { airport: 'Biratnagar (BIR)', minutes: 50, fare: 8000 },
  janakpur: { airport: 'Janakpur (JKR)', minutes: 40, fare: 6500 },
  bardia: { airport: 'Nepalgunj (KEP)', minutes: 70, fare: 9000 },
  'rara-lake': { airport: 'Talcha (FHR)', minutes: 90, fare: 16000 },
  'shey-phoksundo': { airport: 'Juphal (DOP)', minutes: 80, fare: 15000 },
  'upper-mustang': { airport: 'Jomsom (JMO)', minutes: 25, fare: 9000 },
}

const HIGHWAYS: Record<string, string> = {
  'everest-base-camp': 'Sagarmatha Highway to Salleri, then the Lukla road',
  'annapurna-circuit': 'Prithvi Highway to Dumre, then the Besisahar road',
  'upper-mustang': 'Prithvi Highway to Beni, then the Kali Gandaki road',
  'langtang-valley': 'Pasang Lhamu Highway to Syabrubesi',
  ghandruk: 'Prithvi Highway to Nayapul, then the Kimche road',
  'kathmandu-heritage': 'Ring Road and the valley access roads',
  bhaktapur: 'Araniko Highway',
  lumbini: 'East–West Highway (Mahendra) to Bhairahawa',
  janakpur: 'East–West Highway to Bardibas, then the Janakpur road',
  bandipur: 'Prithvi Highway to Dumre, then the Bandipur climb',
  pokhara: 'Prithvi Highway',
  'rara-lake': 'Karnali Highway to Jumla, then the Mugu road',
  'shey-phoksundo': 'Karnali Highway to Dunai, then the Dolpo road',
  gosaikunda: 'Pasang Lhamu Highway to Dhunche',
  chitwan: 'Prithvi Highway to Mugling, then the Narayanghat road',
  bardia: 'East–West Highway to Ambasa, then the Thakurdwara road',
  'koshi-tappu': 'East–West Highway to Chatara, then the barrage road',
  nagarkot: 'Araniko Highway, then the Nagarkot road',
}

export function roadDistanceKm(origin: Origin, destination: Destination): number {
  // Without coordinates there is no distance to measure. Callers that show route
  // figures check hasLocation() first, so this returns the distance floor rather
  // than a number derived from an imaginary position in the Gulf of Guinea.
  if (!hasLocation(destination)) return 0
  const straight = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng)
  const altitude = destination.altitude ?? 500
  const terrainFactor = altitude > 3000 ? 1.55 : altitude > 1200 ? 1.45 : 1.3
  return Math.round(Math.max(8, straight * terrainFactor))
}

function travelSpeed(destination: Destination): number {
  const altitude = destination.altitude ?? 500
  if (altitude > 3000) return 20
  if (altitude > 1500) return 28
  if (altitude > 500) return 36
  return 45
}

function flightFor(origin: Origin, destination: Destination) {
  const hub = FLIGHT_HUBS[destination.slug]
  if (!hub) return null
  if (origin.id !== 'kathmandu' && origin.id !== 'pokhara' && origin.id !== 'lumbini') return null
  const from = origin.name
  return {
    ...hub,
    label: `${from} → ${hub.airport}`,
    cost: hub.fare,
    hours: hub.minutes / 60 + 0.9,
  }
}

function accessStops(destination: Destination, budgetOnly: boolean): EnRouteStop[] {
  return destination.enRoute.filter((stop) => (budgetOnly ? stop.cost === 0 : true))
}

export function buildRouteOptions(
  destination: Destination,
  origin: Origin,
  travelers: number,
  transport: Transport,
): RouteOption[] {
  const baseKm = roadDistanceKm(origin, destination)
  const speed = travelSpeed(destination)
  const flight = flightFor(origin, destination)
  const highway = HIGHWAYS[destination.slug] ?? `${origin.name} → ${destination.name} road`
  const groupSize = Math.max(1, travelers)

  const privateKm = baseKm
  const publicKm = baseKm
  const scenicKm = Math.round(baseKm * 1.12)

  const privateCost = Math.max(1200, privateKm * 16) / groupSize
  const publicCost = Math.max(250, publicKm * 2.4)
  const bikeCost = Math.max(400, privateKm * 4.2) / Math.min(2, groupSize)

  const preferFlight = Boolean(flight) && (transport === 'private' || transport === 'mixed') && baseKm > 160

  const fastest: RouteOption = preferFlight && flight
    ? {
        type: 'fastest',
        label: 'Fastest route',
        headline: 'Time optimized',
        distanceKm: Math.round(baseKm),
        hours: Number(flight.hours.toFixed(1)),
        costPerPerson: flight.cost,
        mode: `Flight ${flight.label}, then road transfer`,
        roads: [`${flight.airport} approach`, highway],
        stops: [],
        tradeoff: 'Shortest door-to-door time, but flights in Nepal are weather-dependent.',
      }
    : {
        type: 'fastest',
        label: 'Fastest route',
        headline: 'Time optimized',
        distanceKm: Math.round(privateKm),
        hours: Number((privateKm / (speed * 1.1)).toFixed(1)),
        costPerPerson: Math.round(privateCost),
        mode: transport === 'public' ? 'Express bus, limited stops' : 'Private vehicle',
        roads: [highway, 'final access road'],
        stops: [],
        tradeoff: 'Prioritises shorter travel time and the most reliable road conditions.',
      }

  const scenic: RouteOption = {
    type: 'scenic',
    label: 'Scenic route',
    headline: 'The journey is the point',
    distanceKm: scenicKm,
    hours: Number((scenicKm / (speed * 0.92) + accessStops(destination, false).length * 0.6).toFixed(1)),
    costPerPerson: Math.round(Math.max(1400, scenicKm * 17) / groupSize),
    mode: 'Private vehicle with stops',
    roads: [highway, 'scenic detours'],
    stops: accessStops(destination, false),
    tradeoff: 'Adds viewpoints, food stops and short walks; a longer day but a richer route.',
  }

  const budget: RouteOption = {
    type: 'budget',
    label: 'Budget-friendly route',
    headline: 'Cheapest practical option',
    distanceKm: publicKm,
    hours: Number((publicKm / (speed * 0.8)).toFixed(1)),
    costPerPerson: Math.round(transport === 'motorbike' ? bikeCost : publicCost),
    mode: transport === 'motorbike' ? 'Motorbike, fuel share' : 'Public bus and shared jeep',
    roads: [highway, 'shared final leg'],
    stops: accessStops(destination, true).slice(0, 2),
    tradeoff: 'Lowest cost, slowest journey, and the most exposed to delays and road conditions.',
  }

  return [fastest, scenic, budget]
}

export function routeByType(
  destination: Destination,
  origin: Origin,
  travelers: number,
  transport: Transport,
  type: RouteType,
): RouteOption {
  const options = buildRouteOptions(destination, origin, travelers, transport)
  return options.find((option) => option.type === type) ?? options[0]
}

export function hoursLabel(hours: number): string {
  const whole = Math.floor(hours)
  const minutes = Math.round((hours - whole) * 60)
  if (whole === 0) return `${minutes} min`
  if (minutes === 0) return `${whole} hr`
  return `${whole} hr ${minutes} min`
}
