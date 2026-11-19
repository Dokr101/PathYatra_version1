import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Calculator, Compass, Map as MapIcon, Menu, X } from 'lucide-react'
import logoMark from '../assets/logo-mark.png'
import { useApp } from '../context/AppContext'

/**
 * Lightweight header used on the landing page (transparent over the hero, solid on scroll)
 * and on inner public pages for guests (always solid).
 *
 * Always stays visible when scrolling down (fixed top navigation).
 */
export function LandingHeader({ solid = false }: { solid?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(solid)
  const { user, openAuth } = useApp()
  const { pathname } = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (solid) {
      setScrolled(true)
      return undefined
    }

    const onScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [solid])

  const navClass = `inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors duration-200 ${
    scrolled
      ? 'text-ink-soft hover:bg-paper-2 hover:text-ink'
      : 'text-paper/85 hover:bg-paper/10 hover:text-paper'
  }`

  const accountClass = `inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
    scrolled
      ? 'bg-accent text-white hover:bg-accent-strong'
      : 'border border-paper/30 bg-paper/12 text-paper backdrop-blur-sm hover:bg-paper/20'
  }`

  const accountLabel = user ? 'My Yatra' : 'Sign in'
  const accountAction = () => {
    setMenuOpen(false)
    if (!user) openAuth('Sign in to save trips, wishlists and reviews.')
  }

  return (
    <header
      className={`no-print fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${
        scrolled
          ? 'border-b border-line bg-paper/95 shadow-sm backdrop-blur-md'
          : 'border-b border-white/10 bg-transparent backdrop-blur-sm'
      }`}
    >
      <div className="landing-header-inner container-page relative flex h-[72px] items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-2.5">
          <img
            src={logoMark}
            alt=""
            className={`h-8 w-8 object-contain transition-opacity duration-200 ${
              scrolled ? 'opacity-100' : 'brightness-0 invert opacity-90'
            }`}
          />
          <span
            className={`whitespace-nowrap font-display text-lg leading-none transition-colors duration-200 ${
              scrolled ? 'text-ink' : 'text-paper'
            }`}
          >
            PathYatra
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
          <Link to="/explore" className={navClass}>
            <Compass size={15} /> Explore
          </Link>
          <Link to="/map" className={navClass}>
            <MapIcon size={15} /> Map
          </Link>
          <Link to="/budget" className={navClass}>
            <Calculator size={15} /> Budget
          </Link>
          {user ? (
            <Link to="/mero-yatra" className={accountClass}>
              {accountLabel}
            </Link>
          ) : (
            <button type="button" onClick={accountAction} className={accountClass}>
              {accountLabel}
            </button>
          )}
        </nav>

        {/* Compact navigation */}
        <button
          type="button"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors md:hidden ${
            scrolled
              ? 'text-ink hover:bg-paper-2'
              : 'text-paper hover:bg-paper/10'
          }`}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {menuOpen && (
          <nav
            id="landing-mobile-navigation"
            aria-label="Mobile navigation"
            className={`absolute inset-x-0 top-full z-50 grid gap-1 rounded-b-2xl border px-3 py-3 shadow-lg md:hidden ${
              scrolled
                ? 'border-line bg-paper text-ink'
                : 'border-white/15 bg-ink/95 text-paper backdrop-blur-md'
            }`}
          >
            <Link to="/explore" onClick={() => setMenuOpen(false)} className={navClass}>
              <Compass size={15} /> Explore
            </Link>
            <Link to="/map" onClick={() => setMenuOpen(false)} className={navClass}>
              <MapIcon size={15} /> Map
            </Link>
            <Link to="/budget" onClick={() => setMenuOpen(false)} className={navClass}>
              <Calculator size={15} /> Budget
            </Link>
            {user ? (
              <Link to="/mero-yatra" onClick={() => setMenuOpen(false)} className={accountClass}>
                {accountLabel}
              </Link>
            ) : (
              <button type="button" onClick={accountAction} className={accountClass}>
                {accountLabel}
              </button>
            )}
          </nav>
        )}
      </div>
    </header>
  )
}
