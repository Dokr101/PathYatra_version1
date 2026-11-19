import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { adminApi, apiErrorMessage, isAbortError, type Paginated } from './api'

/** The admin client rides the same HttpOnly session cookie as the rest of the app. */
export function useAdminApi() {
  return useMemo(() => adminApi(), [])
}

export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/**
 * Fetches one page of an admin list. `deps` are the filter/page values; change
 * any of them and the list reloads. `reload()` re-runs the same query after a
 * mutation without losing the current filters.
 */
export function usePagedList<T, P extends Paginated<T> = Paginated<T>>(
  load: (signal: AbortSignal) => Promise<P>,
  deps: unknown[],
) {
  const [data, setData] = useState<P | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const loader = useRef(load)
  loader.current = load
  // Callers pass a fresh array every render, so the effect depends on a key made
  // from the values themselves: new filters reload, a re-render does not.
  const key = deps.map((value) => String(value)).join('\u0000')

  useEffect(() => {
    let active = true
    // A newer filter/page run aborts the previous request, so a slow response
    // cannot resolve into state that belongs to an older query.
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    loader
      .current(controller.signal)
      .then((result) => {
        if (active) setData(result)
      })
      .catch((reason: unknown) => {
        if (!active || isAbortError(reason)) return
        setError(apiErrorMessage(reason))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [key, tick])

  const reload = useCallback(() => setTick((value) => value + 1), [])
  return { data, loading, error, reload }
}

export interface Flash {
  tone: 'success' | 'error'
  text: string
}

export function useFlash() {
  const [flash, setFlash] = useState<Flash | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((tone: Flash['tone'], text: string) => {
    setFlash({ tone, text })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setFlash(null), tone === 'success' ? 4500 : 9000)
  }, [])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  // Stable identities, so callers can list them in effect dependencies.
  const success = useCallback((text: string) => show('success', text), [show])
  const fail = useCallback((reason: unknown) => show('error', apiErrorMessage(reason)), [show])
  const clear = useCallback(() => setFlash(null), [])

  return { flash, success, fail, clear }
}

/** Local form field errors from an ApiRequestError. */
export function fieldErrors(reason: unknown): Record<string, string> {
  if (reason && typeof reason === 'object' && 'fields' in reason) {
    const fields = (reason as { fields?: Record<string, string> }).fields
    if (fields) return fields
  }
  return {}
}

export function usePageTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = `${title} · PathYatra Admin`
    return () => {
      document.title = previous
    }
  }, [title])
}
