import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User,
  X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { generateStrongPassword } from '../lib/password'
import { safeInternalPath } from '../lib/safePath'
import { cx } from '../lib/format'
import logo from '../assets/logo.png'
import { Modal } from './ui'
import { PasswordRequirements } from './PasswordRequirements'

export function AuthModal() {
  const { authRequest, closeAuth, signIn, signUp, notify } = useApp()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const open = Boolean(authRequest)

  useEffect(() => {
    if (open) return
    setError(null)
    setFieldErrors({})
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
    setMode('signin')
  }, [open])

  const changeMode = (nextMode: 'signin' | 'signup') => {
    if (submitting) return
    setMode(nextMode)
    setError(null)
    setFieldErrors({})
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const suggestPassword = () => {
    const suggested = generateStrongPassword()
    setPassword(suggested)
    setConfirmPassword(suggested)
    setShowPassword(true)
    setShowConfirmPassword(true)
    setFieldErrors((previous) => ({ ...previous, password: '', confirmPassword: '' }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    setError(null)
    setFieldErrors({})

    if (mode === 'signup' && password !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match.' })
      return
    }

    setSubmitting(true)
    try {
      const signInResult = mode === 'signin' ? await signIn(email, password) : null
      const result =
        signInResult ??
        (await signUp(
          {
            name,
            email,
            phone: '',
            homeCity: 'Kathmandu',
            province: 'Bagmati',
            startPoint: 'kathmandu',
          },
          password,
        ))

      if (!result.ok) {
        setFieldErrors(result.fields ?? {})
        setError(
          result.fields
            ? null
            : result.error?.startsWith('Cannot reach')
              ? 'PathYatra could not reach its sign-in service. Check your connection and try again.'
              : result.error ?? 'Something went wrong. Please try again.',
        )
        return
      }

      const isAdmin =
        signInResult?.user?.role === 'ADMIN' || signInResult?.user?.role === 'SUPER_ADMIN'
      const next = safeInternalPath(authRequest?.next)
      const nextPathname = next ? new URL(next, window.location.origin).pathname : ''
      const nextIsAdmin = nextPathname === '/admin' || nextPathname.startsWith('/admin/')

      notify(
        isAdmin
          ? 'Signed in as an administrator.'
          : mode === 'signin'
            ? 'Welcome back. Your saved places and trip planner are ready.'
            : 'Account created. Your details are saved; next, continue planning your itinerary.',
      )
      closeAuth()

      if (isAdmin) {
        navigate(next?.startsWith('/admin/') || next === '/admin' ? next : '/admin', { replace: true })
      } else if (next && !nextIsAdmin) {
        navigate(next, { replace: true })
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to complete sign-in. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'field pl-10 pr-4 text-xs sm:text-[13px]'

  return (
    <Modal
      open={open}
      onClose={closeAuth}
      title="PathYatra account access"
      hideHeader
      className="auth-dialog !border-0 !bg-transparent !shadow-none"
      contentClassName="!p-0"
    >
      <section className="auth-glass auth-panel relative overflow-hidden rounded-3xl border p-5 sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#f5dccb]/35 via-[#fff0e6]/15 to-transparent"
        />

        <div className="relative">
          <header className="auth-header mb-6 flex items-center justify-between gap-3">
            <Link
              to="/"
              onClick={closeAuth}
              aria-label="PathYatra home"
              className="motion-press inline-flex min-w-0 items-center rounded-lg"
            >
              <img src={logo} alt="PathYatra" className="h-9 w-auto max-w-[190px] object-contain sm:h-10" />
            </Link>
            <div className="flex items-center gap-2">
              <Link
                to="/help"
                onClick={closeAuth}
                className="motion-press hidden rounded-full px-2.5 py-1.5 text-xs font-medium text-ink-mute hover:bg-white/70 hover:text-ink sm:inline-flex"
              >
                Need help?
              </Link>
              <button
                type="button"
                onClick={closeAuth}
                aria-label="Close sign-in dialog"
                className="motion-press rounded-full border border-line/80 bg-white/70 p-2 text-ink-mute hover:bg-white hover:text-ink"
              >
                <X size={15} />
              </button>
            </div>
          </header>

          <div className="auth-copy mb-6 text-center">
            <h2 className="font-display text-3xl leading-tight tracking-tight text-ink sm:text-[34px]">
              {mode === 'signin' ? 'Welcome back' : 'Begin your journey'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink-mute sm:text-[13px]">
              {authRequest?.reason ??
                (mode === 'signin'
                  ? 'Sign in to access your itineraries, saved destinations and travel plans.'
                  : 'Create an account to save destinations and keep your Nepal journeys together.')}
            </p>
          </div>

          <div className="auth-segment relative mb-5 flex rounded-full border border-white/70 bg-white/40 p-1 shadow-[inset_0_1px_2px_rgba(80,52,38,0.08)]">
            <span
              aria-hidden="true"
              className={cx(
                'absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full bg-pine shadow-sm transition-[left] duration-200',
                mode === 'signin' ? 'left-1' : 'left-[calc(50%+2px)]',
              )}
            />
            <button
              type="button"
              aria-pressed={mode === 'signin'}
              disabled={submitting}
              onClick={() => changeMode('signin')}
              className={cx(
                'relative z-10 w-1/2 rounded-full py-2 text-center text-xs font-semibold transition-colors',
                mode === 'signin' ? 'text-paper' : 'text-ink-mute hover:text-ink',
              )}
            >
              Sign in
            </button>
            <button
              type="button"
              aria-pressed={mode === 'signup'}
              disabled={submitting}
              onClick={() => changeMode('signup')}
              className={cx(
                'relative z-10 w-1/2 rounded-full py-2 text-center text-xs font-semibold transition-colors',
                mode === 'signup' ? 'text-paper' : 'text-ink-mute hover:text-ink',
              )}
            >
              Create account
            </button>
          </div>

          {authRequest?.pendingWishlist ? (
            <div className="motion-feedback mb-4 rounded-2xl border border-saffron/25 bg-saffron-soft/50 px-4 py-2.5 text-xs leading-relaxed text-clay">
              We’ll save your selected destination to your wishlist after you sign in.
            </div>
          ) : null}

          {/* Keyed so switching tabs crossfades the form instead of snapping. */}
          <form key={mode} onSubmit={submit} className="auth-form tab-fade space-y-3.5" noValidate>
            {mode === 'signup' ? (
              <div className="block">
                <label htmlFor="auth-full-name" className="field-label">Full name</label>
                <span className="relative block">
                  <User aria-hidden="true" size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
                  <input
                    id="auth-full-name"
                    className={cx(inputClass, fieldErrors.fullName && 'border-clay')}
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value)
                      setFieldErrors((previous) => ({ ...previous, fullName: '' }))
                    }}
                    placeholder="Your full name"
                    autoComplete="name"
                    required
                    aria-invalid={Boolean(fieldErrors.fullName)}
                    aria-describedby={fieldErrors.fullName ? 'auth-name-error' : undefined}
                  />
                </span>
                {fieldErrors.fullName ? (
                  <span id="auth-name-error" className="motion-feedback mt-1 block text-[11px] text-clay">
                    {fieldErrors.fullName}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="block">
              <label htmlFor="auth-email" className="field-label">Email address</label>
              <span className="relative block">
                <Mail aria-hidden="true" size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
                <input
                  id="auth-email"
                  className={cx(inputClass, fieldErrors.email && 'border-clay')}
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setFieldErrors((previous) => ({ ...previous, email: '' }))
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined}
                />
              </span>
              {fieldErrors.email ? (
                <span id="auth-email-error" className="motion-feedback mt-1 block text-[11px] text-clay">
                  {fieldErrors.email}
                </span>
              ) : null}
            </div>

            <div className={mode === 'signup' ? 'grid gap-3 sm:grid-cols-2' : ''}>
              <div className="block">
                <label htmlFor="auth-password" className="field-label">Password</label>
                <span className="relative block">
                  <Lock aria-hidden="true" size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
                  <input
                    id="auth-password"
                    className={cx(inputClass, 'pr-11', fieldErrors.password && 'border-clay')}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setFieldErrors((previous) => ({ ...previous, password: '' }))
                    }}
                    placeholder={mode === 'signin' ? 'Your password' : 'Create a password'}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    required
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? 'auth-password-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="motion-press absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink-mute hover:bg-ink/5 hover:text-ink"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </span>
                {fieldErrors.password ? (
                  <span id="auth-password-error" className="motion-feedback mt-1 block text-[11px] text-clay">
                    {fieldErrors.password}
                  </span>
                ) : null}
              </div>

              {mode === 'signup' ? (
                <div className="block">
                  <label htmlFor="auth-confirm-password" className="field-label">Confirm password</label>
                  <span className="relative block">
                    <Lock aria-hidden="true" size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
                    <input
                      id="auth-confirm-password"
                      className={cx(inputClass, 'pr-11', fieldErrors.confirmPassword && 'border-clay')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value)
                        setFieldErrors((previous) => ({ ...previous, confirmPassword: '' }))
                      }}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      required
                      aria-invalid={Boolean(fieldErrors.confirmPassword)}
                      aria-describedby={fieldErrors.confirmPassword ? 'auth-confirm-error' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      aria-pressed={showConfirmPassword}
                      className="motion-press absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink-mute hover:bg-ink/5 hover:text-ink"
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </span>
                  {fieldErrors.confirmPassword ? (
                    <span id="auth-confirm-error" className="motion-feedback mt-1 block text-[11px] text-clay">
                      {fieldErrors.confirmPassword}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {mode === 'signup' ? (
              <PasswordRequirements password={password} onSuggest={suggestPassword} />
            ) : null}

            {error ? (
              <div role="alert" className="motion-feedback rounded-xl border border-clay/25 bg-[#fbeeea] px-3.5 py-2.5 text-xs leading-relaxed text-clay">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="motion-press mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-saffron px-5 py-3 text-xs font-semibold text-white shadow-[0_10px_24px_-16px_rgba(210,106,56,0.85)] hover:bg-clay disabled:cursor-not-allowed disabled:opacity-70 sm:text-[13px]"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                  {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                </>
              ) : (
                <>
                  {mode === 'signin' ? 'Sign in to PathYatra' : 'Create your account'}
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="auth-trust mt-5 flex items-center justify-center gap-2 border-t border-white/70 pt-4 text-[11px] text-ink-mute sm:text-[11px]">
            <ShieldCheck size={14} className="shrink-0 text-pine-3" />
            <span>Passwords are securely hashed by the PathYatra API.</span>
          </div>
        </div>
      </section>
    </Modal>
  )
}
