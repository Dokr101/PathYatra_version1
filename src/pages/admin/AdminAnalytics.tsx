import { useCallback, useEffect, useRef, useState } from 'react'
import { BarChart3, CalendarDays, Info } from 'lucide-react'
import type { AdminAnalytics as AnalyticsData } from '../../lib/api'
import { apiErrorMessage } from '../../lib/api'
import { useAdminApi, usePageTitle } from '../../lib/adminHooks'
import {
  AdminButton,
  AdminCard,
  EmptyBlock,
  Field,
  InlineAlert,
  LoadingBlock,
  PageHeader,
  StatusBadge,
  TextInput,
} from '../../components/admin/AdminUI'
import { daysAgoInput, formatDate, todayInput } from '../../lib/adminFormat'

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
]

function Bars({
  data,
  label,
  color = 'bg-pine-3',
}: {
  data: { date: string; count: number }[]
  label: string
  color?: string
}) {
  const max = Math.max(1, ...data.map((point) => point.count))
  const total = data.reduce((sum, point) => sum + point.count, 0)
  if (data.length === 0) {
    return <p className="text-xs text-ink-mute">No daily buckets in this range.</p>
  }
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-[11px] text-ink-mute">{label}</p>
        <p className="text-[11px] font-medium text-ink">{total} in range</p>
      </div>
      <div className="flex h-24 items-end gap-[2px]" role="img" aria-label={label}>
        {data.map((point) => (
          <div
            key={point.date}
            title={`${point.date}: ${point.count}`}
            className={`min-w-0 flex-1 rounded-sm ${color}`}
            style={{ height: `${Math.max(2, (point.count / max) * 100)}%`, opacity: point.count === 0 ? 0.22 : 1 }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-ink-mute">
        <span>{formatDate(data[0].date)}</span>
        <span>{formatDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  )
}

export function AdminAnalytics() {
  usePageTitle('Reports & Analytics')
  const api = useAdminApi()

  const [from, setFrom] = useState(daysAgoInput(29))
  const [to, setTo] = useState(todayInput())
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    (rangeFrom: string, rangeTo: string) => {
      setLoading(true)
      setError(null)
      api
        .analytics({ from: rangeFrom, to: rangeTo })
        .then(setData)
        .catch((reason: unknown) => setError(apiErrorMessage(reason)))
        .finally(() => setLoading(false))
    },
    [api],
  )

  // The first load reads the range once; later loads come from Apply or a
  // preset, which pass the dates they just picked rather than refetching on
  // every keystroke in the date inputs.
  const initialRange = useRef({ from, to })
  useEffect(() => {
    load(initialRange.current.from, initialRange.current.to)
  }, [load])

  const applyPreset = (days: number) => {
    const nextFrom = daysAgoInput(days - 1)
    const nextTo = todayInput()
    setFrom(nextFrom)
    setTo(nextTo)
    load(nextFrom, nextTo)
  }

  const maxCategory = Math.max(1, ...(data?.destinationsByCategory.map((row) => row.count) ?? [1]))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports & Analytics"
        description="Only counts that exist in the database: content, moderation, accounts and saved trips. No page views or popularity numbers are invented."
      />

      <div className="rounded-2xl border border-line bg-[#fffdf8] p-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <AdminButton key={preset.days} size="sm" onClick={() => applyPreset(preset.days)}>
                {preset.label}
              </AdminButton>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-end gap-2">
            <Field label="From" className="w-[150px]">
              <TextInput type="date" value={from} onChange={setFrom} />
            </Field>
            <Field label="To" className="w-[150px]">
              <TextInput type="date" value={to} onChange={setTo} />
            </Field>
            <AdminButton variant="primary" onClick={() => load(from, to)} loading={loading}>
              <CalendarDays size={13} /> Apply range
            </AdminButton>
          </div>
        </div>
      </div>

      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      {loading && !data ? (
        <LoadingBlock rows={7} label="Loading analytics" />
      ) : data ? (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-paper-2/50 px-4 py-2.5 text-[11px] text-ink-soft">
            <Info size={13} className="text-pine" />
            Showing records created between <strong>{formatDate(data.range.from)}</strong> and{' '}
            <strong>{formatDate(data.range.to)}</strong>. Counts are not unique visitors.
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Destinations created', value: data.inRange.destinationsCreated, total: data.totals.destinations },
              { label: 'Reviews submitted', value: data.inRange.reviewsSubmitted, total: data.totals.reviews },
              { label: 'Saved trips created', value: data.inRange.tripsCreated, total: data.totals.trips },
              { label: 'Registered users', value: data.usersOverTime.reduce((sum, point) => sum + point.count, 0), total: data.totals.users },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-line bg-[#fffdf8] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
                  {card.label}
                </p>
                <p className="mt-2 font-display text-3xl leading-none">{card.value}</p>
                <p className="mt-1.5 text-[11px] text-ink-mute">in range · {card.total} all time</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <AdminCard title="Users over time" description="Accounts by creation date in the selected range.">
              <Bars data={data.usersOverTime} label="New accounts per day" color="bg-pine-3" />
            </AdminCard>
            <AdminCard title="Saved trips over time" description="Personal itineraries created in the range.">
              <Bars data={data.tripsOverTime} label="New saved trips per day" color="bg-saffron" />
            </AdminCard>

            <AdminCard title="Destinations by category" description="All destinations, all statuses.">
              {data.destinationsByCategory.length === 0 ? (
                <EmptyBlock title="No categories yet" description="Create a category to group destinations." />
              ) : (
                <ul className="space-y-3">
                  {data.destinationsByCategory.map((row) => (
                    <li key={row.id}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-ink-soft">{row.name}</span>
                        <span className="font-medium text-ink">{row.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-paper-2">
                        <div
                          className="h-full rounded-full bg-pine-3"
                          style={{ width: `${(row.count / maxCategory) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </AdminCard>

            <AdminCard title="Review moderation" description="Current review status counts.">
              <ul className="space-y-2.5">
                {(['PENDING', 'APPROVED', 'HIDDEN'] as const).map((status) => (
                  <li key={status} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
                    <span className="flex items-center gap-2">
                      <StatusBadge status={status} />
                      <span className="text-[11px] text-ink-mute">
                        {status === 'PENDING'
                          ? 'awaiting moderation'
                          : status === 'APPROVED'
                            ? 'visible publicly'
                            : 'removed from public view'}
                      </span>
                    </span>
                    <span className="font-display text-xl">{data.reviewsByStatus[status]}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] leading-relaxed text-ink-mute">
                There is no view counter or popularity score in the database, so none is reported
                here.
              </p>
            </AdminCard>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-line bg-paper-2/50 px-4 py-3 text-[11px] text-ink-soft">
            <BarChart3 size={14} className="text-pine" />
            Generated {formatDate(data.generatedAt)}. Every figure above comes from real records.
          </div>
        </>
      ) : null}
    </div>
  )
}
