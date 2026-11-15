export type Category = 'adventure' | 'sacred' | 'lakes' | 'wildlife'

export type Difficulty = 'Easy' | 'Moderate' | 'Challenging' | 'Difficult'

export type SceneKind = 'peaks' | 'temple' | 'lake' | 'jungle' | 'stupa' | 'hills'

export type SceneSky = 'dawn' | 'clear' | 'dusk' | 'night' | 'alpine'

export type TravelStyle = 'adventure' | 'nature' | 'culture' | 'pilgrimage' | 'mixed'

export type Pace = 'relaxed' | 'balanced' | 'packed'

export type Transport = 'private' | 'public' | 'motorbike' | 'mixed'

export type Accommodation = 'budget' | 'mid' | 'comfort'

export type RouteType = 'fastest' | 'scenic' | 'budget'

export type PlanStage = 'draft' | 'upcoming' | 'completed'

export type StayKind = 'Teahouse' | 'Hotel' | 'Homestay' | 'Lodge' | 'Resort' | 'Guesthouse'

export interface EnRouteStop {
  name: string
  kind: 'viewpoint' | 'food' | 'culture' | 'adventure' | 'nature' | 'market'
  note: string
  detourKm: number
  cost: number
}

export interface Destination {
  slug: string
  name: string
  province: string
  district: string
  category: Category
  tagline: string
  summary: string
  overview: string[]
  history: string
  highlights: string[]
  activities: string[]
  food: string[]
  essentials: string[]
  bestMonths: number[]
  difficulty: Difficulty
  minDays: number
  maxDays: number
  costPerDay: number
  altitude?: number
  permit?: { name: string; cost: number; note?: string }
  lat: number
  lng: number
  hiddenGem?: boolean
  scene: { kind: SceneKind; sky: SceneSky; seed: number }
  enRoute: EnRouteStop[]
  nearby: string[]
}

export interface Origin {
  id: string
  name: string
  district: string
  lat: number
  lng: number
}

export interface DestinationCategory {
  id: Category
  label: string
  short: string
  blurb: string
  scene: { kind: SceneKind; sky: SceneSky; seed: number }
}

export interface Reviewer {
  name: string
  home: string
}

export interface Review {
  id: string
  author: string
  home: string
  category: 'Destination' | 'Road & transport' | 'Hotels & stays' | 'Restaurants & food' | 'Activities' | 'Local hospitality' | 'Affordability'
  subject: string
  destinationSlug: string
  rating: number
  date: string
  spend?: number
  text: string
  helpful: number
  verified: false
}

export interface Advisory {
  id: string
  title: string
  area: string
  severity: 'info' | 'caution' | 'warning'
  confidence: 'confirmed' | 'reported' | 'outlook'
  updated: string
  body: string
}

export interface Guide {
  id: string
  name: string
  base: string
  languages: string[]
  specialities: string[]
  dayRate: number
  rating: number
  trips: number
}

export interface TripBlock {
  time: 'Morning' | 'Afternoon' | 'Evening'
  title: string
  note?: string
  cost: number
  kind: 'travel' | 'activity' | 'meal' | 'rest' | 'stay' | 'stop'
}

export interface TripExpense {
  id: string
  title: string
  amount: number
  paidBy: number
  sharedBy: number
}

export interface TripDay {
  index: number
  date: string
  title: string
  subtitle: string
  type: 'travel' | 'explore' | 'trek' | 'rest' | 'return'
  altitude?: number
  blocks: TripBlock[]
  stay?: string
  meals?: string
}

export interface CostLine {
  key: string
  label: string
  perPerson: number
  group: number
  detail: string
}

export interface CostBreakdown {
  lines: CostLine[]
  perPerson: number
  group: number
  budget: number
  remaining: number
  contingency: number
  verdict: 'comfortable' | 'on-track' | 'tight' | 'over'
}

export interface RouteOption {
  type: RouteType
  label: string
  headline: string
  distanceKm: number
  hours: number
  costPerPerson: number
  mode: string
  roads: string[]
  stops: EnRouteStop[]
  tradeoff: string
}

export interface TripPlan {
  id: string
  createdAt: string
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
  route: RouteOption
  itinerary: TripDay[]
  costs: CostBreakdown
  packing: string[]
  notes: string[]
  status: PlanStage
  title: string
}
