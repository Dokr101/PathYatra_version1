import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bell, Compass, LogOut, MapPin, Save, ShieldCheck, Star, User as UserIcon } from 'lucide-react'
import type { Accommodation, Pace, Transport, TravelStyle } from '../types'
import { useApp } from '../context/AppContext'
import { ORIGINS, INTERESTS, STYLE_LABELS, PACE_LABELS, TRANSPORT_LABELS, ACCOMMODATION_LABELS } from '../data/taxonomy'
import { getDestination } from '../data/destinations'
import { loadJSON, saveJSON } from '../lib/storage'
import { cx, formatDateRange, initials, npr } from '../lib/format'
import { ChoiceGrid, Modal, Pill, Stat } from '../components/ui'
import { DestinationImage } from '../components/DestinationImage'
import { ScenicArt } from '../components/ScenicArt'

const PROVINCES = ['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim']

export function Profile() {
  const { user, updateUser, signOut, prefs, setPrefs, trips, wishlist, reviews, openAuth, notify } = useApp()
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [homeCity, setHomeCity] = useState(user?.homeCity ?? '')
  const [province, setProvince] = useState(user?.province ?? 'Bagmati')
  const [startPoint, setStartPoint] = useState(user?.startPoint ?? 'kathmandu')
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [notifications, setNotifications] = useState(() =>
    loadJSON('notifications', { alerts: true, reminders: true, digest: false }),
  )

  if (!user) {
    return (
      <div className="container-page py-16">
        <div className="grid overflow-hidden rounded-3xl border border-line bg-white/55 lg:grid-cols-2">
          <div className="p-8 sm:p-10">
            <Pill tone="outline">
              <UserIcon size={12} /> My profile
            </Pill>
            <h1 className="mt-4 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.02]">Your travel self, in one place.</h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
              Personal details, travel preferences, a record of where you have been, and the statistics that come out of
              it. Sign in to open your profile.
            </p>
            <button type="button" onClick={() => openAuth('Sign in to open your profile.', '/profile')} className="btn-primary mt-6">
              Sign in <ArrowRight size={15} />
            </button>
          </div>
          <div className="relative min-h-[260px]">
            <ScenicArt scene={{ kind: 'temple', sky: 'clear', seed: 44 }} className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/65 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-paper">
              <p className="font-display text-xl">Every yatra leaves a trace.</p>
              <p className="mt-1 text-xs text-paper/75">Track provinces, days, spend and the places still on your list.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const completed = trips.filter((trip) => trip.status === 'completed')
  // Drafts and confirmed-but-upcoming trips are plans, not journeys taken yet.
  const planned = trips.filter((trip) => trip.status !== 'completed')
  const visited = completed
    .map((trip) => getDestination(trip.destinationSlug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
  const provincesVisited = new Set(visited.map((item) => item.province))
  const totalDays = completed.reduce((sum, trip) => sum + trip.days, 0)
  const daysPlanned = planned.reduce((sum, trip) => sum + trip.days, 0)
  const completedSpend = completed.reduce((sum, trip) => sum + trip.costs.group, 0)
  const plannedSpend = planned.reduce((sum, trip) => sum + trip.costs.group, 0)
  const reviewCount = reviews.filter((review) => review.author === user.name).length

  const saveDetails = () => {
    updateUser({ name: name.trim() || user.name, phone, homeCity, province, startPoint })
    setPrefs({ startPoint })
    notify('Profile details saved on this device.')
  }

  const saveNotifications = () => {
    saveJSON('notifications', notifications)
    notify('Notification preferences saved.')
  }

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Decorative: the <h1> next to it already names the account. */}
          <span
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pine text-xl font-semibold text-paper"
          >
            {initials(user.name)}
          </span>
          <div>
            <Pill tone="outline">
              <ShieldCheck size={11} /> Local account
            </Pill>
            <h1 className="mt-2 font-display text-[clamp(1.8rem,4vw,2.8rem)] leading-[1]">{user.name}</h1>
            <p className="mt-1 text-xs text-ink-mute">
              {user.email} · {user.homeCity}
              {user.phone ? ` · ${user.phone}` : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/mero-yatra" className="btn-ghost">
            Mero Yatra
          </Link>
          <Link to="/plan" className="btn-primary">
            Plan a trip
          </Link>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat value={visited.length} label="Destinations explored" />
        <Stat value={provincesVisited.size} label="Provinces visited" />
        <Stat value={completed.length} label="Completed trips" />
        <Stat value={planned.length} label="Trips planned" />
        <Stat value={totalDays} label="Days travelled" />
        <Stat value={daysPlanned} label="Days planned" />
        <Stat value={npr(completedSpend)} label="Spent on completed" />
        <Stat value={npr(plannedSpend)} label="Planned spend" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          {/* Personal information */}
          <section className="rounded-2xl border border-line bg-white/60 p-5">
            <h2 className="font-display text-xl text-ink">Personal information</h2>
            <p className="mt-1 text-[11px] text-ink-soft">Used to prefill plans and personalise costs. Never sent anywhere.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">Name</span>
                <input className="field" value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="block">
                <span className="field-label">Email</span>
                <input className="field bg-paper-2/60" value={user.email} readOnly />
              </label>
              <label className="block">
                <span className="field-label">Phone</span>
                <input className="field" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+977 …" />
              </label>
              <label className="block">
                <span className="field-label">Home city</span>
                <input className="field" value={homeCity} onChange={(event) => setHomeCity(event.target.value)} />
              </label>
              <label className="block">
                <span className="field-label">Province</span>
                <select className="field" value={province} onChange={(event) => setProvince(event.target.value)}>
                  {PROVINCES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="field-label">Preferred starting point</span>
                <select className="field" value={startPoint} onChange={(event) => setStartPoint(event.target.value)}>
                  {ORIGINS.map((origin) => (
                    <option key={origin.id} value={origin.id}>
                      {origin.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button type="button" onClick={saveDetails} className="btn-primary mt-4">
              <Save size={14} /> Save details
            </button>
          </section>

          {/* Travel preferences */}
          <section className="rounded-2xl border border-line bg-white/60 p-5">
            <h2 className="font-display text-xl text-ink">Travel preferences</h2>
            <p className="mt-1 text-[11px] text-ink-soft">These become the defaults when you open the planner.</p>

            <div className="mt-4 space-y-4">
              <div>
                <span className="field-label">Travel style</span>
                <ChoiceGrid
                  columns={2}
                  value={prefs.style}
                  onChange={(style) => setPrefs({ style })}
                  options={(Object.keys(STYLE_LABELS) as TravelStyle[]).map((value) => ({
                    value,
                    label: STYLE_LABELS[value],
                  }))}
                />
              </div>
              <div>
                <span className="field-label">Pace</span>
                <ChoiceGrid
                  columns={3}
                  value={prefs.pace}
                  onChange={(pace) => setPrefs({ pace })}
                  options={(Object.keys(PACE_LABELS) as Pace[]).map((value) => ({
                    value,
                    label: PACE_LABELS[value].split('—')[0].trim(),
                  }))}
                />
              </div>
              <div>
                <span className="field-label">Transport</span>
                <ChoiceGrid
                  columns={4}
                  value={prefs.transport}
                  onChange={(transport) => setPrefs({ transport })}
                  options={(Object.keys(TRANSPORT_LABELS) as Transport[]).map((value) => ({
                    value,
                    label: TRANSPORT_LABELS[value],
                  }))}
                />
              </div>
              <div>
                <span className="field-label">Comfort</span>
                <ChoiceGrid
                  columns={3}
                  value={prefs.accommodation}
                  onChange={(accommodation) => setPrefs({ accommodation })}
                  options={(Object.keys(ACCOMMODATION_LABELS) as Accommodation[]).map((value) => ({
                    value,
                    label: value === 'budget' ? 'Budget' : value === 'mid' ? 'Mid-range' : 'Premium',
                  }))}
                />
              </div>
              <div>
                <span className="field-label">Interests</span>
                <div className="flex flex-wrap gap-1.5">
                  {INTERESTS.map((interest) => {
                    const active = prefs.interests.includes(interest.id)
                    return (
                      <button
                        key={interest.id}
                        type="button"
                        onClick={() =>
                          setPrefs({
                            interests: active
                              ? prefs.interests.filter((item) => item !== interest.id)
                              : [...prefs.interests, interest.id],
                          })
                        }
                        className={cx(
                          'rounded-full border px-3 py-1.5 text-[11px] transition',
                          active ? 'border-pine bg-pine text-paper' : 'border-line text-ink-soft hover:border-pine-3',
                        )}
                      >
                        {interest.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-ink-mute">Preferences save automatically.</p>
          </section>

          {/* History */}
          <section className="rounded-2xl border border-line bg-white/60 p-5">
            <h2 className="font-display text-xl text-ink">Travel history</h2>
            {completed.length === 0 ? (
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                No completed journeys yet. When you return from a trip, open it in{' '}
                <Link to="/mero-yatra" className="text-pine underline underline-offset-2">
                  Mero Yatra
                </Link>{' '}
                and mark it completed.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {completed.map((trip) => {
                  const destination = getDestination(trip.destinationSlug)
                  return (
                    <Link
                      key={trip.id}
                      to={`/itinerary/${trip.id}`}
                      className="flex items-center gap-3 rounded-xl border border-line/80 p-2.5 transition hover:border-pine-3"
                    >
                      {destination ? (
                        <span className="h-10 w-14 shrink-0 overflow-hidden rounded-lg">
                          <DestinationImage destination={destination} className="h-full w-full" />
                        </span>
                      ) : null}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-ink">{trip.title}</span>
                        <span className="block text-[11px] text-ink-mute">
                          {formatDateRange(trip.startDate, trip.days)} · {npr(trip.costs.group)}
                        </span>
                      </span>
                      <ArrowRight size={13} className="text-ink-mute" />
                    </Link>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-line bg-white/60 p-5">
            <h2 className="font-display text-xl text-ink">At a glance</h2>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-ink-mute">
                  <Compass size={12} /> Saved wishlist
                </span>
                <span className="font-medium text-ink">{wishlist.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-ink-mute">
                  <Star size={12} /> Reviews written
                </span>
                <span className="font-medium text-ink">{reviewCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-ink-mute">
                  <MapPin size={12} /> Starting point
                </span>
                <span className="font-medium text-ink">
                  {ORIGINS.find((origin) => origin.id === user.startPoint)?.name ?? 'Kathmandu'}
                </span>
              </div>
            </div>
            <div className="mt-3 space-y-1 rounded-xl bg-paper-2/60 px-3 py-2 text-[11px] leading-relaxed text-ink-soft">
              <p>
                <span className="font-medium text-ink">Completed</span> figures come from trips you marked completed:{' '}
                {completed.length} {completed.length === 1 ? 'trip' : 'trips'}, {npr(completedSpend)} spent.
              </p>
              <p>
                <span className="font-medium text-ink">Planned</span> figures come from drafts and upcoming trips:{' '}
                {planned.length} {planned.length === 1 ? 'trip' : 'trips'}, {npr(plannedSpend)} estimated.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white/60 p-5">
            <h2 className="flex items-center gap-1.5 font-display text-xl text-ink">
              <Bell size={16} /> Notifications
            </h2>
            <div className="mt-3 space-y-2">
              {[
                { key: 'alerts' as const, label: 'Travel alerts for saved destinations' },
                { key: 'reminders' as const, label: 'Trip reminders before departure' },
                { key: 'digest' as const, label: 'Monthly Nepal travel digest' },
              ].map((item) => (
                <label key={item.key} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line/80 px-3 py-2.5">
                  <span className="text-[11px] text-ink-soft">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={notifications[item.key]}
                    onChange={(event) => setNotifications({ ...notifications, [item.key]: event.target.checked })}
                    className="h-4 w-4 accent-pine"
                  />
                </label>
              ))}
            </div>
            <button type="button" onClick={saveNotifications} className="btn-ghost mt-3 w-full py-2 text-[11px]">
              Save preferences
            </button>
            <p className="mt-2 text-[11px] text-ink-mute">No email is sent in this demo build.</p>
          </section>

          <section className="rounded-2xl border border-line bg-white/60 p-5">
            <h2 className="font-display text-xl text-ink">Account</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
              Your sign-in account is stored on the PathYatra server with a hashed password. Trips, wishlist, reviews
              and preferences stay in this browser. Signing out keeps that work on this device so you can continue
              later; anyone with access to this browser may also be able to see it.
            </p>
            <button
              type="button"
              onClick={() => setConfirmSignOut(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-clay/30 px-4 py-2 text-[11px] font-medium text-clay transition hover:bg-clay/5"
            >
              <LogOut size={12} /> Sign out
            </button>
          </section>
        </div>
      </div>

      <Modal
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        title="Sign out of PathYatra?"
        description="Your saved trips and wishlist will stay on this device."
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmSignOut(false)} className="btn-ghost">
              Stay signed in
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmSignOut(false)
                signOut()
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-clay px-5 py-2.5 text-xs font-medium text-white"
            >
              <LogOut size={13} /> Sign out
            </button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-ink-soft">
          Your reviews stay in the community feed. Trip itineraries, drafts and wishlist entries remain in this browser
          so you can return to them after signing in again.
        </p>
      </Modal>
    </div>
  )
}
