import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Map as MapIcon,
  Route,
  Search,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { DESTINATIONS, POPULAR_SLUGS, destinationsInSeason, getDestination } from '../data/destinations'
import { categoryPhoto, heroPhoto, type DestinationPhoto } from '../data/destinationImages'
import { CATEGORIES, MONTHS, SEASONS } from '../data/taxonomy'
import { DestinationCard } from '../components/DestinationCard'
import { LandingHeader } from '../components/LandingHeader'
import { MapView } from '../components/MapViewLazy'
import { staggerDelay, useRevealOnScroll } from '../lib/motion'
import { SectionHeading } from '../components/ui'

const POPULAR = POPULAR_SLUGS.map(getDestination).filter(Boolean) as NonNullable<
  ReturnType<typeof getDestination>
>[]

const SIGNATURES = [
  {
    icon: Route,
    title: 'Yatra Intelligence',
    copy: 'Season, terrain, altitude, permits and budget, weighed into three honest routes.',
  },
  {
    icon: Sparkles,
    title: 'Discover the Undiscovered',
    copy: 'The valleys and lakes guidebooks skip, with the context to visit them well.',
  },
  {
    icon: CalendarDays,
    title: 'My Yatra Companion',
    copy: 'Day plans, packing lists and costs that stay useful after you land.',
  },
]

/** How far the hero photograph travels per unit of page scroll. */
const HERO_PARALLAX = 0.18

export function Home() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [showScrollHint, setShowScrollHint] = useState(true)
  const [categoryImages, setCategoryImages] = useState<Record<string, DestinationPhoto>>({})
  const reveal = useRevealOnScroll<HTMLElement>()
  const heroPhotoRef = useRef<HTMLImageElement | null>(null)
  const heroCopyRef = useRef<HTMLDivElement | null>(null)

  // Category cards use the same lazy photo chunk as destination cards, so the
  // URL map is fetched once after the first paint instead of at module load.
  useEffect(() => {
    let active = true
    Promise.all(CATEGORIES.map(async (category) => [category.id, await categoryPhoto(category.id)] as const)).then(
      (entries) => {
        if (!active) return
        const next: Record<string, DestinationPhoto> = {}
        for (const [id, photo] of entries) if (photo) next[id] = photo
        setCategoryImages(next)
      },
    )
    return () => {
      active = false
    }
  }, [])

  const month = new Date().getMonth() + 1
  const season = SEASONS.find((item) => item.months.includes(month)) ?? SEASONS[3]
  const seasonal = destinationsInSeason(month).slice(0, 3)

  /**
   * One scroll listener for the hero: it keeps the scroll hint in sync, drifts
   * the photograph slower than the page and fades the copy out as it leaves.
   * Simplified to nothing below 768px and for reduced-motion users.
   */
  useEffect(() => {
    let frame = 0
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const reset = () => {
      if (heroPhotoRef.current) heroPhotoRef.current.style.transform = ''
      if (heroCopyRef.current) {
        heroCopyRef.current.style.opacity = ''
        heroCopyRef.current.style.transform = ''
      }
    }

    const update = () => {
      frame = 0
      const y = window.scrollY
      setShowScrollHint(y <= 48)

      if (reducedMotion || window.innerWidth < 768) {
        reset()
        return
      }

      const viewport = window.innerHeight || 1
      const progress = Math.min(y / viewport, 1)

      if (heroPhotoRef.current) {
        // Slight scale keeps the frame full while the photo drifts down.
        heroPhotoRef.current.style.transform = `translate3d(0, ${(progress * viewport * HERO_PARALLAX).toFixed(
          1,
        )}px, 0) scale(1.06)`
      }
      if (heroCopyRef.current) {
        heroCopyRef.current.style.opacity = `${Math.max(0, 1 - progress * 1.6).toFixed(3)}`
        heroCopyRef.current.style.transform = `translate3d(0, ${(progress * -24).toFixed(1)}px, 0)`
      }
    }

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  const search = (event: React.FormEvent) => {
    event.preventDefault()
    navigate(query.trim() ? `/explore?q=${encodeURIComponent(query.trim())}` : '/explore')
  }

  return (
    <div>
      <LandingHeader />

      {/* 1. Hero */}
      <section className="home-hero relative overflow-hidden bg-ink text-white">
        {heroPhoto ? (
          <picture className="contents">
            <source srcSet={heroPhoto.webpSrcset} sizes="100vw" type="image/webp" />
            <img
              ref={heroPhotoRef}
              src={heroPhoto.src}
              srcSet={heroPhoto.srcset}
              sizes="100vw"
              width={heroPhoto.width}
              height={heroPhoto.height}
              alt="Sunrise over the high Himalaya"
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover object-[58%_center] will-change-transform max-sm:object-[62%_center]"
            />
          </picture>
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-ink/25" />

        <div className="home-hero-inner container-page relative flex h-full min-h-0 flex-col pt-[72px]">
          <div ref={heroCopyRef} className="home-hero-content flex min-h-0 flex-1 items-center overflow-hidden py-6 sm:py-8">
            <div className="hero-entrance hero-text-shadow w-full max-w-[550px] min-h-0">
              <h1 className="hero-title font-display text-[clamp(2.65rem,6.8vw,4.5rem)] leading-[0.98] tracking-[-0.035em] text-white max-[360px]:text-[2.4rem]">
                Find your way
                <br />
                through <span className="text-paper">Nepal.</span>
              </h1>

              <p className="hero-description mt-5 max-w-[430px] text-sm leading-[1.7] text-white/85 sm:mt-6 sm:text-base">
                Plan a journey that fits your season, budget and pace.
              </p>

              <div className="hero-actions mt-6 flex flex-wrap items-center gap-3 max-[420px]:flex-col max-[420px]:items-stretch sm:mt-7">
                <Link
                  to="/plan"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-paper px-6 py-3 text-sm font-medium text-accent shadow-[0_10px_30px_-18px_rgba(0,0,0,0.85)] transition duration-200 hover:-translate-y-0.5 hover:bg-white"
                >
                  Plan your journey <ArrowRight size={16} />
                </Link>
              </div>

              <form onSubmit={search} className="hero-search mt-6 w-full max-w-[470px] sm:mt-7">
                <div className="flex items-center gap-2 rounded-[15px] border border-white/55 bg-paper p-1.5 pl-4 shadow-[0_14px_36px_-20px_rgba(0,0,0,0.7)] transition duration-200 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/20">
                  <Search size={17} className="shrink-0 text-ink/60" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search destinations, regions, or experiences..."
                    aria-label="Search destinations, regions, or experiences"
                    className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-ink-mute"
                  />
                  <button
                    type="submit"
                    className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-[10px] bg-accent px-4 py-2.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-accent-strong"
                  >
                    Search
                  </button>
                </div>
                <p className="hero-popular mt-2.5 flex flex-wrap items-center gap-1.5 pl-1 text-[11px] text-white/85">
                  <span className="mr-0.5 text-white/70">Popular:</span>
                  {['Pokhara', 'Mustang', 'Rara Lake', 'Chitwan'].map((destination) => (
                    <Link
                      key={destination}
                      to={`/explore?q=${encodeURIComponent(destination)}`}
                      className="inline-flex min-h-[36px] items-center rounded-full border border-white/25 bg-white/10 px-3 transition-colors hover:border-white/60 hover:bg-white/20"
                    >
                      {destination}
                    </Link>
                  ))}
                </p>
              </form>
            </div>
          </div>

          <p className="hero-stats w-full max-w-[550px] shrink-0 border-t border-white/25 py-4 text-[11px] tracking-[0.04em] text-white/85">
            <span className="text-white">{DESTINATIONS.length}+</span> destinations ·{' '}
            <span className="text-white">7</span> provinces
          </p>

          <a
            href="#popular"
            onClick={(event) => {
              event.preventDefault()
              document.getElementById('popular')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            aria-label="Scroll to explore popular destinations"
            aria-hidden={!showScrollHint}
            tabIndex={showScrollHint ? 0 : -1}
            className={`hero-scroll flex shrink-0 flex-col items-center gap-1.5 self-center py-2 text-white/90 transition-[opacity,color] duration-200 hover:text-white ${
              showScrollHint ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <span className="scroll-hint flex h-7 w-7 items-center justify-center rounded-full border border-white/40 bg-ink/70">
              <ArrowDown size={13} />
            </span>
            <span className="rounded-full border border-white/25 bg-ink/75 px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] text-white backdrop-blur-sm">
              Scroll to explore
            </span>
          </a>
        </div>
      </section>

      {/* 2. Popular destinations */}
      <section id="popular" ref={reveal} className="reveal container-page pt-16 sm:pt-20">
        <SectionHeading
          title="Popular destinations"
          action={
            <Link to="/explore" className="btn-ghost">
              All destinations <ArrowUpRight size={15} />
            </Link>
          }
        />
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:mt-8 lg:grid-cols-4 xl:gap-5">
          {POPULAR.map((destination, index) => (
            <div
              key={destination.slug}
              className="stagger-item [&>article]:h-full"
              style={{ '--stagger': `${staggerDelay(index)}ms` } as React.CSSProperties}
            >
              <DestinationCard destination={destination} />
            </div>
          ))}
        </div>
      </section>

      {/* 3. Categories */}
      <section ref={reveal} className="reveal container-page pt-20">
        <SectionHeading title="Explore by category" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((category, index) => {
            const count = DESTINATIONS.filter((d) => d.category === category.id).length
            return (
              <div
                key={category.id}
                className="stagger-item"
                style={{ '--stagger': `${staggerDelay(index)}ms` } as React.CSSProperties}
              >
                <Link
                  to={`/explore?category=${category.id}`}
                  className="group relative block overflow-hidden rounded-2xl border border-line"
                >
                  <picture className="contents">
                    <source
                      srcSet={categoryImages[category.id]?.webpSrcset}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      type="image/webp"
                    />
                    <img
                      src={categoryImages[category.id]?.src}
                      srcSet={categoryImages[category.id]?.srcset}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      alt={category.label}
                      loading="lazy"
                      decoding="async"
                      className="motion-image h-56 w-full object-cover group-hover:scale-[1.02]"
                    />
                  </picture>
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-paper">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-paper/60">{count} destinations</p>
                    <h3 className="mt-1 font-display text-xl leading-tight">{category.label}</h3>
                    <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-paper">
                      Browse <ArrowUpRight size={12} />
                    </span>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      </section>

      {/* 4. Map — fade only: Leaflet needs an untransformed, stable box. */}
      <section ref={reveal} className="reveal reveal--fade container-page pt-20">
        <SectionHeading
          title="See the country before you choose"
          action={
            <Link to="/map" className="btn-ghost">
              Full map <MapIcon size={15} />
            </Link>
          }
        />
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <MapView destinations={DESTINATIONS} height="430px" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-line bg-white/55 p-5">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
                <CalendarDays size={12} /> Right now · {MONTHS[month - 1]}
              </p>
              <h3 className="mt-2 font-display text-xl leading-tight text-ink">{season.label} in Nepal</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">{season.note}</p>
              <p className="mt-3 text-[11px] font-medium text-accent">
                {seasonal.length} destinations in peak condition
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white/55 p-5">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
                <Wallet size={12} /> Before you commit
              </p>
              <h3 className="mt-2 font-display text-xl leading-tight text-ink">Check the budget first</h3>
              <Link
                to="/budget"
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-accent"
              >
                Open budget planner <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Why PathYatra */}
      <section ref={reveal} className="reveal container-page pt-20">
        <SectionHeading title="Built around the way Nepal actually travels" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {SIGNATURES.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-line bg-white/55 p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon size={19} />
                </span>
                <h3 className="mt-4 font-display text-xl leading-tight text-ink">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">{item.copy}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* 6. Closing CTA */}
      <section ref={reveal} className="reveal container-page pt-20">
        <div className="relative overflow-hidden rounded-[26px] border border-line bg-accent-soft px-8 py-12 text-center sm:px-14">
          <div className="topo-lines absolute inset-0 opacity-60" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] text-ink">
              One destination is enough to begin.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Answer six questions and get a day-by-day plan with a cost breakdown.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/plan" className="btn-primary">
                Plan your yatra <ArrowRight size={15} />
              </Link>
              <Link to="/explore" className="btn-ghost bg-paper/60">
                Browse destinations
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
