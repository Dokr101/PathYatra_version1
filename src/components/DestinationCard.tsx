import { Link } from 'react-router-dom'
import { ArrowUpRight, Heart, Layers, MapPin } from 'lucide-react'
import type { Destination } from '../types'
import { CATEGORY_MAP, getDestination } from '../data/destinations'
import { useApp } from '../context/AppContext'
import { monthsLabel, npr, cx } from '../lib/format'
import { DestinationImage } from './DestinationImage'
import { Pill } from './ui'

const DIFFICULTY_TONE: Record<string, string> = {
  Easy: 'text-pine',
  Moderate: 'text-[#7a6a1f]',
  Challenging: 'text-clay',
  Difficult: 'text-clay',
}

export function DestinationCard({ destination, dense = false }: { destination: Destination; dense?: boolean }) {
  const { wishlist, toggleWishlist, compare, toggleCompare } = useApp()
  const saved = wishlist.includes(destination.slug)
  const comparing = compare.includes(destination.slug)
  const category = CATEGORY_MAP[destination.category]

  return (
    <article className="motion-card group relative flex flex-col overflow-hidden rounded-[22px] border border-line bg-[#fffdf7]/80 shadow-card hover:shadow-lift">
      <Link to={`/explore/${destination.slug}`} className="flex flex-1 flex-col">
        <div className={cx('relative overflow-hidden', dense ? 'aspect-[16/9]' : 'aspect-[4/3]')}>
          <DestinationImage
            destination={destination}
            className="motion-image h-full w-full group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/5 to-transparent" />

          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <Pill tone="pine" className="backdrop-blur-sm">
              {category.short}
            </Pill>
            {destination.hiddenGem ? <Pill tone="marigold">Hidden gem</Pill> : null}
          </div>

          <div className="absolute inset-x-3 bottom-3 text-paper">
            <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.16em] text-paper/75">
              <MapPin size={10} /> {destination.district} · {destination.province}
            </p>
            <h3 className="mt-1 font-display text-[1.35rem] leading-tight text-paper">{destination.name}</h3>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <p className="line-clamp-2 text-xs leading-relaxed text-ink-soft">{destination.summary}</p>

          <dl className="mt-4 grid grid-cols-2 gap-x-2 gap-y-2.5 border-t border-line pt-3">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-mute">Best season</dt>
              <dd className="mt-0.5 text-[11px] font-medium text-ink">{monthsLabel(destination.bestMonths)}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-mute">Suggested</dt>
              <dd className="mt-0.5 text-[11px] font-medium text-ink">
                {destination.minDays}–{destination.maxDays} days
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-mute">From</dt>
              <dd className="mt-0.5 text-[11px] font-medium text-ink">{npr(destination.costPerDay)} / day</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-mute">Difficulty</dt>
              <dd className={cx('mt-0.5 text-[11px] font-medium', DIFFICULTY_TONE[destination.difficulty])}>
                {destination.difficulty}
              </dd>
            </div>
          </dl>

          <div className="mt-auto flex items-center justify-between pt-4">
            <span className="text-[11px] font-medium text-pine">View destination</span>
            <ArrowUpRight size={15} className="motion-icon text-pine group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </Link>

      <div className="absolute right-3 top-3 z-10 flex gap-1.5">
        <button
          type="button"
          onClick={() => toggleWishlist(destination.slug)}
          aria-label={saved ? `Remove ${destination.name} from wishlist` : `Save ${destination.name} to wishlist`}
          aria-pressed={saved}
          className={cx(
            'motion-press flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-sm',
            saved
              ? 'border-saffron bg-saffron text-white'
              : 'border-paper/40 bg-ink/25 text-paper hover:bg-ink/40',
          )}
        >
          <Heart size={14} className={cx('motion-icon', saved ? 'fill-current' : '')} />
        </button>
        <button
          type="button"
          onClick={() => toggleCompare(destination.slug)}
          aria-label={comparing ? `Remove ${destination.name} from comparison` : `Compare ${destination.name}`}
          aria-pressed={comparing}
          className={cx(
            'motion-press flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-sm',
            comparing
              ? 'border-paper bg-paper text-pine'
              : 'border-paper/40 bg-ink/25 text-paper hover:bg-ink/40',
          )}
        >
          <Layers size={14} className="motion-icon" />
        </button>
      </div>
    </article>
  )
}

export function MiniDestination({ slug }: { slug: string }) {
  const destination = getDestination(slug)
  if (!destination) return null
  return (
    <Link
      to={`/explore/${destination.slug}`}
      className="group flex items-center gap-3 rounded-2xl border border-line bg-white/50 p-2.5 transition hover:border-pine-3"
    >
      <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg">
        <DestinationImage destination={destination} className="h-full w-full" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-ink">{destination.name}</span>
        <span className="block truncate text-[10px] text-ink-mute">
          {destination.district} · {monthsLabel(destination.bestMonths)}
        </span>
      </span>
      <ArrowUpRight size={13} className="shrink-0 text-ink-mute transition group-hover:text-pine" />
    </Link>
  )
}
