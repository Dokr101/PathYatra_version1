export function npr(value: number): string {
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

export function formatDate(iso: string, opts?: { short?: boolean }): string {
  const d = parseDate(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: opts?.short ? 'short' : 'long',
    year: 'numeric',
  })
}

export function formatDateRange(startISO: string, days: number): string {
  const end = addDays(startISO, Math.max(0, days - 1))
  const s = parseDate(startISO)
  const e = parseDate(end)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return formatDate(startISO)
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
  const startDay = s.getDate()
  const endDay = e.getDate()
  const startMonth = s.toLocaleDateString('en-GB', { month: 'short' })
  const endMonth = e.toLocaleDateString('en-GB', { month: 'short' })
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

export function monthsLabel(months: number[]): string {
  const sorted = [...months].sort((a, b) => a - b)
  if (!sorted.length) return 'Year-round'
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

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}
