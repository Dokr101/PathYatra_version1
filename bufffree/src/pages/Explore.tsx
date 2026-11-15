import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, Compass, Filter, Heart, RotateCcw, Search, Sparkles, X } from 'lucide-react'
import type { Category, Difficulty } from '../types'
import { CATEGORIES, MONTHS } from '../data/taxonomy'
import {
  DESTINATIONS,
  destinationsInSeason,
  getDestination,
  searchDestinations,
} from '../data/destinations'
import { useApp } from '../context/AppContext'
import { DestinationCard, MiniDestination } from '../components/DestinationCard'
import { Pill } from '../components/ui'
import { cx } from '../lib/format'
import { getRecent } from '../lib/recent'

type Sort = 'recommended' | 'cost' | 'duration'
type Band = 'all' | 'low' | 'mid' | 'high'
type DurationBand = 'all' | 'short' | 'medium' | 'long'

export function Explore() {
  const [params] = useSearchParams()
  const { wishlist } = useApp()
  const month = new Date().getMonth() + 1

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

  const paramString = params.toString()
  useEffect(() => {
    setQuery(params.get('q') ?? '')
    setCategory((params.get('category') as Category) ?? 'all')
    setGemsOnly(params.get('gems') === '1')
    setSeasonOnly(params.get('season') === '1')
  }, [paramString, params])

  const results = useMemo(() => {
    let list = query.trim() ? searchDestinations(query) : seasonOnly ? destinationsInSeason(month) : [...DESTINATIONS]
    if (category !== 'all') list = list.filter((d) => d.category === category)
    if (gemsOnly) list = list.filter((d) => d.hiddenGem)
    if (savedOnly) list = list.filter((d) => wishlist.includes(d.slug))
    if (difficulty !== 'all') list = list.filter((d) => d.difficulty === difficulty)
    if (budgetBand !== 'all') {
      list = list.filter((d) =>
        budgetBand === 'low' ? d.costPerDay < 4500 : budgetBand === 'mid' ? d.costPerDay < 6500 : d.costPerDay >= 6500,
      )
    }
    if (durationBand !== 'all') {
      list = list.filter((d) =>
        durationBand === 'short' ? d.maxDays <= 3 : durationBand === 'medium' ? d.minDays <= 6 && d.maxDays >= 3 : d.maxDays >= 7,
      )
    }
    if (sort === 'cost') list = [...list].sort((a, b) => a.costPerDay - b.costPerDay)
    if (sort === 'duration') list = [...list].sort((a, b) => a.minDays - b.minDays)
    return list
  }, [budgetBand, category, difficulty, durationBand, gemsOnly, month, query, savedOnly, seasonOnly, sort, wishlist])

  const recent = getRecent()
    .map(getDestination)
    .filter((d): d is NonNullable<typeof d> => Boolean(d))
    .slice(0, 4)

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
          {DESTINATIONS.length} destinations across seven provinces, with honest costs, seasons and difficulty. Filter
          by what matters, save what interests you, and compare before you commit.
        </p>
      </div>

      {/* Search + category rail */}
      <div className="mt-8 rounded-2xl border border-line bg-white/55 p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-paper px-3">
            <Search size={16} className="text-ink-mute" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search destinations, districts, activities…"
              aria-label="Search destinations"
              className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-ink-mute"
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
              className="field max-w-[170px] py-2.5"
            >
              <option value="recommended">Recommended</option>
              <option value="cost">Lowest cost</option>
              <option value="duration">Shortest trip</option>
            </select>
          </div>
        </div>

        <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={cx(
              'shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition',
              category === 'all' ? 'border-pine bg-pine text-paper' : 'border-line text-ink-soft hover:border-pine-3',
            )}
          >
            All of Nepal
          </button>
          {CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(category === item.id ? 'all' : item.id)}
              className={cx(
                'shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition',
                category === item.id ? 'border-pine bg-pine text-paper' : 'border-line text-ink-soft hover:border-pine-3',
              )}
            >
              {item.short}
            </button>
          ))}
          <span className="mx-1 w-px shrink-0 bg-line" />
          <button
            type="button"
            onClick={() => setGemsOnly((value) => !value)}
            className={cx(
              'shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition',
              gemsOnly ? 'border-marigold bg-marigold/20 text-ink' : 'border-line text-ink-soft hover:border-marigold',
            )}
          >
            <Sparkles size={11} className="mr-1 inline" /> Hidden gems
          </button>
          <button
            type="button"
            onClick={() => setSeasonOnly((value) => !value)}
            className={cx(
              'shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition',
              seasonOnly ? 'border-pine bg-pine text-paper' : 'border-line text-ink-soft hover:border-pine-3',
            )}
          >
            In season · {MONTHS[month - 1]}
          </button>
          <button
            type="button"
            onClick={() => setSavedOnly((value) => !value)}
            className={cx(
              'shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition',
              savedOnly ? 'border-saffron bg-saffron-soft text-clay' : 'border-line text-ink-soft hover:border-saffron',
            )}
          >
            <Heart size={11} className="mr-1 inline" /> My wishlist
          </button>
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
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-mute">Recently viewed</p>
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
          {seasonOnly ? ` in season during ${MONTHS[month - 1]}` : ''}
        </p>
        {activeFilters > 0 ? (
          <button type="button" onClick={reset} className="text-[11px] text-clay hover:underline">
            Clear {activeFilters} filters
          </button>
        ) : null}
      </div>

      {results.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-paper-3 bg-white/40 px-6 py-16 text-center">
          <h2 className="font-display text-2xl">No destinations matched that combination.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            Try removing a filter, widening the budget, or searching for a district instead of a full destination name.
          </p>
          <button type="button" onClick={reset} className="btn-primary mt-6">
            Reset filters
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((destination) => (
            <DestinationCard key={destination.slug} destination={destination} />
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
