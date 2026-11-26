import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  Calculator,
  Compass,
  Heart,
  LogOut,
  Map as MapIcon,
  Menu,
  NotebookTabs,
  Search,
  ShieldCheck,
  Star,
  User,
  X,
} from 'lucide-react'
import logoMark from '../assets/logo-mark.png'
import { searchDestinations } from '../data/destinations'
import { useApp } from '../context/AppContext'
import { cx } from '../lib/format'
import { DestinationImage } from './DestinationImage'
import { CATEGORY_MAP } from '../data/destinations'
import { Modal } from './ui'

const LINKS = [
  { to: '/explore', label: 'Explore Nepal', icon: Compass },
  { to: '/budget', label: 'Budget Planner', icon: Calculator },
  { to: '/mero-yatra', label: 'Mero Yatra', icon: NotebookTabs },
  { to: '/reviews', label: 'Travel Reviews', icon: Star },
  { to: '/map', label: 'Interactive Map', icon: MapIcon },
]

export function TravellerSidebar({
  open,
  collapsed,
  onClose,
  onToggle,
  onHoverChange,
}: {
  open: boolean
  collapsed: boolean
  onClose: () => void
  onToggle: () => void
  onHoverChange: (hovered: boolean) => void
}) {
  const { user, wishlist, openAuth, compare, signOut } = useApp()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchMounted, setSearchMounted] = useState(false)
  const [searchClosing, setSearchClosing] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const compact = collapsed && !hovered
  const toggleLabel = open ? 'Close navigation' : collapsed ? 'Expand navigation' : 'Collapse navigation'

  const toggleSidebar = () => {
    setHovered(false)
    onHoverChange(false)
    onToggle()
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      if ((event.key === '/' && !typing) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault()
        setSearchOpen(true)
      }
      if (event.key === 'Escape') {
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!searchOpen) {
      document.body.style.overflow = ''
      return undefined
    }
    const timer = setTimeout(() => inputRef.current?.focus(), 40)
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(timer)
      document.body.style.overflow = ''
    }
  }, [searchOpen])

  useEffect(() => {
    if (searchOpen) {
      setSearchMounted(true)
      setSearchClosing(false)
      return undefined
    }
    if (!searchMounted) return undefined

    setSearchClosing(true)
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200
    const timer = window.setTimeout(() => {
      setSearchMounted(false)
      setSearchClosing(false)
    }, duration)
    return () => window.clearTimeout(timer)
  }, [searchOpen, searchMounted])

  const results = query.trim() ? searchDestinations(query).slice(0, 6) : searchDestinations('').slice(0, 4)

  const logout = () => {
    setConfirmLogout(false)
    signOut()
    onClose()
    navigate('/')
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cx(
          'fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        onMouseEnter={() => {
          setHovered(true)
          onHoverChange(true)
        }}
        onMouseLeave={() => {
          setHovered(false)
          onHoverChange(false)
        }}
        className={cx(
          'no-print motion-sidebar sidebar-panel fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-[#f8f1e3]',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          collapsed && (hovered ? 'lg:w-72' : 'lg:w-16'),
        )}
        data-compact={compact}
        aria-label="Traveller navigation"
      >
        <div
          className={cx(
            'border-b border-line px-5 py-4',
            compact && 'lg:px-2',
          )}
        >
          <NavLink
            to="/"
            className={cx('flex items-center gap-2.5', compact && 'lg:justify-center lg:gap-0')}
            onClick={onClose}
          >
            <img src={logoMark} alt="" className="h-9 w-9 shrink-0 object-contain" />
            <span className="sidebar-label">
              <span className="block font-display text-lg leading-none text-ink">PathYatra</span>
              <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
                Traveller panel
              </span>
            </span>
          </NavLink>

          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={toggleLabel}
            className={cx(
              'mt-4 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] text-ink-soft transition-colors hover:bg-[#ebdfc9] hover:text-ink',
              compact && 'lg:justify-center lg:gap-0 lg:px-0',
            )}
            title={compact ? toggleLabel : undefined}
          >
            <Menu size={18} className="shrink-0" />
            <span className="sidebar-label">{toggleLabel}</span>
          </button>
        </div>

        <nav className={cx('no-scrollbar flex-1 overflow-y-auto px-3 py-3', compact && 'lg:px-1.5')}>
          <p className={cx('px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute/80', compact && 'lg:hidden')}>
            Travel
          </p>
          <ul className="space-y-0.5">
            {LINKS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cx(
                      'flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] transition-colors',
                      compact && 'lg:justify-center lg:gap-0 lg:px-0',
                      isActive
                        ? 'bg-pine text-paper shadow-sm'
                        : 'text-ink-soft hover:bg-[#ebdfc9] hover:text-ink',
                    )
                  }
                  title={compact ? item.label : undefined}
                >
                  <item.icon size={16} strokeWidth={1.8} className="shrink-0" />
                  <span className="sidebar-label leading-tight">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          <p className={cx('px-2 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute/80', compact && 'lg:hidden')}>
            Your account
          </p>
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={cx(
                'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[13px] text-ink-soft transition-colors hover:bg-[#ebdfc9] hover:text-ink',
                compact && 'lg:justify-center lg:gap-0 lg:px-0',
              )}
              title={compact ? 'Search Nepal' : undefined}
            >
              <Search size={16} strokeWidth={1.8} className="shrink-0" />
              <span className="sidebar-label leading-tight">Search Nepal</span>
              <kbd className={cx('ml-auto rounded border border-line bg-paper px-1.5 py-0.5 text-[11px] text-ink-mute', compact && 'lg:hidden')}>
                /
              </kbd>
            </button>

            <NavLink
              to="/mero-yatra?tab=favorites"
              onClick={onClose}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] transition-colors',
                  compact && 'lg:justify-center lg:gap-0 lg:px-0',
                  isActive
                    ? 'bg-pine text-paper shadow-sm'
                    : 'text-ink-soft hover:bg-[#ebdfc9] hover:text-ink',
                )
              }
              title={compact ? 'Wishlist' : undefined}
            >
              <Heart size={16} strokeWidth={1.8} className="shrink-0" />
              <span className="sidebar-label leading-tight">Wishlist</span>
              {wishlist.length > 0 ? (
                <span
                  className={cx(
                    'ml-auto rounded-full bg-saffron px-1.5 py-0.5 text-[11px] font-semibold text-white',
                    compact && 'lg:hidden',
                  )}
                >
                  {wishlist.length}
                </span>
              ) : null}
            </NavLink>

            <NavLink
              to="/profile"
              onClick={onClose}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] transition-colors',
                  compact && 'lg:justify-center lg:gap-0 lg:px-0',
                  isActive
                    ? 'bg-pine text-paper shadow-sm'
                    : 'text-ink-soft hover:bg-[#ebdfc9] hover:text-ink',
                )
              }
              title={compact ? 'My profile' : undefined}
            >
              <User size={16} strokeWidth={1.8} className="shrink-0" />
              <span className="sidebar-label leading-tight">My profile</span>
            </NavLink>

            {compare.length > 0 ? (
              <NavLink
                to="/explore?compare=1"
                onClick={onClose}
                className={cx(
                  'flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] text-ink-soft transition-colors hover:bg-[#ebdfc9] hover:text-ink',
                  compact && 'lg:justify-center lg:gap-0 lg:px-0',
                )}
                title={compact ? `Comparing ${compare.length}` : undefined}
              >
                <Compass size={16} strokeWidth={1.8} className="shrink-0" />
                <span className="sidebar-label leading-tight">Comparing {compare.length}</span>
              </NavLink>
            ) : null}

            {isAdmin ? (
              <NavLink
                to="/admin"
                onClick={onClose}
                className={cx(
                  'flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] text-ink-soft transition-colors hover:bg-[#ebdfc9] hover:text-ink',
                  compact && 'lg:justify-center lg:gap-0 lg:px-0',
                )}
                title={compact ? 'Admin panel' : undefined}
              >
                <ShieldCheck size={16} strokeWidth={1.8} className="shrink-0" />
                <span className="sidebar-label leading-tight">Admin panel</span>
              </NavLink>
            ) : null}
          </div>
        </nav>

        <div className="border-t border-line p-3">
          {user ? (
            <>
              <div className={cx('mb-2 rounded-xl bg-white/60 px-3 py-2.5', compact && 'lg:hidden')}>
                <p className="truncate text-xs font-medium text-ink">{user.name}</p>
                <p className="truncate text-[11px] text-ink-mute">{user.email}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-pine-3">
                  {isAdmin ? 'Admin' : 'Traveller'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmLogout(true)}
                className={cx(
                  'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] text-ink-soft transition-colors hover:bg-[#ebdfc9] hover:text-ink',
                  compact && 'lg:justify-center lg:gap-0 lg:px-0',
                )}
                title={compact ? 'Logout' : undefined}
              >
                <LogOut size={16} strokeWidth={1.8} />
                <span className="sidebar-label">Logout</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose()
                openAuth('Sign in to save trips, wishlists and reviews.')
              }}
              className={cx(
                'flex w-full items-center gap-2.5 rounded-xl bg-pine px-2.5 py-2.5 text-[13px] font-medium text-paper transition-colors hover:bg-pine-2',
                compact && 'lg:justify-center lg:gap-0 lg:px-0',
              )}
              title={compact ? 'Sign in' : undefined}
            >
              <User size={16} strokeWidth={1.8} />
              <span className="sidebar-label">Sign in</span>
            </button>
          )}
        </div>
      </aside>

      {searchMounted ? (
        <div
          aria-hidden={searchClosing}
          inert={searchClosing}
          className={cx(
            'motion-overlay fixed inset-0 z-[90] bg-ink/45 backdrop-blur-[3px]',
            searchClosing && 'pointer-events-none motion-overlay-exit',
          )}
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close search"
            onClick={() => setSearchOpen(false)}
          />
          <div className={cx('motion-dialog relative mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-3xl border border-line bg-paper shadow-lift', searchClosing && 'motion-dialog-exit')}>
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
              <Search size={18} className="text-ink-mute" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search destinations, districts or things to do…"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-mute"
                aria-label="Search destinations"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="rounded-full p-1.5 text-ink-mute transition hover:bg-paper-2"
                aria-label="Close search"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
                {query.trim() ? `${results.length} matches` : 'Start here'}
              </p>
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-ink-soft">
                  Nothing matched “{query}”. Try Pokhara, Lumbini, wildlife or trekking.
                </p>
              ) : (
                results.map((destination) => (
                  <button
                    key={destination.slug}
                    type="button"
                    onClick={() => {
                      navigate(`/explore/${destination.slug}`)
                      setSearchOpen(false)
                      onClose()
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-paper-2"
                  >
                    <span className="h-11 w-14 overflow-hidden rounded-lg">
                      <DestinationImage destination={destination} className="h-full w-full" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{destination.name}</span>
                      <span className="block truncate text-[11px] text-ink-mute">
                        {destination.district} · {CATEGORY_MAP[destination.category].short}
                      </span>
                    </span>
                    <ArrowUpRight size={14} className="text-ink-mute" />
                  </button>
                ))
              )}
            </div>
            <div className="flex items-center justify-between border-t border-line bg-paper-2/50 px-5 py-2.5 text-[11px] text-ink-mute">
              <span className="flex items-center gap-1.5">
                <MapIcon size={12} /> {results.length} of {searchDestinations('').length} destinations
              </span>
              <span>Esc to close</span>
            </div>
          </div>
        </div>
      ) : null}

      <Modal
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="Log out of PathYatra?"
        description="Are you sure you want to log out?"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmLogout(false)} className="btn-ghost">
              Stay signed in
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-full bg-clay px-5 py-2.5 text-xs font-medium text-white"
            >
              <LogOut size={13} /> Log out
            </button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-ink-soft">
          Your trips, wishlist and drafts stay in this browser, so you can sign back in whenever you
          are ready.
        </p>
      </Modal>
    </>
  )
}
