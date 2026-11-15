import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  MapPin,
  Route,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'
import type { Accommodation, Destination, Origin, Pace, RouteType, Transport, TravelStyle } from '../types'
import {
  CATEGORIES,
  ORIGINS,
  INTERESTS,
  STYLE_LABELS,
  PACE_LABELS,
  TRANSPORT_LABELS,
  ACCOMMODATION_LABELS,
} from '../data/taxonomy'
import { DESTINATIONS, getDestination } from '../data/destinations'
import { useApp } from '../context/AppContext'
import { generateTrip } from '../lib/itinerary'
import { buildRouteOptions, hoursLabel } from '../lib/route'
import { buildCostBreakdown, VERDICT_COPY } from '../lib/pricing'
import { addDays, cx, npr, todayISO } from '../lib/format'
import { ChoiceGrid, Notice, Pill } from '../components/ui'
import { ScenicArt } from '../components/ScenicArt'

const STEPS = ['Trip basics', 'Travel style', 'Interests', 'Route']

function suggestedDays(destination: Destination): number {
  return Math.min(destination.maxDays, Math.max(3, destination.minDays))
}

function suggestedBudget(
  destination: Destination,
  origin: Origin,
  transport: Transport,
  accommodation: Accommodation,
  travelers: number,
): number {
  const days = suggestedDays(destination)
  const sample = generateTrip({
    destination,
    origin,
    startDate: todayISO(),
    days,
    travelers,
    budget: 0,
    style: 'mixed',
    pace: 'balanced',
    transport,
    accommodation,
    interests: [],
    routeType: 'scenic',
  })
  return Math.max(10000, Math.round((sample.costs.group * 1.12) / 5000) * 5000)
}

export function Planner() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, openAuth, notify, saveTrip, prefs } = useApp()

  const preset = getDestination(params.get('destination') ?? undefined) ?? DESTINATIONS[0]
  const [destinationSlug, setDestinationSlug] = useState(preset.slug)
  const destination = getDestination(destinationSlug) ?? DESTINATIONS[0]
  const [originId, setOriginId] = useState(prefs.startPoint)
  const [startDate, setStartDate] = useState(addDays(todayISO(), 14))
  const [days, setDays] = useState(suggestedDays(preset))
  const [travelers, setTravelers] = useState(2)
  const [budget, setBudget] = useState(() =>
    suggestedBudget(
      preset,
      ORIGINS.find((item) => item.id === prefs.startPoint) ?? ORIGINS[0],
      prefs.transport,
      prefs.accommodation,
      2,
    ),
  )
  const [style, setStyle] = useState<TravelStyle>(prefs.style)
  const [pace, setPace] = useState<Pace>(prefs.pace)
  const [transport, setTransport] = useState<Transport>(prefs.transport)
  const [accommodation, setAccommodation] = useState<Accommodation>(prefs.accommodation)
  const [interests, setInterests] = useState<string[]>(prefs.interests)
  const [routeType, setRouteType] = useState<RouteType>('scenic')
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(false)

  const origin = ORIGINS.find((item) => item.id === originId) ?? ORIGINS[0]
  const routes = useMemo(
    () => buildRouteOptions(destination, origin, travelers, transport),
    [destination, origin, travelers, transport],
  )
  const selectedRoute = routes.find((option) => option.type === routeType) ?? routes[0]
  const estimate = useMemo(
    () =>
      buildCostBreakdown({
        destination,
        days,
        travelers,
        accommodation,
        route: selectedRoute,
        activitySpend: days * 900,
        budget,
      }),
    [accommodation, budget, days, destination, selectedRoute, travelers],
  )
  const verdict = VERDICT_COPY[estimate.verdict]

  useEffect(() => {
    if (user && pending.current) {
      pending.current = false
      runGenerate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const chooseDestination = (slug: string) => {
    const next = getDestination(slug)
    if (!next) return
    setDestinationSlug(slug)
    setDays(suggestedDays(next))
    setBudget(suggestedBudget(next, origin, transport, accommodation, travelers))
  }

  const toggleInterest = (id: string) => {
    setInterests((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  function runGenerate() {
    if (!destination) return
    const plan = generateTrip({
      destination,
      origin,
      startDate,
      days,
      travelers,
      budget,
      style,
      pace,
      transport,
      accommodation,
      interests,
      routeType,
    })
    saveTrip(plan)
    notify('Itinerary generated. Review it, then customise anything that feels wrong.')
    navigate(`/itinerary/${plan.id}`)
  }

  const generate = () => {
    setError(null)
    if (days < 1 || days > 21) {
      setError('Choose between 1 and 21 days.')
      return
    }
    if (travelers < 1 || travelers > 20) {
      setError('Choose between 1 and 20 travellers.')
      return
    }
    if (budget < 5000) {
      setError('A total budget under Rs. 5,000 is unlikely to cover transport, food and a bed. Increase it or try the budget planner first.')
      return
    }
    if (!user) {
      pending.current = true
      openAuth('Sign in to generate and save your itinerary. Your answers on this page are kept exactly as they are.', '/plan')
      return
    }
    runGenerate()
  }

  return (
    <div className="container-page py-10">
      <div className="max-w-3xl">
        <Pill tone="outline">
          <Sparkles size={12} /> Trip setup
        </Pill>
        <h1 className="mt-4 font-display text-[clamp(2rem,4.2vw,3.2rem)] leading-[1] tracking-tight">
          Plan your yatra.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Four short steps. We will weigh season, road time, altitude, permits, your pace and your budget — then show
          you the plan, not just a PDF.
        </p>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div>
          {/* Stepper */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(index)}
                className="flex flex-1 flex-col gap-1.5 text-left"
                aria-current={step === index}
              >
                <span
                  className={cx(
                    'h-1 w-full rounded-full transition',
                    index <= step ? 'bg-pine' : 'bg-paper-3',
                  )}
                />
                <span
                  className={cx(
                    'hidden text-[10px] font-medium uppercase tracking-[0.12em] sm:block',
                    index === step ? 'text-ink' : 'text-ink-mute',
                  )}
                >
                  {index + 1}. {label}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-line bg-white/55 p-5 sm:p-6">
            {step === 0 ? (
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-xl text-ink">Where and when</h2>
                  <p className="mt-1 text-xs text-ink-soft">Start with the shape of the trip. You can change everything later.</p>
                </div>

                <label className="block">
                  <span className="field-label">Destination</span>
                  <select className="field" value={destinationSlug} onChange={(event) => chooseDestination(event.target.value)}>
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
                    <span className="field-label">Start date</span>
                    <input
                      type="date"
                      className="field"
                      min={todayISO()}
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="field-label">Days on the road</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDays((value) => Math.max(1, value - 1))}
                        className="h-9 w-9 shrink-0 rounded-full border border-line text-sm text-ink-soft transition hover:bg-paper-2"
                        aria-label="Fewer days"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={21}
                        className="field text-center"
                        value={days}
                        onChange={(event) => setDays(Number(event.target.value) || 1)}
                      />
                      <button
                        type="button"
                        onClick={() => setDays((value) => Math.min(21, value + 1))}
                        className="h-9 w-9 shrink-0 rounded-full border border-line text-sm text-ink-soft transition hover:bg-paper-2"
                        aria-label="More days"
                      >
                        +
                      </button>
                    </div>
                    <span className="mt-1 block text-[10px] text-ink-mute">
                      Suggested {destination.minDays}–{destination.maxDays} days
                    </span>
                  </label>
                  <label className="block">
                    <span className="field-label">Travellers</span>
                    <div className="flex items-center gap-2">
                      <Users size={15} className="text-ink-mute" />
                      <input
                        type="number"
                        min={1}
                        max={20}
                        className="field"
                        value={travelers}
                        onChange={(event) => setTravelers(Number(event.target.value) || 1)}
                      />
                    </div>
                  </label>
                </div>

                <label className="block">
                  <span className="field-label">Total budget for the group (Rs.)</span>
                  <div className="flex items-center gap-2">
                    <Wallet size={16} className="text-ink-mute" />
                    <input
                      type="number"
                      min={5000}
                      step={5000}
                      className="field"
                      value={budget}
                      onChange={(event) => setBudget(Number(event.target.value) || 0)}
                    />
                  </div>
                  <span className="mt-1 block text-[10px] text-ink-mute">
                    Everything except international flights. {npr(estimate.group)} is our current estimate.
                  </span>
                </label>

                {days < destination.minDays || days > destination.maxDays ? (
                  <Notice tone="warn">
                    {days} days sits outside the usual {destination.minDays}–{destination.maxDays} day range for this
                    place. The plan will still generate, but expect a compressed or stretched version of the route.
                  </Notice>
                ) : null}
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-xl text-ink">How you like to travel</h2>
                  <p className="mt-1 text-xs text-ink-soft">These choices change the pace, the route and the cost model.</p>
                </div>

                <div>
                  <span className="field-label">Travel style</span>
                  <ChoiceGrid
                    columns={2}
                    value={style}
                    onChange={setStyle}
                    options={(Object.keys(STYLE_LABELS) as TravelStyle[]).map((value) => ({
                      value,
                      label: STYLE_LABELS[value],
                    }))}
                  />
                </div>

                <div>
                  <span className="field-label">Preferred pace</span>
                  <ChoiceGrid
                    columns={3}
                    value={pace}
                    onChange={setPace}
                    options={(Object.keys(PACE_LABELS) as Pace[]).map((value) => ({
                      value,
                      label: PACE_LABELS[value].split('—')[0].trim(),
                      hint: PACE_LABELS[value].split('—')[1]?.trim(),
                    }))}
                  />
                </div>

                <div>
                  <span className="field-label">Transportation</span>
                  <ChoiceGrid
                    columns={4}
                    value={transport}
                    onChange={setTransport}
                    options={(Object.keys(TRANSPORT_LABELS) as Transport[]).map((value) => ({
                      value,
                      label: TRANSPORT_LABELS[value],
                    }))}
                  />
                </div>

                <div>
                  <span className="field-label">Accommodation</span>
                  <ChoiceGrid
                    columns={3}
                    value={accommodation}
                    onChange={setAccommodation}
                    options={(Object.keys(ACCOMMODATION_LABELS) as Accommodation[]).map((value) => ({
                      value,
                      label: ACCOMMODATION_LABELS[value].split('—')[0].trim(),
                      hint: ACCOMMODATION_LABELS[value].split('—')[1]?.trim(),
                    }))}
                  />
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-xl text-ink">What would you like to experience?</h2>
                  <p className="mt-1 text-xs text-ink-soft">Pick as many as you like. They shape the activities in your days.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {INTERESTS.map((interest) => {
                    const active = interests.includes(interest.id)
                    return (
                      <button
                        key={interest.id}
                        type="button"
                        onClick={() => toggleInterest(interest.id)}
                        aria-pressed={active}
                        className={cx(
                          'flex items-center justify-between rounded-xl border px-3.5 py-3 text-left text-xs transition',
                          active ? 'border-pine bg-pine text-paper' : 'border-line bg-white/60 text-ink hover:border-pine-3',
                        )}
                      >
                        {interest.label}
                        <span
                          className={cx(
                            'flex h-4 w-4 items-center justify-center rounded-full border',
                            active ? 'border-paper bg-paper text-pine' : 'border-line',
                          )}
                        >
                          {active ? <Check size={10} strokeWidth={3} /> : null}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <Notice>
                  Interests nudge which activities appear. Local food, viewpoints and cultural walks are always in the
                  mix unless you remove them.
                </Notice>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-xl text-ink">Choose your route</h2>
                  <p className="mt-1 text-xs text-ink-soft">
                    {origin.name} → {destination.name.split('&')[0].trim()} · {travelers}{' '}
                    {travelers === 1 ? 'traveller' : 'travellers'}
                  </p>
                </div>
                <div className="space-y-2.5">
                  {routes.map((option) => {
                    const active = option.type === routeType
                    return (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() => setRouteType(option.type)}
                        className={cx(
                          'w-full rounded-2xl border p-4 text-left transition',
                          active ? 'border-pine bg-pine/5' : 'border-line bg-white/50 hover:border-pine-3',
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                              {option.label}
                              {active ? <Check size={14} className="text-pine" /> : null}
                            </p>
                            <p className="text-[11px] text-ink-mute">{option.headline}</p>
                          </div>
                          <p className="text-sm font-medium text-pine">{npr(option.costPerPerson * 2)}</p>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-soft">
                          <span className="inline-flex items-center gap-1">
                            <Route size={11} /> {option.distanceKm} km
                          </span>
                          <span>{hoursLabel(option.hours)} each way</span>
                          <span>{option.mode}</span>
                        </div>
                        {option.stops.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {option.stops.slice(0, 3).map((stop) => (
                              <span key={stop.name} className="chip">
                                <MapPin size={9} /> {stop.name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <p className="mt-2 text-[10px] leading-relaxed text-ink-mute">{option.tradeoff}</p>
                      </button>
                    )
                  })}
                </div>
                <Notice tone="warn">
                  Distances and drive times are modelled from coordinates and road class, not live traffic. Roads in
                  Nepal change with weather. Check conditions before departure.
                </Notice>
                {error ? (
                  <p className="rounded-xl border border-clay/30 bg-clay/10 px-3 py-2 text-xs text-clay">{error}</p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setStep((value) => Math.max(0, value - 1))}
                disabled={step === 0}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft disabled:opacity-30"
              >
                <ArrowLeft size={14} /> Back
              </button>
              {step < 3 ? (
                <button type="button" onClick={() => setStep((value) => value + 1)} className="btn-primary">
                  Continue <ArrowRight size={14} />
                </button>
              ) : (
                <button type="button" onClick={generate} className="btn-saffron">
                  <Sparkles size={15} /> Generate itinerary
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Summary rail */}
        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-line bg-white/60">
            <div className="relative">
              <ScenicArt scene={destination.scene} className="h-32 w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3 text-paper">
                <p className="text-[9px] uppercase tracking-[0.16em] text-paper/60">
                  {destination.district} · {destination.difficulty}
                </p>
                <p className="font-display text-lg leading-tight">{destination.name}</p>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-mute">Planning estimate</span>
                <Pill tone={estimate.verdict === 'over' ? 'clay' : estimate.verdict === 'comfortable' ? 'pine' : 'marigold'}>
                  {verdict.label}
                </Pill>
              </div>
              <p className="mt-2 font-display text-3xl leading-none text-ink">{npr(estimate.group)}</p>
              <p className="mt-1 text-[11px] text-ink-soft">
                {npr(estimate.perPerson)} per person · {travelers} {travelers === 1 ? 'traveller' : 'travellers'}
              </p>

              <div className="mt-3 space-y-1.5">
                {estimate.lines.map((line) => (
                  <div key={line.key} className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-mute">{line.label}</span>
                    <span className="text-ink-soft">{npr(line.group)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-line pt-1.5 text-[11px]">
                  <span className="text-ink-mute">Contingency</span>
                  <span className="text-ink-soft">{npr(estimate.contingency * travelers)}</span>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-paper-2/60 px-3 py-2 text-[10px] leading-relaxed text-ink-soft">
                {verdict.note}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Pill tone="outline">{days} days</Pill>
                <Pill tone="outline">{startDate}</Pill>
                <Pill tone="outline">{selectedRoute.label}</Pill>
                <Pill tone="outline">{interests.length} interests</Pill>
              </div>

              {!user ? (
                <p className="mt-3 text-[10px] leading-relaxed text-ink-mute">
                  You can complete every step without an account. Sign-in is requested only when you generate the plan.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-paper-2/50 p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-mute">
              <Compass size={12} /> What happens next
            </p>
            <ol className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-ink-soft">
              <li>1. Day-by-day plan with travel, activities and meals.</li>
              <li>2. Editable days, add or remove stops, regenerate a day.</li>
              <li>3. Cost breakdown, packing list and travel notes.</li>
              <li>4. Print-ready PDF or a read-only share link.</li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  )
}
