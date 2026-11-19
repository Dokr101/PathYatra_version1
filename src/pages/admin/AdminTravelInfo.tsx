import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Info, Pencil, Plus, Trash2 } from 'lucide-react'
import type {
  AdminDestination,
  AdminTravelInfo,
  ContentStatus,
  TravelInfoStatus,
} from '../../lib/api'
import { apiErrorMessage } from '../../lib/api'
import {
  fieldErrors,
  useAdminApi,
  useDebounced,
  useFlash,
  usePageTitle,
  usePagedList,
} from '../../lib/adminHooks'
import { ConfirmDialog } from '../../components/admin/ConfirmDialog'
import {
  AdminButton,
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
  TextInput,
  UpdatedCell,
} from '../../components/admin/AdminUI'
import { formatDate, inputDate } from '../../lib/adminFormat'
import { safeHttpUrl } from '../../lib/format'

interface InfoForm {
  destinationId: string
  title: string
  category: string
  content: string
  sourceName: string
  sourceUrl: string
  lastVerifiedAt: string
  validFrom: string
  validUntil: string
  statusLabel: TravelInfoStatus
  status: ContentStatus
}

const EMPTY: InfoForm = {
  destinationId: '',
  title: '',
  category: '',
  content: '',
  sourceName: '',
  sourceUrl: '',
  lastVerifiedAt: '',
  validFrom: '',
  validUntil: '',
  statusLabel: 'GENERAL_GUIDANCE',
  status: 'DRAFT',
}

function toForm(info: AdminTravelInfo): InfoForm {
  return {
    destinationId: info.destinationId,
    title: info.title,
    category: info.category ?? '',
    content: info.content,
    sourceName: info.sourceName ?? '',
    sourceUrl: info.sourceUrl ?? '',
    lastVerifiedAt: inputDate(info.lastVerifiedAt),
    validFrom: inputDate(info.validFrom),
    validUntil: inputDate(info.validUntil),
    statusLabel: info.statusLabel,
    status: info.status,
  }
}

export function AdminTravelInfo() {
  usePageTitle('Travel Information')
  const api = useAdminApi()
  const { flash, success, fail } = useFlash()
  const [params, setParams] = useSearchParams()

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounced(query)
  const [destinationId, setDestinationId] = useState(params.get('destinationId') ?? '')
  const [status, setStatus] = useState('')
  const [statusLabel, setStatusLabel] = useState('')
  const [page, setPage] = useState(1)
  const [destinations, setDestinations] = useState<AdminDestination[]>([])
  const [editing, setEditing] = useState<AdminTravelInfo | 'new' | null>(null)
  const [form, setForm] = useState<InfoForm>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<AdminTravelInfo | null>(null)

  useEffect(() => {
    api.destinations
      .list({ pageSize: 100, sort: 'name', order: 'asc' })
      .then((result) => setDestinations(result.items))
      .catch(() => undefined)
  }, [api])

  useEffect(() => {
    const next = new URLSearchParams()
    if (destinationId) next.set('destinationId', destinationId)
    setParams(next, { replace: true })
  }, [destinationId, setParams])

  useEffect(() => setPage(1), [debouncedQuery, destinationId, status, statusLabel])

  const { data, loading, error, reload } = usePagedList(
    (signal) =>
      api.travelInfo.list({
        q: debouncedQuery,
        destinationId,
        status,
        statusLabel,
        page,
        pageSize: 20,
      }, signal),
    [debouncedQuery, destinationId, status, statusLabel, page],
  )

  const openNew = () => {
    setEditing('new')
    setForm({ ...EMPTY, destinationId })
    setErrors({})
  }

  const openEdit = (info: AdminTravelInfo) => {
    setEditing(info)
    setForm(toForm(info))
    setErrors({})
  }

  const save = async () => {
    const clientErrors: Record<string, string> = {}
    if (!form.destinationId) clientErrors.destinationId = 'Choose a destination.'
    if (form.title.trim().length < 2) clientErrors.title = 'Enter a title.'
    if (form.content.trim().length < 5) clientErrors.content = 'Add the information travellers need.'
    if (form.sourceUrl && !/^https?:\/\//i.test(form.sourceUrl))
      clientErrors.sourceUrl = 'Start the source URL with http:// or https://.'
    if (form.validFrom && form.validUntil && form.validUntil < form.validFrom)
      clientErrors.validUntil = 'Valid-until must be on or after valid-from.'
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return

    setSaving(true)
    const body = {
      ...form,
      lastVerifiedAt: form.lastVerifiedAt || null,
      validFrom: form.validFrom || null,
      validUntil: form.validUntil || null,
    }
    try {
      if (editing === 'new') {
        await api.travelInfo.create(body)
        success('Travel information created.')
      } else if (editing) {
        await api.travelInfo.update(editing.id, body)
        success('Travel information updated.')
      }
      setEditing(null)
      reload()
    } catch (reason) {
      setErrors(fieldErrors(reason))
      fail(reason)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleting) return
    try {
      await api.travelInfo.remove(deleting.id)
      success('Travel information deleted.')
      setDeleting(null)
      reload()
    } catch (reason) {
      fail(reason)
      throw reason
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Travel Information"
        description="Permits, transport, safety and money notes. Every public item carries its source and a VERIFIED / ESTIMATE / GENERAL GUIDANCE label."
        actions={
          <AdminButton variant="primary" onClick={openNew}>
            <Plus size={14} /> New entry
          </AdminButton>
        }
      />

      <div className="rounded-xl border border-[#ead8a8] bg-[#fbf3e0] px-4 py-3 text-[11px] leading-relaxed text-[#7a5a12]">
        <strong>Do not treat admin notes as live data.</strong> If a fee or rule can change, mark it
        ESTIMATE or GENERAL GUIDANCE, add the source and verification date, and keep the validity
        window honest. The public site shows the label and source alongside the text.
      </div>

      {flash ? <InlineAlert tone={flash.tone}>{flash.text}</InlineAlert> : null}
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      <div className="rounded-2xl border border-line bg-[#fffdf8] p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <SearchBox value={query} onChange={setQuery} placeholder="Search travel information…" />
          <Select value={destinationId} onChange={setDestinationId}>
            <option value="">All destinations</option>
            {destinations.map((destination) => (
              <option key={destination.id} value={destination.id}>
                {destination.name}
              </option>
            ))}
          </Select>
          <Select value={statusLabel} onChange={setStatusLabel}>
            <option value="">All labels</option>
            <option value="VERIFIED">Verified</option>
            <option value="ESTIMATE">Estimate</option>
            <option value="GENERAL_GUIDANCE">General guidance</option>
          </Select>
          <Select value={status} onChange={setStatus}>
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-[#fffdf8]">
        {loading && !data ? (
          <div className="p-4">
            <LoadingBlock rows={5} />
          </div>
        ) : data && data.items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Info size={22} className="mx-auto mb-3 text-ink-mute" />
            <h3 className="font-display text-xl">No travel information yet</h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-soft">
              Add an entry with a source and verification date. Nothing publishes automatically.
            </p>
            <AdminButton variant="primary" className="mt-5" onClick={openNew}>
              <Plus size={13} /> New entry
            </AdminButton>
          </div>
        ) : data ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper-2/50 text-[11px] uppercase tracking-[0.08em] text-ink-mute">
                    <th className="px-4 py-3 font-semibold">Title</th>
                    <th className="px-3 py-3 font-semibold">Destination</th>
                    <th className="px-3 py-3 font-semibold">Label</th>
                    <th className="px-3 py-3 font-semibold">Source</th>
                    <th className="px-3 py-3 font-semibold">Verified</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Updated</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.items.map((info) => {
                    const sourceUrl = safeHttpUrl(info.sourceUrl)
                    return (
                      <tr key={info.id} className="hover:bg-paper-2/30">
                        <td className="px-4 py-3">
                          <p className="font-medium">{info.title}</p>
                          {info.category ? (
                            <p className="text-[11px] text-ink-mute">{info.category}</p>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            to={`/admin/destinations/${info.destinationId}/edit`}
                            className="text-xs text-pine hover:underline"
                          >
                            {info.destination.name}
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={info.statusLabel} />
                        </td>
                        <td className="px-3 py-3 text-xs text-ink-soft">
                          {sourceUrl ? (
                            <a
                              href={sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-pine hover:underline"
                            >
                              {info.sourceName || 'Source'}
                            </a>
                          ) : (
                            info.sourceName || '—'
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-ink-soft">
                          {formatDate(info.lastVerifiedAt)}
                          {info.validUntil ? (
                            <span className="block text-[11px] text-ink-mute">
                              valid to {formatDate(info.validUntil)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={info.status} />
                        </td>
                        <td className="px-3 py-3">
                          <UpdatedCell date={info.updatedAt} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEdit(info)}
                              aria-label={`Edit ${info.title}`}
                              className="rounded-full border border-line bg-[#fffdf8] p-1.5 text-ink-soft hover:bg-paper-2"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleting(info)}
                              aria-label={`Delete ${info.title}`}
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

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New travel information' : 'Edit travel information'}
        description="Published entries appear with their label, source and dates — not as guaranteed live facts."
        wide
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </AdminButton>
            <AdminButton variant="primary" loading={saving} onClick={() => void save()}>
              Save entry
            </AdminButton>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Destination" error={errors.destinationId} required>
            <Select
              value={form.destinationId}
              onChange={(value) => setForm((previous) => ({ ...previous, destinationId: value }))}
            >
              <option value="">Choose a destination</option>
              {destinations.map((destination) => (
                <option key={destination.id} value={destination.id}>
                  {destination.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Category" error={errors.category} hint="e.g. Permits, Transport, Safety">
            <TextInput
              value={form.category}
              onChange={(value) => setForm((previous) => ({ ...previous, category: value }))}
            />
          </Field>
          <Field label="Title" error={errors.title} required className="sm:col-span-2">
            <TextInput
              value={form.title}
              onChange={(value) => setForm((previous) => ({ ...previous, title: value }))}
            />
          </Field>
          <Field label="Information" error={errors.content} required className="sm:col-span-2">
            <TextArea
              value={form.content}
              onChange={(value) => setForm((previous) => ({ ...previous, content: value }))}
              rows={6}
            />
          </Field>
          <Field label="Source name" error={errors.sourceName}>
            <TextInput
              value={form.sourceName}
              onChange={(value) => setForm((previous) => ({ ...previous, sourceName: value }))}
            />
          </Field>
          <Field label="Source URL" error={errors.sourceUrl}>
            <TextInput
              type="url"
              value={form.sourceUrl}
              onChange={(value) => setForm((previous) => ({ ...previous, sourceUrl: value }))}
              placeholder="https://…"
            />
          </Field>
          <Field label="Last verified" error={errors.lastVerifiedAt}>
            <TextInput
              type="date"
              value={form.lastVerifiedAt}
              onChange={(value) => setForm((previous) => ({ ...previous, lastVerifiedAt: value }))}
            />
          </Field>
          <Field label="Label">
            <Select
              value={form.statusLabel}
              onChange={(value) =>
                setForm((previous) => ({ ...previous, statusLabel: value as TravelInfoStatus }))
              }
            >
              <option value="VERIFIED">Verified — checked against the source</option>
              <option value="ESTIMATE">Estimate — approximate, may change</option>
              <option value="GENERAL_GUIDANCE">General guidance — not live data</option>
            </Select>
          </Field>
          <Field label="Valid from" error={errors.validFrom}>
            <TextInput
              type="date"
              value={form.validFrom}
              onChange={(value) => setForm((previous) => ({ ...previous, validFrom: value }))}
            />
          </Field>
          <Field label="Valid until" error={errors.validUntil}>
            <TextInput
              type="date"
              value={form.validUntil}
              onChange={(value) => setForm((previous) => ({ ...previous, validUntil: value }))}
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(value) => setForm((previous) => ({ ...previous, status: value as ContentStatus }))}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this travel information?"
        description={
          deleting ? (
            <>
              <strong>{deleting.title}</strong> will be permanently removed. Archive it instead if
              travellers may need the historical record.
            </>
          ) : null
        }
        confirmLabel="Delete entry"
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
      />
    </div>
  )
}
