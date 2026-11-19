import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Archive, ExternalLink, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import type { AdminCategory, AdminDestination } from '../../lib/api'
import { apiErrorMessage } from '../../lib/api'
import { useAdminApi, useDebounced, useFlash, usePageTitle, usePagedList } from '../../lib/adminHooks'
import { clearPublicDestinationsCache } from '../../lib/publicDestinations'
import { ConfirmDialog } from '../../components/admin/ConfirmDialog'
import {
  AdminButton,
  InlineAlert,
  LoadingBlock,
  PageHeader,
  Pagination,
  SearchBox,
  Select,
  StatusBadge,
  UpdatedCell,
} from '../../components/admin/AdminUI'

type PendingAction =
  | { kind: 'archive'; destination: AdminDestination }
  | { kind: 'delete'; destination: AdminDestination }
  | null

export function AdminDestinations() {
  usePageTitle('Destinations')
  const api = useAdminApi()
  const { flash, success, fail } = useFlash()
  const [params, setParams] = useSearchParams()

  const [query, setQuery] = useState(params.get('q') ?? '')
  const debouncedQuery = useDebounced(query)
  const [status, setStatus] = useState(params.get('status') ?? '')
  const [categoryId, setCategoryId] = useState(params.get('categoryId') ?? '')
  const [province, setProvince] = useState(params.get('province') ?? '')
  const [sort, setSort] = useState(params.get('sort') ?? 'updatedAt')
  const [order, setOrder] = useState(params.get('order') ?? 'desc')
  const [page, setPage] = useState(1)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [pending, setPending] = useState<PendingAction>(null)

  useEffect(() => {
    api.categories.list().then((result) => setCategories(result.items)).catch(() => undefined)
  }, [api])

  useEffect(() => {
    const next = new URLSearchParams()
    if (status) next.set('status', status)
    if (categoryId) next.set('categoryId', categoryId)
    if (province) next.set('province', province)
    if (sort !== 'updatedAt') next.set('sort', sort)
    if (order !== 'desc') next.set('order', order)
    setParams(next, { replace: true })
    setPage(1)
  }, [status, categoryId, province, sort, order, setParams])

  const { data, loading, error, reload } = usePagedList(
    (signal) =>
      api.destinations.list({
        q: debouncedQuery,
        status,
        categoryId,
        province,
        sort,
        order,
        page,
        pageSize: 20,
      }, signal),
    [debouncedQuery, status, categoryId, province, sort, order, page],
  )

  const provinces = data?.provinces ?? []
  const activeFilters = useMemo(
    () => [status, categoryId, province].filter(Boolean).length,
    [status, categoryId, province],
  )

  const reset = () => {
    setQuery('')
    setStatus('')
    setCategoryId('')
    setProvince('')
    setSort('updatedAt')
    setOrder('desc')
    setPage(1)
  }

  const runAction = async () => {
    if (!pending) return
    const { kind, destination } = pending
    try {
      if (kind === 'archive') {
        await api.destinations.update(destination.id, { status: 'ARCHIVED' })
        clearPublicDestinationsCache()
        success(`“${destination.name}” archived. Saved trips still reference it.`)
      } else {
        await api.destinations.remove(destination.id)
        clearPublicDestinationsCache()
        success(`“${destination.name}” deleted.`)
      }
      setPending(null)
      reload()
    } catch (reason) {
      fail(reason)
      throw reason
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Destinations"
        description="Manage every destination, all statuses. Only PUBLISHED destinations appear on the public Explore pages."
        actions={
          <Link to="/admin/destinations/new">
            <AdminButton variant="primary">
              <Plus size={14} /> New destination
            </AdminButton>
          </Link>
        }
      />

      {flash ? <InlineAlert tone={flash.tone}>{flash.text}</InlineAlert> : null}
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      <div className="rounded-2xl border border-line bg-[#fffdf8] p-3">
        <div className="grid gap-2 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <SearchBox value={query} onChange={setQuery} placeholder="Search name, slug, district…" />
          <Select value={status} onChange={setStatus}>
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
          <Select value={categoryId} onChange={setCategoryId}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Select value={province} onChange={setProvince}>
            <option value="">All provinces</option>
            {provinces.map((item) => (
              <option key={item} value={item ?? ''}>
                {item}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Select value={sort} onChange={setSort} className="flex-1">
              <option value="updatedAt">Last updated</option>
              <option value="name">Name</option>
              <option value="createdAt">Created</option>
            </Select>
            <AdminButton
              size="sm"
              title="Toggle sort direction"
              onClick={() => setOrder((value) => (value === 'asc' ? 'desc' : 'asc'))}
            >
              {order === 'asc' ? '↑' : '↓'}
            </AdminButton>
          </div>
        </div>
        {activeFilters > 0 || query ? (
          <div className="mt-2 flex items-center justify-between text-[11px] text-ink-mute">
            <span>
              {activeFilters} filter{activeFilters === 1 ? '' : 's'} active
            </span>
            <button type="button" onClick={reset} className="text-clay hover:underline">
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-[#fffdf8]">
        {loading && !data ? (
          <div className="p-4">
            <LoadingBlock rows={6} label="Loading destinations" />
          </div>
        ) : data && data.items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <MapPin size={22} className="mx-auto mb-3 text-ink-mute" />
            <h3 className="font-display text-xl">No destinations match this view</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
              Try clearing filters, or create the first destination.
            </p>
            <Link to="/admin/destinations/new" className="mt-5 inline-block">
              <AdminButton variant="primary">+ New destination</AdminButton>
            </Link>
          </div>
        ) : data ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper-2/50 text-[11px] uppercase tracking-[0.08em] text-ink-mute">
                    <th className="px-4 py-3 font-semibold">Destination</th>
                    <th className="px-3 py-3 font-semibold">Category</th>
                    <th className="px-3 py-3 font-semibold">Province</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Updated</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.items.map((destination) => {
                    const cover = destination.images.find((image) => image.isCover) ?? destination.images[0]
                    return (
                      <tr key={destination.id} className="align-middle hover:bg-paper-2/30">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md border border-line bg-paper-2">
                              {cover?.url ?? destination.imagePath ? (
                                <img
                                  src={cover?.url ?? destination.imagePath ?? ''}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="flex h-full items-center justify-center text-ink-mute">
                                  <MapPin size={14} />
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-ink">{destination.name}</p>
                              <p className="truncate text-[11px] text-ink-mute">
                                /explore/{destination.slug}
                                {destination._count.itineraries > 0
                                  ? ` · ${destination._count.itineraries} saved trip${destination._count.itineraries === 1 ? '' : 's'}`
                                  : ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-ink-soft">{destination.category.name}</td>
                        <td className="px-3 py-2.5 text-xs text-ink-soft">
                          {destination.province || '—'}
                          {destination.district ? (
                            <span className="block text-[11px] text-ink-mute">{destination.district}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={destination.status} />
                        </td>
                        <td className="px-3 py-2.5">
                          <UpdatedCell date={destination.updatedAt} />
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1.5">
                            {destination.status === 'PUBLISHED' ? (
                              <a
                                href={`/explore/${destination.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Preview on the public site"
                                className="rounded-full border border-line bg-[#fffdf8] p-1.5 text-ink-soft hover:bg-paper-2"
                              >
                                <ExternalLink size={12} />
                              </a>
                            ) : null}
                            <Link
                              to={`/admin/destinations/${destination.id}/edit`}
                              title="Edit destination"
                              className="rounded-full border border-line bg-[#fffdf8] p-1.5 text-ink-soft hover:bg-paper-2"
                            >
                              <Pencil size={12} />
                            </Link>
                            {destination.status !== 'ARCHIVED' ? (
                              <button
                                type="button"
                                title="Archive destination"
                                onClick={() => setPending({ kind: 'archive', destination })}
                                className="rounded-full border border-line bg-[#fffdf8] p-1.5 text-ink-soft hover:bg-paper-2"
                              >
                                <Archive size={12} />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              title="Delete destination"
                              onClick={() => setPending({ kind: 'delete', destination })}
                              className="rounded-full border border-line bg-[#fffdf8] p-1.5 text-clay hover:bg-[#f7e2dc]"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
        ) : (
          <div className="p-4">
            <InlineAlert tone="error">{apiErrorMessage(error)}</InlineAlert>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pending?.kind === 'archive'}
        title="Archive this destination?"
        description={
          pending?.kind === 'archive' ? (
            <>
              <strong>{pending.destination.name}</strong> will disappear from the public site, but
              its data, images and any saved trips that reference it stay intact. You can restore it
              by setting it back to Published.
            </>
          ) : null
        }
        confirmLabel="Archive destination"
        onCancel={() => setPending(null)}
        onConfirm={runAction}
      />

      <ConfirmDialog
        open={pending?.kind === 'delete'}
        title="Delete this destination permanently?"
        description={
          pending?.kind === 'delete' ? (
            <>
              This removes <strong>{pending.destination.name}</strong>, its images, activities and
              travel information.{' '}
              {pending.destination._count.itineraries > 0
                ? `It is referenced by ${pending.destination._count.itineraries} saved trip(s), so the server will refuse and ask you to archive instead.`
                : 'This cannot be undone.'}
            </>
          ) : null
        }
        confirmLabel="Delete forever"
        onCancel={() => setPending(null)}
        onConfirm={runAction}
      />
    </div>
  )
}
