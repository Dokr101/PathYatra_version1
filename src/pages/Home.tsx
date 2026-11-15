import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Compass,
  Heart,
  Map as MapIcon,
  Quote,
  Route,
  Search,
  Sparkles,
  Star,
  Wallet,
} from 'lucide-react'
import {
  DESTINATIONS,
  HIDDEN_GEMS,
  POPULAR_SLUGS,
  destinationsInSeason,
  getDestination,
} from '../data/destinations'
import { categoryImage, heroImage } from '../data/destinationImages'
import { SEED_REVIEWS } from '../data/content'
import { CATEGORIES, MONTHS, SEASONS } from '../data/taxonomy'
import { DestinationImage } from '../components/DestinationImage'
import { DestinationCard } from '../components/DestinationCard'
import { LandingHeader } from '../components/LandingHeader'
import { MapView } from '../components/MapView'
import { SectionHeading, Eyebrow, Pill, Rating } from '../components/ui'
import { useApp } from '../context/AppContext'

const POPULAR = POPULAR_SLUGS.map(getDestination).filter(Boolean) as NonNullable<
  ReturnType<typeof getDestination>
>[]

const SIGNATURES = [
  {
    icon: Route,
    title: 'Yatra Intelligence',
    copy: 'A Nepal-aware planner that weighs season, terrain, road time, altitude, permits and budget — and shows three honest routes instead of one.',
    tag: 'Plan',
  },
  {
    icon: Sparkles,
    title: 'Discover the Undiscovered',
    copy: 'Hidden valley bazaars, Dolpo lakes, far-western parks and Mithila art. The places generic travel platforms skip, with the context to visit them well.',
    tag: 'Explore',
  },
  {
    icon: CalendarDays,
    title: 'My Yatra Companion',
    copy: 'A dashboard that stays useful before, during and after the journey: day plans, packing lists, expense splitting and a record of where you have been.',
    tag: 'Travel',
  },
]

export function Home() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [showScrollHint, setShowScrollHint] = useState(true)
  const month = new Date().getMonth() + 1
  const season = SEASONS.find((item) => item.months.includes(month)) ?? SEASONS[3]
  const seasonal = destinationsInSeason(month).slice(0, 3)
  const { wishlist } = useApp()

  useEffect(() => {
    const updateScrollHint = () => setShowScrollHint(window.scrollY <= 48)
    updateScrollHint()
    window.addEventListener('scroll', updateScrollHint, { passive: true })
    return () => window.removeEventListener('scroll', updateScrollHint)
  }, [])

  const search = (event: React.FormEvent) => {
    event.preventDefault()
    navigate(query.trim() ? `/explore?q=${encodeURIComponent(query.trim())}` : '/explore')
  }

  return (
    <div>
      <LandingHeader />
      {/* 1. Hero */}
      <section className="home-hero relative overflow-hidden bg-[#172B32] text-white">
        <img
          src={heroImage}
          alt="Sunrise over the high Himalaya"
          className="absolute inset-0 h-full w-full object-cover object-[58%_center] max-sm:object-[62%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#172B32]/85 via-[#172B32]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#172B32]/65 via-transparent to-[#172B32]/15" />

        <div className="home-hero-inner container-page relative flex h-full min-h-0 flex-col pt-[72px]">
          <div className="home-hero-content flex flex-1 min-h-0 items-center overflow-hidden py-6 sm:py-8">
            <div className="hero-entrance w-full max-w-[550px] min-h-0">
              <p className="hero-eyebrow mb-5 text-[10px] font-medium uppercase tracking-[0.24em] text-white/75 sm:text-[11px]">
                Nepal, beyond the ordinary
              </p>

              <h1 className="hero-title font-display text-[clamp(2.65rem,6.8vw,4.5rem)] leading-[0.98] tracking-[-0.035em] text-white max-[360px]:text-[2.4rem]">
                Find your way
                <br />
                through <span className="text-[#F1B653]">Nepal.</span>
              </h1>

              <p className="hero-description mt-5 max-w-[500px] text-sm leading-[1.7] text-[#D3D9D8] sm:mt-6 sm:text-base">
                From quiet Himalayan villages to lakeside escapes and unforgettable mountain trails, discover Nepal
                your way. Find destinations, compare routes, and plan a journey that fits your budget.
              </p>

              <div className="hero-actions mt-6 flex flex-wrap items-center gap-3 max-[420px]:flex-col max-[420px]:items-stretch sm:mt-7 sm:gap-4">
                <Link
                  to="/explore"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#DC753C] px-6 py-3 text-sm font-medium text-white shadow-[0_8px_24px_-14px_rgba(220,117,60,0.9)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#ca6834] hover:shadow-[0_12px_28px_-14px_rgba(220,117,60,0.95)]"
                >
                  Explore destinations <ArrowRight size={16} />
                </Link>
                <Link
                  to="/plan"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 bg-white/5 px-6 py-3 text-sm font-medium text-white transition duration-200 hover:-translate-y-0.5 hover:border-white/70 hover:bg-white/12"
                >
                  Plan your journey <ArrowUpRight size={16} />
                </Link>
              </div>

              <form onSubmit={search} className="hero-search mt-6 w-full max-w-[470px] sm:mt-7">
                <div className="flex items-center gap-2 rounded-[15px] border border-white/55 bg-[#F5F2E9] p-1.5 pl-4 shadow-[0_14px_36px_-20px_rgba(0,0,0,0.7)] transition duration-200 focus-within:border-[#F1B653] focus-within:ring-4 focus-within:ring-[#F1B653]/20">
                  <Search size={17} className="shrink-0 text-[#172B32]/70" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search destinations, regions, or experiences..."
                    aria-label="Search destinations, regions, or experiences"
                    className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-[#172B32] outline-none placeholder:text-[#172B32]/55"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-[10px] bg-[#DC753C] px-4 py-2.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-[#ca6834]"
                  >
                    Search
                  </button>
                </div>
                <p className="hero-popular mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 pl-1 text-[11px] text-white/70">
                  <span className="mr-0.5 text-white/55">Popular:</span>
                  {['Pokhara', 'Mustang', 'Rara Lake', 'Chitwan'].map((destination, index) => (
                    <span key={destination} className="inline-flex items-center gap-1.5">
                      <Link
                        to={`/explore?q=${encodeURIComponent(destination)}`}
                        className="transition-colors hover:text-[#F1B653] hover:underline"
                      >
                        {destination}
                      </Link>
                      {index < 3 && <span aria-hidden="true" className="text-white/45">·</span>}
                    </span>
                  ))}
                </p>
              </form>
            </div>
          </div>

          <div className="hero-stats flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/20 py-4 text-[10px] tracking-[0.04em] text-white/65 max-[360px]:gap-x-3 max-[360px]:text-[9px] sm:gap-x-7 sm:py-4 sm:text-[11px]">
            <span>
              <span className="text-white">{DESTINATIONS.length}+</span> Destinations
            </span>
            <span className="hidden h-3 w-px bg-white/25 sm:block" aria-hidden="true" />
            <span>
              <span className="text-white">7</span> Provinces
            </span>
            <span className="hidden h-3 w-px bg-white/25 sm:block" aria-hidden="true" />
            <span>Your pace, your budget</span>
          </div>
          <a
            href="#popular"
            onClick={(event) => {
              event.preventDefault()
              document.getElementById('popular')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            aria-label="Scroll to explore popular destinations"
            aria-hidden={!showScrollHint}
            tabIndex={showScrollHint ? 0 : -1}
            className={`hero-scroll flex shrink-0 flex-col items-center gap-1 self-center py-2 text-white/65 transition-[opacity,color] duration-200 hover:text-white ${
              showScrollHint ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <span className="scroll-hint flex h-7 w-7 items-center justify-center rounded-full border border-white/30">
              <ArrowDown size={13} />
            </span>
            <span className="text-[9px] uppercase tracking-[0.2em]">Scroll to explore</span>
          </a>
        </div>
      </section>

      {/* 3. Popular destinations */}
      <section id="popular" className="container-page pt-16 sm:pt-20">
        <SectionHeading
          eyebrow="Most loved this season"
          title="Popular destinations"
          description="The journeys travellers ask about most — from the Khumbu icefall to the rhino grass of Chitwan."
          action={
            <Link to="/explore" className="btn-ghost">
              All destinations <ArrowUpRight size={15} />
            </Link>
          }
        />
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:mt-8 lg:grid-cols-3 xl:grid-cols-4 xl:gap-5">
          {POPULAR.map((destination) => (
            <DestinationCard key={destination.slug} destination={destination} />
          ))}
        </div>
      </section>

      {/* 4. Categories */}
      <section className="container-page pt-20">
        <SectionHeading
          eyebrow="Four ways in"
          title="Explore by category"
          description="Nepal is not one trip. Pick the version of the country you are travelling for."
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((category) => {
            const count = DESTINATIONS.filter((d) => d.category === category.id).length
            return (
              <Link
                key={category.id}
                to={`/explore?category=${category.id}`}
                className="group relative overflow-hidden rounded-2xl border border-line"
              >
                <img
                  src={categoryImage(category.id)}
                  alt={category.label}
                  loading="lazy"
                  className="motion-image h-56 w-full object-cover group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-paper">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-paper/60">{count} destinations</p>
                  <h3 className="mt-1 font-display text-xl leading-tight">{category.label}</h3>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-paper/70">{category.blurb}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-marigold">
                    Browse <ArrowUpRight size={12} />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* 5. Hidden gems */}
      <section className="container-page pt-20">
        <div className="overflow-hidden rounded-[26px] border border-line bg-pine text-paper">
          <div className="grid gap-0 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="flex flex-col justify-center p-8 sm:p-10">
              <Eyebrow className="text-paper/55">Discover the undiscovered</Eyebrow>
              <h2 className="mt-3 font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.02]">
                The Nepal that guidebooks skip.
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-paper/70">
                A Newari bazaar with no cars, a turquoise lake in Dolpo, tigers in the far west, Mithila painting in
                Janakpur. Choose a quieter corner and spend longer there.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/explore?gems=1"
                  className="inline-flex items-center gap-2 rounded-full bg-paper px-5 py-2.5 text-xs font-semibold text-pine transition hover:bg-paper-2"
                >
                  See all {HIDDEN_GEMS.length} hidden gems <ArrowRight size={14} />
                </Link>
                <Link to="/map" className="inline-flex items-center gap-2 rounded-full border border-paper/30 px-5 py-2.5 text-xs text-paper transition hover:bg-paper/10">
                  <MapIcon size={14} /> Open the map
                </Link>
              </div>
              <p className="mt-6 flex items-center gap-1.5 text-[11px] text-paper/50">
                {wishlist.length > 0 ? <Heart size={11} className="fill-marigold text-marigold" /> : <Heart size={11} />}
                {wishlist.length > 0
                  ? `${wishlist.length} saved on your wishlist`
                  : 'Save destinations without planning a whole trip'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-paper/15">
              {HIDDEN_GEMS.slice(0, 4).map((destination) => (
                <Link key={destination.slug} to={`/explore/${destination.slug}`} className="group relative bg-pine">
                  <DestinationImage
                    destination={destination}
                    className="motion-image h-44 w-full opacity-90 group-hover:scale-[1.02] sm:h-52"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="text-[9px] uppercase tracking-[0.14em] text-paper/60">{destination.district}</p>
                    <p className="font-display text-base leading-tight text-paper">{destination.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. Map */}
      <section className="container-page pt-20">
        <SectionHeading
          eyebrow="Explore Nepal on the map"
          title="See the country before you choose"
          description="Every destination in PathYatra, plotted across the seven provinces. Open a pin to read the place, or filter by category and season."
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
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-mute">
                <CalendarDays size={12} /> Right now · {MONTHS[month - 1]}
              </p>
              <h3 className="mt-2 font-display text-xl leading-tight text-ink">{season.label} in Nepal</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">{season.note}</p>
              <p className="mt-3 text-[11px] font-medium text-pine">{seasonal.length} destinations in peak condition</p>
            </div>
            <div className="rounded-2xl border border-line bg-white/55 p-5">
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-mute">
                <Wallet size={12} /> Before you commit
              </p>
              <h3 className="mt-2 font-display text-xl leading-tight text-ink">Check the budget first</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                The standalone budget planner tells you what a route really costs — and what to change if the number is
                tight.
              </p>
              <Link to="/budget" className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-pine">
                Open budget planner <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Seasonal */}
      <section className="container-page pt-20">
        <SectionHeading
          eyebrow={`Seasonal recommendations · ${MONTHS[month - 1]}`}
          title="Where the weather is on your side"
          description="These destinations are inside their recommended window this month. The notes explain what the season actually feels like."
          action={
            <Link to="/explore?season=1" className="btn-ghost">
              All in season <ArrowUpRight size={15} />
            </Link>
          }
        />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {seasonal.map((destination) => (
            <DestinationCard key={destination.slug} destination={destination} />
          ))}
        </div>
      </section>

      {/* 8. Why PathYatra */}
      <section className="container-page pt-20">
        <SectionHeading
          eyebrow="Why PathYatra"
          title="Built around the way Nepal actually travels"
          description="Three ideas guide the product: plan for the country you are in, surface what others miss, and stay useful after the itinerary is printed."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {SIGNATURES.map((item, index) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="group relative overflow-hidden rounded-2xl border border-line bg-white/55 p-6">
                <span className="absolute right-5 top-5 font-display text-5xl leading-none text-paper-3">
                  0{index + 1}
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pine/8 text-pine">
                  <Icon size={19} />
                </span>
                <h3 className="mt-4 font-display text-xl leading-tight text-ink">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">{item.copy}</p>
                <Pill tone="outline" className="mt-4">
                  {item.tag}
                </Pill>
              </div>
            )
          })}
        </div>
      </section>

      {/* 9. Reviews */}
      <section className="container-page pt-20">
        <SectionHeading
          eyebrow="From the community"
          title="Travellers, in their own words"
          description="Community reviews are labelled as such. We only add a verified-visit badge when there is a reliable way to prove the visit."
          action={
            <Link to="/reviews" className="btn-ghost">
              Read all reviews <Star size={14} />
            </Link>
          }
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {SEED_REVIEWS.slice(0, 3).map((review) => (
            <figure key={review.id} className="flex flex-col rounded-2xl border border-line bg-white/55 p-5">
              <Quote size={18} className="text-paper-3" />
              <blockquote className="mt-3 flex-1 text-xs leading-relaxed text-ink-soft">{review.text}</blockquote>
              <figcaption className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
                <div>
                  <p className="text-xs font-medium text-ink">{review.author}</p>
                  <p className="text-[10px] text-ink-mute">
                    {review.home} · {review.subject}
                  </p>
                </div>
                <Rating value={review.rating} size={11} />
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* 10. Closing CTA */}
      <section className="container-page pt-20">
        <div className="relative overflow-hidden rounded-[26px] border border-line bg-saffron-soft px-8 py-12 text-center sm:px-14">
          <div className="topo-lines absolute inset-0 opacity-60" />
          <div className="relative mx-auto max-w-2xl">
            <Eyebrow className="text-clay">Start where you are</Eyebrow>
            <h2 className="mt-3 font-display text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] text-ink">
              One destination is enough to begin.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Choose a place, answer six questions, and get a day-by-day plan with a cost breakdown you can argue with.
              Change the budget, the pace or the route — the plan follows.
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
