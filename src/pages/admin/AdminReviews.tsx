import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, EyeOff, MessageSquareText, Star } from 'lucide-react'
import type { AdminDestination, AdminReview, ReviewStatus } from '../../lib/api'
import {
  useAdminApi,
  useDebounced,
  useFlash,
  usePageTitle,
  usePagedList,
} from '../../lib/adminHooks'
import {
  AdminButton,
  AdminCard,
  Field,
  InlineAlert,
  LoadingBlock,
  Modal,
  PageHeader,
  Pagination,
  SearchBox,
  Select,
  StatusBadge,
  TextArea,
} from '../../components/admin/AdminUI'
import { formatDate, formatDateTime } from '../../lib/adminFormat'

export function AdminReviews() {
  usePageTitle('Reviews & Feedback')
  const api = useAdminApi()
  const { flash, success, fail } = useFlash()

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounced(query)
  const [status, setStatus] = useState('PENDING')
  const [destinationId, setDestinationId] = useState('')
  const [page, setPage] = useState(1)
  const [destinations, setDestinations] = useState<AdminDestination[]>([])
  const [moderating, setModerating] = useState<{
    review: AdminReview
    next: 'APPROVED' | 'HIDDEN'
  } | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.destinations
      .list({ pageSize: 100, sort: 'name', order: 'asc' })
      .then((result) => setDestinations(result.items))
      .catch(() => undefined)
  }, [api])

  useEffect(() => setPage(1), [debouncedQuery, status, destinationId])

  const { data, loading, error, reload } = usePagedList(
    (signal) =>
      api.reviews.list({
        q: debouncedQuery,
        status,
        destinationId,
        page,
        pageSize: 20,
      }, signal),
    [debouncedQuery, status, destinationId, page],
  )

  const counts = data?.statusCounts ?? {}

  const openModeration = (review: AdminReview, next: 'APPROVED' | 'HIDDEN') => {
    setModerating({ review, next })
    setNote(review.moderationNote ?? '')
  }

  const moderate = async () => {
    if (!moderating) return
    setSaving(true)
    try {
      await api.reviews.moderate(moderating.review.id, moderating.next, note || undefined)
      success(
        moderating.next === 'APPROVED'
          ? 'Review approved and visible publicly.'
          : 'Review hidden from the public site.',
      )
      setModerating(null)
      reload()
    } catch (reason) {
      fail(reason)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reviews & Feedback"
        description="Only approved reviews are public. Review text is never edited here — approve, hide, and record why."
      />

      {flash ? <InlineAlert tone={flash.tone}>{flash.text}</InlineAlert> : null}
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { value: '', label: 'All reviews' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'HIDDEN', label: 'Hidden' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatus(tab.value)}
            className={
              status === tab.value
                ? 'rounded-full border border-pine bg-pine px-3 py-1.5 text-[11px] font-medium text-paper'
                : 'rounded-full border border-line bg-[#fffdf8] px-3 py-1.5 text-[11px] text-ink-soft hover:border-pine-3'
            }
          >
            {tab.label}
            {tab.value ? (
              <span className="ml-1.5 opacity-75">{counts[tab.value as ReviewStatus] ?? 0}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-[#fffdf8] p-3">
        <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr]">
          <SearchBox value={query} onChange={setQuery} placeholder="Search review text, author or destination…" />
          <Select value={destinationId} onChange={setDestinationId}>
            <option value="">All destinations</option>
            {destinations.map((destination) => (
              <option key={destination.id} value={destination.id}>
                {destination.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {loading && !data ? (
        <div className="rounded-2xl border border-line bg-[#fffdf8] p-4">
          <LoadingBlock rows={5} label="Loading reviews" />
        </div>
      ) : data && data.items.length === 0 ? (
        <AdminCard>
          <div className="py-12 text-center">
            <MessageSquareText size={22} className="mx-auto mb-3 text-ink-mute" />
            <h3 className="font-display text-xl">Nothing waiting in this view</h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-soft">
              New traveller reviews arrive as PENDING. Approve the useful ones and hide spam or
              abusive content with a note.
            </p>
          </div>
        </AdminCard>
      ) : data ? (
        <>
          <div className="space-y-3">
            {data.items.map((review) => (
              <article key={review.id} className="rounded-2xl border border-line bg-[#fffdf8] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-ink">{review.user.fullName}</p>
                      <span className="text-[11px] text-ink-mute">{review.user.email}</span>
                      <StatusBadge status={review.status} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink-mute">
                      on{' '}
                      <Link
                        to={`/admin/destinations/${review.destination.id}/edit`}
                        className="text-pine hover:underline"
                      >
                        {review.destination.name}
                      </Link>{' '}
                      · submitted {formatDateTime(review.createdAt)}
                      {review.travelDate ? ` · travelled ${formatDate(review.travelDate)}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5" aria-label={`${review.rating} out of 5`}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={13}
                        className={
                          star <= review.rating
                            ? 'fill-marigold text-marigold'
                            : 'text-paper-3'
                        }
                      />
                    ))}
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                  {review.comment || 'No written comment.'}
                </p>

                {review.moderationNote ? (
                  <p className="mt-3 rounded-lg bg-paper-2 px-3 py-2 text-[11px] text-ink-soft">
                    <strong>Moderation note:</strong> {review.moderationNote}
                    {review.moderatedAt ? ` · ${formatDateTime(review.moderatedAt)}` : ''}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  {review.status !== 'APPROVED' ? (
                    <AdminButton variant="primary" size="sm" onClick={() => openModeration(review, 'APPROVED')}>
                      <Check size={11} /> Approve
                    </AdminButton>
                  ) : null}
                  {review.status !== 'HIDDEN' ? (
                    <AdminButton variant="danger" size="sm" onClick={() => openModeration(review, 'HIDDEN')}>
                      <EyeOff size={11} /> Hide
                    </AdminButton>
                  ) : null}
                  <p className="text-[11px] text-ink-mute">Review content is read-only.</p>
                </div>
              </article>
            ))}
          </div>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            pageSize={data.pageSize}
            onPage={setPage}
          />
        </>
      ) : null}

      <Modal
        open={moderating !== null}
        onClose={() => setModerating(null)}
        title={moderating?.next === 'APPROVED' ? 'Approve this review?' : 'Hide this review?'}
        description={
          moderating?.next === 'APPROVED'
            ? 'It will appear on the public destination page with the author’s name.'
            : 'It will disappear from the public site. The record is kept for the audit trail.'
        }
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setModerating(null)} disabled={saving}>
              Cancel
            </AdminButton>
            <AdminButton
              variant={moderating?.next === 'APPROVED' ? 'primary' : 'danger'}
              loading={saving}
              onClick={() => void moderate()}
            >
              {moderating?.next === 'APPROVED' ? 'Approve review' : 'Hide review'}
            </AdminButton>
          </>
        }
      >
        {moderating ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-paper/60 p-3">
              <p className="text-xs font-medium">
                {moderating.review.rating}★ · {moderating.review.user.fullName} ·{' '}
                {moderating.review.destination.name}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                {moderating.review.comment || 'No written comment.'}
              </p>
            </div>
            <Field
              label="Moderation reason"
              hint="Visible to admins in the audit log and review record. Never edit the review text itself."
            >
              <TextArea
                value={note}
                onChange={setNote}
                rows={3}
                placeholder={
                  moderating.next === 'APPROVED'
                    ? 'e.g. First-hand trip report, no personal data.'
                    : 'e.g. Contains personal contact details and advertising.'
                }
              />
            </Field>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
