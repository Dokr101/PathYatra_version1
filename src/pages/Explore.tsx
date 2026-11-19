import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, Check, Compass, Filter, Heart, RotateCcw, Search, Sparkles, X, type LucideIcon } from 'lucide-react'
import type { Category, Difficulty } from '../types'
import { CATEGORIES } from '../data/taxonomy'
import { DESTINATIONS, getDestination } from '../data/destinations'
import { usePublicDestinations } from '../lib/publicDestinations'
import { useApp } from '../context/AppContext'
import { DestinationCard, MiniDestination } from '../components/DestinationCard'
import { DestinationCardSkeleton } from '../components/CardSkeletons'
import { staggerDelay, useDelayedFlag } from '../lib/motion'
import { Pill, Skeleton } from '../components/ui'
import { cx } from '../lib/format'
import { getRecent } from '../lib/recent'

/** Multi-select toggle: a checkbox square makes "several can be on" obvious. */
function ToggleChip({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: LucideIcon
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition',
        active ? 'border-pine bg-pine/10 text-ink' : 'border-line text-ink-soft hover:border-pine-3',
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border transition',
          active ? 'border-pine bg-pine text-paper' : 'border-[#8f846d] bg-white/70',
        )}
      >
        {active ? <Check size={9} strokeWidth={3} /> : null}
      </span>
      <Icon size={11} />
      {label}
    </button>
  )
}

type Sort = 'recommended' | 'cost' | 'duration'
type Band = 'all' | 'low' | 'mid' | 'high'
type DurationBand = 'all' | 'short' | 'medium' | 'long'

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0]
    previous[0] = row
    for (let column = 1; column <= right.length; column += 1) {
      const above = previous[column]
      previous[column] = Math.min(
        previous[column] + 1,
        previous[column - 1] + 1,
        diagonal + (left[row - 1] === right[column - 1] ? 0 : 1),
      )
      diagonal = above
    }
  }
  return previous[right.length]
}

export function Explore() {
  const [params] = useSearchParams()
  const { wishlist } = useApp()
  const { destinations, loading: destinationsLoading, error: destinationsError, retry } = usePublicDestinations()
  const month = new Date().getMonth() + 1
  const monthName = new Date().toLocaleString('en', { month: 'long' })
  const [slowLoading, setSlowLoading] = useState(false)

  const [query, setQuery] = useState(params.get('q') ?? '')
  const [category, setCategory] = useState<Category | 'all'>((params.get('category') as Category) ?? 'all')
  const [gemsOnly, setGemsOnly] = useState(params.get('gems') === '1')
  const [seasonOnly, setSeasonOnly] = useState(params.get('season') === '1')
  const [savedOnly, setSavedOnly] = useState(false)
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all')
  const [budgetBand, setBudgetBand] = useState<Band>('all')
  const [durationBand, setDurationBand] = useState<DurationBand>('all')
  const [sort, setSort] = useState<Sort>('recommended')
  const [showFilters, setShowFilters] = useState(false)
  /** Only while the live catalog is still the bundled fallback, and only if it is slow. */
  const showCatalogSkeleton = useDelayedFlag(destinationsLoading && destinations === DESTINATIONS, 180)

  useEffect(() => {
    if (!destinationsLoading) {
      setSlowLoading(false)
      return undefined
    }
    const timer = window.setTimeout(() => setSlowLoading(true), 4000)
    return () => window.clearTimeout(timer)
  }, [destinationsLoading])

  const paramString = params.toString()
  useEffect(() => {
    setQuery(params.get('q') ?? '')
    setCategory((params.get('category') as Category) ?? 'all')
    setGemsOnly(params.get('gems') === '1')
    setSeasonOnly(params.get('season') === '1')
  }, [paramString, params])

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    const searched = term
      ? destinations.filter((destination) =>
          [
            destination.name,
            destination.district,
            destination.province,
            destination.tagline,
            destination.summary,
            ...destination.activities,
            ...destination.highlights,
          ]
            .join(' ')
            .toLowerCase()
            .includes(term),
        )
      : seasonOnly
        ? destinations.filter((destination) => destination.bestMonths.includes(month))
        : [...destinations]
    let list = searched
    if (category !== 'all') list = list.filter((d) => d.category === category)
    if (gemsOnly) list = list.filter((d) => d.hiddenGem)
    if (savedOnly) list = list.filter((d) => wishlist.includes(d.slug))
    if (difficulty !== 'all') list = list.filter((d) => d.difficulty === difficulty)
    // A destination with no stated cost or duration matches neither band: it has
    // no place in "under Rs. 4,500" or "2–3 days" until an admin fills it in.
    if (budgetBand !== 'all') {
      list = list.filter((d) => {
        if (d.costPerDay === undefined) return false
        return budgetBand === 'low'
          ? d.costPerDay < 4500
          : budgetBand === 'mid'
            ? d.costPerDay < 6500
            : d.costPerDay >= 6500
      })
    }
    if (durationBand !== 'all') {
      list = list.filter((d) => {
        if (d.minDays === undefined || d.maxDays === undefined) return false
        return durationBand === 'short'
          ? d.maxDays <= 3
          : durationBand === 'medium'
            ? d.minDays <= 6 && d.maxDays >= 3
            : d.maxDays >= 7
      })
    }
    // Unpriced destinations sort last rather than first as a fake zero.
    if (sort === 'cost')
      list = [...list].sort((a, b) => (a.costPerDay ?? Infinity) - (b.costPerDay ?? Infinity))
    if (sort === 'duration')
      list = [...list].sort((a, b) => (a.minDays ?? Infinity) - (b.minDays ?? Infinity))
    return list
  }, [budgetBand, category, destinations, difficulty, durationBand, gemsOnly, month, query, savedOnly, seasonOnly, sort, wishlist])

  const recent = getRecent()
    .map(getDestination)
    .filter((d): d is NonNullable<typeof d> => Boolean(d) && destinations.some((item) => item.slug === d!.slug))
    .slice(0, 4)

  const normalizedQuery = query.trim().toLowerCase()
  const closestMatch = useMemo(() => {
    if (normalizedQuery.length < 3) return null
    const candidates = destinations.map((destination) => ({
      destination,
      distance: Math.min(
        ...destination.name
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter(Boolean)
          .map((word) => editDistance(normalizedQuery, word)),
        editDistance(normalizedQuery, destination.district.toLowerCase()),
      ),
    }))
    const closest = candidates.sort((a, b) => a.distance - b.distance)[0]
    return closest && closest.distance > 0 && closest.distance <= Math.max(2, Math.floor(normalizedQuery.length * 0.25))
      ? closest.destination
      : null
  }, [destinations, normalizedQuery])

  const similarSearches = useMemo(
    () =>
      destinations
        .filter((destination) => destination.name.toLowerCase() !== normalizedQuery)
        .slice(0, 3),
    [destinations, normalizedQuery],
  )

  const activeFilters = [
    category !== 'all',
    gemsOnly,
    seasonOnly,
    savedOnly,
    difficulty !== 'all',
    budgetBand !== 'all',
    durationBand !== 'all',
  ].filter(Boolean).length

  const reset = () => {
    setQuery('')
    setCategory('all')
    setGemsOnly(false)
    setSeasonOnly(false)
    setSavedOnly(false)
    setDifficulty('all')
    setBudgetBand('all')
    setDurationBand('all')
    setSort('recommended')
  }

  return (
    <div className="container-page py-10">
      <div className="max-w-3xl">
        <Pill tone="outline">
          <Compass size={12} /> Explore Nepal · no account needed
        </Pill>
        <h1 className="mt-4 font-display text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[0.98] tracking-tight">
          Find the Nepal you came for.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          {destinations.length} destinations across seven provinces, with honest costs, seasons and difficulty. Filter
          by what matters, save what interests you, and compare before you commit.
        </p>
      </div>

      {destinationsLoading ? (
        <section
          className="mt-5 rounded-2xl border border-line bg-white/55 p-4"
          role="progressbar"
          aria-label="Loading live destination updates"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-ink">Live destination updates</p>
              <p className="mt-1 text-[11px] text-ink-mute">
                {slowLoading
                  ? 'The live catalog is taking longer than usual. The local guide below is ready while it catches up.'
                  : 'Checking for the latest destination details. The local guide below is ready in the meantime.'}
              </p>
            </div>
            <span className="hidden text-[11px] font-medium uppercase tracking-wide text-ink-mute sm:block">
              {slowLoading ? 'Still loading' : 'Connecting'}
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3" aria-hidden="true">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-xl border border-line/70 bg-paper/70 p-2.5">
                <Skeleton className="h-10 w-12 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-2.5 w-3/4" />
                  <Skeleton className="h-2 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : destinationsError ? (
        <section role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-marigold/50 bg-marigold/10 px-4 py-3">
          <div>
            <p className="text-xs font-medium text-ink">Live destination updates couldn’t load.</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
              This is a PathYatra service or connection issue, not something you did. The local guide below still works; reconnect or try again for live details.
            </p>
          </div>
          <button type="button" onClick={retry} className="btn-ghost shrink-0 py-2 text-xs">
            <RotateCcw size={13} /> Try again
          </button>
        </section>
      ) : null}

      {/* Search + category rail */}
      <div className="mt-8 rounded-2xl border border-line bg-white/55 p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-field-line bg-paper px-3 focus-within:border-pine-3 focus-within:ring-2 focus-within:ring-pine/15">
            <Search size={16} className="text-ink-mute" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search destinations, districts, activities…"
              aria-label="Search destinations"
              className="w-full bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-ink-mute"
            />
            {query ? (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="text-ink-mute">
                <X size={14} />
              </button>
            ) : null}
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              className={cx('btn-ghost flex-1 sm:flex-none', activeFilters ? 'border-pine bg-pine/5 text-pine' : '')}
            >
              <Filter size={14} /> Filters {activeFilters ? `(${activeFilters})` : ''}
            </button>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              aria-label="Sort destinations"
              className="field min-w-[168px] max-w-[190px] py-2.5"
            >
              <option value="recommended">Recommended</option>
              <option value="cost">Lowest cost</option>
              <option value="duration">Shortest trip</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
          {/* Category: one at a time. */}
          <div className="min-w-0">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">Category</p>
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Category">
              <button
                type="button"
                onClick={() => setCategory('all')}
                aria-pressed={category === 'all'}
                className={cx(
                  'shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition',
                  category === 'all' ? 'border-pine bg-pine text-paper' : 'border-line text-ink-soft hover:border-pine-3',
                )}
              >
                All
              </button>
              {CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(category === item.id ? 'all' : item.id)}
                  aria-pressed={category === item.id}
                  className={cx(
                    'shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition',
                    category === item.id ? 'border-pine bg-pine text-paper' : 'border-line text-ink-soft hover:border-pine-3',
                  )}
                >
                  {item.short}
                </button>
              ))}
            </div>
          </div>

          {/* Filters: independent toggles that combine. */}
          <div className="min-w-0 sm:border-l sm:border-line sm:pl-5">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">Filters</p>
            <div
              className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5"
              role="group"
              aria-label="Filters, several can be on"
            >
              <ToggleChip
                active={gemsOnly}
                onClick={() => setGemsOnly((value) => !value)}
                label="Hidden gems"
                icon={Sparkles}
              />
              <ToggleChip
                active={seasonOnly}
                onClick={() => setSeasonOnly((value) => !value)}
                label={`In season · ${monthName}`}
                icon={Compass}
              />
              <ToggleChip
                active={savedOnly}
                onClick={() => setSavedOnly((value) => !value)}
                label="My wishlist"
                icon={Heart}
              />
            </div>
          </div>
        </div>

        {showFilters ? (
          <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-3">
            <label className="block">
              <span className="field-label">Difficulty</span>
              <select
                className="field"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value as Difficulty | 'all')}
              >
                <option value="all">Any difficulty</option>
                <option value="Easy">Easy</option>
                <option value="Moderate">Moderate</option>
                <option value="Challenging">Challenging</option>
                <option value="Difficult">Difficult</option>
              </select>
            </label>
            <label className="block">
              <span className="field-label">Budget per person, per day</span>
              <select className="field" value={budgetBand} onChange={(event) => setBudgetBand(event.target.value as Band)}>
                <option value="all">Any budget</option>
                <option value="low">Under Rs. 4,500</option>
                <option value="mid">Rs. 4,500 – 6,500</option>
                <option value="high">Rs. 6,500 and above</option>
              </select>
            </label>
            <label className="block">
              <span className="field-label">Trip length</span>
              <select
                className="field"
                value={durationBand}
                onChange={(event) => setDurationBand(event.target.value as DurationBand)}
              >
                <option value="all">Any length</option>
                <option value="short">Weekend · up to 3 days</option>
                <option value="medium">4 – 7 days</option>
                <option value="long">A week or more</option>
              </select>
            </label>
            <div className="sm:col-span-3 flex items-center justify-between">
              <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 text-[11px] text-ink-mute hover:text-ink">
                <RotateCcw size={12} /> Reset all filters
              </button>
              <p className="text-[11px] text-ink-mute">Costs are per person per day, excluding intercity transport.</p>
            </div>
          </div>
        ) : null}
      </div>

      {recent.length > 0 && !query && activeFilters === 0 ? (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">Recently viewed</p>
            <Link to="/mero-yatra?tab=favorites" className="text-[11px] text-ink-mute hover:text-pine">
              Wishlist
            </Link>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((destination) => (
              <MiniDestination key={destination.slug} slug={destination.slug} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-soft">
          <span className="font-semibold text-ink">{results.length}</span>{' '}
          {results.length === 1 ? 'destination' : 'destinations'}
          {query ? ` for “${query}”` : ''}
          {seasonOnly ? ` in season during ${monthName}` : ''}
        </p>
        {activeFilters > 0 ? (
          <button type="button" onClick={reset} className="text-[11px] text-clay hover:underline">
            Clear {activeFilters} filters
          </button>
        ) : null}
      </div>

      {results.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-paper-3 bg-white/40 px-6 py-16 text-center">
          <h2 className="font-display text-2xl">
            {query ? `No results for “${query}”.` : 'No destinations match these filters.'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            {query
              ? 'Check the spelling or try a broader place name. You can also clear filters to see more of Nepal.'
              : 'Your current filters rule out every destination. Remove a filter or reset them to see more of Nepal.'}
          </p>
          {query && closestMatch ? (
            <p className="mt-4 text-sm text-ink-soft">
              Did you mean{' '}
              <button
                type="button"
                onClick={() => setQuery(closestMatch.name)}
                className="font-semibold text-pine underline underline-offset-2"
              >
                {closestMatch.name}
              </button>
              ?
            </p>
          ) : null}
          {query && !closestMatch && similarSearches.length > 0 ? (
            <div className="mt-5">
              <p className="text-[11px] font-medium text-ink-mute">Try a next search</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {similarSearches.map((destination) => (
                  <button
                    key={destination.slug}
                    type="button"
                    onClick={() => setQuery(destination.name)}
                    className="rounded-full border border-line bg-white/70 px-3 py-1.5 text-[11px] text-ink-soft hover:border-pine-3 hover:text-pine"
                  >
                    {destination.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <button type="button" onClick={reset} className="btn-primary mt-6">
            {query ? 'Clear search and filters' : 'Reset filters'}
          </button>
        </div>
      ) : showCatalogSkeleton ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <DestinationCardSkeleton key={item} />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((destination, index) => (
            <DestinationCard
              key={destination.slug}
              destination={destination}
              enterDelay={staggerDelay(index)}
            />
          ))}
        </div>
      )}

      {!savedOnly && wishlist.length > 0 ? (
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper-2/50 px-5 py-4">
          <p className="text-xs text-ink-soft">
            <Heart size={12} className="mr-1.5 inline fill-saffron text-saffron" />
            {wishlist.length} {wishlist.length === 1 ? 'destination' : 'destinations'} on your wishlist
          </p>
          <button type="button" onClick={() => setSavedOnly(true)} className="inline-flex items-center gap-1 text-[11px] font-medium text-pine">
            Show only saved <ArrowUpRight size={12} />
          </button>
        </div>
      ) : null}
    </div>
  )
}
