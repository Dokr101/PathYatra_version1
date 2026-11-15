import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Lock, ShieldCheck } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Modal } from './ui'
import { ORIGINS } from '../data/taxonomy'
import { ScenicArt } from './ScenicArt'

const PROVINCES = ['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim']

export function AuthModal() {
  const { authRequest, closeAuth, signIn, signUp, notify } = useApp()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [homeCity, setHomeCity] = useState('Kathmandu')
  const [province, setProvince] = useState('Bagmati')
  const [startPoint, setStartPoint] = useState('kathmandu')
  const [error, setError] = useState<string | null>(null)

  const open = Boolean(authRequest)

  useEffect(() => {
    if (!open) {
      setError(null)
      setPassword('')
    }
  }, [open])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    const result =
      mode === 'signin'
        ? signIn(email, password)
        : signUp({ name, email, phone: '', homeCity, province, startPoint }, password)

    if (!result.ok) {
      setError(result.error ?? 'Something went wrong.')
      return
    }

    notify(mode === 'signin' ? 'Welcome back to PathYatra.' : 'Account created. Your journey starts here.')
    const next = authRequest?.next
    closeAuth()
    if (next) navigate(next)
  }

  return (
    <Modal
      open={open}
      onClose={closeAuth}
      title={mode === 'signin' ? 'Sign in to PathYatra' : 'Create your PathYatra account'}
      description={authRequest?.reason ?? 'Save trips, keep a wishlist and manage your journeys in one place.'}
      wide
    >
      <div className="grid gap-6 md:grid-cols-[0.85fr_1.15fr]">
        <div className="relative hidden overflow-hidden rounded-2xl border border-line md:block">
          <ScenicArt scene={{ kind: 'peaks', sky: 'dawn', seed: 12 }} className="absolute inset-0 h-full w-full" />
          <div className="relative flex h-full min-h-[420px] flex-col justify-end bg-gradient-to-t from-ink/85 via-ink/25 to-transparent p-5 text-paper">
            <p className="font-display text-2xl leading-tight">Your journey. Your budget. Your Nepal.</p>
            <p className="mt-2 text-xs leading-relaxed text-paper/80">
              Explore freely. Sign in only when you want to save a destination, generate an itinerary or write a review.
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-paper/20 bg-paper/10 px-3 py-2 text-[11px] text-paper/85">
              <ShieldCheck size={14} /> Demo accounts stay on this device
            </div>
          </div>
        </div>

        <div>
          <div className="mb-5 flex rounded-full border border-line bg-paper-2/60 p-1">
            {(['signin', 'signup'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value)
                  setError(null)
                }}
                className={
                  mode === value
                    ? 'flex-1 rounded-full bg-pine px-4 py-2 text-xs font-medium text-paper'
                    : 'flex-1 rounded-full px-4 py-2 text-xs font-medium text-ink-soft'
                }
              >
                {value === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          {authRequest?.pendingWishlist ? (
            <div className="mb-4 rounded-xl border border-pine-3/30 bg-pine/5 px-3 py-2 text-[11px] leading-relaxed text-ink-soft">
              We will add the destination you selected to your wishlist as soon as you are signed in.
            </div>
          ) : null}

          <form onSubmit={submit} className="space-y-3.5">
            {mode === 'signup' ? (
              <label className="block">
                <span className="field-label">Full name</span>
                <input
                  className="field"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Aarati Sharma"
                  autoComplete="name"
                  required
                />
              </label>
            ) : null}

            <label className="block">
              <span className="field-label">Email</span>
              <input
                className="field"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="block">
              <span className="field-label">Password</span>
              <input
                className="field"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least six characters"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
              />
            </label>

            {mode === 'signup' ? (
              <div className="grid gap-3.5 sm:grid-cols-2">
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
                <label className="block sm:col-span-2">
                  <span className="field-label">Usual starting point</span>
                  <select className="field" value={startPoint} onChange={(event) => setStartPoint(event.target.value)}>
                    {ORIGINS.map((origin) => (
                      <option key={origin.id} value={origin.id}>
                        {origin.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {error ? (
              <p className="rounded-xl border border-clay/30 bg-clay/10 px-3 py-2 text-xs text-clay">{error}</p>
            ) : null}

            <button type="submit" className="btn-primary w-full">
              {mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight size={16} />
            </button>
          </form>

          <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-ink-mute">
            <Lock size={12} className="mt-0.5 shrink-0" />
            This demo stores your profile, trips and wishlist in this browser only. No password is sent anywhere. Use a
            throwaway password.
          </p>
        </div>
      </div>
    </Modal>
  )
}
