import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Crosshair,
  Loader2,
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
import { DayCardSkeleton } from '../components/CardSkeletons'
import { loadPlanDraft, savePlanDraft, type PlanDraft } from '../lib/planDraft'
import { buildRouteOptions, hoursLabel } from '../lib/route'
import { useGeolocation } from '../lib/useGeolocation'
import {
  MY_LOCATION_ID,
  MY_LOCATION_NAME,
  approximateCoordinate,
  coordinateLabel,
  myLocationOrigin,
  resolveOrigin,
} from '../lib/geolocation'
import { buildCostBreakdown, VERDICT_COPY } from '../lib/pricing'
import {
  addDays,
  cx,
  formatDate,
  hasLocation,
  LOCATION_NOT_SET,
  NOT_PRICED,
  npr,
  stayLabel,
  STAY_NOT_SET,
  todayISO,
} from '../lib/format'
import { ChoiceGrid, Notice, Pill } from '../components/ui'
import { DestinationImage } from '../components/DestinationImage'

const STEPS = ['Trip basics', 'Travel style', 'Interests', 'Route']

function suggestedDays(destination: Destination): number {
  // Only a starting value for the day counter: the "Suggested …" caption below
  // shows an explicit gap instead of inventing a range.
  const minDays = destination.minDays ?? 3
  const maxDays = destination.maxDays ?? Math.max(minDays, minDays + 2)
  return Math.min(maxDays, Math.max(3, minDays))
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
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, openAuth, notify, saveTrip, prefs } = useApp()

  // A draft restored from sessionStorage keeps a mid-wizard refresh (or the
  // sign-in round trip) from throwing the four steps of answers away.
  const savedDraft = useMemo(loadPlanDraft, [])
  const requestedDestination = params.get('destination')
  // A link to a different place starts a fresh plan; otherwise the draft wins.
  const restored =
    requestedDestination && requestedDestination !== savedDraft?.destinationSlug ? null : savedDraft
  const preset =
    getDestination(requestedDestination ?? savedDraft?.destinationSlug ?? undefined) ?? DESTINATIONS[0]
  const [destinationSlug, setDestinationSlug] = useState(preset.slug)
  const destination = getDestination(destinationSlug) ?? DESTINATIONS[0]
  // A GPS origin restored from the draft is rebuilt from its saved coordinates;
  // without them the draft falls back to the traveller's usual starting city.
  const restoredFix =
    restored !== null &&
    restored.originId === MY_LOCATION_ID &&
    typeof restored.originLat === 'number' &&
    typeof restored.originLng === 'number' &&
    Number.isFinite(restored.originLat) &&
    Number.isFinite(restored.originLng)
      ? { lat: restored.originLat, lng: restored.originLng, label: restored.originLabel ?? MY_LOCATION_NAME }
      : null
  const [originId, setOriginId] = useState(
    restored?.originId === MY_LOCATION_ID && !restoredFix
      ? prefs.startPoint
      : (restored?.originId ?? prefs.startPoint),
  )
  const [myLocation, setMyLocation] = useState<{
    lat: number
    lng: number
    label: string
    accuracyMeters?: number
  } | null>(restoredFix)
  const [startDate, setStartDate] = useState(restored?.startDate ?? addDays(todayISO(), 14))
  const [days, setDays] = useState(restored?.days ?? suggestedDays(preset))
  const [travelers, setTravelers] = useState(restored?.travelers ?? 2)
  const [budget, setBudget] = useState(() =>
    restored?.budget ??
    suggestedBudget(
      preset,
      ORIGINS.find((item) => item.id === prefs.startPoint) ?? ORIGINS[0],
      prefs.transport,
      prefs.accommodation,
      2,
    ),
  )
  const [budgetEditing, setBudgetEditing] = useState(false)
  const [budgetDigits, setBudgetDigits] = useState(() => String(budget))
  const [style, setStyle] = useState<TravelStyle>(restored?.style ?? prefs.style)
  const [pace, setPace] = useState<Pace>(restored?.pace ?? prefs.pace)
  const [transport, setTransport] = useState<Transport>(restored?.transport ?? prefs.transport)
  const [accommodation, setAccommodation] = useState<Accommodation>(restored?.accommodation ?? prefs.accommodation)
  const [interests, setInterests] = useState<string[]>(restored?.interests ?? prefs.interests)
  const [routeType, setRouteType] = useState<RouteType>(restored?.routeType ?? 'scenic')
  const [step, setStep] = useState(restored?.step ?? 0)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { fix: geoFix, request: requestLocation, reset: resetLocation } = useGeolocation()
  const origin: Origin =
    originId === MY_LOCATION_ID && myLocation
      ? myLocationOrigin(myLocation.lat, myLocation.lng, myLocation.label)
      : resolveOrigin(originId) ?? ORIGINS[0]
  const locating = geoFix.status === 'requesting'

  /** One tap, one fix. The coordinates stay in this tab's draft, never in prefs. */
  const locateMe = async () => {
    const next = await requestLocation()
    if (next.status !== 'success' || typeof next.lat !== 'number' || typeof next.lng !== 'number') return
    setMyLocation({
      lat: next.lat,
      lng: next.lng,
      label: next.label ?? MY_LOCATION_NAME,
      accuracyMeters: next.accuracyMeters,
    })
    setOriginId(MY_LOCATION_ID)
  }

  const chooseOrigin = (value: string) => {
    if (value !== MY_LOCATION_ID) {
      // A picked city replaces the GPS point, so no stale fix lingers in the draft.
      setMyLocation(null)
      resetLocation()
    }
    setOriginId(value)
  }

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

  const planDraft: PlanDraft = useMemo(
    () => ({
      destinationSlug,
      originId,
      ...(originId === MY_LOCATION_ID && myLocation
        ? {
            originLabel: myLocation.label,
            originLat: approximateCoordinate(myLocation.lat),
            originLng: approximateCoordinate(myLocation.lng),
          }
        : {}),
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
      step,
    }),
    [
      accommodation,
      budget,
      days,
      destinationSlug,
      interests,
      myLocation,
      originId,
      pace,
      routeType,
      startDate,
      step,
      style,
      transport,
      travelers,
    ],
  )

  // Persist on every change: a refresh mid-wizard restores this exact state.
  useEffect(() => {
    savePlanDraft(planDraft)
  }, [planDraft])

  /** Snapshot the answers, then hand off to sign-in. Called before the modal opens. */
  const signInToSave = () => {
    savePlanDraft(planDraft)
    openAuth('Sign in to save this trip to your account.', '/plan')
  }

  const chooseDestination = (slug: string) => {
    const next = getDestination(slug)
    if (!next) return
    setDestinationSlug(slug)
    setDays(suggestedDays(next))
    setBudget(suggestedBudget(next, origin, transport, accommodation, travelers))
    // Keep the URL in step with the wizard so a reload restores this destination
    // rather than the one the traveller originally arrived with.
    const nextParams = new URLSearchParams(params)
    if (nextParams.get('destination') !== slug) {
      nextParams.set('destination', slug)
      setParams(nextParams, { replace: true })
    }
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
    // Show the day skeletons for a beat first; the build itself is synchronous.
    setGenerating(true)
    window.setTimeout(() => {
      try {
        runGenerate()
      } finally {
        setGenerating(false)
      }
    }, 650)
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
                    'hidden text-[11px] font-medium uppercase tracking-[0.08em] sm:block',
                    index === step ? 'text-ink' : 'text-ink-mute',
                  )}
                >
                  {index + 1}. {label}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-line bg-white/55 p-5 sm:p-6">
            {generating ? (
              <div role="status" aria-live="polite">
                <p className="flex items-center gap-2 font-display text-xl text-ink">
                  <Sparkles size={16} className="animate-pulse text-marigold" />
                  Assembling {days === 1 ? 'your day' : `your ${days} days`}
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  Weighing road time, altitude, season and your budget{origin ? ` from ${origin.name}` : ''}.
                </p>
                <div className="mt-4 space-y-3" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((item) => (
                    <DayCardSkeleton key={item} />
                  ))}
                </div>
              </div>
            ) : null}

            {!generating && step === 0 ? (
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
                  <div className="block">
                    <label className="field-label" htmlFor="planner-origin">
                      Starting point
                    </label>
                    <select
                      id="planner-origin"
                      className="field"
                      value={originId}
                      onChange={(event) => chooseOrigin(event.target.value)}
                    >
                      {myLocation ? <option value={MY_LOCATION_ID}>{MY_LOCATION_NAME}</option> : null}
                      {ORIGINS.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <button
                        type="button"
                        onClick={() => void locateMe()}
                        disabled={locating}
                        aria-describedby="planner-origin-hint"
                        className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-ink-soft transition hover:border-pine-3 hover:text-pine disabled:opacity-60"
                      >
                        {locating ? <Loader2 size={11} className="animate-spin" /> : <Crosshair size={11} />}
                        {locating ? 'Locating…' : 'Use my location'}
                      </button>
                      <span id="planner-origin-hint" className="text-[11px] leading-snug text-ink-mute">
                        {myLocation
                          ? `GPS point · ${coordinateLabel(myLocation.lat, myLocation.lng)}${
                              myLocation.accuracyMeters ? ` · ±${myLocation.accuracyMeters} m` : ''
                            } · this plan only`
                          : locating
                            ? 'Waiting for your browser’s permission.'
                            : 'Or pick a city from the list.'}
                      </span>
                      <span role="status" aria-live="polite" className="sr-only">
                        {locating ? 'Finding your location' : ''}
                      </span>
                    </div>
                    {geoFix.status === 'error' && geoFix.errorMessage ? (
                      <div className="mt-2">
                        <Notice tone="warn">{geoFix.errorMessage}</Notice>
                      </div>
                    ) : null}
                  </div>
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
                    <span className="mt-1 block text-[11px] text-ink-mute">
                      {destination.minDays === undefined || destination.maxDays === undefined
                        ? STAY_NOT_SET
                        : `Suggested ${stayLabel(destination.minDays, destination.maxDays)}`}
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
                      type="text"
                      inputMode="numeric"
                      className="field"
                      value={budgetEditing ? budgetDigits : npr(budget)}
                      onFocus={() => {
                        setBudgetEditing(true)
                        setBudgetDigits(String(budget))
                      }}
                      onChange={(event) => {
                        const digits = event.target.value.replace(/[^0-9]/g, '')
                        setBudgetDigits(digits)
                        setBudget(Number(digits) || 0)
                      }}
                      onBlur={() => setBudgetEditing(false)}
                    />
                  </div>
                  <span className="mt-1 block text-[11px] text-ink-mute">
                    Everything except international flights. {npr(estimate.group)} is our current estimate.
                  </span>
                </label>

                {destination.minDays !== undefined &&
                destination.maxDays !== undefined &&
                (days < destination.minDays || days > destination.maxDays) ? (
                  <Notice tone="warn">
                    {days} days sits outside the usual {destination.minDays}–{destination.maxDays} day range for this
                    place. The plan will still generate, but expect a compressed or stretched version of the route.
                  </Notice>
                ) : null}
              </div>
            ) : null}

            {!generating && step === 1 ? (
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

            {!generating && step === 2 ? (
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

            {!generating && step === 3 ? (
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
                        <p className="mt-2 text-[11px] leading-relaxed text-ink-mute">{option.tradeoff}</p>
                      </button>
                    )
                  })}
                </div>
                {origin.id === MY_LOCATION_ID ? (
                  <Notice>
                    Routing from your GPS point uses the road model only. Flights are offered from Kathmandu, Pokhara
                    and Lumbini, so the fastest option here is overland.
                  </Notice>
                ) : null}
                <Notice tone="warn">
                  Distances and drive times are modelled from coordinates and road class, not live traffic. Roads in
                  Nepal change with weather. Check conditions before departure.
                </Notice>
                {error ? (
                  <p className="rounded-xl border border-clay/30 bg-clay/10 px-3 py-2 text-xs text-clay">{error}</p>
                ) : null}
              </div>
            ) : null}

            {generating ? null : (
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
            )}
          </div>
        </div>

        {/* Summary rail */}
        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-line bg-white/60">
            <div className="relative">
              <DestinationImage destination={destination} className="h-32 w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3 text-paper">
                <p className="text-[11px] uppercase tracking-[0.08em] text-paper/60">
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
              {destination.costPerDay === undefined || !hasLocation(destination) ? (
                <p className="mt-2 rounded-lg bg-marigold/15 px-2 py-1.5 text-[11px] leading-snug text-[#7a5410]">
                  {[
                    destination.costPerDay === undefined
                      ? `${NOT_PRICED}: daily costs use the national baseline.`
                      : null,
                    hasLocation(destination)
                      ? null
                      : `${LOCATION_NOT_SET}: distance and transport are placeholders.`,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                </p>
              ) : null}

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

              <div className="mt-3 rounded-xl bg-paper-2/60 px-3 py-2 text-[11px] leading-relaxed text-ink-soft">
                {verdict.note}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Pill tone="outline">{days} days</Pill>
                <Pill tone="outline">{formatDate(startDate)}</Pill>
                <Pill tone="outline">{selectedRoute.label}</Pill>
                <Pill tone="outline">{interests.length} interests</Pill>
              </div>

              {!user ? (
                <div className="mt-3 rounded-xl border border-line bg-white/60 px-3 py-2.5">
                  <p className="text-[11px] leading-relaxed text-ink-mute">
                    Generate and explore the plan without an account. It stays on this device until you sign in.
                  </p>
                  <button
                    type="button"
                    onClick={signInToSave}
                    className="mt-1.5 text-[11px] font-medium text-pine underline underline-offset-2 hover:text-clay"
                  >
                    Sign in to save this trip to your account
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-paper-2/50 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
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
