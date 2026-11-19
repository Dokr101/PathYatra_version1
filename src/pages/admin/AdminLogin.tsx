import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import logoMark from '../../assets/logo-mark.png'
import { useApp } from '../../context/AppContext'
import { safeInternalPath } from '../../lib/safePath'
import { AdminButton, Field, InlineAlert, TextInput } from '../../components/admin/AdminUI'

interface LocationState {
  from?: string
  denied?: boolean
}

export function AdminLogin() {
  const { user, authReady, signIn, signOut } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as LocationState | null) ?? {}

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Only ever navigate to an internal admin path: safeInternalPath rejects
  // absolute/off-origin URLs, and the prefix check keeps public routes out of
  // the admin area.
  const safeFrom = safeInternalPath(state.from)
  const destination = safeFrom?.startsWith('/admin') ? safeFrom : '/admin'

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  if (authReady && isAdmin) {
    return <Navigate to={destination} replace />
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const errors: Record<string, string> = {}
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) errors.email = 'Enter a valid email address.'
    if (!password) errors.password = 'Enter your password.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    setError(null)
    const result = await signIn(email, password)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error ?? 'Sign-in failed.')
      return
    }
    if (result.user?.role !== 'ADMIN' && result.user?.role !== 'SUPER_ADMIN') {
      signOut()
      setError('This account does not have admin access. Use an administrator account.')
      return
    }
    navigate(destination, { replace: true })
  }

  return (
    <div className="topo-lines flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-ink-soft transition hover:text-pine"
        >
          <ArrowLeft size={13} /> Back to PathYatra
        </Link>

        <div className="rounded-3xl border border-line bg-[#fffdf8]/95 p-7 shadow-lift sm:p-9">
          <div className="flex items-center gap-3">
            <img src={logoMark} alt="" className="h-11 w-11 object-contain" />
            <div>
              <p className="font-display text-2xl leading-none">PathYatra</p>
              <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-pine-3">
                <ShieldCheck size={11} /> Admin panel
              </p>
            </div>
          </div>

          <h1 className="mt-7 font-display text-2xl">Sign in to manage PathYatra</h1>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
            This is a separate entrance from the public site. Only accounts with the ADMIN or
            SUPER ADMIN role can continue.
          </p>

          {state.denied || (authReady && user && !isAdmin) ? (
            <div className="mt-4">
              <InlineAlert tone="warning">
                You are signed in as {user?.email ?? 'a public account'}. That account does not have
                administrator access. Sign in below with an admin account, or{" "}
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="font-medium underline underline-offset-2"
                >
                  sign out first
                </button>
                .
              </InlineAlert>
            </div>
          ) : null}

          <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4" noValidate>
            <Field label="Admin email" error={fieldErrors.email} required>
              <TextInput
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                required
              />
            </Field>

            <Field label="Password" error={fieldErrors.password} required>
              <div className="relative">
                <TextInput
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={setPassword}
                  placeholder="Your password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>

            {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

            <AdminButton
              type="submit"
              variant="primary"
              loading={submitting}
              className="w-full py-2.5"
            >
              <LockKeyhole size={14} /> {submitting ? 'Signing in…' : 'Sign in to admin'}
            </AdminButton>
          </form>

          <div className="mt-5 rounded-xl border border-line bg-paper-2/60 px-3.5 py-3 text-[11px] leading-relaxed text-ink-soft">
            <p className="font-medium text-ink">No admin account yet?</p>
            <p className="mt-1">
              Set <code className="rounded bg-paper px-1">ADMIN_SEED_EMAIL</code> and{' '}
              <code className="rounded bg-paper px-1">ADMIN_SEED_PASSWORD</code> in{' '}
              <code className="rounded bg-paper px-1">backend/.env</code>, then run{' '}
              <code className="rounded bg-paper px-1">npm run seed:admin</code>.
            </p>
          </div>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-ink-mute">
          <LockKeyhole size={11} /> HttpOnly cookie session · the same account system as the public
          site
        </p>
      </div>
    </div>
  )
}
