import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, BadgeCheck, MapPin, MessageSquarePlus, Star, ThumbsUp } from 'lucide-react'
import type { Review } from '../types'
import { useApp } from '../context/AppContext'
import { DESTINATIONS, getDestination } from '../data/destinations'
import { GUIDES } from '../data/content'
import { cx, formatDate, npr, initials, todayISO } from '../lib/format'
import { Modal, Pill, Rating, SectionHeading } from '../components/ui'

const CATEGORIES: Array<Review['category'] | 'All'> = [
  'All',
  'Destination',
  'Road & transport',
  'Hotels & stays',
  'Restaurants & food',
  'Activities',
  'Local hospitality',
  'Affordability',
]

export function Reviews() {
  const { reviews, user, openAuth, addReview, voteHelpful, votedReviews } = useApp()
  const [params] = useSearchParams()
  const destinationFilter = params.get('destination')
  const [category, setCategory] = useState<Review['category'] | 'All'>('All')
  const [sort, setSort] = useState<'recent' | 'helpful' | 'highest'>('recent')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [subject, setSubject] = useState(destinationFilter ? getDestination(destinationFilter)?.name ?? '' : '')
  const [reviewCategory, setReviewCategory] = useState<Review['category']>('Destination')
  const [text, setText] = useState('')
  const [spend, setSpend] = useState('')
  const [reviewDestination, setReviewDestination] = useState(destinationFilter ?? '')
  const [travelDate, setTravelDate] = useState(todayISO())

  const filtered = useMemo(() => {
    let list = [...reviews]
    if (destinationFilter) list = list.filter((review) => review.destinationSlug === destinationFilter)
    if (category !== 'All') list = list.filter((review) => review.category === category)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (review) =>
          review.text.toLowerCase().includes(q) ||
          review.subject.toLowerCase().includes(q) ||
          review.author.toLowerCase().includes(q),
      )
    }
    if (sort === 'helpful') list.sort((a, b) => b.helpful - a.helpful)
    if (sort === 'highest') list.sort((a, b) => b.rating - a.rating)
    if (sort === 'recent') list.sort((a, b) => b.date.localeCompare(a.date))
    return list
  }, [category, destinationFilter, query, reviews, sort])

  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((review) => review.rating === star).length,
  }))
  const filterDestination = destinationFilter ? getDestination(destinationFilter) : undefined

  const openForm = () => {
    if (!user) {
      openAuth('Sign in to publish a community review. Reviews are labelled as community contributions.', '/reviews')
      return
    }
    setOpen(true)
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return
    if (!text.trim() || !subject.trim()) return
    const destination = getDestination(reviewDestination)
    addReview({
      author: user.name,
      home: user.homeCity,
      category: reviewCategory,
      subject: subject.trim(),
      destinationSlug: destination?.slug ?? reviewDestination ?? 'kathmandu-heritage',
      rating,
      date: travelDate || todayISO(),
      spend: spend ? Number(spend) : undefined,
      text: text.trim(),
    })
    setOpen(false)
    setText('')
    setSubject('')
    setSpend('')
  }

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <Pill tone="outline">
            <Star size={12} /> Community reviews
          </Pill>
          <h1 className="mt-4 font-display text-[clamp(2rem,4.4vw,3.3rem)] leading-[1] tracking-tight">
            The country, reviewed honestly.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Destinations, roads, stays, food, activities, hospitality and affordability. We do not invent verified
            badges — everything here is labelled as a community contribution until verification exists.
          </p>
        </div>
        <button type="button" onClick={openForm} className="btn-primary">
          <MessageSquarePlus size={15} /> Write a review
        </button>
      </div>

      {filterDestination ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-paper-2/60 px-4 py-3">
          <p className="text-xs text-ink-soft">
            Showing reviews for <strong className="font-medium text-ink">{filterDestination.name}</strong>
          </p>
          <Link to="/reviews" className="text-[11px] font-medium text-pine">
            Clear filter
          </Link>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.7fr]">
        {/* Summary */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-line bg-white/60 p-5">
            <div className="flex items-end gap-3">
              <p className="font-display text-5xl leading-none text-ink">{average.toFixed(1)}</p>
              <div className="pb-1">
                <Rating value={average} size={14} />
                <p className="mt-1 text-[11px] text-ink-mute">{reviews.length} community reviews</p>
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              {distribution.map((row) => (
                <div key={row.star} className="flex items-center gap-2">
                  <span className="w-3 text-[10px] text-ink-mute">{row.star}</span>
                  <Star size={9} className="fill-marigold text-marigold" />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                    <div
                      className="h-full rounded-full bg-marigold"
                      style={{ width: `${reviews.length ? (row.count / reviews.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-4 text-right text-[9px] text-ink-mute">{row.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white/55 p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
              <BadgeCheck size={12} /> About verification
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
              A verified-visit label should mean something. Until PathYatra can confirm a booking or check-in, every
              entry stays a community review — useful, opinionated and unverified.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-paper-2/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-mute">Review categories</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CATEGORIES.filter((item) => item !== 'All').map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(category === item ? 'All' : item)}
                  className={cx(
                    'rounded-full border px-2.5 py-1 text-[10px] transition',
                    category === item ? 'border-pine bg-pine text-paper' : 'border-line text-ink-soft hover:border-pine-3',
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search reviews…"
              aria-label="Search reviews"
              className="field flex-1 py-2.5"
            />
            <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="field max-w-[180px] py-2.5">
              <option value="recent">Most recent</option>
              <option value="helpful">Most helpful</option>
              <option value="highest">Highest rated</option>
            </select>
            {category !== 'All' ? (
              <button type="button" onClick={() => setCategory('All')} className="text-[11px] text-clay">
                Clear
              </button>
            ) : null}
          </div>

          <div className="mt-3 space-y-2.5">
            {filtered.map((review) => {
              const destination = getDestination(review.destinationSlug)
              const voted = votedReviews.includes(review.id)
              return (
                <article key={review.id} className="rounded-2xl border border-line bg-white/55 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pine/10 text-[11px] font-semibold text-pine">
                      {initials(review.author)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-ink">{review.author}</p>
                          <p className="text-[10px] text-ink-mute">
                            {review.home} · {formatDate(review.date, { short: true })}
                          </p>
                        </div>
                        <Rating value={review.rating} size={11} />
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Pill tone="outline">{review.category}</Pill>
                        <span className="text-[10px] text-ink-mute">{review.subject}</span>
                        {destination ? (
                          <Link to={`/explore/${destination.slug}`} className="text-[10px] font-medium text-pine">
                            · {destination.district}
                          </Link>
                        ) : null}
                        <span className="rounded-full bg-paper-2 px-2 py-0.5 text-[9px] uppercase tracking-wide text-ink-mute">
                          Community
                        </span>
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-ink-soft">{review.text}</p>

                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 text-[10px] text-ink-mute">
                          {review.spend ? <span>Spent about {npr(review.spend)}</span> : null}
                          {destination ? (
                            <Link to={`/explore/${destination.slug}`} className="inline-flex items-center gap-1 text-pine">
                              <MapPin size={9} /> {destination.name.split('&')[0].trim()}
                            </Link>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => voteHelpful(review.id)}
                          aria-pressed={voted}
                          className={cx(
                            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] transition',
                            voted ? 'border-pine bg-pine/10 text-pine' : 'border-line text-ink-mute hover:border-pine-3',
                          )}
                        >
                          <ThumbsUp size={10} /> Helpful · {review.helpful + (voted ? 1 : 0)}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-paper-3 px-5 py-12 text-center">
                <p className="font-display text-xl">No reviews match that.</p>
                <button type="button" onClick={() => { setQuery(''); setCategory('All') }} className="btn-ghost mt-4">
                  Reset filters
                </button>
              </div>
            ) : null}
          </div>

          <button type="button" onClick={openForm} className="btn-ghost mt-4 w-full">
            <MessageSquarePlus size={14} /> Share your experience
          </button>
        </div>
      </div>

      {/* Guides */}
      <section id="guides" className="mt-16 scroll-mt-24">
        <SectionHeading
          eyebrow="Local knowledge"
          title="Guides worth travelling with"
          description="A sample directory of specialists across the regions PathYatra covers. Verify licensing and insurance with the Nepal Tourism Board before you book."
          action={
            <Link to="/help" className="btn-ghost">
              How we vet guides <ArrowRight size={14} />
            </Link>
          }
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map((guide) => (
            <div key={guide.id} className="rounded-2xl border border-line bg-white/55 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-lg leading-tight text-ink">{guide.name}</p>
                  <p className="text-[10px] text-ink-mute">
                    {guide.base} · {guide.languages.join(', ')}
                  </p>
                </div>
                <span className="flex items-center gap-0.5 text-[10px] font-medium text-ink">
                  {guide.rating.toFixed(1)} <Star size={9} className="fill-marigold text-marigold" />
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {guide.specialities.map((speciality) => (
                  <span key={speciality} className="chip">
                    {speciality}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-[10px]">
                <span className="text-ink-mute">{guide.trips} journeys guided</span>
                <span className="font-medium text-ink">{npr(guide.dayRate)} / day</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Write a community review"
        description="Be specific, name what you paid, and say when you travelled. Reviews are published as unverified community contributions."
      >
        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <span className="field-label">Your rating</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`${star} stars`}
                  aria-pressed={rating === star}
                  className="p-1"
                >
                  <Star size={22} className={star <= rating ? 'fill-marigold text-marigold' : 'text-paper-3'} />
                </button>
              ))}
              <span className="ml-2 text-xs text-ink-soft">{rating} / 5</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Category</span>
              <select
                className="field"
                value={reviewCategory}
                onChange={(event) => setReviewCategory(event.target.value as Review['category'])}
              >
                {CATEGORIES.filter((item) => item !== 'All').map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="field-label">Travel date</span>
              <input type="date" className="field" value={travelDate} onChange={(event) => setTravelDate(event.target.value)} />
            </label>
          </div>

          <label className="block">
            <span className="field-label">Destination or place</span>
            <select className="field" value={reviewDestination} onChange={(event) => {
              setReviewDestination(event.target.value)
              const match = getDestination(event.target.value)
              if (match) setSubject(match.name)
            }}>
              <option value="">Choose a destination</option>
              {DESTINATIONS.map((destination) => (
                <option key={destination.slug} value={destination.slug}>
                  {destination.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="field-label">Subject</span>
            <input className="field" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="What are you reviewing?" required />
          </label>

          <label className="block">
            <span className="field-label">Your experience</span>
            <textarea
              className="field min-h-[100px] resize-y"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="What surprised you? What would you tell the next traveller?"
              required
            />
          </label>

          <label className="block">
            <span className="field-label">Estimated spend (Rs., optional)</span>
            <input className="field" type="number" min={0} value={spend} onChange={(event) => setSpend(event.target.value)} placeholder="12000" />
          </label>

          <button type="submit" className="btn-primary w-full" disabled={!text.trim() || !subject.trim()}>
            <ThumbsUp size={14} /> Publish community review
          </button>
          <p className="text-[10px] leading-relaxed text-ink-mute">
            Published under {user?.name}. Stored locally in this demo build. Do not include personal contact details.
          </p>
        </form>
      </Modal>
    </div>
  )
}
