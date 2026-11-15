import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BedDouble,
  CircuitBoard,
  Clock3,
  ImageIcon,
  MapPin,
  MessageSquareText,
  Mountain,
  NotebookTabs,
  Route,
  UsersRound,
} from 'lucide-react'
import type { AdminDashboard as DashboardData } from '../../lib/api'
import { apiErrorMessage } from '../../lib/api'
import { useAdminApi, usePageTitle } from '../../lib/adminHooks'
import { relativeTime } from '../../lib/adminFormat'
import {
  AdminButton,
  AdminCard,
  EmptyBlock,
  InlineAlert,
  LoadingBlock,
  PageHeader,
  StatusBadge,
} from '../../components/admin/AdminUI'

const CARD_DEFS = [
  { key: 'destinations', label: 'Destinations', icon: MapPin, hint: 'all statuses' },
  { key: 'publishedDestinations', label: 'Published', icon: CircuitBoard, hint: 'live on the site' },
  { key: 'draftDestinations', label: 'Drafts', icon: Clock3, hint: 'not public yet' },
  { key: 'users', label: 'Registered users', icon: UsersRound, hint: 'all accounts' },
  { key: 'trips', label: 'Saved trips', icon: NotebookTabs, hint: 'personal itineraries' },
  { key: 'pendingReviews', label: 'Awaiting moderation', icon: MessageSquareText, hint: 'pending reviews' },
  { key: 'activities', label: 'Activities & attractions', icon: Mountain, hint: 'all statuses' },
  { key: 'templates', label: 'Itinerary templates', icon: Route, hint: 'admin-authored' },
] as const

export function AdminDashboard() {
  usePageTitle('Dashboard')
  const api = useAdminApi()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    api
      .dashboard()
      .then(setData)
      .catch((reason: unknown) => setError(apiErrorMessage(reason)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let active = true
    api
      .dashboard()
      .then((result) => {
        if (active) setData(result)
      })
      .catch((reason: unknown) => {
        if (active) setError(apiErrorMessage(reason))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const attentionCount =
    (data?.attention.drafts.length ?? 0) +
    (data?.attention.pendingReviews.length ?? 0) +
    (data?.attention.missingCovers.length ?? 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="What is live, what is waiting, and what changed recently. Every number below is a real database count."
        actions={
          <>
            <AdminButton onClick={load} loading={loading}>
              Refresh
            </AdminButton>
            <Link to="/admin/destinations/new">
              <AdminButton variant="primary">+ New destination</AdminButton>
            </Link>
          </>
        }
      />

      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      {loading && !data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl border border-line bg-white/50" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {CARD_DEFS.map((card) => (
              <div key={card.key} className="rounded-2xl border border-line bg-[#fffdf8] px-4 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
                    {card.label}
                  </p>
                  <card.icon size={15} className="text-pine-3" strokeWidth={1.7} />
                </div>
                <p className="mt-2 font-display text-3xl leading-none text-ink">
                  {data.counts[card.key]}
                </p>
                <p className="mt-1.5 text-[11px] text-ink-mute">{card.hint}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <AdminCard
              title="Needs attention"
              description={
                attentionCount === 0
                  ? 'Nothing is waiting right now.'
                  : `${attentionCount} item${attentionCount === 1 ? '' : 's'} worth reviewing`
              }
            >
              {attentionCount === 0 ? (
                <EmptyBlock
                  title="All clear"
                  description="No drafts, missing cover images or reviews waiting for moderation."
                />
              ) : (
                <div className="space-y-5">
                  {data.attention.drafts.length > 0 ? (
                    <section>
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
                          Draft destinations
                        </h3>
                        <Link
                          to="/admin/destinations?status=DRAFT"
                          className="text-[11px] text-pine hover:underline"
                        >
                          View drafts
                        </Link>
                      </div>
                      <ul className="divide-y divide-line rounded-xl border border-line">
                        {data.attention.drafts.map((draft) => (
                          <li key={draft.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="truncate text-sm">{draft.name}</p>
                              <p className="text-[11px] text-ink-mute">
                                updated {relativeTime(draft.updatedAt)}
                              </p>
                            </div>
                            <Link
                              to={`/admin/destinations/${draft.id}/edit`}
                              className="shrink-0 text-[11px] text-pine hover:underline"
                            >
                              Finish
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {data.attention.pendingReviews.length > 0 ? (
                    <section>
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
                          Reviews awaiting moderation
                        </h3>
                        <Link
                          to="/admin/reviews?status=PENDING"
                          className="text-[11px] text-pine hover:underline"
                        >
                          Moderate
                        </Link>
                      </div>
                      <ul className="divide-y divide-line rounded-xl border border-line">
                        {data.attention.pendingReviews.map((review) => (
                          <li key={review.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="truncate text-sm">
                                {review.rating}★ {review.destination.name}
                              </p>
                              <p className="text-[11px] text-ink-mute">
                                {review.user.fullName} · {relativeTime(review.createdAt)}
                              </p>
                            </div>
                            <Link to="/admin/reviews?status=PENDING" className="shrink-0 text-[11px] text-pine hover:underline">
                              Review
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {data.attention.missingCovers.length > 0 ? (
                    <section>
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
                          Published without a cover image
                        </h3>
                        <Link to="/admin/media" className="text-[11px] text-pine hover:underline">
                          Image library
                        </Link>
                      </div>
                      <ul className="divide-y divide-line rounded-xl border border-line">
                        {data.attention.missingCovers.map((destination) => (
                          <li key={destination.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                            <p className="truncate text-sm">{destination.name}</p>
                            <Link
                              to={`/admin/media?destinationId=${destination.id}`}
                              className="shrink-0 text-[11px] text-pine hover:underline"
                            >
                              Add image
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              )}
            </AdminCard>

            <AdminCard
              title="Recent activity"
              description="Admin actions recorded in the audit log."
              actions={
                <Link to="/admin/audit-logs" className="text-[11px] text-pine hover:underline">
                  Full log
                </Link>
              }
            >
              {data.recentActivity.length === 0 ? (
                <EmptyBlock
                  title="No admin activity yet"
                  description="Create or edit content and the audit trail will appear here."
                />
              ) : (
                <ol className="space-y-3.5">
                  {data.recentActivity.map((entry) => (
                    <li key={entry.id} className="flex gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pine-3" />
                      <div className="min-w-0">
                        <p className="text-sm leading-snug text-ink">{entry.summary}</p>
                        <p className="mt-0.5 text-[11px] text-ink-mute">
                          {entry.admin.fullName} · {relativeTime(entry.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </AdminCard>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              to="/admin/analytics"
              className="group rounded-2xl border border-line bg-[#fffdf8] p-4 transition hover:border-pine-3"
            >
              <p className="flex items-center justify-between text-sm font-medium">
                Reports & analytics <ArrowRight size={14} className="text-pine-3" />
              </p>
              <p className="mt-1.5 text-[11px] text-ink-soft">
                Content, users and trips over a date range.
              </p>
            </Link>
            <Link
              to="/admin/media"
              className="group rounded-2xl border border-line bg-[#fffdf8] p-4 transition hover:border-pine-3"
            >
              <p className="flex items-center justify-between text-sm font-medium">
                Image library <ImageIcon size={14} className="text-pine-3" />
              </p>
              <p className="mt-1.5 text-[11px] text-ink-soft">
                {data.counts.images} uploaded image{data.counts.images === 1 ? '' : 's'} in the library.
              </p>
            </Link>
            <Link
              to="/admin/places"
              className="group rounded-2xl border border-line bg-[#fffdf8] p-4 transition hover:border-pine-3"
            >
              <p className="flex items-center justify-between text-sm font-medium">
                Hotels & restaurants <BedDouble size={14} className="text-pine-3" />
              </p>
              <p className="mt-1.5 text-[11px] text-ink-soft">
                Stays and places to eat, with no booking flow.
              </p>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-paper-2/50 px-4 py-3 text-[11px] text-ink-soft">
            <span>
              Statuses: <StatusBadge status="DRAFT" /> <StatusBadge status="PUBLISHED" />{' '}
              <StatusBadge status="ARCHIVED" />
            </span>
            <span>Generated {relativeTime(data.generatedAt)}</span>
          </div>
        </>
      ) : (
        <LoadingBlock rows={4} />
      )}
    </div>
  )
}
