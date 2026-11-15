const KEY = 'pathyatra.v1.recent'

export function trackRecent(slug: string): void {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(KEY)
    const current: string[] = raw ? JSON.parse(raw) : []
    const next = [slug, ...current.filter((item) => item !== slug)].slice(0, 6)
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Ignore storage failures.
  }
}

export function getRecent(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}
