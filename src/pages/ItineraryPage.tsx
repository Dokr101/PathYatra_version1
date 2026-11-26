import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CloudUpload,
  Copy,
  FileText,
  Lightbulb,
  MapPin,
  Pencil,
  Printer,
  Route as RouteIcon,
  Share2,
  Sparkles,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getDestination } from '../data/destinations'
import { ORIGINS } from '../data/taxonomy'
import { resolveOrigin } from '../lib/geolocation'
import { ADVISORIES } from '../data/content'
import { recalculatePlan, regenerateDay } from '../lib/itinerary'
import { savingTips, VERDICT_COPY } from '../lib/pricing'
import { copyText, shareLink } from '../lib/share'
import { cx, formatDate, formatDateRange, npr } from '../lib/format'
import { hoursLabel } from '../lib/route'
import { DayCard } from '../components/itinerary/DayCard'
import { CompanionTab } from '../components/itinerary/CompanionTab'
import { EmptyState, Modal, Notice, Pill, Stat } from '../components/ui'
import { DestinationImage } from '../components/DestinationImage'

type Tab = 'itinerary' | 'costs' | 'companion'

const STATUS_COPY = {
  draft: { label: 'Draft', tone: 'saffron' as const },
  upcoming: { label: 'Upcoming', tone: 'pine' as const },
  completed: { label: 'Completed', tone: 'marigold' as const },
}

export function ItineraryPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { trips, updateTrip, deleteTrip, setTripStatus, notify, user, openAuth } = useApp()
  const trip = trips.find((item) => item.id === id)
  const destination = trip ? getDestination(trip.destinationSlug) : undefined
  const origin = (trip ? resolveOrigin(trip.originId, trip.originLabel, trip.originLat, trip.originLng) : undefined) ?? ORIGINS[0]

  const [tab, setTab] = useState<Tab>('itinerary')
  const [editMode, setEditMode] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [link, setLink] = useState('')
  const [budgetDraft, setBudgetDraft] = useState(trip?.budget ?? 0)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [id])

  useEffect(() => {
    setBudgetDraft(trip?.budget ?? 0)
  }, [trip?.id, trip?.budget])

  const tips = useMemo(() => {
    if (!trip || !destination) return []
    if (trip.costs.verdict === 'comfortable' || trip.costs.verdict === 'on-track') return []
    return savingTips(
      destination,
      trip.days,
      trip.travelers,
      trip.accommodation,
      trip.route,
      trip.budget,
      trip.costs,
    )
  }, [destination, trip])

  const dailyTotals = useMemo(() => {
    if (!trip) return []
    return trip.itinerary.map((day) => ({
      index: day.index,
      total: day.blocks.filter((block) => block.kind !== 'travel').reduce((sum, block) => sum + block.cost, 0),
    }))
  }, [trip])

  const contingencyGroup = trip ? trip.costs.contingency * trip.travelers : 0
  const contingencyRate = trip ? Math.round((trip.costs.contingency / Math.max(1, trip.costs.perPerson)) * 200) / 2 : 0

  if (!trip || !destination) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<FileText size={20} />}
          title="This itinerary is not on this device"
          description="Saved plans live in the browser where they were created. You can generate a new plan in a minute, or open Mero Yatra to see what is saved here."
          action={
            <div className="flex flex-wrap gap-2">
              <Link to="/plan" className="btn-primary">
                Plan a new yatra
              </Link>
              <Link to="/mero-yatra" className="btn-ghost">
                Go to Mero Yatra
              </Link>
            </div>
          }
        />
      </div>
    )
  }

  const verdict = VERDICT_COPY[trip.costs.verdict]
  const status = STATUS_COPY[trip.status]
  const nextStatus =
    trip.status === 'draft'
      ? { label: 'Confirm this trip', value: 'upcoming' as const }
      : trip.status === 'upcoming'
        ? { label: 'Mark as completed', value: 'completed' as const }
        : { label: 'Move back to upcoming', value: 'upcoming' as const }
  const maxDaily = Math.max(...dailyTotals.map((item) => item.total), 1)

  const regenerate = (index: number) => {
    const updated = regenerateDay(trip, destination, index, Math.floor(Math.random() * 97) + 1)
    updateTrip(updated)
    notify('Day regenerated with different activities.')
  }

  const applyBudget = () => {
    const next = Number(budgetDraft)
    if (!Number.isFinite(next) || next < 1000) {
      notify('Enter a budget of at least Rs. 1,000.')
      return
    }
    updateTrip(recalculatePlan({ ...trip, budget: next }, destination))
    notify('Budget updated and the itinerary re-priced.')
  }

  const openShare = async () => {
    const url = shareLink(trip)
    setLink(url)
    setShareOpen(true)
    const copied = await copyText(url)
    if (copied) notify('Read-only link copied to your clipboard.')
  }

  return (
    <>
      <div className="no-print container-page py-8">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-mute">
          <Link to="/mero-yatra" className="inline-flex items-center gap-1 hover:text-pine">
            <ArrowLeft size={12} /> Mero Yatra
          </Link>
          <span>/</span>
          <span className="text-ink-soft">{trip.title}</span>
        </div>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={status.tone}>{status.label}</Pill>
              <Pill tone="outline">{trip.route.label}</Pill>
              {trip.costs.verdict === 'over' ? <Pill tone="clay">Over budget</Pill> : null}
            </div>
            <h1 className="mt-3 font-display text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] tracking-tight text-ink">
              {trip.title}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} /> {destination.name}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={12} /> {formatDateRange(trip.startDate, trip.days)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users size={12} /> {trip.travelers} {trip.travelers === 1 ? 'traveller' : 'travellers'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Wallet size={12} /> {npr(trip.costs.group)} estimated
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!user ? (
              <button
                type="button"
                onClick={() => openAuth('Sign in to save this trip to your account.', `/itinerary/${trip.id}`)}
                className="btn-saffron"
              >
                <CloudUpload size={14} /> Save to your account
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setEditMode((value) => !value)}
              className={cx('btn-ghost', editMode ? 'border-pine bg-pine/5 text-pine' : '')}
            >
              <Pencil size={14} /> {editMode ? 'Done editing' : 'Edit itinerary'}
            </button>
            <button type="button" onClick={openShare} className="btn-ghost">
              <Share2 size={14} /> Share
            </button>
            <button type="button" onClick={() => window.print()} className="btn-primary">
              <Printer size={14} /> Print / PDF
            </button>
          </div>
        </div>

        {editMode ? (
          <div className="mt-4 rounded-xl border border-pine/25 bg-pine/5 px-4 py-2.5 text-[11px] text-ink-soft">
            <strong className="font-semibold text-pine">Editing on.</strong> Rename or remove any activity, regenerate a
            day, or add a stop. The budget recalculates with every change.
          </div>
        ) : null}

        <div className="no-scrollbar mt-6 flex gap-1 overflow-x-auto border-b border-line">
          {([
            { id: 'itinerary', label: 'Day by day', icon: CalendarDays },
            { id: 'costs', label: 'Costs & budget', icon: Wallet },
            { id: 'companion', label: 'Travel companion', icon: Sparkles },
          ] as const).map((item) => {
            const Icon = item.icon
            const active = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cx(
                  'relative inline-flex shrink-0 items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition',
                  active ? 'text-pine' : 'text-ink-mute hover:text-ink',
                )}
              >
                <Icon size={14} /> {item.label}
                {active ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-pine" /> : null}
              </button>
            )
          })}
        </div>

        <div key={tab} className="tab-fade mt-6 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          <div className="min-w-0">
            {tab === 'itinerary' ? (
              <div className="space-y-3">
                {trip.itinerary.map((day) => (
                  <DayCard
                    key={day.index}
                    plan={trip}
                    destination={destination}
                    day={day}
                    editMode={editMode}
                    onRegenerate={() => regenerate(day.index - 1)}
                  />
                ))}

                <div className="rounded-2xl border border-line bg-paper-2/50 p-4">
                  <h3 className="flex items-center gap-1.5 font-display text-lg text-ink">
                    <Lightbulb size={15} className="text-marigold" /> Travel notes
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {trip.notes.map((note) => (
                      <li key={note.slice(0, 24)} className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-soft">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-saffron" />
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white/55 p-4">
                  <div>
                    <p className="text-xs font-medium text-ink">Not right yet?</p>
                    <p className="mt-0.5 text-[11px] text-ink-soft">
                      Change the budget, comfort level or route and regenerate the plan.
                    </p>
                  </div>
                  <Link to={`/plan?destination=${destination.slug}`} className="btn-ghost">
                    Start a new version <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ) : null}

            {tab === 'costs' ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-line bg-white/60 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">Estimated total</p>
                      <p className="mt-1 font-display text-[clamp(2rem,4vw,2.8rem)] leading-none text-ink">
                        {npr(trip.costs.group)}
                      </p>
                      <p className="mt-1 text-xs text-ink-soft">
                        {npr(trip.costs.perPerson)} per person · {npr(trip.costs.group / trip.days)} per day for the group
                      </p>
                    </div>
                    <div className="text-right">
                      <Pill
                        tone={
                          trip.costs.verdict === 'over'
                            ? 'clay'
                            : trip.costs.verdict === 'comfortable'
                              ? 'pine'
                              : 'marigold'
                        }
                      >
                        {verdict.label}
                      </Pill>
                      <p className="mt-2 text-[11px] text-ink-mute">Budget {npr(trip.budget)}</p>
                      <p
                        className={cx(
                          'text-xs font-medium',
                          trip.costs.remaining < 0 ? 'text-clay' : 'text-pine',
                        )}
                      >
                        {trip.costs.remaining < 0
                          ? `${npr(Math.abs(trip.costs.remaining))} over`
                          : `${npr(trip.costs.remaining)} left`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-paper-2">
                    <div
                      className={cx(
                        'h-full',
                        trip.costs.remaining < 0 ? 'bg-clay' : trip.costs.verdict === 'tight' ? 'bg-marigold' : 'bg-pine-3',
                      )}
                      style={{ width: `${Math.min(100, (trip.costs.group / Math.max(1, trip.budget)) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-ink-mute">{verdict.note}</p>

                  <div className="mt-4 flex flex-wrap items-end gap-2">
                    <label className="min-w-[180px] flex-1">
                      <span className="field-label">Adjust total budget (Rs.)</span>
                      <input
                        type="number"
                        min={1000}
                        step={1000}
                        className="field"
                        value={budgetDraft}
                        onChange={(event) => setBudgetDraft(Number(event.target.value))}
                      />
                    </label>
                    <button type="button" onClick={applyBudget} className="btn-primary mb-0.5">
                      Re-price plan
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-white/55 p-5">
                  <h3 className="font-display text-lg text-ink">Where the money goes</h3>
                  <div className="mt-3 space-y-3">
                    {trip.costs.lines.map((line) => (
                      <div key={line.key}>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-ink-soft">{line.label}</span>
                          <span className="text-ink-soft">
                            {npr(line.group)} <span className="text-ink-mute">· {npr(line.perPerson)} pp</span>
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-2">
                          <div
                            className={cx(
                              'h-full rounded-full',
                              line.key === 'transport'
                                ? 'bg-saffron'
                                : line.key === 'accommodation'
                                  ? 'bg-pine-3'
                                  : line.key === 'food'
                                    ? 'bg-marigold'
                                    : 'bg-mist',
                            )}
                            style={{ width: `${(line.group / Math.max(1, trip.costs.group)) * 100}%` }}
                          />
                        </div>
                        <p className="mt-0.5 text-[11px] text-ink-mute">{line.detail}</p>
                      </div>
                    ))}
                    <div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-ink-soft">Contingency buffer (≈{contingencyRate}%)</span>
                        <span className="text-ink-soft">
                          {npr(contingencyGroup)}{' '}
                          <span className="text-ink-mute">· {npr(trip.costs.contingency)} pp</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-2">
                        <div
                          className="h-full rounded-full bg-clay/60"
                          style={{ width: `${(contingencyGroup / Math.max(1, trip.costs.group)) * 100}%` }}
                        />
                      </div>
                      <p className="mt-0.5 text-[11px] text-ink-mute">
                        Weather delays, price changes and extra nights — the lines above plus this buffer make the
                        estimated total.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-white/55 p-5">
                  <h3 className="font-display text-lg text-ink">Daily spend pattern</h3>
                  <div className="mt-3 flex h-28 items-end gap-1.5">
                    {dailyTotals.map((item) => (
                      <div key={item.index} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t bg-pine-3/80"
                          style={{ height: `${Math.max(4, (item.total / maxDaily) * 90)}px` }}
                          title={npr(item.total)}
                        />
                        <span className="text-[11px] text-ink-mute">{item.index}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-ink-mute">
                    Activity spend by day, excluding transport and accommodation. Day one is usually lightest.
                  </p>
                </div>

                {tips.length > 0 ? (
                  <div className="rounded-2xl border border-line bg-white/55 p-5">
                    <h3 className="font-display text-lg text-ink">Ways to bring this down</h3>
                    <div className="mt-3 space-y-2">
                      {tips.map((tip) => (
                        <div key={tip.title} className="rounded-xl border border-line/80 px-3.5 py-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium text-ink">{tip.title}</p>
                            <span className="shrink-0 text-[11px] text-pine">save {npr(tip.saving)}</span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">{tip.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <Notice tone="warn">
                  Estimates use 2026 mid-range prices and modelled road distances. They are not quotes. Verify
                  accommodation, permits and transport with operators before paying.
                </Notice>
              </div>
            ) : null}

            {tab === 'companion' ? <CompanionTab plan={trip} destination={destination} /> : null}
          </div>

          {/* Sidebar */}
          <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-line bg-white/60">
              <div className="relative">
                <DestinationImage destination={destination} className="h-28 w-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 text-paper">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-paper/60">{destination.district}</p>
                  <p className="font-display text-base leading-tight">{destination.name}</p>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  <Stat value={trip.days} label="Days" />
                  <Stat value={trip.travelers} label="Travellers" />
                </div>
                <dl className="mt-3 space-y-2 text-[11px]">
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink-mute">From</dt>
                    <dd className="text-right font-medium text-ink">{origin.name}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink-mute">Start</dt>
                    <dd className="text-right font-medium text-ink">{formatDate(trip.startDate)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink-mute">Route</dt>
                    <dd className="text-right font-medium text-ink">{trip.route.label}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink-mute">Distance</dt>
                    <dd className="text-right font-medium text-ink">
                      {trip.route.distanceKm} km · {hoursLabel(trip.route.hours)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink-mute">Comfort</dt>
                    <dd className="text-right font-medium capitalize text-ink">{trip.accommodation}</dd>
                  </div>
                </dl>

                <button
                  type="button"
                  onClick={() => setTripStatus(trip.id, nextStatus.value)}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-pine px-4 py-2.5 text-xs font-medium text-paper transition hover:bg-pine-2"
                >
                  {trip.status === 'completed' ? <Sparkles size={13} /> : <Check size={13} />} {nextStatus.label}
                </button>
                <div className="mt-1.5 flex gap-1.5">
                  <button type="button" onClick={openShare} className="btn-ghost flex-1 py-2 text-[11px]">
                    <Copy size={12} /> Link
                  </button>
                  <button type="button" onClick={() => window.print()} className="btn-ghost flex-1 py-2 text-[11px]">
                    <Printer size={12} /> PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-white/55 p-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
                  <RouteIcon size={12} /> Route
                </p>
                <Pill tone="outline">{trip.routeType}</Pill>
              </div>
              <p className="mt-2 text-xs font-medium text-ink">{trip.route.mode}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">{trip.route.tradeoff}</p>
              <div className="mt-2 space-y-1">
                {trip.route.roads.map((road) => (
                  <p key={road} className="text-[11px] text-ink-mute">
                    · {road}
                  </p>
                ))}
              </div>
              {trip.route.stops.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {trip.route.stops.slice(0, 4).map((stop) => (
                    <span key={stop.name} className="chip">
                      {stop.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-marigold/40 bg-marigold/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7a5410]">
                Live conditions
              </p>
              <p className="mt-1.5 text-[11px] font-medium text-ink">{ADVISORIES[1].title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">{ADVISORIES[1].body}</p>
              <Link to={`/explore/${destination.slug}`} className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#7a5410]">
                See the destination forecast <ArrowRight size={10} />
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2 text-[11px] text-ink-mute transition hover:border-clay/40 hover:text-clay"
            >
              <Trash2 size={12} /> Delete this itinerary
            </button>
          </aside>
        </div>
      </div>

      {/* Print view */}
      <section className="hidden print:block print:px-0">
        <div className="mb-6 border-b border-ink/20 pb-4">
          <p className="text-[11px] uppercase tracking-[0.08em]">PathYatra · Nepal travel companion</p>
          <h1 className="mt-2 font-display text-3xl">{trip.title}</h1>
          <p className="mt-1 text-sm">
            {destination.name} · {formatDateRange(trip.startDate, trip.days)} · {trip.travelers}{' '}
            {trip.travelers === 1 ? 'traveller' : 'travellers'}
          </p>
          <p className="mt-1 text-xs">
            From {origin.name} · {trip.route.label} · {trip.route.distanceKm} km · {hoursLabel(trip.route.hours)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 border-b border-ink/15 pb-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider">Estimated total</p>
            <p className="font-display text-lg">{npr(trip.costs.group)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider">Per person</p>
            <p className="font-display text-lg">{npr(trip.costs.perPerson)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider">Budget</p>
            <p className="font-display text-lg">{npr(trip.budget)}</p>
          </div>
        </div>

        {trip.itinerary.map((day) => (
          <div key={day.index} className="print-avoid-break mt-4 border-b border-ink/10 pb-3">
            <h2 className="font-display text-base">
              Day {day.index} · {formatDate(day.date)} · {day.title}
            </h2>
            <p className="text-[11px] text-ink-soft">{day.subtitle}</p>
            <ul className="mt-1 space-y-0.5">
              {day.blocks.map((block, index) => (
                <li key={index} className="text-[11px]">
                  <span className="inline-block w-16 font-medium">{block.time}</span>
                  {block.title}
                  {block.cost > 0 ? ` · ${npr(block.cost)}` : ''}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-[11px] text-ink-soft">
              {day.stay ? `Stay: ${day.stay}. ` : ''}
              {day.meals ? `Eat: ${day.meals}.` : ''}
            </p>
          </div>
        ))}

        <div className="print-avoid-break mt-4">
          <h2 className="font-display text-base">Budget breakdown</h2>
          <table className="mt-1 w-full text-[11px]">
            <tbody>
              {trip.costs.lines.map((line) => (
                <tr key={line.key} className="border-b border-ink/10">
                  <td className="py-0.5">{line.label}</td>
                  <td className="py-0.5 text-right">{npr(line.perPerson)} pp</td>
                  <td className="py-0.5 text-right">{npr(line.group)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-0.5">Contingency (8%)</td>
                <td className="py-0.5 text-right">{npr(trip.costs.contingency)} pp</td>
                <td className="py-0.5 text-right">{npr(trip.costs.contingency * trip.travelers)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="print-avoid-break mt-4">
          <h2 className="font-display text-base">Packing checklist</h2>
          <p className="text-[11px]">{trip.packing.join(' · ')}</p>
        </div>

        <div className="print-avoid-break mt-4">
          <h2 className="font-display text-base">Travel notes and safety</h2>
          <ul className="mt-1 space-y-0.5">
            {trip.notes.map((note) => (
              <li key={note.slice(0, 20)} className="text-[11px]">
                · {note}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px]">
            Emergency: Police 100 · Ambulance 102 · Tourist Police 1144. Estimates are indicative, not bookings. Verify
            conditions with official sources.
          </p>
        </div>
      </section>

      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share this itinerary"
        description="The link carries the plan itself, so it opens read-only on another device without an account."
      >
        <textarea
          readOnly
          value={link}
          rows={4}
          className="field resize-none font-mono text-[11px] leading-relaxed"
          aria-label="Share link"
          onFocus={(event) => event.target.select()}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              const copied = await copyText(link)
              notify(copied ? 'Link copied.' : 'Copy failed — select the link and copy it manually.')
            }}
            className="btn-primary"
          >
            <Copy size={14} /> Copy link
          </button>
          <a href={link} target="_blank" rel="noopener noreferrer" className="btn-ghost">
            Open preview <ArrowRight size={14} />
          </a>
        </div>
        <div className="mt-3">
          <Notice>
            The share payload includes the day plan and cost summary. It does not include your account, wishlist or
            expense log.
          </Notice>
        </div>
        <button
          type="button"
          onClick={() => setShareOpen(false)}
          className="mt-3 inline-flex items-center gap-1 text-[11px] text-ink-mute"
        >
          <X size={11} /> Close
        </button>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this itinerary?"
        description="The plan will be removed from this browser. This cannot be undone."
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteOpen(false)} className="btn-ghost">
              Keep it
            </button>
            <button
              type="button"
              onClick={() => {
                deleteTrip(trip.id)
                setDeleteOpen(false)
                navigate('/mero-yatra')
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-clay px-5 py-2.5 text-xs font-medium text-white"
            >
              <Trash2 size={13} /> Delete itinerary
            </button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-ink-soft">
          You are deleting <strong className="font-medium text-ink">{trip.title}</strong> for {destination.name}. Your
          wishlist and reviews are not affected.
        </p>
      </Modal>
    </>
  )
}
