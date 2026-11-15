import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mountain, Pencil, Plus, Trash2 } from 'lucide-react'
import type {
  AdminActivity,
  AdminDestination,
  ActivityType,
  ContentStatus,
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
import { currency, formatDate, inputDate, todayInput } from '../../lib/adminFormat'

interface ActivityForm {
  destinationId: string
  name: string
  type: ActivityType
  description: string
  durationHours: string
  costEstimate: string
  costUpdatedAt: string
  difficulty: string
  bestSeason: string
  status: ContentStatus
}

const EMPTY: ActivityForm = {
  destinationId: '',
  name: '',
  type: 'ACTIVITY',
  description: '',
  durationHours: '',
  costEstimate: '',
  costUpdatedAt: '',
  difficulty: '',
  bestSeason: '',
  status: 'DRAFT',
}

function toForm(activity: AdminActivity): ActivityForm {
  return {
    destinationId: activity.destinationId,
    name: activity.name,
    type: activity.type,
    description: activity.description ?? '',
    durationHours: activity.durationHours === null ? '' : String(activity.durationHours),
    costEstimate: activity.costEstimate === null ? '' : String(activity.costEstimate),
    costUpdatedAt: inputDate(activity.costUpdatedAt),
    difficulty: activity.difficulty ?? '',
    bestSeason: activity.bestSeason ?? '',
    status: activity.status,
  }
}

export function AdminActivities() {
  usePageTitle('Activities & Attractions')
  const api = useAdminApi()
  const { flash, success, fail } = useFlash()

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounced(query)
  const [destinationId, setDestinationId] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [destinations, setDestinations] = useState<AdminDestination[]>([])
  const [editing, setEditing] = useState<AdminActivity | 'new' | null>(null)
  const [form, setForm] = useState<ActivityForm>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<AdminActivity | null>(null)

  useEffect(() => {
    api.destinations
      .list({ pageSize: 100, sort: 'name', order: 'asc' })
      .then((result) => setDestinations(result.items))
      .catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => setPage(1), [debouncedQuery, destinationId, type, status])

  const { data, loading, error, reload } = usePagedList(
    () =>
      api.activities.list({
        q: debouncedQuery,
        destinationId,
        type,
        status,
        page,
        pageSize: 20,
      }),
    [debouncedQuery, destinationId, type, status, page],
  )

  const openNew = () => {
    setEditing('new')
    setForm({ ...EMPTY, destinationId })
    setErrors({})
  }

  const openEdit = (activity: AdminActivity) => {
    setEditing(activity)
    setForm(toForm(activity))
    setErrors({})
  }

  const save = async () => {
    const clientErrors: Record<string, string> = {}
    if (!form.destinationId) clientErrors.destinationId = 'Choose a destination.'
    if (form.name.trim().length < 2) clientErrors.name = 'Enter a name.'
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return

    setSaving(true)
    const body = {
      ...form,
      durationHours: form.durationHours || null,
      costEstimate: form.costEstimate || null,
      costUpdatedAt: form.costUpdatedAt || null,
    }
    try {
      if (editing === 'new') {
        await api.activities.create(body)
        success('Activity created.')
      } else if (editing) {
        await api.activities.update(editing.id, body)
        success('Activity updated.')
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
      await api.activities.remove(deleting.id)
      success('Activity deleted.')
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
        title="Activities & Attractions"
        description="Optional things to do at a destination. Money figures are always labelled as estimates, with a last-updated date."
        actions={
          <AdminButton variant="primary" onClick={openNew}>
            <Plus size={14} /> New activity
          </AdminButton>
        }
      />

      {flash ? <InlineAlert tone={flash.tone}>{flash.text}</InlineAlert> : null}
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      <div className="rounded-2xl border border-line bg-[#fffdf8] p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <SearchBox value={query} onChange={setQuery} placeholder="Search activities…" />
          <Select value={destinationId} onChange={setDestinationId}>
            <option value="">All destinations</option>
            {destinations.map((destination) => (
              <option key={destination.id} value={destination.id}>
                {destination.name}
              </option>
            ))}
          </Select>
          <Select value={type} onChange={setType}>
            <option value="">All types</option>
            <option value="ACTIVITY">Activity</option>
            <option value="ATTRACTION">Attraction</option>
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
            <Mountain size={22} className="mx-auto mb-3 text-ink-mute" />
            <h3 className="font-display text-xl">No activities match this view</h3>
            <p className="mt-1.5 text-sm text-ink-soft">
              Add a trek, a viewpoint or a temple visit, then publish it with its destination.
            </p>
            <AdminButton variant="primary" className="mt-5" onClick={openNew}>
              <Plus size={13} /> New activity
            </AdminButton>
          </div>
        ) : data ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper-2/50 text-[10px] uppercase tracking-[0.12em] text-ink-mute">
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-3 py-3 font-semibold">Destination</th>
                    <th className="px-3 py-3 font-semibold">Type</th>
                    <th className="px-3 py-3 font-semibold">Estimate</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Updated</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.items.map((activity) => (
                    <tr key={activity.id} className="hover:bg-paper-2/30">
                      <td className="px-4 py-3">
                        <p className="font-medium">{activity.name}</p>
                        {activity.difficulty ? (
                          <p className="text-[11px] text-ink-mute">{activity.difficulty}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          to={`/admin/destinations/${activity.destinationId}/edit`}
                          className="text-xs text-pine hover:underline"
                        >
                          {activity.destination.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={activity.type} />
                      </td>
                      <td className="px-3 py-3 text-xs text-ink-soft">
                        {activity.costEstimate === null ? (
                          '—'
                        ) : (
                          <>
                            <span>{currency(activity.costEstimate)} estimate</span>
                            <span className="block text-[10px] text-ink-mute">
                              updated {formatDate(activity.costUpdatedAt)}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={activity.status} />
                      </td>
                      <td className="px-3 py-3">
                        <UpdatedCell date={activity.updatedAt} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(activity)}
                            aria-label={`Edit ${activity.name}`}
                            className="rounded-full border border-line bg-[#fffdf8] p-1.5 text-ink-soft hover:bg-paper-2"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(activity)}
                            aria-label={`Delete ${activity.name}`}
                            className="rounded-full border border-line bg-[#fffdf8] p-1.5 text-clay hover:bg-[#f7e2dc]"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
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
        ) : (
          <div className="p-4">
            <InlineAlert tone="error">{apiErrorMessage(error)}</InlineAlert>
          </div>
        )}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New activity' : 'Edit activity'}
        description="Activities and attractions are separate from admin itinerary templates."
        wide
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </AdminButton>
            <AdminButton variant="primary" loading={saving} onClick={() => void save()}>
              Save activity
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
          <Field label="Type">
            <Select
              value={form.type}
              onChange={(value) => setForm((previous) => ({ ...previous, type: value as ActivityType }))}
            >
              <option value="ACTIVITY">Activity</option>
              <option value="ATTRACTION">Attraction</option>
            </Select>
          </Field>
          <Field label="Name" error={errors.name} required className="sm:col-span-2">
            <TextInput
              value={form.name}
              onChange={(value) => setForm((previous) => ({ ...previous, name: value }))}
            />
          </Field>
          <Field label="Description" error={errors.description} className="sm:col-span-2">
            <TextArea
              value={form.description}
              onChange={(value) => setForm((previous) => ({ ...previous, description: value }))}
              rows={3}
            />
          </Field>
          <Field label="Typical duration (hours)" error={errors.durationHours}>
            <TextInput
              type="number"
              min={0}
              value={form.durationHours}
              onChange={(value) => setForm((previous) => ({ ...previous, durationHours: value }))}
            />
          </Field>
          <Field label="Cost estimate (Rs.)" error={errors.costEstimate} hint="Shown publicly as an estimate, never a fixed price.">
            <TextInput
              type="number"
              min={0}
              value={form.costEstimate}
              onChange={(value) => setForm((previous) => ({ ...previous, costEstimate: value }))}
            />
          </Field>
          <Field label="Estimate last updated" error={errors.costUpdatedAt} hint="Defaults to today when a cost is saved.">
            <TextInput
              type="date"
              value={form.costUpdatedAt}
              onChange={(value) => setForm((previous) => ({ ...previous, costUpdatedAt: value || todayInput() }))}
            />
          </Field>
          <Field label="Difficulty" error={errors.difficulty}>
            <TextInput
              value={form.difficulty}
              onChange={(value) => setForm((previous) => ({ ...previous, difficulty: value }))}
              placeholder="Easy / moderate"
            />
          </Field>
          <Field label="Best season" error={errors.bestSeason}>
            <TextInput
              value={form.bestSeason}
              onChange={(value) => setForm((previous) => ({ ...previous, bestSeason: value }))}
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
        title="Delete this activity?"
        description={
          deleting ? (
            <>
              <strong>{deleting.name}</strong> will be removed from its destination. This cannot be
              undone; archive it instead if you may need it again.
            </>
          ) : null
        }
        confirmLabel="Delete activity"
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
      />
    </div>
  )
}
