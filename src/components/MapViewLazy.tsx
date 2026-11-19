import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import type { ComponentProps } from 'react'

/** MapView (and Leaflet with it) is fetched only when a map is actually rendered. */
const LazyMapView = lazy(() => import('./MapView').then((module) => ({ default: module.MapView })))

/**
 * Holds the map's space until it scrolls close to the viewport. Home renders a
 * map far below the fold, so this keeps Leaflet off a first visit entirely.
 */
export function MapView(props: ComponentProps<typeof LazyMapView>) {
  const height = props.height ?? '420px'
  const holderRef = useRef<HTMLDivElement>(null)
  const [nearView, setNearView] = useState(false)

  useEffect(() => {
    const holder = holderRef.current
    if (!holder || nearView) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      setNearView(true)
      return undefined
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '240px' },
    )
    observer.observe(holder)
    return () => observer.disconnect()
  }, [nearView])

  return (
    <div ref={holderRef} style={{ height }} className="w-full">
      {nearView ? (
        <Suspense
          fallback={
            <div
              className="h-full w-full animate-pulse rounded-2xl border border-dashed border-line bg-paper-2"
              aria-hidden="true"
            />
          }
        >
          <LazyMapView {...props} />
        </Suspense>
      ) : (
        <div
          className="h-full w-full rounded-2xl border border-dashed border-line bg-paper-2"
          aria-hidden="true"
        />
      )}
    </div>
  )
}
