import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Compass, MapPin, Sparkles } from 'lucide-react'
import type { Category } from '../types'
import { CATEGORIES, MONTHS } from '../data/taxonomy'
import { DESTINATIONS, destinationsInSeason } from '../data/destinations'
import { MapView } from '../components/MapView'
import { DestinationImage } from '../components/DestinationImage'
import { Pill } from '../components/ui'
import { cx, monthsLabel, npr } from '../lib/format'

export function MapPage() {
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [seasonOnly, setSeasonOnly] = useState(false)
  const month = new Date().getMonth() + 1

  const filtered = useMemo(() => {
    let list = seasonOnly ? destinationsInSeason(month) : DESTINATIONS
    if (category !== 'all') list = list.filter((destination) => destination.category === category)
    return list
  }, [category, month, seasonOnly])

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <Pill tone="outline">
            <Compass size={12} /> Interactive Nepal map
          </Pill>
          <h1 className="mt-3 font-display text-[clamp(2rem,4.2vw,3.2rem)] leading-[1] tracking-tight">
            The whole country, one screen.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Pins are coloured by category. Select a marker to open the destination. Map tiles come from OpenStreetMap;
            distances in PathYatra are modelled, not routed live.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={cx(
              'rounded-full border px-3 py-1.5 text-[11px] font-medium transition',
              category === 'all' ? 'border-pine bg-pine text-paper' : 'border-line text-ink-soft hover:border-pine-3',
            )}
          >
            All {DESTINATIONS.length}
          </button>
          {CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(category === item.id ? 'all' : item.id)}
              className={cx(
                'rounded-full border px-3 py-1.5 text-[11px] font-medium transition',
                category === item.id ? 'border-pine bg-pine text-paper' : 'border-line text-ink-soft hover:border-pine-3',
              )}
            >
              {item.short}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSeasonOnly((value) => !value)}
            className={cx(
              'rounded-full border px-3 py-1.5 text-[11px] font-medium transition',
              seasonOnly ? 'border-marigold bg-marigold/20 text-ink' : 'border-line text-ink-soft hover:border-marigold',
            )}
          >
            <Sparkles size={11} className="mr-1 inline" /> In season · {MONTHS[month - 1]}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-line bg-white/50">
          <MapView destinations={filtered} height="min(68vh, 640px)" fit />
          <div className="flex flex-wrap items-center gap-4 border-t border-line px-4 py-2.5 text-[10px] text-ink-mute">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#D26A38]" /> Adventure
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#A9533F]" /> Sacred
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#3F7089]" /> Lakes
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#3E6B4F]" /> Wildlife
            </span>
            <span className="ml-auto">{filtered.length} destinations shown</span>
          </div>
        </div>

        <div className="flex max-h-[68vh] flex-col overflow-hidden rounded-2xl border border-line bg-white/55">
          <div className="border-b border-line px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-mute">On this map</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {filtered.length} of {DESTINATIONS.length} destinations
            </p>
          </div>
          <div className="no-scrollbar flex-1 space-y-1 overflow-y-auto p-2">
            {filtered.map((destination) => (
              <Link
                key={destination.slug}
                to={`/explore/${destination.slug}`}
                className="group flex items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-paper-2"
              >
                <span className="h-11 w-14 shrink-0 overflow-hidden rounded-lg">
                  <DestinationImage destination={destination} className="h-full w-full" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-medium text-ink">{destination.name}</span>
                  <span className="block truncate text-[9px] text-ink-mute">
                    {destination.district} · {monthsLabel(destination.bestMonths)} · {npr(destination.costPerDay)}/day
                  </span>
                </span>
                <ArrowUpRight size={12} className="shrink-0 text-ink-mute transition group-hover:text-pine" />
              </Link>
            ))}
            {filtered.length === 0 ? (
              <p className="px-3 py-10 text-center text-xs text-ink-mute">No destinations for that combination.</p>
            ) : null}
          </div>
          <div className="border-t border-line px-4 py-2.5 text-[9px] leading-relaxed text-ink-mute">
            <MapPin size={9} className="mr-1 inline" /> Map data © OpenStreetMap contributors. Destination coordinates
            are approximate town or trailhead centres.
          </div>
        </div>
      </div>
    </div>
  )
}
