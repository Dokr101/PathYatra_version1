import { Suspense, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ExternalLink, Menu } from 'lucide-react'
import { AdminSidebar, ADMIN_NAV } from './AdminSidebar'
import { PageSkeleton } from '../PageSkeleton'
import { ErrorBoundary } from '../ErrorBoundary'
import { useApp } from '../../context/AppContext'
import { loadJSON, saveJSON } from '../../lib/storage'

function currentLabel(pathname: string): string {
  if (pathname === '/admin') return 'Dashboard'
  if (pathname.startsWith('/admin/destinations/new')) return 'New destination'
  if (pathname.startsWith('/admin/destinations/')) return 'Edit destination'
  const match = ADMIN_NAV.find(
    (item) => item.to !== '/admin' && pathname.startsWith(item.to),
  )
  if (match) return match.label
  if (pathname.startsWith('/admin/audit-logs')) return 'Audit log'
  if (pathname.startsWith('/admin/itineraries/')) return 'Itinerary template'
  return 'Admin'
}

export function AdminLayout() {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => loadJSON('admin-sidebar-collapsed', false))
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const { user } = useApp()
  const location = useLocation()

  useEffect(() => saveJSON('admin-sidebar-collapsed', collapsed), [collapsed])

  const isDesktop = () =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches

  const toggleSidebar = () => {
    if (isDesktop()) setCollapsed((value) => !value)
    else setOpen((value) => !value)
  }

  return (
    <div className="min-h-screen bg-[#f7f0e2] text-ink">
      <AdminSidebar
        open={open}
        collapsed={collapsed}
        onClose={() => setOpen(false)}
        onToggle={toggleSidebar}
        onHoverChange={setSidebarHovered}
      />

      <div
        className={`transition-[padding] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          collapsed ? (sidebarHovered ? 'lg:pl-72' : 'lg:pl-16') : 'lg:pl-72'
        }`}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[#d9cdb6] bg-[#f7f0e2]/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Toggle navigation"
              className="motion-press rounded-lg border border-line bg-[#fffdf8] p-2 text-ink-soft hover:bg-paper-2 lg:hidden"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-medium text-ink">{currentLabel(location.pathname)}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-full border border-line bg-[#fffdf8] px-3 py-1.5 text-[11px] text-ink-soft hover:bg-paper-2 sm:inline-flex"
            >
              View site <ExternalLink size={11} />
            </Link>
            <div className="flex items-center gap-2 rounded-full border border-line bg-[#fffdf8] py-1 pl-1 pr-3">
              {/* Decorative: the name beside it is what a screen reader should
                  read. It stays in the accessibility tree at every width
                  (sr-only, not display:none) so the chip is never an
                  unexplained letter on a phone. */}
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-pine text-[11px] font-semibold text-paper"
              >
                {(user?.name ?? 'A').slice(0, 1).toUpperCase()}
              </span>
              <span className="sr-only text-[11px] text-ink-soft sm:not-sr-only">
                {user?.name ?? 'Admin'}
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:py-8">
          <div key={location.pathname} className="route-enter">
            <ErrorBoundary resetKey={location.pathname} scope="admin">
              <Suspense fallback={<PageSkeleton label="Loading admin page" />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}
