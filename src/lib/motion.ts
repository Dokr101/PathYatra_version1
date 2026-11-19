import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Entrance delay for the nth card in a grid: 40ms apart, capped so the last
 * card still arrives inside ~320ms rather than trailing the scroll.
 */
export function staggerDelay(index: number, step = 40, max = 320): number {
  return Math.min(index * step, max)
}

/**
 * Reveal-on-scroll, once per element.
 *
 * Attach the returned callback ref to every section that should fade in the
 * first time it is scrolled to. One IntersectionObserver is shared by all of
 * them, elements are unobserved after firing, and nothing is re-run on later
 * scrolls. Reduced-motion users get the revealed state immediately.
 *
 * The observed element only ever changes opacity (plus a 10px rise), so it is
 * clickable throughout — no pointer-events or visibility is involved.
 */
export function useRevealOnScroll<T extends HTMLElement = HTMLElement>() {
  const nodes = useRef<Set<T>>(new Set())
  const observer = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('reveal--in')
          io.unobserve(entry.target)
          nodes.current.delete(entry.target as T)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    observer.current = io
    // StrictMode remounts the effect; re-observe anything already registered.
    nodes.current.forEach((node) => io.observe(node))

    return () => {
      io.disconnect()
      observer.current = null
    }
  }, [])

  return useCallback((node: T | null) => {
    if (!node) return
    const reduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || typeof IntersectionObserver === 'undefined') {
      node.classList.add('reveal--in')
      return
    }
    nodes.current.add(node)
    observer.current?.observe(node)
  }, [])
}

/**
 * True only once `active` has stayed true for `delay`ms. Keeps a fast request
 * from flashing a skeleton on screen.
 */
export function useDelayedFlag(active: boolean, delay = 160): boolean {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!active) {
      setShown(false)
      return undefined
    }
    const timer = window.setTimeout(() => setShown(true), delay)
    return () => window.clearTimeout(timer)
  }, [active, delay])

  return active && shown
}
