import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Compass, MapPin, Sparkles } from 'lucide-react'
import type { Category } from '../types'
import { CATEGORIES, MONTHS } from '../data/taxonomy'
import { DESTINATIONS, destinationsInSeason } from '../data/destinations'
import { MapView } from '../components/MapViewLazy'
import { CATEGORY_COLOR } from '../lib/mapColors'
import { DestinationImage } from '../components/DestinationImage'
import { Pill } from '../components/ui'
import { cx, monthsLabel, NOT_PRICED, nprShort } from '../lib/format'

export function MapPage() {
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [seasonOnly, setSeasonOnly] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const month = new Date().getMonth() + 1

  const filtered = useMemo(() => {
    let list = seasonOnly ? destinationsInSeason(month) : DESTINATIONS
    if (category !== 'all') list = list.filter((destination) => destination.category === category)
    return list
  }, [category, month, seasonOnly])

  // A filter change can drop the selected row; the map should not highlight
  // something the list no longer shows.
  const activeSlug = selected && filtered.some((item) => item.slug === selected) ? selected : null

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
            Pins are coloured by category and cluster where they overlap. Pick a row or a marker to see the destination;
            open it with the arrow to read the full guide. Map tiles come from OpenStreetMap.
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
          <MapView
            destinations={filtered}
            height="min(68vh, 640px)"
            fit
            selectedSlug={activeSlug}
            onSelect={setSelected}
          />
          <div className="flex flex-wrap items-center gap-4 border-t border-line px-4 py-2.5 text-[11px] text-ink-mute">
            {CATEGORIES.map((item) => (
              <span key={item.id} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: CATEGORY_COLOR[item.id] ?? '#1e3d33' }}
                  aria-hidden="true"
                />
                {item.label}
              </span>
            ))}
            <span className="ml-auto">{filtered.length} destinations shown</span>
          </div>
        </div>

        <div className="flex max-h-[68vh] flex-col overflow-hidden rounded-2xl border border-line bg-white/55">
          <div className="border-b border-line px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">On this map</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {filtered.length} of {DESTINATIONS.length} destinations
            </p>
          </div>
          <div className="no-scrollbar flex-1 space-y-1 overflow-y-auto p-2">
            {filtered.map((destination) => {
              const isActive = destination.slug === activeSlug
              return (
                <div
                  key={destination.slug}
                  className={cx(
                    'flex items-center gap-1 rounded-xl transition',
                    isActive ? 'bg-paper-2 ring-1 ring-pine/25' : 'hover:bg-paper-2',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelected(destination.slug)}
                    aria-pressed={isActive}
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-2 text-left"
                  >
                    <span className="h-11 w-14 shrink-0 overflow-hidden rounded-lg">
                      <DestinationImage destination={destination} className="h-full w-full" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: CATEGORY_COLOR[destination.category] ?? '#1e3d33' }}
                          aria-hidden="true"
                        />
                        <span className="truncate text-[11px] font-medium text-ink">{destination.name}</span>
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-ink-mute">
                        {destination.district} · {monthsLabel(destination.bestMonths)} ·{' '}
                        {destination.costPerDay === undefined
                          ? NOT_PRICED
                          : `${nprShort(destination.costPerDay)}/day`}
                      </span>
                    </span>
                  </button>
                  <Link
                    to={`/explore/${destination.slug}`}
                    aria-label={`Open ${destination.name}`}
                    className="mr-1.5 shrink-0 rounded-full p-1.5 text-ink-mute transition hover:bg-paper-3 hover:text-pine"
                  >
                    <ArrowUpRight size={12} />
                  </Link>
                </div>
              )
            })}
            {filtered.length === 0 ? (
              <p className="px-3 py-10 text-center text-xs text-ink-mute">No destinations for that combination.</p>
            ) : null}
          </div>
          <div className="border-t border-line px-4 py-2.5 text-[11px] leading-relaxed text-ink-mute">
            <MapPin size={9} className="mr-1 inline" /> Map data © OpenStreetMap contributors. Destination coordinates
            are approximate town or trailhead centres.
          </div>
        </div>
      </div>
    </div>
  )
}
