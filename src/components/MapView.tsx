import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Destination } from '../types'

const CATEGORY_COLOR: Record<string, string> = {
  adventure: '#D26A38',
  sacred: '#A9533F',
  lakes: '#3F7089',
  wildlife: '#3E6B4F',
}

interface Props {
  destinations: Destination[]
  height?: string
  zoom?: number
  center?: [number, number]
  fit?: boolean
  className?: string
  interactive?: boolean
}

export function MapView({
  destinations,
  height = '420px',
  zoom = 7,
  center = [28.2, 84.15],
  fit = true,
  className,
  interactive = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      zoomControl: interactive,
      dragging: interactive,
      attributionControl: true,
    }).setView(center, zoom)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    const timer = setTimeout(() => map.invalidateSize(), 120)

    return () => {
      clearTimeout(timer)
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()

    destinations.forEach((destination) => {
      const icon = L.divIcon({
        className: '',
        html: `<span class="map-pin" style="background:${CATEGORY_COLOR[destination.category] ?? '#1E3D33'}"></span>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })
      const marker = L.marker([destination.lat, destination.lng], {
        icon,
        title: destination.name,
        alt: destination.name,
      })
        .bindPopup(
          `<div style="font-family:Inter,sans-serif"><strong style="display:block;font-size:13px;margin-bottom:2px">${destination.name}</strong><span style="color:#7b7364">${destination.district} · ${destination.difficulty}</span><br/><a href="/explore/${destination.slug}" style="color:#2c5a49;font-size:11px">Open destination →</a></div>`,
        )
        .on('click', () => {
          window.setTimeout(() => navigate(`/explore/${destination.slug}`), 120)
        })
      marker.addTo(layer)
    })

    if (fit && destinations.length > 1) {
      const bounds = L.latLngBounds(destinations.map((d) => [d.lat, d.lng] as [number, number]))
      map.fitBounds(bounds.pad(0.18), { animate: false })
    } else if (destinations.length === 1) {
      map.setView([destinations[0].lat, destinations[0].lng], zoom, { animate: false })
    }
  }, [destinations, fit, navigate, zoom])

  return (
    <div className={className} style={{ position: 'relative', zIndex: 0 }}>
      <div ref={containerRef} style={{ height }} className="w-full overflow-hidden rounded-2xl border border-line" />
    </div>
  )
}
