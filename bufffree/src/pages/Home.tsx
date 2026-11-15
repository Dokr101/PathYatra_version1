import { useState } from 'react'
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
  popularDestinations,
} from '../data/destinations'
import { SEED_REVIEWS } from '../data/content'
import { CATEGORIES, MONTHS, SEASONS } from '../data/taxonomy'
import { ScenicArt } from '../components/ScenicArt'
import { DestinationCard } from '../components/DestinationCard'
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
  const month = new Date().getMonth() + 1
  const season = SEASONS.find((item) => item.months.includes(month)) ?? SEASONS[3]
  const seasonal = destinationsInSeason(month).slice(0, 3)
  const { wishlist } = useApp()

  const search = (event: React.FormEvent) => {
    event.preventDefault()
    navigate(query.trim() ? `/explore?q=${encodeURIComponent(query.trim())}` : '/explore')
  }

  return (
    <div>
      {/* 1. Hero */}
      <section className="relative overflow-hidden bg-pine text-paper">
        <ScenicArt
          scene={{ kind: 'peaks', sky: 'dawn', seed: 3 }}
          label="Sunrise over the high Himalaya"
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/35 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-ink/15" />

        <div className="container-page relative flex min-h-[640px] flex-col justify-center pb-24 pt-16 sm:min-h-[700px]">
          <div className="max-w-2xl fade-up">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Pill tone="marigold" className="border-none">
                <Compass size={12} /> Nepal-first travel planning
              </Pill>
              <span className="text-[11px] uppercase tracking-[0.18em] text-paper/60">Est. in the Himalaya</span>
            </div>

            <h1 className="font-display text-[clamp(2.7rem,6.2vw,4.6rem)] leading-[0.96] tracking-[-0.03em] text-paper">
              Your Journey.
              <br />
              Your Budget.
              <br />
              <span className="italic text-marigold">Your Nepal.</span>
            </h1>

            <p className="mt-6 max-w-lg text-sm leading-relaxed text-paper/80 sm:text-base">
              Discover Nepal’s hidden gems, plan smarter routes, and create journeys that match your travel style —
              with real seasons, real road time and a budget that makes sense.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/explore" className="btn-saffron">
                Explore Nepal <ArrowRight size={16} />
              </Link>
              <Link
                to="/plan"
                className="inline-flex items-center gap-2 rounded-full border border-paper/35 bg-paper/10 px-6 py-3 text-sm font-medium text-paper backdrop-blur-sm transition hover:bg-paper/20"
              >
                Plan your yatra <ArrowUpRight size={16} />
              </Link>
            </div>

            <form onSubmit={search} className="mt-8 max-w-lg">
              <div className="flex items-center gap-2 rounded-full border border-paper/30 bg-paper/12 p-1.5 pl-4 backdrop-blur-md">
                <Search size={16} className="shrink-0 text-paper/60" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Where in Nepal? Pokhara, Rara, Chitwan…"
                  aria-label="Search destinations from the homepage"
                  className="min-w-0 flex-1 bg-transparent py-2 text-sm text-paper outline-none placeholder:text-paper/55"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-paper px-4 py-2 text-xs font-semibold text-pine transition hover:bg-paper-2"
                >
                  Search
                </button>
              </div>
              <p className="mt-2 pl-1 text-[11px] text-paper/55">
                {DESTINATIONS.length} destinations across all seven provinces. No account needed to explore.
              </p>
            </form>
          </div>

          <div className="mt-14 grid max-w-2xl grid-cols-2 gap-x-6 gap-y-4 border-t border-paper/20 pt-6 sm:grid-cols-4">
            {[
              { value: `${DESTINATIONS.length}`, label: 'Destinations' },
              { value: '7', label: 'Provinces' },
              { value: '3', label: 'Route options' },
              { value: 'Free', label: 'To explore' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-2xl leading-none text-paper">{stat.value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-paper/55">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <a
          href="#popular"
          aria-label="Scroll to popular destinations"
          className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-paper/60 transition hover:text-paper sm:flex"
        >
          <span className="scroll-hint flex h-8 w-8 items-center justify-center rounded-full border border-paper/30">
            <ArrowDown size={14} />
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em]">Scroll to explore</span>
        </a>
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
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                <ScenicArt
                  scene={category.scene}
                  label={category.label}
                  className="h-56 w-full transition duration-700 group-hover:scale-105"
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
                  <ScenicArt
                    scene={destination.scene}
                    className="h-44 w-full opacity-90 transition duration-700 group-hover:scale-105 sm:h-52"
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
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
