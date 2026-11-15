import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  Calculator,
  Compass,
  Heart,
  Map as MapIcon,
  Menu,
  NotebookTabs,
  Search,
  Star,
  User,
  X,
} from 'lucide-react'
import { searchDestinations } from '../data/destinations'
import { useApp } from '../context/AppContext'
import { cx, initials } from '../lib/format'
import { ScenicArt } from './ScenicArt'
import { CATEGORY_MAP } from '../data/destinations'

const LINKS = [
  { to: '/explore', label: 'Explore Nepal', icon: Compass },
  { to: '/budget', label: 'Budget Planner', icon: Calculator },
  { to: '/mero-yatra', label: 'Mero Yatra', icon: NotebookTabs },
  { to: '/reviews', label: 'Travel Reviews', icon: Star },
]

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="PathYatra home">
      <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-[11px] bg-pine">
        <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden="true">
          <circle cx="28" cy="11" r="4" fill="#E5A93F" />
          <path d="M2 31 L13 15 L20 25 L26 17 L38 31 Z" fill="#FAF6EC" />
          <path d="M13 15 L17 21 L13 20 L9.5 23 Z" fill="#D26A38" />
        </svg>
      </span>
      {!compact ? <span className="font-display text-[1.35rem] leading-none tracking-tight">PathYatra</span> : null}
    </Link>
  )
}

export function Nav() {
  const { user, wishlist, openAuth, compare } = useApp()
  const [drawer, setDrawer] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    setDrawer(false)
    setSearchOpen(false)
    setQuery('')
  }, [location.pathname])

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
        setDrawer(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (searchOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 40)
      document.body.style.overflow = 'hidden'
      return () => {
        clearTimeout(timer)
        document.body.style.overflow = ''
      }
    }
    document.body.style.overflow = ''
    return undefined
  }, [searchOpen])

  const results = query.trim() ? searchDestinations(query).slice(0, 6) : searchDestinations('').slice(0, 4)

  return (
    <>
      <div className="no-print border-b border-line bg-pine text-paper">
        <div className="container-page flex flex-wrap items-center justify-between gap-2 py-1.5 text-[11px] tracking-wide">
          <p className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-marigold" />
            Nepal-first trip intelligence · explore freely, sign in only when you save
          </p>
          <Link to="/map" className="hidden items-center gap-1 text-paper/80 transition hover:text-paper sm:flex">
            Open the Nepal map <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>

      <header className="no-print sticky top-0 z-50 border-b border-line/80 bg-paper/85 backdrop-blur-md">
        <div className="container-page flex h-[68px] items-center justify-between gap-4">
          <Logo />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cx(
                    'rounded-full px-3.5 py-2 text-[13px] font-medium transition',
                    isActive ? 'bg-pine/8 text-pine' : 'text-ink-soft hover:bg-paper-2 hover:text-ink',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden items-center gap-2 rounded-full border border-line bg-white/50 px-3 py-2 text-xs text-ink-mute transition hover:border-paper-3 hover:text-ink md:flex"
              aria-label="Search destinations"
            >
              <Search size={14} />
              <span>Search Nepal</span>
              <kbd className="rounded border border-line bg-paper px-1.5 py-0.5 text-[10px] text-ink-mute">/</kbd>
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="rounded-full p-2.5 text-ink-soft transition hover:bg-paper-2 md:hidden"
              aria-label="Search destinations"
            >
              <Search size={18} />
            </button>
            <Link
              to="/mero-yatra?tab=favorites"
              className="relative rounded-full p-2.5 text-ink-soft transition hover:bg-paper-2"
              aria-label={`Wishlist, ${wishlist.length} saved`}
            >
              <Heart size={18} />
              {wishlist.length > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-saffron px-1 text-[9px] font-semibold text-white">
                  {wishlist.length}
                </span>
              ) : null}
            </Link>
            {user ? (
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-full border border-line bg-white/60 py-1 pl-1 pr-3 transition hover:border-paper-3"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pine text-[11px] font-semibold text-paper">
                  {initials(user.name) || 'P'}
                </span>
                <span className="hidden text-xs font-medium text-ink sm:block">{user.name.split(' ')[0]}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openAuth('Sign in to save trips, wishlists and reviews.')}
                className="hidden items-center gap-1.5 rounded-full bg-pine px-4 py-2 text-xs font-medium text-paper transition hover:bg-pine-2 sm:flex"
              >
                <User size={14} /> Sign in
              </button>
            )}
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="rounded-full p-2.5 text-ink transition hover:bg-paper-2 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {searchOpen ? (
        <div className="fixed inset-0 z-[90] bg-ink/45 backdrop-blur-[3px]">
          <button type="button" className="absolute inset-0" aria-label="Close search" onClick={() => setSearchOpen(false)} />
          <div className="relative mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-3xl border border-line bg-paper shadow-lift">
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
              <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-mute">
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
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-paper-2"
                  >
                    <span className="h-11 w-14 overflow-hidden rounded-lg">
                      <ScenicArt scene={destination.scene} className="h-full w-full" />
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

      {drawer ? (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink/50" aria-label="Close menu" onClick={() => setDrawer(false)} />
          <div className="absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col overflow-y-auto border-l border-line bg-paper p-6">
            <div className="flex items-center justify-between">
              <Logo />
              <button
                type="button"
                onClick={() => setDrawer(false)}
                className="rounded-full border border-line p-2 text-ink-soft"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-8 space-y-1">
              {LINKS.map((link) => {
                const Icon = link.icon
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      cx(
                        'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition',
                        isActive ? 'bg-pine text-paper' : 'text-ink hover:bg-paper-2',
                      )
                    }
                  >
                    <Icon size={17} />
                    {link.label}
                  </NavLink>
                )
              })}
              <NavLink
                to="/map"
                className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-ink transition hover:bg-paper-2"
              >
                <MapIcon size={17} /> Interactive map
              </NavLink>
              {compare.length > 0 ? (
                <NavLink
                  to="/explore?compare=1"
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-ink transition hover:bg-paper-2"
                >
                  <Compass size={17} /> Comparing {compare.length} destinations
                </NavLink>
              ) : null}
            </div>

            <div className="mt-auto space-y-3 pt-8">
              {user ? (
                <Link to="/profile" className="flex items-center justify-between rounded-2xl border border-line bg-white/60 px-4 py-3">
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pine text-xs font-semibold text-paper">
                      {initials(user.name)}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{user.name}</span>
                      <span className="block text-[11px] text-ink-mute">My profile & travel stats</span>
                    </span>
                  </span>
                  <ArrowUpRight size={16} className="text-ink-mute" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDrawer(false)
                    openAuth('Sign in to save trips, wishlists and reviews.')
                  }}
                  className="btn-primary w-full"
                >
                  <User size={16} /> Sign in or create an account
                </button>
              )}
              <p className="text-center text-[11px] leading-relaxed text-ink-mute">
                PathYatra is free to explore. Plans, wishlists and reviews live on this device in the demo build.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
