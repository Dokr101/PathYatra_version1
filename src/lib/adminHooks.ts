import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { adminApi, apiErrorMessage, type Paginated } from './api'

export function useAdminApi() {
  const { token } = useApp()
  return useMemo(() => adminApi(token ?? ''), [token])
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
  load: () => Promise<P>,
  deps: unknown[],
) {
  const [data, setData] = useState<P | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const loader = useRef(load)
  loader.current = load

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    loader
      .current()
      .then((result) => {
        if (active) setData(result)
      })
      .catch((reason: unknown) => {
        if (active) setError(apiErrorMessage(reason))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

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

  return {
    flash,
    success: (text: string) => show('success', text),
    fail: (reason: unknown) => show('error', apiErrorMessage(reason)),
    clear: () => setFlash(null),
  }
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
