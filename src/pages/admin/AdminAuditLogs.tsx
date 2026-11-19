import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ScrollText } from 'lucide-react'
import { useAdminApi, useDebounced, usePageTitle, usePagedList } from '../../lib/adminHooks'
import {
  AdminButton,
  InlineAlert,
  LoadingBlock,
  PageHeader,
  Pagination,
  SearchBox,
  Select,
  UpdatedCell,
} from '../../components/admin/AdminUI'
import { formatDateTime } from '../../lib/adminFormat'

export function AdminAuditLogs() {
  usePageTitle('Audit log')
  const api = useAdminApi()

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounced(query)
  const [entityType, setEntityType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => setPage(1), [debouncedQuery, entityType, from, to])

  const { data, loading, error } = usePagedList(
    (signal) =>
      api.auditLogs.list({
        q: debouncedQuery,
        entityType,
        from,
        to,
        page,
        pageSize: 30,
      }, signal),
    [debouncedQuery, entityType, from, to, page],
  )

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-pine"
        >
          <ArrowLeft size={13} /> Dashboard
        </Link>
      </div>

      <PageHeader
        title="Audit log"
        description="Every sensitive admin action: who did it, what changed, on which record and when. Passwords, tokens and file contents are never recorded."
      />

      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      <div className="rounded-2xl border border-line bg-[#fffdf8] p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <SearchBox value={query} onChange={setQuery} placeholder="Search summary or action…" />
          <Select value={entityType} onChange={setEntityType}>
            <option value="">All record types</option>
            {(data?.entityTypes ?? []).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 rounded-xl border border-line bg-[#fffdf8] px-2.5 py-1.5 text-[11px] text-ink-mute">
            From
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="w-full bg-transparent text-xs text-ink outline-none"
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-line bg-[#fffdf8] px-2.5 py-1.5 text-[11px] text-ink-mute">
            To
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="w-full bg-transparent text-xs text-ink outline-none"
            />
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-[#fffdf8]">
        {loading && !data ? (
          <div className="p-4">
            <LoadingBlock rows={6} label="Loading audit log" />
          </div>
        ) : data && data.items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <ScrollText size={22} className="mx-auto mb-3 text-ink-mute" />
            <h3 className="font-display text-xl">No audit entries match</h3>
            <p className="mt-1.5 text-sm text-ink-soft">
              Try widening the date range or clearing the record type.
            </p>
            {from || to || entityType || query ? (
              <AdminButton
                className="mt-5"
                onClick={() => {
                  setFrom('')
                  setTo('')
                  setEntityType('')
                  setQuery('')
                }}
              >
                Clear filters
              </AdminButton>
            ) : null}
          </div>
        ) : data ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper-2/50 text-[11px] uppercase tracking-[0.08em] text-ink-mute">
                    <th className="px-4 py-3 font-semibold">When</th>
                    <th className="px-3 py-3 font-semibold">Admin</th>
                    <th className="px-3 py-3 font-semibold">Action</th>
                    <th className="px-3 py-3 font-semibold">Record</th>
                    <th className="px-4 py-3 font-semibold">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.items.map((entry) => (
                    <tr key={entry.id} className="align-top hover:bg-paper-2/30">
                      <td className="whitespace-nowrap px-4 py-3 text-[11px] text-ink-soft">
                        <span title={formatDateTime(entry.createdAt)}>
                          <UpdatedCell date={entry.createdAt} />
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-xs font-medium">{entry.admin.fullName}</p>
                        <p className="text-[11px] text-ink-mute">{entry.admin.email}</p>
                      </td>
                      <td className="px-3 py-3">
                        <code className="rounded bg-paper-2 px-1.5 py-0.5 text-[11px] text-ink-soft">
                          {entry.action}
                        </code>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-ink-soft">
                        {entry.entityType}
                        {entry.entityId ? (
                          <span className="block truncate text-[11px] text-ink-mute">
                            {entry.entityId}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs leading-relaxed text-ink-soft">
                        {entry.summary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 pb-3">
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                pageSize={data.pageSize}
                onPage={setPage}
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
