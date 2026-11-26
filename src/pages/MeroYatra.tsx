import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Cloud,
  CloudOff,
  Copy,
  FileText,
  HardDrive,
  Heart,
  Layers,
  MapPin,
  NotebookTabs,
  Plus,
  RefreshCw,
  Share2,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import type { TripPlan, TripSyncState } from '../types'
import { useApp } from '../context/AppContext'
import { getDestination } from '../data/destinations'
import { ORIGINS } from '../data/taxonomy'
import { resolveOrigin } from '../lib/geolocation'
import { generateTrip } from '../lib/itinerary'
import { copyText, shareLink } from '../lib/share'
import { addDays, cx, formatDateRange, npr, todayISO } from '../lib/format'
import { DestinationCard } from '../components/DestinationCard'
import { DestinationCardSkeleton, TripCardSkeleton } from '../components/CardSkeletons'
import { staggerDelay, useDelayedFlag } from '../lib/motion'
import { EmptyState, Modal, Pill, Stat } from '../components/ui'
import { DestinationImage } from '../components/DestinationImage'
import { ScenicArt } from '../components/ScenicArt'

type Tab = 'upcoming' | 'saved' | 'completed' | 'drafts' | 'favorites'

const TABS: Array<{ id: Tab; label: string; hint: string }> = [
  { id: 'upcoming', label: 'Upcoming', hint: 'Confirmed plans with a date in front of them' },
  { id: 'saved', label: 'Saved', hint: 'Every itinerary — synced to your account or saved on this device' },
  { id: 'completed', label: 'Completed', hint: 'Your travel history' },
  { id: 'drafts', label: 'Drafts', hint: 'Generated but not confirmed' },
  { id: 'favorites', label: 'Favorites', hint: 'Bookmarked destinations' },
]

const SYNC_COPY: Record<
  TripSyncState,
  { label: string; tone: string; icon: typeof Cloud; spin?: boolean }
> = {
  synced: { label: 'Synced', tone: 'border-pine/30 bg-pine/10 text-pine', icon: Cloud },
  syncing: { label: 'Syncing', tone: 'border-marigold/40 bg-marigold/15 text-[#7a5410]', icon: RefreshCw, spin: true },
  local: { label: 'On this device', tone: 'border-line bg-paper-2 text-ink-mute', icon: HardDrive },
  error: { label: 'Not synced', tone: 'border-clay/30 bg-clay/10 text-clay', icon: CloudOff },
}

function SyncBadge({ state = 'local' }: { state?: TripSyncState }) {
  const meta = SYNC_COPY[state]
  const Icon = meta.icon
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        meta.tone,
      )}
      title={
        state === 'synced'
          ? 'Stored in your account and on this device'
          : state === 'syncing'
            ? 'Sending this plan to your account'
            : state === 'error'
              ? 'Saved here; sync will retry when the server is reachable'
              : 'Saved on this device only — sign in to sync'
      }
    >
      <Icon size={9} className={meta.spin ? 'animate-spin' : undefined} /> {meta.label}
    </span>
  )
}

function TripCard({ trip, onDelete }: { trip: TripPlan; onDelete: (trip: TripPlan) => void }) {
  const { duplicateTrip, setTripStatus, notify } = useApp()
  const destination = getDestination(trip.destinationSlug)
  const origin = resolveOrigin(trip.originId, trip.originLabel, trip.originLat, trip.originLng)

  if (!destination) return null

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white/60 sm:flex-row">
      <Link to={`/itinerary/${trip.id}`} className="relative block h-32 shrink-0 sm:h-auto sm:w-44">
        <DestinationImage destination={destination} className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-ink/10" />
        <span className="absolute left-2 top-2">
          <Pill tone={trip.status === 'completed' ? 'marigold' : trip.status === 'upcoming' ? 'pine' : 'saffron'}>
            {trip.status === 'draft' ? 'Draft' : trip.status === 'upcoming' ? 'Upcoming' : 'Completed'}
          </Pill>
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Link to={`/itinerary/${trip.id}`} className="font-display text-lg leading-tight text-ink hover:text-pine">
              {trip.title}
            </Link>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-mute">
              <span className="inline-flex items-center gap-1">
                <MapPin size={9} /> {destination.district}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={9} /> {formatDateRange(trip.startDate, trip.days)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users size={9} /> {trip.travelers}
              </span>
              {origin ? <span>from {origin.name}</span> : null}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-ink">{npr(trip.costs.group)}</p>
            <p className={cx('text-[11px]', trip.costs.remaining < 0 ? 'text-clay' : 'text-pine')}>
              {trip.costs.remaining < 0 ? 'over budget' : `${npr(trip.costs.remaining)} spare`}
            </p>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1">
          <SyncBadge state={trip.syncState} />
          <span className="chip">{trip.days} days</span>
          <span className="chip">{trip.route.label}</span>
          <span className="chip">
            {trip.accommodation === 'budget' ? 'Budget' : trip.accommodation === 'mid' ? 'Mid-range' : 'Premium'}
          </span>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
          <Link to={`/itinerary/${trip.id}`} className="inline-flex items-center gap-1 rounded-full bg-pine px-3 py-1.5 text-[11px] font-medium text-paper">
            Open plan <ArrowRight size={11} />
          </Link>
          <button
            type="button"
            onClick={() => {
              void copyText(shareLink(trip)).then((ok) =>
                notify(ok ? 'Share link copied.' : 'Could not copy the link on this browser.'),
              )
            }}
            className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1.5 text-[11px] text-ink-soft hover:border-pine-3"
          >
            <Share2 size={10} /> Share
          </button>
          <button
            type="button"
            onClick={() => duplicateTrip(trip.id)}
            className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1.5 text-[11px] text-ink-soft hover:border-pine-3"
          >
            <Copy size={10} /> Duplicate
          </button>
          {trip.status !== 'completed' ? (
            <button
              type="button"
              onClick={() => setTripStatus(trip.id, 'completed')}
              className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1.5 text-[11px] text-ink-soft hover:border-pine-3"
            >
              <CheckCircle2 size={10} /> Complete
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setTripStatus(trip.id, 'upcoming')}
              className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1.5 text-[11px] text-ink-soft hover:border-pine-3"
            >
              Reopen
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(trip)}
            className="ml-auto rounded-full p-1.5 text-ink-mute transition hover:text-clay"
            aria-label={`Delete ${trip.title}`}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </article>
  )
}

export function MeroYatra() {
  const {
    user,
    trips,
    wishlist,
    openAuth,
    deleteTrip,
    saveTrip,
    notify,
    prefs,
    wishlistSyncError,
    retryWishlistSync,
    authReady,
  } = useApp()
  /** Account trips and wishlist merge in after the session check, so wait rather than flash an empty tab. */
  const showAccountSkeleton = useDelayedFlag(!authReady, 180)
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const initialTab = params.get('tab') as Tab | null
  const fallbackTab: Tab = trips.some((trip) => trip.status === 'upcoming')
    ? 'upcoming'
    : trips.length > 0
      ? 'saved'
      : 'upcoming'
  const [tab, setTab] = useState<Tab>(
    initialTab && TABS.some((item) => item.id === initialTab) ? initialTab : fallbackTab,
  )
  const [deleting, setDeleting] = useState<TripPlan | null>(null)

  if (!user) {
    return (
      <div className="container-page py-16">
        <div className="grid overflow-hidden rounded-3xl border border-line bg-white/55 lg:grid-cols-2">
          <div className="p-8 sm:p-10">
            <Pill tone="outline">
              <NotebookTabs size={12} /> Mero Yatra
            </Pill>
            <h1 className="mt-4 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.02]">Your journeys, kept in one place.</h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
              Upcoming trips, saved itineraries, drafts, completed journeys and your wishlist. Sign in to open your
              personal travel dashboard — everything you were doing is preserved.
            </p>
            <button
              type="button"
              onClick={() => openAuth('Sign in to open Mero Yatra and save your journeys.', '/mero-yatra')}
              className="btn-primary mt-6"
            >
              Sign in to continue <ArrowRight size={15} />
            </button>
            <p className="mt-3 text-[11px] text-ink-mute">
              You can still explore every destination and build a plan before signing in.
            </p>
          </div>
          <div className="relative min-h-[280px]">
            <ScenicArt scene={{ kind: 'peaks', sky: 'dusk', seed: 22 }} className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-paper">
              <p className="font-display text-xl">Before, during and after the journey.</p>
              <p className="mt-1 text-xs text-paper/75">Plans, checklists, expense splits and travel statistics.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const filtered = trips.filter((trip) =>
    tab === 'saved' ? true : tab === 'drafts' ? trip.status === 'draft' : trip.status === tab,
  )
  const upcoming = trips.filter((trip) => trip.status === 'upcoming')
  const completed = trips.filter((trip) => trip.status === 'completed')
  const favoriteDestinations = wishlist.map(getDestination).filter((item): item is NonNullable<typeof item> => Boolean(item))
  const provinces = new Set(
    completed.map((trip) => getDestination(trip.destinationSlug)?.province).filter(Boolean),
  )

  const changeTab = (next: Tab) => {
    setTab(next)
    setParams(next === 'upcoming' ? {} : { tab: next }, { replace: true })
  }

  const loadSample = () => {
    const destination = getDestination('pokhara')
    if (!destination) return
    const plan = generateTrip({
      destination,
      origin: ORIGINS.find((item) => item.id === prefs.startPoint) ?? ORIGINS[0],
      startDate: addDays(todayISO(), 18),
      days: 4,
      travelers: 2,
      budget: 45000,
      style: 'mixed',
      pace: 'balanced',
      transport: 'mixed',
      accommodation: 'mid',
      interests: prefs.interests,
      routeType: 'scenic',
    })
    saveTrip(plan)
    notify('Sample Pokhara itinerary loaded as a draft.')
    navigate(`/itinerary/${plan.id}`)
  }

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Pill tone="outline">
            <NotebookTabs size={12} /> Mero Yatra
          </Pill>
          <h1 className="mt-3 font-display text-[clamp(2rem,4.2vw,3.2rem)] leading-[1] tracking-tight">
            Namaste, {user.name.split(' ')[0]}.
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">
            {upcoming.length > 0
              ? `You have ${upcoming.length} upcoming ${upcoming.length === 1 ? 'journey' : 'journeys'} and ${wishlist.length} saved ${wishlist.length === 1 ? 'place' : 'places'}.`
              : 'Your next journey starts with a destination. Everything you save will live here.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/plan" className="btn-primary">
            <Plus size={15} /> Plan a new yatra
          </Link>
          <Link to="/explore" className="btn-ghost">
            Explore Nepal
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat value={trips.length} label="Itineraries" />
        <Stat value={completed.length} label="Completed" />
        <Stat value={provinces.size} label="Provinces visited" />
        <Stat value={favoriteDestinations.length} label="Wishlist" />
      </div>

      <div className="no-scrollbar mt-7 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((item) => {
          const count =
            item.id === 'favorites'
              ? wishlist.length
              : item.id === 'saved'
                ? trips.length
                : item.id === 'drafts'
                  ? trips.filter((trip) => trip.status === 'draft').length
                  : trips.filter((trip) => trip.status === item.id).length
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => changeTab(item.id)}
              className={cx(
                'relative shrink-0 px-4 py-2.5 text-xs font-medium transition',
                tab === item.id ? 'text-pine' : 'text-ink-mute hover:text-ink',
              )}
            >
              {item.label}
              <span className={cx('ml-1.5 rounded-full px-1.5 py-0.5 text-[11px]', tab === item.id ? 'bg-pine/10' : 'bg-paper-2')}>
                {count}
              </span>
              {tab === item.id ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-pine" /> : null}
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-[11px] text-ink-mute">{TABS.find((item) => item.id === tab)?.hint}</p>

      <div className="mt-4">
        {tab === 'favorites' && wishlistSyncError ? (
          <div
            role="status"
            className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-marigold/40 bg-marigold/10 px-4 py-3"
          >
            <p className="text-xs text-ink-soft">
              <strong className="font-semibold text-ink">Saved on this device.</strong> {wishlistSyncError}
            </p>
            <button type="button" onClick={retryWishlistSync} className="btn-ghost shrink-0 py-2 text-xs">
              Retry sync
            </button>
          </div>
        ) : null}

        {tab === 'favorites' ? (
          favoriteDestinations.length === 0 ? (
            <EmptyState
              icon={<Heart size={20} />}
              title="No favourites yet"
              description="Tap the heart on any destination to keep it here. A wishlist does not need a full itinerary — it is just a place you want to remember."
              action={
                <Link to="/explore" className="btn-primary">
                  Find a destination <ArrowRight size={14} />
                </Link>
              }
            />
          ) : showAccountSkeleton && favoriteDestinations.length === 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
              {[0, 1, 2].map((item) => (
                <DestinationCardSkeleton key={item} />
              ))}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {favoriteDestinations.map((destination, index) => (
                <DestinationCard
                  key={destination.slug}
                  destination={destination}
                  enterDelay={staggerDelay(index)}
                />
              ))}
            </div>
          )
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FileText size={20} />}
            title={
              tab === 'drafts'
                ? 'No drafts waiting'
                : tab === 'completed'
                  ? 'No journeys logged yet'
                  : tab === 'upcoming'
                    ? 'Nothing confirmed yet'
                    : 'No itineraries saved'
            }
            description={
              tab === 'completed'
                ? 'Mark a trip completed when you return and it becomes part of your travel history and statistics.'
                : 'Generate a plan from a destination page and it will appear here, ready to edit, share or print.'
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/plan" className="btn-primary">
                  Plan your first yatra
                </Link>
                <button type="button" onClick={loadSample} className="btn-ghost">
                  <Sparkles size={14} /> Load a sample
                </button>
              </div>
            }
          />
        ) : showAccountSkeleton && filtered.length === 0 ? (
          <div className="space-y-2.5" aria-hidden="true">
            {[0, 1].map((item) => (
              <TripCardSkeleton key={item} />
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((trip) => (
              <TripCard key={trip.id} trip={trip} onDelete={setDeleting} />
            ))}
          </div>
        )}
      </div>

      {tab === 'saved' && trips.length > 0 ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link to="/budget" className="rounded-2xl border border-line bg-white/50 p-4 transition hover:border-pine-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
              <Layers size={11} /> Next step
            </p>
            <p className="mt-1.5 text-xs font-medium text-ink">Price another route</p>
            <p className="mt-0.5 text-[11px] text-ink-mute">Use the standalone budget planner to compare options.</p>
          </Link>
          <Link to="/explore?gems=1" className="rounded-2xl border border-line bg-white/50 p-4 transition hover:border-pine-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
              <MapPin size={11} /> Add a stop
            </p>
            <p className="mt-1.5 text-xs font-medium text-ink">Browse hidden gems</p>
            <p className="mt-0.5 text-[11px] text-ink-mute">Quieter places that pair with your current plan.</p>
          </Link>
          <Link to="/profile" className="rounded-2xl border border-line bg-white/50 p-4 transition hover:border-pine-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
              <ArrowUpRight size={11} /> Your account
            </p>
            <p className="mt-1.5 text-xs font-medium text-ink">Travel statistics</p>
            <p className="mt-0.5 text-[11px] text-ink-mute">Days on the road, provinces visited and spend.</p>
          </Link>
        </div>
      ) : null}

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this itinerary?"
        description="It will be removed from this browser. This cannot be undone."
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDeleting(null)} className="btn-ghost">
              Keep it
            </button>
            <button
              type="button"
              onClick={() => {
                if (deleting) deleteTrip(deleting.id)
                setDeleting(null)
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-clay px-5 py-2.5 text-xs font-medium text-white"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        }
      >
        <p className="text-sm text-ink-soft">
          {deleting ? `${deleting.title} · ${formatDateRange(deleting.startDate, deleting.days)}` : ''}
        </p>
      </Modal>
    </div>
  )
}
