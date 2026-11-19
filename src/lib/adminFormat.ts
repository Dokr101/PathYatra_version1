/**
 * Admin-only formatting helpers. Everything that is not admin-specific —
 * cx, formatDate, formatDateTime and npr — is defined once in ./format and
 * re-exported here, so admin pages can keep a single import for their cells
 * while the traveller and admin screens share one source of truth.
 */
import { formatDate } from './format'

export { cx, formatDate, formatDateTime, npr } from './format'

/** Date-only value for <input type="date">. */
export function inputDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10)
}

export function todayInput(): string {
  return inputDate(new Date().toISOString())
}

export function daysAgoInput(days: number): string {
  return inputDate(new Date(Date.now() - days * 86_400_000).toISOString())
}

export function relativeTime(iso: string): string {
  const date = new Date(iso).getTime()
  const diff = Date.now() - date
  if (Number.isNaN(date)) return '—'
  const minutes = Math.round(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(iso)
}
