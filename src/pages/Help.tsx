import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, LifeBuoy, Mail, Phone, ShieldCheck } from 'lucide-react'
import { FAQS } from '../data/content'
import { Pill } from '../components/ui'

const SOURCES = [
  {
    area: 'Weather',
    source: 'Open-Meteo forecast API',
    note: 'Live seven-day forecast, timestamped in the app. Falls back to seasonal normals beyond the window.',
  },
  {
    area: 'Routes & drive times',
    source: 'PathYatra road model',
    note: 'Great-circle distance scaled by terrain and class of road. Not live traffic or closure data.',
  },
  {
    area: 'Costs',
    source: 'Typical 2026 mid-range prices',
    note: 'Planning estimates, with a separate contingency line. Never presented as a booking price.',
  },
  {
    area: 'Advisories',
    source: 'Curated sample feed',
    note: 'Labelled confirmed, reported or outlook with a last-updated date. Not an official alert service.',
  },
  {
    area: 'Map tiles',
    source: 'OpenStreetMap contributors',
    note: 'Destination pins are approximate centres. Always use a current local map on the trail.',
  },
  {
    area: 'Reviews',
    source: 'Community submissions',
    note: 'Unverified by design. A verified-visit badge appears only when a reliable method exists.',
  },
]

export function Help() {
  return (
    <div className="container-page py-10">
      <div className="max-w-3xl">
        <Pill tone="outline">
          <LifeBuoy size={12} /> Help & support
        </Pill>
        <h1 className="mt-4 font-display text-[clamp(2rem,4.4vw,3.3rem)] leading-[1] tracking-tight">
          How PathYatra works.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          A short, honest guide to what the product does, what it estimates, and where you should check a second source
          before you travel.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section>
            <h2 className="font-display text-2xl text-ink">Common questions</h2>
            <div className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white/55">
              {FAQS.map((faq) => (
                <details key={faq.q} className="group px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium text-ink">
                    {faq.q}
                    <span className="text-ink-mute transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink">Data, sources and uncertainty</h2>
            <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white/55">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-paper-2/60 text-[9px] uppercase tracking-[0.1em] text-ink-mute">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Area</th>
                    <th className="px-3 py-2 font-semibold">Source</th>
                    <th className="px-3 py-2 font-semibold">What it means</th>
                  </tr>
                </thead>
                <tbody>
                  {SOURCES.map((row) => (
                    <tr key={row.area} className="border-t border-line align-top">
                      <td className="whitespace-nowrap px-3 py-2.5 font-medium text-ink">{row.area}</td>
                      <td className="px-3 py-2.5 text-ink-soft">{row.source}</td>
                      <td className="px-3 py-2.5 text-ink-mute">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-ink-mute">
              The product deliberately separates the route engine (valid distances and costs) from the recommendation
              layer (why a place suits you). Neither invents live road closures or weather.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink">Before you go</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                'Check the Department of Roads for highway status.',
                'Confirm permits with the relevant national park or conservation office.',
                'Buy insurance that covers your maximum altitude and activities.',
                'Keep printed copies of permits and emergency contacts.',
                'Tell someone your route and expected return date.',
                'Carry enough cash for remote sections — ATMs stop where the road ends.',
              ].map((item) => (
                <p key={item} className="flex items-start gap-2 rounded-xl border border-line bg-white/45 px-3 py-2.5 text-[11px] leading-relaxed text-ink-soft">
                  <ShieldCheck size={12} className="mt-0.5 shrink-0 text-pine-3" />
                  {item}
                </p>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-3">
          <div className="rounded-2xl border border-line bg-white/60 p-5">
            <h2 className="flex items-center gap-1.5 font-display text-xl text-ink">
              <Phone size={16} className="text-clay" /> Emergency numbers
            </h2>
            <div className="mt-3 space-y-2">
              {[
                { label: 'Nepal Police', number: '100' },
                { label: 'Ambulance', number: '102' },
                { label: 'Tourist Police', number: '1144' },
                { label: 'Nepal Tourism Board', number: '01-4256909' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-xl border border-line/80 px-3 py-2">
                  <span className="text-[11px] text-ink-soft">{row.label}</span>
                  <span className="text-sm font-medium text-ink">{row.number}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-ink-mute">
              Numbers can change. Save them offline and confirm locally on arrival.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white/60 p-5">
            <h2 className="flex items-center gap-1.5 font-display text-xl text-ink">
              <BookOpen size={16} /> Getting started
            </h2>
            <div className="mt-3 space-y-2 text-[11px]">
              {[
                { label: 'Browse and compare destinations', to: '/explore' },
                { label: 'Price a trip in the budget planner', to: '/budget' },
                { label: 'Generate a day-by-day plan', to: '/plan' },
                { label: 'Open the interactive map', to: '/map' },
                { label: 'Read or write a review', to: '/reviews' },
              ].map((link) => (
                <Link key={link.label} to={link.to} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-ink-soft transition hover:bg-paper-2 hover:text-ink">
                  {link.label}
                  <ArrowRight size={12} />
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-paper-2/60 p-5">
            <h2 className="flex items-center gap-1.5 font-display text-xl text-ink">
              <Mail size={16} /> Contact
            </h2>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
              This is a product demo, so support is illustrative. In a live deployment, support, data corrections and
              guide verification would run through the operator.
            </p>
            <p className="mt-2 text-[11px] font-medium text-ink">hello@pathyatra.example</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
