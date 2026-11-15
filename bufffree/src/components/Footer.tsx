import { Link } from 'react-router-dom'
import { ArrowUpRight, Heart } from 'lucide-react'
import { CATEGORIES } from '../data/taxonomy'
import { Logo } from './Nav'

const COLUMNS = [
  {
    title: 'Explore',
    links: [
      { label: 'All destinations', to: '/explore' },
      { label: 'Hidden gems', to: '/explore?gems=1' },
      { label: 'Interactive map', to: '/map' },
      { label: 'Destinations in season', to: '/explore?season=1' },
    ],
  },
  {
    title: 'Plan',
    links: [
      { label: 'Plan your yatra', to: '/plan' },
      { label: 'Budget planner', to: '/budget' },
      { label: 'Compare destinations', to: '/explore?compare=1' },
      { label: 'Mero Yatra', to: '/mero-yatra' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Travel reviews', to: '/reviews' },
      { label: 'Local guides', to: '/reviews#guides' },
      { label: 'Help & support', to: '/help' },
      { label: 'My profile', to: '/profile' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="no-print mt-24 border-t border-line bg-paper-2/60">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-[1.3fr_repeat(3,0.8fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
              A Nepal-first travel companion. Discover the country, plan within a real budget, and carry the plan with
              you before, during and after the journey.
            </p>
            <p className="mt-5 flex items-center gap-1.5 text-[11px] text-ink-mute">
              Built for Nepal <Heart size={11} className="fill-saffron text-saffron" /> with respect for the trail.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-mute">{column.title}</p>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="inline-flex items-center gap-1 text-sm text-ink-soft transition hover:text-pine"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-6 border-t border-line pt-8 lg:grid-cols-[1fr_auto]">
          <div className="max-w-3xl space-y-2 text-[11px] leading-relaxed text-ink-mute">
            <p>
              <strong className="font-semibold text-ink-soft">Planning estimates, not bookings.</strong> Costs and drive
              times are modelled from typical mid-range 2026 prices and road distances. They are indicative only and
              should be confirmed with operators before payment.
            </p>
            <p>
              <strong className="font-semibold text-ink-soft">Weather and advisories.</strong> Live forecasts come from
              Open-Meteo and are timestamped. The advisory feed in this build is a curated sample with confidence labels;
              it is not an official road-closure service. Always check the Department of Roads, Nepal Tourism Board and
              local conditions before travel.
            </p>
            <p>
              Destination imagery is original generated artwork. Reviews are community contributions unless a reliable
              verification method exists.
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            {CATEGORIES.map((category) => (
              <Link
                key={category.id}
                to={`/explore?category=${category.id}`}
                className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11px] text-ink-soft transition hover:border-pine-3 hover:text-pine"
              >
                {category.short} <ArrowUpRight size={11} />
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-[11px] text-ink-mute">
          <p>© 2026 PathYatra · Kathmandu, Nepal</p>
          <p>Navigate Nepal with better information.</p>
        </div>
      </div>
    </footer>
  )
}
