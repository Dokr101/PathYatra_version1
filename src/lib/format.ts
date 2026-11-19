export function npr(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `Rs. ${Math.round(value).toLocaleString('en-IN')}`
}

export function nprShort(value: number): string {
  if (value >= 100000) {
    const lakh = value / 100000
    return `Rs. ${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)}L`
  }
  if (value >= 1000) {
    const k = value / 1000
    return `Rs. ${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`
  }
  return `Rs. ${Math.round(value)}`
}

export function parseDate(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00`)
}

export function todayISO(): string {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  const d = parseDate(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Date format used everywhere in the UI: "29 Nov 2026". One signature for both
 * traveller and admin screens: a date-only string ("2026-11-29") is read as a
 * local calendar date, a full ISO timestamp keeps its local day, and a missing
 * or unparseable value becomes "—".
 */
export function formatDate(iso: string | null | undefined): string {
  const date = toDate(iso)
  if (!date) return '—'
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

/** "29 Nov 2026 · 14:05" for audit rows, submissions and other timestamps. */
export function formatDateTime(iso: string | null | undefined): string {
  const date = toDate(iso)
  if (!date) return '—'
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${formatDate(iso)} · ${hours}:${minutes}`
}

/**
 * Date-only strings must be read as local midnight, because
 * `new Date('2026-11-29')` is UTC and shifts the day west of Greenwich;
 * timestamps are read exactly as written.
 */
function toDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? parseDate(iso) : new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Trim prose to a word boundary for card summaries and replace any trailing
 * punctuation (commas, dashes, stray ellipses) before the ellipsis is added.
 */
export function truncateText(value: string, maxLength = 96): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLength) return clean
  const clipped = clean.slice(0, maxLength)
  const boundary = clipped.lastIndexOf(' ')
  const base = (boundary > maxLength * 0.6 ? clipped.slice(0, boundary) : clipped).replace(
    /[\s,;:.!?·–—-]+$/u,
    '',
  )
  return `${base}…`
}

export function formatDateRange(startISO: string, days: number): string {
  const end = addDays(startISO, Math.max(0, days - 1))
  const s = parseDate(startISO)
  const e = parseDate(end)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return formatDate(startISO)
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
  const startDay = s.getDate()
  const endDay = e.getDate()
  const startMonth = SHORT_MONTHS[s.getMonth()]
  const endMonth = SHORT_MONTHS[e.getMonth()]
  if (days <= 1) return `${startDay} ${startMonth} ${s.getFullYear()}`
  if (sameMonth) return `${startDay} – ${endDay} ${endMonth} ${e.getFullYear()}`
  return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${e.getFullYear()}`
}

export function monthIndex(iso: string): number {
  return parseDate(iso).getMonth() + 1
}

export function daysBetween(startISO: string, endISO: string): number {
  const a = parseDate(startISO).getTime()
  const b = parseDate(endISO).getTime()
  return Math.round((b - a) / 86400000)
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function shortName(name: string): string {
  return name.split('&')[0].trim()
}

export function plural(count: number, singular: string, pluralForm?: string): string {
  return count === 1 ? singular : pluralForm ?? `${singular}s`
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Copy for an admin destination whose record leaves a value unknown. */
export const NOT_PRICED = 'Not yet priced'
export const STAY_NOT_SET = 'Stay not set'
export const LOCATION_NOT_SET = 'Location not set'
export const SEASON_NOT_SET = 'Season not set'

export function monthsLabel(months: number[]): string {
  const sorted = [...months].sort((a, b) => a - b)
  if (!sorted.length) return SEASON_NOT_SET
  const runs: Array<[number, number]> = []
  for (const month of sorted) {
    const last = runs[runs.length - 1]
    if (last && month === last[1] + 1) last[1] = month
    else runs.push([month, month])
  }
  return runs
    .map(([start, end]) => {
      if (start === end) return SHORT_MONTHS[start - 1]
      if (end - start === 1) return `${SHORT_MONTHS[start - 1]}–${SHORT_MONTHS[end - 1]}`
      return `${SHORT_MONTHS[start - 1]}–${SHORT_MONTHS[end - 1]}`
    })
    .join(' · ')
}

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** "2–4 days", or an explicit gap when nobody stated a duration. */
export function stayLabel(minDays?: number, maxDays?: number): string {
  if (minDays === undefined || maxDays === undefined) return STAY_NOT_SET
  return `${minDays}–${maxDays} days`
}

/** "Rs. 4,500 / day", or an explicit gap instead of an invented price. */
export function costPerDayLabel(costPerDay?: number): string {
  return costPerDay === undefined ? NOT_PRICED : `${npr(costPerDay)} / day`
}

/** True only when the destination can actually be pinned on a map. */
export function hasLocation<T extends { lat?: number; lng?: number }>(
  destination: T,
): destination is T & { lat: number; lng: number } {
  return typeof destination.lat === 'number' && typeof destination.lng === 'number'
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

/**
 * Guards admin-supplied URLs before they reach an <a href>. Returns the parsed
 * URL only for absolute http(s) links; javascript:, data:, blob:, relative and
 * malformed values all become null so callers render plain text instead.
 */
export function safeHttpUrl(value: string | null): string | null {
  const raw = value?.trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}
