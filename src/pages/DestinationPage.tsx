import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Backpack,
  CalendarDays,
  ChevronRight,
  Clock,
  Compass,
  HardDrive,
  Heart,
  Layers,
  MapPin,
  Mountain,
  ShieldCheck,
  Star,
  Ticket,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react'
import { CATEGORY_MAP } from '../data/destinations'
import { usePublicDestinations } from '../lib/publicDestinations'
import { useDestinationReviews } from '../lib/publicReviews'
import { ORIGINS, MONTHS } from '../data/taxonomy'
import { useApp } from '../context/AppContext'
import { buildCostBreakdown } from '../lib/pricing'
import { routeByType } from '../lib/route'
import {
  costPerDayLabel,
  cx,
  formatDate,
  hasLocation,
  LOCATION_NOT_SET,
  monthIndex,
  monthsLabel,
  NOT_PRICED,
  npr,
  safeHttpUrl,
  SEASON_NOT_SET,
  stayLabel,
} from '../lib/format'
import { trackRecent } from '../lib/recent'
import { DestinationImage } from '../components/DestinationImage'
import { ScenicArt } from '../components/ScenicArt'
import { WeatherPanel } from '../components/WeatherPanel'
import { MapView } from '../components/MapViewLazy'
import { DestinationCard } from '../components/DestinationCard'
import { Pill, Rating, SectionHeading } from '../components/ui'
import { NotFound } from './NotFound'

export function DestinationPage() {
  const { slug } = useParams()
  const { destinations, loading: destinationsLoading } = usePublicDestinations()
  const destination = destinations.find((item) => item.slug === slug)
  const {
    wishlist,
    toggleWishlist,
    wishlistSyncError,
    retryWishlistSync,
    compare,
    toggleCompare,
    myReviews,
    prefs,
    user,
  } = useApp()
  const {
    reviews: serverReviews,
    reviewCount: serverReviewCount,
    averageRating: serverAverageRating,
    error: reviewsError,
    retry: retryReviews,
  } = useDestinationReviews(destination?.slug)

  useEffect(() => {
    if (destination) trackRecent(destination.slug)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [destination])

  const origin = ORIGINS.find((item) => item.id === prefs.startPoint) ?? ORIGINS[0]
  const month = new Date().getMonth() + 1

  const estimate = useMemo(() => {
    // No stated stay length or daily cost means there is no honest estimate; the
    // cost section says so instead of pricing a fabricated stay.
    if (!destination || destination.minDays === undefined || destination.costPerDay === undefined) {
      return null
    }
    const days = destination.minDays
    const travelers = 2
    const route = routeByType(destination, origin, travelers, 'mixed', 'budget')
    return { days, travelers, route, breakdown: buildCostBreakdown({
      destination,
      days,
      travelers,
      accommodation: 'mid',
      route,
      activitySpend: 0,
      budget: 0,
    }) }
  }, [destination, origin])

  if (!destination) {
    if (destinationsLoading) {
      return (
        <div className="container-page py-16" aria-busy="true">
          <div className="h-72 animate-pulse rounded-3xl bg-paper-2" />
          <div className="mt-6 h-4 w-1/2 animate-pulse rounded bg-paper-2" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-paper-2" />
        </div>
      )
    }
    return <NotFound />
  }

  const category = CATEGORY_MAP[destination.category]
  const saved = wishlist.includes(destination.slug)
  const comparing = compare.includes(destination.slug)
  const explicitRelated = destination.nearby
    .map((item) => destinations.find((entry) => entry.slug === item))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
  const related =
    explicitRelated.length >= 3
      ? explicitRelated.slice(0, 3)
      : [
          ...explicitRelated,
          ...destinations.filter(
            (item) =>
              item.category === destination.category &&
              item.slug !== destination.slug &&
              !explicitRelated.some((entry) => entry.slug === item.slug),
          ),
        ].slice(0, 3)
  const serverReviewIds = new Set(serverReviews.map((review) => review.id))
  // Once the server has the review, its (approved) copy wins over the local one.
  const ownReviews = myReviews.filter(
    (review) =>
      review.destinationSlug === destination.slug &&
      !serverReviewIds.has(review.id) &&
      !(review.serverId && serverReviewIds.has(review.serverId)),
  )
  const destinationReviews = [...ownReviews, ...serverReviews].slice(0, 2)
  const approvedReviews = destination.reviewCount ?? serverReviewCount
  const averageRating = destination.averageRating ?? serverAverageRating
  const travelMonth = monthIndex(formatDate(new Date().toISOString()))
  const seasonKnown = destination.bestMonths.length > 0
  const inSeason = seasonKnown && destination.bestMonths.includes(travelMonth)

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'highlights', label: 'Highlights' },
    { id: 'season', label: 'Best time' },
    { id: 'activities', label: 'Activities' },
    { id: 'food', label: 'Local food' },
    { id: 'essentials', label: 'Essentials' },
    ...(destination.travelInfo && destination.travelInfo.length > 0
      ? [{ id: 'travel-info', label: 'Travel info' }]
      : []),
    { id: 'cost', label: 'Cost' },
  ]

  return (
    <div>
      <div className="container-page pt-5">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-mute">
          <Link to="/explore" className="inline-flex items-center gap-1 hover:text-pine">
            <ArrowLeft size={12} /> Explore Nepal
          </Link>
          <ChevronRight size={11} />
          <Link to={`/explore?category=${destination.category}`} className="hover:text-pine">
            {category.short}
          </Link>
          <ChevronRight size={11} />
          <span className="text-ink-soft">{destination.name}</span>
        </div>
      </div>

      {/* Hero */}
      <section className="container-page mt-3">
        <div className="relative overflow-hidden rounded-[26px] border border-line">
          <DestinationImage
            destination={destination}
            eager
            sizes="100vw"
            className="h-[380px] w-full sm:h-[460px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/35 to-ink/5" />

          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <Pill tone="pine">{category.short}</Pill>
            {destination.hiddenGem ? <Pill tone="marigold">Hidden gem</Pill> : null}
            {inSeason ? <Pill tone="marigold">In season now</Pill> : null}
          </div>

          <div className="absolute right-4 top-4 flex gap-2">
            <button
              type="button"
              onClick={() => toggleWishlist(destination.slug)}
              aria-pressed={saved}
              className={cx(
                'flex items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-medium backdrop-blur-sm transition',
                saved ? 'border-saffron bg-saffron text-white' : 'border-paper/40 bg-ink/25 text-paper hover:bg-ink/40',
              )}
            >
              <Heart size={13} className={saved ? 'fill-current' : ''} /> {saved ? 'Saved' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => toggleCompare(destination.slug)}
              aria-pressed={comparing}
              className={cx(
                'flex items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-medium backdrop-blur-sm transition',
                comparing ? 'border-paper bg-paper text-pine' : 'border-paper/40 bg-ink/25 text-paper hover:bg-ink/40',
              )}
            >
              <Layers size={13} /> {comparing ? 'Comparing' : 'Compare'}
            </button>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-5 text-paper sm:p-8">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-paper/70">
              <MapPin size={11} /> {destination.district} · {destination.province} Province
            </p>
            <h1 className="mt-2 max-w-3xl font-display text-[clamp(2rem,4.6vw,3.5rem)] leading-[0.98] tracking-tight text-paper">
              {destination.name}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-paper/80">{destination.tagline}</p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Link to={`/plan?destination=${destination.slug}`} className="btn-saffron">
                Begin Your Yatra <ArrowRight size={15} />
              </Link>
              <span className="text-[11px] text-paper/60">
                {user
                  ? 'Saved to your account · available on every device you sign in to'
                  : 'Free to explore · sign in to save the plan'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {wishlistSyncError ? (
        <div className="container-page mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-marigold/40 bg-marigold/10 px-4 py-3">
          <p role="status" className="text-xs text-ink-soft">
            <strong className="font-semibold text-ink">Saved on this device.</strong> {wishlistSyncError}
          </p>
          <button type="button" onClick={retryWishlistSync} className="btn-ghost shrink-0 py-2 text-xs">
            Retry sync
          </button>
        </div>
      ) : null}

      <div className="container-page mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        {/* Main */}
        <div className="min-w-0">
          <nav className="no-print sticky top-[68px] z-30 -mx-1 mb-6 overflow-x-auto border-b border-line bg-paper/95 py-2 backdrop-blur">
            <div className="no-scrollbar flex gap-1">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="shrink-0 rounded-full px-3 py-1.5 text-[11px] text-ink-soft transition hover:bg-paper-2 hover:text-ink"
                >
                  {section.label}
                </a>
              ))}
            </div>
          </nav>

          <section id="overview" className="scroll-mt-32">
            <h2 className="font-display text-2xl text-ink">The place</h2>
            <div className="mt-3 space-y-3">
              {destination.overview.map((paragraph) => (
                <p key={paragraph.slice(0, 24)} className="text-sm leading-[1.75] text-ink-soft">
                  {paragraph}
                </p>
              ))}
            </div>
            {destination.history ? (
              <div className="mt-5 rounded-2xl border border-line bg-white/50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">History & context</p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{destination.history}</p>
              </div>
            ) : null}
          </section>

          <section id="highlights" className="mt-10 scroll-mt-32">
            <h2 className="font-display text-2xl text-ink">What makes it special</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {destination.highlights.map((highlight) => (
                <div key={highlight} className="flex items-start gap-2 rounded-xl border border-line bg-white/40 px-3 py-2.5">
                  <Star size={13} className="mt-0.5 shrink-0 fill-marigold text-marigold" />
                  <span className="text-xs leading-snug text-ink-soft">{highlight}</span>
                </div>
              ))}
            </div>
          </section>

          <section id="season" className="mt-10 scroll-mt-32">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-ink">When to go</h2>
                <p className="mt-1 text-xs text-ink-soft">
                  Recommended months are shaded. The current month is outlined.
                </p>
              </div>
              {seasonKnown ? (
                <Pill tone={inSeason ? 'pine' : 'saffron'}>
                  {inSeason ? `Good in ${MONTHS[month - 1]}` : `Off-season in ${MONTHS[month - 1]}`}
                </Pill>
              ) : (
                <Pill tone="outline">{SEASON_NOT_SET}</Pill>
              )}
            </div>
            <div className="mt-4 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
              {MONTHS.map((label, index) => {
                const best = destination.bestMonths.includes(index + 1)
                const now = index + 1 === month
                return (
                  <div
                    key={label}
                    className={cx(
                      'rounded-lg border px-1 py-2 text-center transition',
                      best ? 'border-pine/30 bg-pine text-paper' : 'border-line bg-white/40 text-ink-mute',
                      now && 'ring-2 ring-marigold ring-offset-1 ring-offset-paper',
                    )}
                  >
                    <p className="text-[11px] font-medium">{label.slice(0, 3)}</p>
                    <p className={cx('mt-0.5 text-[11px] uppercase tracking-wider', best ? 'text-paper/60' : 'text-ink-mute/70')}>
                      {best ? 'good' : 'off'}
                    </p>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-soft">
              Best months: <strong className="font-medium text-ink">{monthsLabel(destination.bestMonths)}</strong>. The
              live forecast below covers the next seven days; seasonal normals fill in when dates fall beyond the
              forecast window.
            </p>
          </section>

          <section id="activities" className="mt-10 scroll-mt-32">
            <h2 className="font-display text-2xl text-ink">Things to experience</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {destination.activities.map((activity) => (
                <li key={activity} className="flex items-start gap-2 text-sm text-ink-soft">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-saffron" />
                  {activity}
                </li>
              ))}
            </ul>
          </section>

          <section id="food" className="mt-10 scroll-mt-32">
            <h2 className="flex items-center gap-2 font-display text-2xl text-ink">
              <UtensilsCrossed size={18} className="text-clay" /> Eat this
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {destination.food.map((dish) => (
                <span key={dish} className="rounded-full border border-line bg-white/55 px-3.5 py-2 text-xs text-ink-soft">
                  {dish}
                </span>
              ))}
            </div>
          </section>

          <section id="essentials" className="mt-10 scroll-mt-32">
            <h2 className="flex items-center gap-2 font-display text-2xl text-ink">
              <Backpack size={18} className="text-pine" /> Travel essentials
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {destination.essentials.map((item) => (
                <div key={item} className="flex items-start gap-2 rounded-xl border border-line bg-white/40 px-3 py-2.5">
                  <ShieldCheck size={13} className="mt-0.5 shrink-0 text-pine-3" />
                  <span className="text-xs leading-snug text-ink-soft">{item}</span>
                </div>
              ))}
            </div>
            {destination.permit ? (
              <div className="mt-3 rounded-xl border border-marigold/40 bg-marigold/10 p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7a5410]">
                  <Ticket size={12} /> Permit required
                </p>
                <p className="mt-1 text-xs font-medium text-ink">{destination.permit.name}</p>
                <p className="mt-0.5 text-[11px] text-ink-soft">
                  About {npr(destination.permit.cost)} per person.
                  {destination.permit.note ? ` ${destination.permit.note}.` : ''}
                </p>
              </div>
            ) : null}
          </section>

          {destination.travelInfo && destination.travelInfo.length > 0 ? (
            <section id="travel-info" className="mt-10 scroll-mt-32">
              <h2 className="flex items-center gap-2 font-display text-2xl text-ink">
                <ShieldCheck size={18} className="text-pine" /> Travel information
              </h2>
              <p className="mt-1 text-xs text-ink-soft">
                Maintained by the PathYatra editors. Check the source and date before relying on a fee or rule.
              </p>
              <div className="mt-3 space-y-2.5">
                {destination.travelInfo.map((info) => {
                  const sourceUrl = safeHttpUrl(info.sourceUrl)
                  return (
                    <article key={info.id} className="rounded-xl border border-line bg-white/50 p-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-ink">{info.title}</p>
                        <span
                          className={cx(
                            'rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]',
                            info.statusLabel === 'VERIFIED'
                              ? 'border-pine/30 bg-pine/10 text-pine'
                              : info.statusLabel === 'ESTIMATE'
                                ? 'border-marigold/40 bg-marigold/15 text-[#7a5410]'
                                : 'border-line bg-paper-2 text-ink-mute',
                          )}
                        >
                          {info.statusLabel.replaceAll('_', ' ')}
                        </span>
                        {info.category ? <span className="chip">{info.category}</span> : null}
                      </div>
                      <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-ink-soft">{info.content}</p>
                      <p className="mt-2 text-[11px] text-ink-mute">
                        {sourceUrl ? (
                          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-pine hover:underline">
                            {info.sourceName || 'Source'}
                          </a>
                        ) : (
                          info.sourceName || 'No source listed'
                        )}
                        {info.lastVerifiedAt ? ` · checked ${formatDate(info.lastVerifiedAt)}` : ''}
                        {info.validUntil ? ` · valid until ${formatDate(info.validUntil)}` : ''}
                      </p>
                    </article>
                  )
                })}
              </div>
            </section>
          ) : null}

          <section id="cost" className="mt-10 scroll-mt-32">
            <h2 className="flex items-center gap-2 font-display text-2xl text-ink">
              <Wallet size={18} className="text-pine" /> What it costs
            </h2>
            {estimate ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white/55">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper-2/50 px-4 py-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.08em] text-ink-mute">Typical estimate</p>
                    <p className="mt-0.5 font-display text-xl leading-none text-ink">
                      {npr(estimate.breakdown.perPerson)}{' '}
                      <span className="font-sans text-[11px] font-normal text-ink-soft">per person</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-ink-mute">For {estimate.travelers} travellers</p>
                    <p className="mt-0.5 text-sm font-medium text-ink">{npr(estimate.breakdown.group)}</p>
                  </div>
                </div>
                <div className="divide-y divide-line/70">
                  {estimate.breakdown.lines.map((line) => (
                    <div key={line.key} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
                      <div>
                        <p className="font-medium text-ink">{line.label}</p>
                        <p className="text-[11px] text-ink-mute">{line.detail}</p>
                      </div>
                      <p className="shrink-0 text-ink-soft">{npr(line.perPerson)}</p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3 bg-paper-2/40 px-4 py-2.5 text-xs">
                    <div>
                      <p className="font-medium text-ink">Contingency (8%)</p>
                      <p className="text-[11px] text-ink-mute">Weather delays, extra nights and price changes</p>
                    </div>
                    <p className="shrink-0 text-ink-soft">{npr(estimate.breakdown.contingency)}</p>
                  </div>
                </div>
                <div className="bg-paper-2/30 px-4 py-2.5 text-[11px] leading-relaxed text-ink-mute">
                  Based on {estimate.days} days from {origin.name} by {estimate.route.mode.toLowerCase()}, mid-range
                  stays. Excludes international flights and personal shopping. Build a plan to adjust days, travellers
                  and comfort level.
                </div>
              </div>
            ) : (
              <p className="mt-3 rounded-2xl border border-line bg-white/55 p-4 text-sm text-ink-soft">
                {NOT_PRICED} — no suggested stay or daily cost has been published for this place yet, so
                we do not show an estimate rather than invent one.
              </p>
            )}
          </section>

          <section className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-ink">Scenes from the route</h2>
              <span className="text-[11px] uppercase tracking-[0.08em] text-ink-mute">Illustrated</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((index) => (
                <div key={index} className="overflow-hidden rounded-xl border border-line">
                  <ScenicArt
                    scene={{
                      ...destination.scene,
                      seed: destination.scene.seed + index * 11,
                      sky: (['dawn', 'clear', 'dusk'] as const)[index],
                    }}
                    className="h-24 w-full sm:h-32"
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-ink-mute">
              Original artwork generated for PathYatra rather than stock photography. It is indicative of the landscape,
              not a literal view.
            </p>
          </section>

          <section className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="font-display text-2xl text-ink">Community reviews</h2>
              <p className="flex items-center gap-2 text-[11px] text-ink-mute">
                {averageRating !== null ? (
                  <span className="inline-flex items-center gap-1">
                    <Rating value={averageRating} size={11} /> {averageRating.toFixed(1)}
                  </span>
                ) : null}
                <span>
                  {approvedReviews} approved {approvedReviews === 1 ? 'review' : 'reviews'}
                </span>
              </p>
            </div>
            {reviewsError ? (
              <div
                role="status"
                className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-paper-2/60 px-3 py-2"
              >
                <p className="text-[11px] text-ink-soft">Approved reviews could not be loaded just now.</p>
                <button type="button" onClick={retryReviews} className="text-[11px] font-medium text-pine">
                  Try again
                </button>
              </div>
            ) : null}
            {destinationReviews.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">
                No community reviews yet.{' '}
                <Link to={`/reviews?destination=${destination.slug}`} className="text-pine underline underline-offset-2">
                  Be the first to write one
                </Link>
                .
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {destinationReviews.map((review) => (
                  <div key={review.id} className="rounded-2xl border border-line bg-white/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium text-ink">{review.author}</p>
                      <div className="flex items-center gap-1.5">
                        {review.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-marigold/40 bg-marigold/15 px-2 py-0.5 text-[11px] font-medium text-[#7a5410]">
                            <Clock size={9} /> Pending moderation
                          </span>
                        ) : null}
                        {review.syncState && review.syncState !== 'synced' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper-2 px-2 py-0.5 text-[11px] font-medium text-ink-mute">
                            <HardDrive size={9} /> On this device
                          </span>
                        ) : null}
                        <Rating value={review.rating} size={11} />
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-ink-mute">
                      {[review.home, formatDate(review.date), review.category].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-ink-soft">{review.text}</p>
                  </div>
                ))}
                <Link to={`/reviews?destination=${destination.slug}`} className="inline-flex items-center gap-1 text-[11px] font-medium text-pine">
                  All reviews for {destination.name.split('&')[0].trim()} <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="min-w-0 space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line bg-white/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">At a glance</p>
            <dl className="mt-3 space-y-2.5">
              {[
                { icon: CalendarDays, label: 'Best season', value: monthsLabel(destination.bestMonths) },
                { icon: Clock, label: 'Suggested stay', value: stayLabel(destination.minDays, destination.maxDays) },
                { icon: Mountain, label: 'Difficulty', value: destination.difficulty },
                { icon: Compass, label: 'Category', value: category.label },
                ...(destination.altitude
                  ? [{ icon: Mountain, label: 'Maximum altitude', value: `${destination.altitude.toLocaleString('en-IN')} m` }]
                  : []),
                { icon: Wallet, label: 'From, per day', value: costPerDayLabel(destination.costPerDay) },
              ].map((row) => {
                const Icon = row.icon
                return (
                  <div key={row.label} className="flex items-start justify-between gap-3 text-xs">
                    <dt className="flex items-center gap-1.5 text-ink-mute">
                      <Icon size={13} /> {row.label}
                    </dt>
                    <dd className="text-right font-medium text-ink">{row.value}</dd>
                  </div>
                )
              })}
            </dl>
            <Link to={`/plan?destination=${destination.slug}`} className="btn-primary mt-4 w-full">
              Begin Your Yatra <ArrowRight size={14} />
            </Link>
            <p className="mt-2 text-center text-[11px] text-ink-mute">
              You can explore and compare freely. Sign in only to save.
            </p>
          </div>

          <WeatherPanel destination={destination} />

          {hasLocation(destination) ? (
            <div className="overflow-hidden rounded-2xl border border-line bg-white/55">
              <MapView destinations={[destination]} height="190px" zoom={destination.category === 'adventure' ? 9 : 10} fit />
              <div className="flex items-center justify-between px-3 py-2 text-[11px] text-ink-mute">
                <span>
                  {destination.lat.toFixed(3)}°N, {destination.lng.toFixed(3)}°E
                </span>
                <Link to="/map" className="text-pine hover:underline">
                  Nepal map
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-paper-2/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">Map</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                {LOCATION_NOT_SET} — this place has no coordinates yet, so it is not pinned on the map
                and has no local forecast.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-line bg-paper-2/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">Plan from</p>
            <p className="mt-1 text-xs text-ink-soft">
              Your saved starting point is <strong className="font-medium text-ink">{origin.name}</strong>. Change it in
              your profile or in the planner.
            </p>
          </div>
        </aside>
      </div>

      <section className="container-page mt-16">
        <SectionHeading
          eyebrow="Keep going"
          title="Places that pair well with this one"
          action={
            <Link to="/explore" className="btn-ghost">
              Explore more <ArrowRight size={14} />
            </Link>
          }
        />
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((item) => (
            <DestinationCard key={item.slug} destination={item} dense />
          ))}
        </div>
      </section>
    </div>
  )
}
