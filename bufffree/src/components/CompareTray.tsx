import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Layers, Scale, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { CATEGORY_MAP, getDestination } from '../data/destinations'
import { monthsLabel, npr } from '../lib/format'
import { Modal, Pill } from './ui'
import { ScenicArt } from './ScenicArt'

export function CompareTray() {
  const { compare, toggleCompare, clearCompare } = useApp()
  const [open, setOpen] = useState(false)
  const selected = compare.map(getDestination).filter(Boolean)
  const items = selected as NonNullable<(typeof selected)[number]>[]

  if (!compare.length) return null

  return (
    <>
      <div className="no-print fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
        <div className="flex w-full max-w-2xl flex-wrap items-center gap-3 rounded-2xl border border-pine/20 bg-pine px-4 py-3 text-paper shadow-lift">
          <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-paper/70">
            <Layers size={14} /> Compare
          </span>
          <div className="flex flex-1 flex-wrap gap-1.5">
            {items.map((destination) => (
              <span
                key={destination.slug}
                className="inline-flex items-center gap-1.5 rounded-full border border-paper/25 bg-paper/10 px-2.5 py-1 text-[11px]"
              >
                {destination.name.split('&')[0].trim()}
                <button
                  type="button"
                  onClick={() => toggleCompare(destination.slug)}
                  aria-label={`Remove ${destination.name}`}
                  className="text-paper/60 hover:text-paper"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={items.length < 2}
            className="inline-flex items-center gap-1.5 rounded-full bg-paper px-4 py-2 text-[11px] font-semibold text-pine transition hover:bg-paper-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Scale size={13} /> Compare {items.length < 2 ? '(pick 2)' : items.length}
          </button>
          <button type="button" onClick={clearCompare} className="text-[11px] text-paper/60 underline-offset-2 hover:underline">
            Clear
          </button>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Compare destinations"
        description="Budget, duration, difficulty and season, side by side."
        wide
      >
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr>
                <th className="w-32 px-2 pb-3 align-bottom text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
                  Destination
                </th>
                {items.map((destination) => (
                  <th key={destination.slug} className="px-2 pb-3 align-bottom">
                    <div className="mb-2 h-20 overflow-hidden rounded-xl">
                      <ScenicArt scene={destination.scene} className="h-full w-full" />
                    </div>
                    <p className="font-display text-base leading-tight text-ink">{destination.name}</p>
                    <p className="mt-0.5 text-[11px] font-normal text-ink-mute">{destination.district}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[12px]">
              {[
                { label: 'Category', render: (d: (typeof items)[number]) => CATEGORY_MAP[d.category].short },
                { label: 'Best season', render: (d: (typeof items)[number]) => monthsLabel(d.bestMonths) },
                {
                  label: 'Suggested duration',
                  render: (d: (typeof items)[number]) => `${d.minDays}–${d.maxDays} days`,
                },
                { label: 'Difficulty', render: (d: (typeof items)[number]) => d.difficulty },
                { label: 'From, per day', render: (d: (typeof items)[number]) => npr(d.costPerDay) },
                {
                  label: 'Permit',
                  render: (d: (typeof items)[number]) => (d.permit ? npr(d.permit.cost) : 'Not required'),
                },
                {
                  label: 'Altitude',
                  render: (d: (typeof items)[number]) => (d.altitude ? `${d.altitude.toLocaleString('en-IN')} m` : '—'),
                },
                {
                  label: 'Highlights',
                  render: (d: (typeof items)[number]) => (
                    <ul className="space-y-1">
                      {d.highlights.slice(0, 3).map((highlight) => (
                        <li key={highlight} className="text-[11px] leading-snug text-ink-soft">
                          · {highlight}
                        </li>
                      ))}
                    </ul>
                  ),
                },
              ].map((row) => (
                <tr key={row.label} className="border-t border-line align-top">
                  <th className="px-2 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-mute">
                    {row.label}
                  </th>
                  {items.map((destination) => (
                    <td key={destination.slug} className="px-2 py-3 text-ink">
                      {row.render(destination)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-line">
                <th className="px-2 py-3" />
                {items.map((destination) => (
                  <td key={destination.slug} className="px-2 py-3">
                    <Link
                      to={`/plan?destination=${destination.slug}`}
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-pine"
                    >
                      Plan this <ArrowRight size={12} />
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Pill tone="neutral">Up to three destinations</Pill>
          <Pill tone="outline">Estimates only</Pill>
        </div>
      </Modal>
    </>
  )
}
