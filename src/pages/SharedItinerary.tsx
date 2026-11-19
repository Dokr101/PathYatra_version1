import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, CalendarDays, MapPin, Printer, Users, Wallet } from 'lucide-react'
import { decodePlan } from '../lib/share'
import { getDestination } from '../data/destinations'
import { ORIGINS } from '../data/taxonomy'
import { formatDate, formatDateRange, npr } from '../lib/format'
import { DestinationImage } from '../components/DestinationImage'
import { EmptyState, Notice, Pill } from '../components/ui'

export function SharedItinerary() {
  const location = useLocation()
  const plan = useMemo(() => decodePlan(location.hash.replace(/^#/, '')), [location.hash])
  const destination = plan ? getDestination(plan.destinationSlug) : undefined
  const origin = plan ? ORIGINS.find((item) => item.id === plan.originId) : undefined

  if (!plan || !destination) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="This share link is not valid"
          description="The link may be incomplete or from an older version of PathYatra. Ask the sender for a fresh link, or start a plan of your own."
          action={
            <Link to="/plan" className="btn-primary">
              Plan a yatra <ArrowRight size={14} />
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="container-page py-10">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper-2/60 px-4 py-3">
        <p className="text-xs text-ink-soft">
          You are viewing a shared, read-only itinerary. Nothing here can be edited.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()} className="btn-ghost py-2 text-[11px]">
            <Printer size={12} /> Save as PDF
          </button>
          <Link to={`/plan?destination=${destination.slug}`} className="btn-primary py-2 text-[11px]">
            Make my own <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-line">
        <DestinationImage destination={destination} className="h-56 w-full sm:h-64" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-ink/5" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-paper">
          <Pill tone="marigold">Shared itinerary</Pill>
          <h1 className="mt-2 font-display text-[clamp(1.8rem,4vw,3rem)] leading-[1]">{plan.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-paper/80">
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} /> {destination.name}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={11} /> {formatDateRange(plan.startDate, plan.days)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users size={11} /> {plan.travelers} travellers
            </span>
            {origin ? <span>from {origin.name}</span> : null}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-3">
          {plan.itinerary.map((day) => (
            <article key={day.index} className="print-avoid-break rounded-2xl border border-line bg-white/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
                    Day {day.index} · {formatDate(day.date)}
                  </p>
                  <h2 className="mt-0.5 font-display text-lg leading-tight text-ink">{day.title}</h2>
                  <p className="text-[11px] text-ink-mute">{day.subtitle}</p>
                </div>
                {day.altitude ? <Pill tone="outline">{day.altitude.toLocaleString('en-IN')} m</Pill> : null}
              </div>
              <div className="mt-3 space-y-2">
                {day.blocks.map((block, index) => (
                  <div key={index} className="flex items-start gap-3 text-[11px]">
                    <span className="w-[70px] shrink-0 text-[11px] uppercase tracking-wide text-ink-mute">{block.time}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-ink">{block.title}</span>
                      {block.note ? <span className="block text-[11px] text-ink-mute">{block.note}</span> : null}
                    </span>
                    {block.cost > 0 ? <span className="shrink-0 text-[11px] text-ink-soft">{npr(block.cost)}</span> : null}
                  </div>
                ))}
              </div>
              <p className="mt-2 border-t border-line pt-2 text-[11px] text-ink-mute">
                {day.stay ? `Stay: ${day.stay}. ` : ''}
                {day.meals ? `Eat: ${day.meals}.` : ''}
              </p>
            </article>
          ))}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line bg-white/60 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">Shared cost summary</p>
            <p className="mt-1 font-display text-3xl leading-none text-ink">{npr(plan.costs.group)}</p>
            <p className="mt-1 text-xs text-ink-soft">
              {npr(plan.costs.perPerson)} per person · budget {npr(plan.costs.budget)}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Pill tone={plan.costs.remaining < 0 ? 'clay' : 'pine'}>
                {plan.costs.remaining < 0 ? 'Over budget' : `${npr(plan.costs.remaining)} left`}
              </Pill>
              <Pill tone="outline">{plan.days} days</Pill>
            </div>
            <div className="mt-4">
              <Notice>
                Estimates only. This shared link carries the plan itself, not an account or any booking. Confirm prices
                and conditions with operators.
              </Notice>
            </div>
            <Link to={`/plan?destination=${destination.slug}`} className="btn-primary mt-4 w-full">
              Plan your own version <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-3 rounded-2xl border border-line bg-paper-2/60 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
              <Wallet size={11} /> Travel notes
            </p>
            <ul className="mt-2 space-y-1.5">
              {plan.notes.slice(0, 4).map((note) => (
                <li key={note.slice(0, 20)} className="text-[11px] leading-relaxed text-ink-soft">
                  · {note}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
