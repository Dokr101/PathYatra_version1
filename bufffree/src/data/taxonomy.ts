import type { DestinationCategory, Origin } from '../types'

export const CATEGORIES: DestinationCategory[] = [
  {
    id: 'adventure',
    label: 'Adventure & High Passes',
    short: 'Adventure',
    blurb: 'Trekking, mountaineering, paragliding, rafting and high passes.',
    scene: { kind: 'peaks', sky: 'dawn', seed: 11 },
  },
  {
    id: 'sacred',
    label: 'Sacred & Heritage',
    short: 'Sacred',
    blurb: 'Temples, monasteries, pilgrimage sites and heritage walks.',
    scene: { kind: 'temple', sky: 'dusk', seed: 23 },
  },
  {
    id: 'lakes',
    label: 'Lakes & Serenity',
    short: 'Lakes',
    blurb: 'Still water, viewpoints and quiet villages at altitude.',
    scene: { kind: 'lake', sky: 'clear', seed: 37 },
  },
  {
    id: 'wildlife',
    label: 'Wildlife & Terai',
    short: 'Wildlife',
    blurb: 'National parks, jungle safaris, birdwatching and Tharu culture.',
    scene: { kind: 'jungle', sky: 'alpine', seed: 51 },
  },
]

export const ORIGINS: Origin[] = [
  { id: 'kathmandu', name: 'Kathmandu', district: 'Kathmandu', lat: 27.7172, lng: 85.324 },
  { id: 'pokhara', name: 'Pokhara', district: 'Kaski', lat: 28.2096, lng: 83.9856 },
  { id: 'lalitpur', name: 'Lalitpur (Patan)', district: 'Lalitpur', lat: 27.6644, lng: 85.3188 },
  { id: 'biratnagar', name: 'Biratnagar', district: 'Morang', lat: 26.4525, lng: 87.2718 },
  { id: 'birgunj', name: 'Birgunj', district: 'Parsa', lat: 27.0104, lng: 84.877 },
  { id: 'butwal', name: 'Butwal', district: 'Rupandehi', lat: 27.7, lng: 83.45 },
  { id: 'nepalgunj', name: 'Nepalgunj', district: 'Banke', lat: 28.05, lng: 81.6167 },
  { id: 'dharan', name: 'Dharan', district: 'Sunsari', lat: 26.8123, lng: 87.283 },
  { id: 'hetauda', name: 'Hetauda', district: 'Makwanpur', lat: 27.4287, lng: 85.0322 },
  { id: 'surkhet', name: 'Birendranagar (Surkhet)', district: 'Surkhet', lat: 28.6, lng: 81.6333 },
  { id: 'janakpur', name: 'Janakpur', district: 'Dhanusha', lat: 26.7288, lng: 85.925 },
]

export const INTERESTS = [
  { id: 'viewpoints', label: 'Scenic viewpoints' },
  { id: 'food', label: 'Local food' },
  { id: 'trekking', label: 'Trekking' },
  { id: 'adventure-sports', label: 'Adventure sports' },
  { id: 'culture', label: 'Cultural experiences' },
  { id: 'photography', label: 'Photography' },
  { id: 'wildlife', label: 'Wildlife' },
  { id: 'shopping', label: 'Shopping & markets' },
] as const

export const STYLE_LABELS: Record<string, string> = {
  adventure: 'Adventure',
  nature: 'Nature and relaxation',
  culture: 'Cultural and heritage',
  pilgrimage: 'Pilgrimage',
  mixed: 'A little bit of everything',
}

export const PACE_LABELS: Record<string, string> = {
  relaxed: 'Relaxed — fewer activities per day',
  balanced: 'Balanced — moderate activities',
  packed: 'Packed — explore as much as possible',
}

export const TRANSPORT_LABELS: Record<string, string> = {
  private: 'Private vehicle',
  public: 'Public transport',
  motorbike: 'Motorbike',
  mixed: 'Mixed transportation',
}

export const ACCOMMODATION_LABELS: Record<string, string> = {
  budget: 'Budget — lodges and homestays',
  mid: 'Comfortable — good hotels and teahouses',
  comfort: 'Premium — the best available locally',
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const SEASONS = [
  { id: 'winter', label: 'Winter', months: [12, 1, 2], note: 'Clear low-altitude days, cold nights, high passes often closed.' },
  { id: 'spring', label: 'Spring', months: [3, 4, 5], note: 'Rhododendrons, warming trails, afternoon haze before monsoon.' },
  { id: 'monsoon', label: 'Monsoon', months: [6, 7, 8, 9], note: 'Green hills, leeches and landslide risk. Rain-shadow areas stay open.' },
  { id: 'autumn', label: 'Autumn', months: [10, 11], note: 'Stable air, sharp mountain views — the busiest trekking window.' },
]
