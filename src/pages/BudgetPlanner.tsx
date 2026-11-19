import { useMemo, useState } from 'react'
import { ArrowRight, Calculator, Lightbulb, Wallet } from 'lucide-react'
import type { Accommodation, Transport } from '../types'
import { ACCOMMODATION_LABELS, CATEGORIES, ORIGINS, TRANSPORT_LABELS } from '../data/taxonomy'
import { DESTINATIONS, getDestination } from '../data/destinations'
import { buildRouteOptions, hoursLabel } from '../lib/route'
import { buildCostBreakdown, savingTips, VERDICT_COPY } from '../lib/pricing'
import { cx, NOT_PRICED, npr, nprShort } from '../lib/format'
import { ChoiceGrid, Notice, Pill } from '../components/ui'
import { DestinationImage } from '../components/DestinationImage'
import { useApp } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'

export function BudgetPlanner() {
  const { prefs } = useApp()
  const navigate = useNavigate()
  const [slug, setSlug] = useState('pokhara')
  const [originId, setOriginId] = useState(prefs.startPoint)
  const [travelers, setTravelers] = useState(2)
  const [days, setDays] = useState(3)
  const [budget, setBudget] = useState(30000)
  const [transport, setTransport] = useState<Transport>('mixed')
  const [accommodation, setAccommodation] = useState<Accommodation>('mid')

  const destination = getDestination(slug) ?? DESTINATIONS[1]
  const origin = ORIGINS.find((item) => item.id === originId) ?? ORIGINS[0]

  const route = useMemo(
    () => buildRouteOptions(destination, origin, travelers, transport).find((item) => item.type === 'budget')!,
    [destination, origin, travelers, transport],
  )

  const breakdown = useMemo(
    () =>
      buildCostBreakdown({
        destination,
        days,
        travelers,
        accommodation,
        route,
        activitySpend: days * 800,
        budget,
      }),
    [accommodation, budget, days, destination, route, travelers],
  )

  const verdict = VERDICT_COPY[breakdown.verdict]
  const tips = breakdown.verdict === 'comfortable' ? [] : savingTips(destination, days, travelers, accommodation, route, budget, breakdown)

  const cheaper = DESTINATIONS.filter((item) => {
    if (item.slug === destination.slug) return false
    const altRoute = buildRouteOptions(item, origin, travelers, transport).find((option) => option.type === 'budget')!
    const alt = buildCostBreakdown({
      destination: item,
      days,
      travelers,
      accommodation,
      route: altRoute,
      activitySpend: days * 700,
      budget,
    })
    return alt.group <= budget && alt.group >= budget * 0.55
  })
    .sort((a, b) => (a.costPerDay ?? Infinity) - (b.costPerDay ?? Infinity))
    .slice(0, 3)

  const maxLine = Math.max(...breakdown.lines.map((line) => line.group), 1)

  return (
    <div className="container-page py-10">
      <div className="max-w-3xl">
        <Pill tone="outline">
          <Calculator size={12} /> Standalone tool
        </Pill>
        <h1 className="mt-4 font-display text-[clamp(2rem,4.4vw,3.3rem)] leading-[1] tracking-tight">
          Budget planner.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Enter what you have, not what you hope. We will estimate the real cost of the trip and tell you plainly whether
          it fits — then show the three changes that close the gap.
        </p>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <div className="rounded-2xl border border-line bg-white/55 p-5 sm:p-6">
          <h2 className="font-display text-xl text-ink">The trip</h2>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="field-label">Destination</span>
              <select
                className="field"
                value={slug}
                onChange={(event) => {
                  const next = getDestination(event.target.value)
                  setSlug(event.target.value)
                  if (next) {
                    setDays(Math.min(10, Math.max(2, next.minDays ?? 3)))
                  }
                }}
              >
                {CATEGORIES.map((category) => (
                  <optgroup key={category.id} label={category.label}>
                    {DESTINATIONS.filter((item) => item.category === category.id).map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">Starting point</span>
                <select className="field" value={originId} onChange={(event) => setOriginId(event.target.value)}>
                  {ORIGINS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="field-label">Travellers</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="field"
                  value={travelers}
                  onChange={(event) => setTravelers(Math.max(1, Number(event.target.value) || 1))}
                />
              </label>
              <label className="block">
                <span className="field-label">Days</span>
                <input
                  type="number"
                  min={1}
                  max={21}
                  className="field"
                  value={days}
                  onChange={(event) => setDays(Math.min(21, Math.max(1, Number(event.target.value) || 1)))}
                />
              </label>
              <label className="block">
                <span className="field-label">Total budget (Rs.)</span>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  className="field"
                  value={budget}
                  onChange={(event) => setBudget(Math.max(0, Number(event.target.value) || 0))}
                />
              </label>
            </div>

            <div>
              <span className="field-label">Transportation</span>
              <ChoiceGrid
                columns={4}
                value={transport}
                onChange={setTransport}
                options={(Object.keys(TRANSPORT_LABELS) as Transport[]).map((value) => ({
                  value,
                  label: TRANSPORT_LABELS[value].split(' ')[0],
                }))}
              />
            </div>

            <div>
              <span className="field-label">Comfort level</span>
              <ChoiceGrid
                columns={3}
                value={accommodation}
                onChange={setAccommodation}
                options={(Object.keys(ACCOMMODATION_LABELS) as Accommodation[]).map((value) => ({
                  value,
                  label: value === 'budget' ? 'Budget' : value === 'mid' ? 'Mid-range' : 'Premium',
                }))}
              />
            </div>

            <label className="block">
              <span className="field-label">Quick budget presets</span>
              <div className="flex flex-wrap gap-2">
                {[15000, 30000, 60000, 120000].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setBudget(amount)}
                    className={cx(
                      'rounded-full border px-3 py-1.5 text-[11px] transition',
                      budget === amount ? 'border-pine bg-pine text-paper' : 'border-line text-ink-soft hover:border-pine-3',
                    )}
                  >
                    {nprShort(amount)}
                  </button>
                ))}
              </div>
            </label>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-line">
            <DestinationImage destination={destination} className="h-24 w-full" />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-mute">
            Route: {route.mode.toLowerCase()} · {route.distanceKm} km · {hoursLabel(route.hours)} each way. Public
            transport keeps this estimate at its floor.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-white/60 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">Estimated cost</p>
                <p className="mt-1 font-display text-[clamp(2rem,4vw,2.8rem)] leading-none text-ink">
                  {npr(breakdown.group)}
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  {npr(breakdown.perPerson)} per person · {travelers} {travelers === 1 ? 'traveller' : 'travellers'} ·{' '}
                  {days} days
                </p>
              </div>
              <span
                className={cx(
                  'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold',
                  breakdown.verdict === 'comfortable'
                    ? 'bg-pine text-paper'
                    : breakdown.verdict === 'on-track'
                      ? 'bg-[#f7e7c6] text-[#7a5410]'
                      : breakdown.verdict === 'tight'
                        ? 'bg-[#f7e7c6] text-[#7a5410]'
                        : 'bg-[#f3dcd4] text-clay',
                )}
              >
                {verdict.label}
              </span>
            </div>

            <div className="mt-4 rounded-xl bg-paper-2/60 px-3.5 py-2.5 text-xs leading-relaxed text-ink-soft">
              {breakdown.verdict === 'over'
                ? `Your budget of ${npr(budget)} may be tight for these preferences. Here are three ways to make this trip more affordable.`
                : verdict.note}
            </div>

            <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-paper-2">
              <div
                className={cx(
                  'h-full transition-all',
                  breakdown.verdict === 'over' ? 'bg-clay' : breakdown.verdict === 'tight' ? 'bg-marigold' : 'bg-pine-3',
                )}
                style={{ width: `${Math.min(100, (breakdown.group / Math.max(1, budget)) * 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-ink-mute">
              <span>Estimate {nprShort(breakdown.group)}</span>
              <span>Budget {nprShort(budget)}</span>
            </div>

            <div className="mt-5 space-y-2">
              {breakdown.lines.map((line) => (
                <div key={line.key}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-ink-soft">{line.label}</span>
                    <span className="text-ink-soft">{npr(line.group)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-2">
                    <div
                      className={cx(
                        'h-full rounded-full',
                        line.key === 'transport' ? 'bg-saffron' : line.key === 'accommodation' ? 'bg-pine-3' : 'bg-mist',
                      )}
                      style={{ width: `${(line.group / maxLine) * 100}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-[11px] text-ink-mute">{line.detail}</p>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-line pt-2 text-[11px]">
                <span className="text-ink-mute">Contingency (8%)</span>
                <span className="text-ink-soft">{npr(breakdown.contingency * travelers)}</span>
              </div>
            </div>

            <Notice tone="warn">
              Estimate only. Prices move with season, fuel and availability, and this planner does not include
              international flights or shopping.
            </Notice>
          </div>

          {tips.length > 0 ? (
            <div className="rounded-2xl border border-line bg-white/55 p-5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
                <Lightbulb size={12} /> Three ways to close the gap
              </p>
              <div className="mt-3 space-y-2.5">
                {tips.map((tip) => (
                  <div key={tip.title} className="rounded-xl border border-line/80 bg-paper px-3.5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-ink">{tip.title}</p>
                      <span className="shrink-0 text-[11px] font-medium text-pine">save {npr(tip.saving)}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">{tip.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-pine-3/30 bg-pine/5 p-5 text-xs leading-relaxed text-ink-soft">
              <p className="flex items-center gap-1.5 font-medium text-pine">
                <Wallet size={14} /> You have room to move.
              </p>
              <p className="mt-1.5">
                {npr(Math.max(0, budget - breakdown.group))} remains. Consider one extra day, a better teahouse, or
                keeping it as a genuine buffer for weather delays.
              </p>
            </div>
          )}

          {cheaper.length > 0 ? (
            <div className="rounded-2xl border border-line bg-white/55 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
                Affordable swaps at the same budget
              </p>
              <div className="mt-3 space-y-2">
                {cheaper.map((item) => (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => {
                      setSlug(item.slug)
                      setDays(Math.min(10, Math.max(2, item.minDays ?? 3)))
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-line/80 px-3 py-2 text-left transition hover:border-pine-3"
                  >
                    <span>
                      <span className="block text-xs font-medium text-ink">{item.name}</span>
                      <span className="block text-[11px] text-ink-mute">
                        {item.district} · {item.difficulty} ·{' '}
                        {item.costPerDay === undefined
                          ? NOT_PRICED.toLowerCase()
                          : `from ${npr(item.costPerDay)}/day`}
                      </span>
                    </span>
                    <ArrowRight size={13} className="shrink-0 text-pine" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() =>
              navigate(
                `/plan?destination=${destination.slug}`,
              )
            }
            className="btn-primary w-full"
          >
            Build this trip day by day <ArrowRight size={15} />
          </button>
          <p className="text-center text-[11px] text-ink-mute">
            {destination.costPerDay === undefined
              ? `${destination.name} has no local daily cost yet, so estimates use the national baseline.`
              : `The planner uses ${npr(destination.costPerDay)} per day as its local cost baseline for ${destination.name}.`}
          </p>
        </div>
      </div>
    </div>
  )
}
