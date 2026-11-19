import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { Link } from 'react-router-dom'
import { Skeleton } from '../ui'

/**
 * Waits for the session cookie to be checked against /auth/me, then only lets an
 * active ADMIN or SUPER_ADMIN through. Public users are redirected to the
 * separate admin sign-in screen.
 */
export function AdminProtectedRoute({ children }: { children: ReactNode }) {
  const { user, authReady } = useApp()
  const location = useLocation()

  if (!authReady) {
    return (
      <div className="min-h-screen bg-paper p-5 sm:p-8" role="progressbar" aria-label="Checking administrator access">
        <div className="mx-auto max-w-6xl">
          <Skeleton className="h-8 w-40" />
          <div className="mt-8 grid gap-5 md:grid-cols-[220px_1fr]">
            <div className="space-y-3 rounded-2xl border border-line bg-white/50 p-4">
              {[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-8 w-full" />)}
            </div>
            <div className="space-y-5">
              <Skeleton className="h-14 w-2/3" />
              <div className="grid gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((item) => <Skeleton key={item} className="h-24" />)}
              </div>
              <Skeleton className="h-56 w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const allowed = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'

  if (!allowed) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname, denied: Boolean(user) }}
      />
    )
  }

  return <>{children}</>
}

export function AdminAccessDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5">
      <div className="max-w-md rounded-2xl border border-line bg-[#fffdf8] p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f7e2dc] text-clay">
          <ShieldX size={20} />
        </div>
        <h1 className="font-display text-2xl">Administrator access only</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          This account does not have permission to open the PathYatra admin panel. Ask a super
          admin to change your role, or sign in with an administrator account.
        </p>
        <Link to="/" className="btn-primary mt-6">
          Back to PathYatra
        </Link>
      </div>
    </div>
  )
}
