import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Map as LeafletMap, Marker, MarkerClusterGroup } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import type { Destination } from '../types'
import { CATEGORY_COLOR, CATEGORY_LABEL } from '../lib/mapColors'
import { cx, hasLocation } from '../lib/format'

/** Leaflet + the cluster plugin, typed off the packages but imported at runtime. */
type LeafletModule = typeof import('leaflet')

/** Rough national envelope, so panning stops at India and Tibet rather than Albania. */
const NEPAL_BOUNDS: [number, number][] = [
  [26.3, 80.0],
  [30.5, 88.2],
]

interface Props {
  destinations: Destination[]
  height?: string
  zoom?: number
  center?: [number, number]
  fit?: boolean
  className?: string
  interactive?: boolean
  /** Slug to highlight; flies to it and opens its popup when it changes. */
  selectedSlug?: string | null
  /** Fired when a marker is clicked, so a sidebar can follow the map. */
  onSelect?: (slug: string) => void
}

/**
 * Builds the pin as a real element rather than an HTML string: Leaflet assigns
 * a string `html` through innerHTML, so every interpolated value would be a
 * markup-injection sink. Passing an HTMLElement lets Leaflet append it as-is,
 * and the admin-supplied label travels through setAttribute as plain text.
 */
function pinIcon(L: LeafletModule, color: string, active: boolean, label: string, popInMs?: number) {
  const pin = document.createElement('span')
  pin.className = cx('map-pin', active && 'map-pin--active', popInMs !== undefined && 'map-pin--pop')
  pin.setAttribute('role', 'img')
  pin.setAttribute('aria-label', label)
  pin.style.background = color
  if (popInMs !== undefined) pin.style.animationDelay = `${popInMs}ms`

  return L.divIcon({
    className: 'map-pin-wrap',
    html: pin,
    iconSize: active ? [22, 22] : [16, 16],
    iconAnchor: active ? [11, 11] : [8, 8],
    popupAnchor: [0, active ? -12 : -9],
    tooltipAnchor: [0, active ? -13 : -10],
  })
}

function popupContent(destination: Destination, open: () => void): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'map-popup'

  const title = document.createElement('strong')
  title.textContent = destination.name

  const meta = document.createElement('span')
  meta.textContent = `${destination.district} · ${CATEGORY_LABEL[destination.category] ?? destination.category}`

  const link = document.createElement('a')
  link.href = `/explore/${destination.slug}`
  link.textContent = 'Open destination →'
  link.addEventListener('click', (event) => {
    event.preventDefault()
    open()
  })

  wrapper.append(title, meta, link)
  return wrapper
}

export function MapView({
  destinations,
  height = '420px',
  zoom = 7,
  center = [28.2, 84.15],
  fit = true,
  className,
  interactive = true,
  selectedSlug = null,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<LeafletModule | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const clusterRef = useRef<MarkerClusterGroup | null>(null)
  const markersRef = useRef(new Map<string, Marker>())
  /** Last active state written to each pin, so selection does not re-animate it. */
  const activeRef = useRef(new Map<string, boolean>())
  /** Pop-in runs on the first build only, not on every filter or selection change. */
  const poppedRef = useRef(false)
  const selectRef = useRef(onSelect)
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  /**
   * The map is mounted once per container, so it keeps the first view it was
   * given; later `center`/`zoom` prop changes would otherwise remount Leaflet.
   */
  const initialView = useRef({ center, zoom, interactive })
  /** Latest selection, read by the pin builder without making it a dependency. */
  const selectedRef = useRef(selectedSlug)

  useEffect(() => {
    selectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    selectedRef.current = selectedSlug
  }, [selectedSlug])

  // Leaflet is ~140 KB, so it is fetched only once a map actually mounts.
  useEffect(() => {
    let disposed = false
    let map: LeafletMap | null = null
    // Captured now so the cleanup clears the map that belongs to this mount.
    const markers = markersRef.current

    const mount = async () => {
      try {
        const L = (await import('leaflet')).default
        await import('leaflet.markercluster')
        if (disposed || !containerRef.current) return

        map = L.map(containerRef.current, {
          scrollWheelZoom: false,
          zoomControl: initialView.current.interactive,
          dragging: initialView.current.interactive,
          maxZoom: 18,
          minZoom: 5,
          maxBounds: NEPAL_BOUNDS,
          maxBoundsViscosity: 0.8,
        }).setView(initialView.current.center, initialView.current.zoom)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map)

        // Cluster pins that would otherwise pile up on the Kathmandu valley.
        const cluster = L.markerClusterGroup({
          showCoverageOnHover: false,
          maxClusterRadius: 46,
          spiderfyOnMaxZoom: true,
          disableClusteringAtZoom: 11,
          iconCreateFunction: (group) => {
            const count = group.getChildCount()
            const size = count < 5 ? 34 : count < 10 ? 40 : 46
            const label = document.createElement('span')
            label.textContent = String(count)
            return L.divIcon({
              className: 'map-cluster',
              html: label,
              iconSize: L.point(size, size),
            })
          },
        })
        cluster.addTo(map)

        leafletRef.current = L
        mapRef.current = map
        clusterRef.current = cluster
        setReady(true)
        window.setTimeout(() => map?.invalidateSize(), 120)
      } catch {
        if (!disposed) setFailed(true)
      }
    }

    void mount()

    return () => {
      disposed = true
      map?.remove()
      leafletRef.current = null
      mapRef.current = null
      clusterRef.current = null
      markers.clear()
    }
    // Leaflet itself only needs to be mounted once per container.
  }, [])

  // Rebuild pins whenever the destination set changes (filters, category, season).
  useEffect(() => {
    const L = leafletRef.current
    const map = mapRef.current
    const cluster = clusterRef.current
    if (!L || !map || !cluster) return
    cluster.clearLayers()
    markersRef.current.clear()
    activeRef.current.clear()
    const popIn = !poppedRef.current
    // An admin destination saved without coordinates cannot be pinned; dropping
    // it here is the difference between "not on the map yet" and a marker at 0,0.
    const located = destinations.filter(hasLocation)

    located.forEach((destination) => {
      const color = CATEGORY_COLOR[destination.category] ?? '#1e3d33'
      const active = destination.slug === selectedRef.current
      // Longitude-agnostic ripple: southern pins land first.
      const delay = popIn ? Math.max(0, Math.min(180, Math.round((destination.lat - 26.3) * 45))) : undefined
      const marker = L.marker([destination.lat, destination.lng], {
        icon: pinIcon(L, color, active, destination.name, delay),
        alt: destination.name,
        keyboard: true,
      })
      marker.bindTooltip(destination.name, { direction: 'top', className: 'map-tooltip' })
      marker.bindPopup(popupContent(destination, () => navigate(`/explore/${destination.slug}`)), {
        closeButton: true,
        autoPan: false,
      })
      marker.on('click', () => selectRef.current?.(destination.slug))
      marker.addTo(cluster)
      markersRef.current.set(destination.slug, marker)
      activeRef.current.set(destination.slug, active)
    })
    if (located.length > 0) poppedRef.current = true

    if (fit && located.length > 1) {
      const bounds = L.latLngBounds(located.map((d) => [d.lat, d.lng] as [number, number]))
      map.fitBounds(bounds, { padding: [40, 40], animate: false })
    } else if (located.length === 1) {
      map.setView([located[0].lat, located[0].lng], zoom, { animate: false })
    }
    // Selection is handled by the effect below; rebuilding pins on every
    // selection would re-fit the view and undo the flight.
  }, [destinations, fit, navigate, zoom, ready])

  // Selected state: bigger pin with a halo, and a flight to it when the change
  // did not come from the map itself.
  useEffect(() => {
    const L = leafletRef.current
    const map = mapRef.current
    if (!L || !map) return

    markersRef.current.forEach((marker, slug) => {
      const destination = destinations.find((item) => item.slug === slug)
      if (!destination) return
      const active = slug === selectedSlug
      // Replacing the icon would cancel the pop-in, so only touch changed pins.
      if (activeRef.current.get(slug) !== active) {
        activeRef.current.set(slug, active)
        marker.setIcon(pinIcon(L, CATEGORY_COLOR[destination.category] ?? '#1e3d33', active, destination.name))
        marker.setZIndexOffset(active ? 500 : 0)
      }
      if (!active && marker.isPopupOpen()) marker.closePopup()
    })

    if (!selectedSlug) return
    const marker = markersRef.current.get(selectedSlug)
    if (!marker) return

    // Clustering switches off at zoom 11, so a flight to that level guarantees
    // the pin is on screen rather than swallowed by a cluster bubble.
    const targetZoom = Math.max(map.getZoom(), 11)
    const visible = map.getBounds().contains(marker.getLatLng())
    if (map.getZoom() < 11 || !visible) {
      map.flyTo(marker.getLatLng(), targetZoom, { duration: 0.45 })
      const open = window.setTimeout(() => marker.openPopup(), 480)
      return () => window.clearTimeout(open)
    }
    marker.openPopup()
  }, [destinations, selectedSlug, ready])

  return (
    // The skeleton tint lives on the wrapper: Leaflet writes its own classes onto
    // the container, so React must never see that element's className change.
    <div className={cx(className, !ready && 'rounded-2xl bg-paper-2')} style={{ position: 'relative', zIndex: 0 }}>
      <div
        ref={containerRef}
        style={{ height }}
        className="w-full overflow-hidden rounded-2xl border border-line"
      />
      {failed ? (
        <div className="absolute inset-0 grid place-items-center rounded-2xl border border-dashed border-line bg-paper/85 px-4 text-center">
          <p className="text-xs text-ink-soft">The map couldn’t load. The destination list still works.</p>
        </div>
      ) : ready ? null : (
        <div
          className="pointer-events-none absolute inset-0 grid place-items-center rounded-2xl"
          role="status"
          aria-live="polite"
        >
          <span className="animate-pulse rounded-full border border-line bg-white/80 px-3 py-1.5 text-[11px] text-ink-mute">
            Loading map…
          </span>
        </div>
      )}
    </div>
  )
}
