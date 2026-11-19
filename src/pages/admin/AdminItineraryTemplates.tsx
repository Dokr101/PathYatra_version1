import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  Eye,
  Pencil,
  Plus,
  Route,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import type {
  AdminDestination,
  AdminTemplate,
  ContentStatus,
  TemplateDay,
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
  TextInput,
  UpdatedCell,
} from '../../components/admin/AdminUI'
import { formatDate, npr } from '../../lib/adminFormat'

type LocalStop = {
  timeSlot: string
  title: string
  description: string
  estimatedCost: string
}

type LocalDay = {
  title: string
  description: string
  stops: LocalStop[]
}

interface TemplateMetaForm {
  title: string
  slug: string
  destinationId: string
  summary: string
  difficulty: string
  durationDays: string
  estimatedCost: string
  status: ContentStatus
}

const EMPTY_META: TemplateMetaForm = {
  title: '',
  slug: '',
  destinationId: '',
  summary: '',
  difficulty: 'moderate',
  durationDays: '1',
  estimatedCost: '',
  status: 'DRAFT',
}

function toMeta(template: AdminTemplate): TemplateMetaForm {
  return {
    title: template.title,
    slug: template.slug,
    destinationId: template.destinationId ?? '',
    summary: template.summary ?? '',
    difficulty: template.difficulty ?? '',
    durationDays: String(template.durationDays),
    estimatedCost: template.estimatedCost === null ? '' : String(template.estimatedCost),
    status: template.status,
  }
}

function toDays(template: AdminTemplate): LocalDay[] {
  return template.days.map((day) => ({
    title: day.title,
    description: day.description ?? '',
    stops: day.stops.map((stop) => ({
      timeSlot: stop.timeSlot ?? '',
      title: stop.title,
      description: stop.description ?? '',
      estimatedCost: stop.estimatedCost === null ? '' : String(stop.estimatedCost),
    })),
  }))
}

export function AdminItineraryTemplates() {
  const { id } = useParams<{ id: string }>()
  return id ? <TemplateEditor id={id} /> : <TemplateList />
}

/* ------------------------------------------------------------------ */
/* List                                                                 */
/* ------------------------------------------------------------------ */

function TemplateList() {
  usePageTitle('Itinerary Templates')
  const api = useAdminApi()
  const navigate = useNavigate()
  const { flash, success, fail } = useFlash()

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounced(query)
  const [status, setStatus] = useState('')
  const [destinationId, setDestinationId] = useState('')
  const [page, setPage] = useState(1)
  const [destinations, setDestinations] = useState<AdminDestination[]>([])
  const [creating, setCreating] = useState(false)
  const [meta, setMeta] = useState<TemplateMetaForm>(EMPTY_META)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<AdminTemplate | null>(null)
  const [archiving, setArchiving] = useState<AdminTemplate | null>(null)

  useEffect(() => {
    api.destinations
      .list({ pageSize: 100, sort: 'name', order: 'asc' })
      .then((result) => setDestinations(result.items))
      .catch(() => undefined)
  }, [api])

  useEffect(() => setPage(1), [debouncedQuery, status, destinationId])

  const { data, loading, error, reload } = usePagedList(
    (signal) =>
      api.itineraries.list({
        q: debouncedQuery,
        status,
        destinationId,
        page,
        pageSize: 20,
      }, signal),
    [debouncedQuery, status, destinationId, page],
  )

  const openNew = () => {
    setMeta({ ...EMPTY_META, destinationId })
    setErrors({})
    setCreating(true)
  }

  const create = async () => {
    const clientErrors: Record<string, string> = {}
    if (meta.title.trim().length < 2) clientErrors.title = 'Enter a template title.'
    if (!meta.durationDays || Number(meta.durationDays) < 1)
      clientErrors.durationDays = 'Add at least one day.'
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return

    setSaving(true)
    try {
      const template = await api.itineraries.create({
        ...meta,
        durationDays: Number(meta.durationDays),
        estimatedCost: meta.estimatedCost || null,
        destinationId: meta.destinationId || null,
      })
      success('Template created. Add the day-by-day plan next.')
      navigate(`/admin/itineraries/${template.id}`)
    } catch (reason) {
      setErrors(fieldErrors(reason))
      fail(reason)
    } finally {
      setSaving(false)
    }
  }

  const publish = async (template: AdminTemplate) => {
    try {
      await api.itineraries.update(template.id, { status: 'PUBLISHED' })
      success(`“${template.title}” published.`)
      reload()
    } catch (reason) {
      fail(reason)
    }
  }

  const archive = async () => {
    if (!archiving) return
    try {
      await api.itineraries.update(archiving.id, { status: 'ARCHIVED' })
      success(`“${archiving.title}” archived.`)
      setArchiving(null)
      reload()
    } catch (reason) {
      fail(reason)
      throw reason
    }
  }

  const remove = async () => {
    if (!deleting) return
    try {
      await api.itineraries.remove(deleting.id)
      success(`“${deleting.title}” deleted.`)
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
        title="Itinerary Templates"
        description="Admin-authored plans made of template days and stops. These are separate from a traveller’s saved personal trips."
        actions={
          <AdminButton variant="primary" onClick={openNew}>
            <Plus size={14} /> New template
          </AdminButton>
        }
      />

      {flash ? <InlineAlert tone={flash.tone}>{flash.text}</InlineAlert> : null}
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      <div className="rounded-2xl border border-line bg-[#fffdf8] p-3">
        <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr]">
          <SearchBox value={query} onChange={setQuery} placeholder="Search templates…" />
          <Select value={destinationId} onChange={setDestinationId}>
            <option value="">All destinations</option>
            {destinations.map((destination) => (
              <option key={destination.id} value={destination.id}>
                {destination.name}
              </option>
            ))}
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
            <Route size={22} className="mx-auto mb-3 text-ink-mute" />
            <h3 className="font-display text-xl">No itinerary templates yet</h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-soft">
              Build a reusable day-by-day plan an admin can publish for travellers to read.
            </p>
            <AdminButton variant="primary" className="mt-5" onClick={openNew}>
              <Plus size={13} /> New template
            </AdminButton>
          </div>
        ) : data ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper-2/50 text-[11px] uppercase tracking-[0.08em] text-ink-mute">
                    <th className="px-4 py-3 font-semibold">Template</th>
                    <th className="px-3 py-3 font-semibold">Destination</th>
                    <th className="px-3 py-3 font-semibold">Days</th>
                    <th className="px-3 py-3 font-semibold">Estimate</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Updated</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.items.map((template) => (
                    <tr key={template.id} className="hover:bg-paper-2/30">
                      <td className="px-4 py-3">
                        <Link to={`/admin/itineraries/${template.id}`} className="font-medium hover:text-pine">
                          {template.title}
                        </Link>
                        {template.difficulty ? (
                          <p className="text-[11px] text-ink-mute">{template.difficulty}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-xs text-ink-soft">
                        {template.destination?.name ?? 'No destination'}
                      </td>
                      <td className="px-3 py-3 text-xs">{template.days.length}</td>
                      <td className="px-3 py-3 text-xs text-ink-soft">
                        {npr(template.estimatedCost)}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={template.status} />
                      </td>
                      <td className="px-3 py-3">
                        <UpdatedCell date={template.updatedAt} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {template.status !== 'PUBLISHED' ? (
                            <button
                              type="button"
                              onClick={() => void publish(template)}
                              title="Publish"
                              className="rounded-full border border-line bg-[#fffdf8] p-1.5 text-pine hover:bg-paper-2"
                            >
                              <Send size={12} />
                            </button>
                          ) : null}
                          {template.status !== 'ARCHIVED' ? (
                            <button
                              type="button"
                              onClick={() => setArchiving(template)}
                              title="Archive"
                              className="rounded-full border border-line bg-[#fffdf8] p-1.5 text-ink-soft hover:bg-paper-2"
                            >
                              <Archive size={12} />
                            </button>
                          ) : null}
                          <Link
                            to={`/admin/itineraries/${template.id}`}
                            title="Edit"
                            className="rounded-full border border-line bg-[#fffdf8] p-1.5 text-ink-soft hover:bg-paper-2"
                          >
                            <Pencil size={12} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleting(template)}
                            title="Delete"
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
        open={creating}
        onClose={() => setCreating(false)}
        title="New itinerary template"
        description="Create the outline first; the day-by-day editor opens next."
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setCreating(false)} disabled={saving}>
              Cancel
            </AdminButton>
            <AdminButton variant="primary" loading={saving} onClick={() => void create()}>
              Create template
            </AdminButton>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" error={errors.title} required className="sm:col-span-2">
            <TextInput
              value={meta.title}
              onChange={(value) => setMeta((previous) => ({ ...previous, title: value }))}
              placeholder="Kathmandu heritage in three days"
            />
          </Field>
          <Field label="Destination" error={errors.destinationId}>
            <Select
              value={meta.destinationId}
              onChange={(value) => setMeta((previous) => ({ ...previous, destinationId: value }))}
            >
              <option value="">No specific destination</option>
              {destinations.map((destination) => (
                <option key={destination.id} value={destination.id}>
                  {destination.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Duration (days)" error={errors.durationDays} required>
            <TextInput
              type="number"
              min={1}
              max={60}
              value={meta.durationDays}
              onChange={(value) => setMeta((previous) => ({ ...previous, durationDays: value }))}
            />
          </Field>
          <Field label="Difficulty" error={errors.difficulty}>
            <TextInput
              value={meta.difficulty}
              onChange={(value) => setMeta((previous) => ({ ...previous, difficulty: value }))}
            />
          </Field>
          <Field label="Estimated cost (Rs.)" error={errors.estimatedCost}>
            <TextInput
              type="number"
              min={0}
              value={meta.estimatedCost}
              onChange={(value) => setMeta((previous) => ({ ...previous, estimatedCost: value }))}
            />
          </Field>
          <Field label="Summary" error={errors.summary} className="sm:col-span-2">
            <TextArea
              value={meta.summary}
              onChange={(value) => setMeta((previous) => ({ ...previous, summary: value }))}
              rows={3}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={archiving !== null}
        title="Archive this template?"
        description={
          archiving ? (
            <>
              <strong>{archiving.title}</strong> will be hidden. Its days and stops are kept, and you
              can republish it later.
            </>
          ) : null
        }
        confirmLabel="Archive template"
        onCancel={() => setArchiving(null)}
        onConfirm={archive}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this template?"
        description={
          deleting ? (
            <>
              <strong>{deleting.title}</strong> and all of its days and stops will be permanently
              deleted. This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete template"
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Editor                                                               */
/* ------------------------------------------------------------------ */

function TemplateEditor({ id }: { id: string }) {
  usePageTitle('Itinerary template')
  const api = useAdminApi()
  const navigate = useNavigate()
  const { flash, success, fail } = useFlash()

  const [template, setTemplate] = useState<AdminTemplate | null>(null)
  const [meta, setMeta] = useState<TemplateMetaForm>(EMPTY_META)
  const [days, setDays] = useState<LocalDay[]>([])
  const [destinations, setDestinations] = useState<AdminDestination[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [savingMeta, setSavingMeta] = useState(false)
  const [savingDays, setSavingDays] = useState(false)
  const [metaErrors, setMetaErrors] = useState<Record<string, string>>({})
  const [daysError, setDaysError] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [dirtyDays, setDirtyDays] = useState(false)

  useEffect(() => {
    api.destinations
      .list({ pageSize: 100, sort: 'name', order: 'asc' })
      .then((result) => setDestinations(result.items))
      .catch(() => undefined)
  }, [api])

  const hydrate = useCallback((data: AdminTemplate) => {
    setTemplate(data)
    setMeta(toMeta(data))
    setDays(toDays(data))
    setDirtyDays(false)
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    api.itineraries
      .get(id)
      .then((result) => {
        if (active) hydrate(result)
      })
      .catch((reason: unknown) => {
        if (active) setLoadError(apiErrorMessage(reason))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [api, hydrate, id])

  const saveMeta = async (statusOverride?: ContentStatus) => {
    if (!template) return
    if (meta.title.trim().length < 2) {
      setMetaErrors({ title: 'Enter a title.' })
      return
    }
    setSavingMeta(true)
    try {
      const updated = await api.itineraries.update(id, {
        ...meta,
        status: statusOverride ?? meta.status,
        destinationId: meta.destinationId || null,
        estimatedCost: meta.estimatedCost || null,
        durationDays: Number(meta.durationDays) || 1,
      })
      setTemplate(updated)
      setMeta(toMeta(updated))
      success(statusOverride === 'PUBLISHED' ? 'Template published.' : 'Template details saved.')
    } catch (reason) {
      setMetaErrors(fieldErrors(reason))
      fail(reason)
    } finally {
      setSavingMeta(false)
    }
  }

  const saveDays = async () => {
    if (days.length === 0) {
      setDaysError('Add at least one day before saving the plan.')
      return
    }
    for (const [index, day] of days.entries()) {
      if (!day.title.trim()) {
        setDaysError(`Day ${index + 1} needs a title.`)
        return
      }
      if (day.stops.some((stop) => !stop.title.trim())) {
        setDaysError(`Every stop on day ${index + 1} needs a title.`)
        return
      }
    }
    setSavingDays(true)
    setDaysError(null)
    try {
      const payload: TemplateDay[] = days.map((day, index) => ({
        dayNumber: index + 1,
        title: day.title,
        description: day.description || null,
        stops: day.stops.map((stop, stopIndex) => ({
          timeSlot: stop.timeSlot || null,
          title: stop.title,
          description: stop.description || null,
          estimatedCost: stop.estimatedCost ? Number(stop.estimatedCost) : null,
          sortOrder: stopIndex,
        })),
      }))
      const updated = await api.itineraries.saveDays(id, payload)
      hydrate(updated)
      success(`Day-by-day plan saved (${payload.length} days).`)
    } catch (reason) {
      setDaysError(apiErrorMessage(reason))
    } finally {
      setSavingDays(false)
    }
  }

  const updateDay = (index: number, patch: Partial<LocalDay>) => {
    setDays((previous) =>
      previous.map((day, position) => (position === index ? { ...day, ...patch } : day)),
    )
    setDirtyDays(true)
  }

  const updateStop = (dayIndex: number, stopIndex: number, patch: Partial<LocalStop>) => {
    setDays((previous) =>
      previous.map((day, position) =>
        position === dayIndex
          ? {
              ...day,
              stops: day.stops.map((stop, stopPosition) =>
                stopPosition === stopIndex ? { ...stop, ...patch } : stop,
              ),
            }
          : day,
      ),
    )
    setDirtyDays(true)
  }

  const addDay = () => {
    setDays((previous) => [
      ...previous,
      { title: `Day ${previous.length + 1}`, description: '', stops: [] },
    ])
    setDirtyDays(true)
  }

  const removeDay = (index: number) => {
    setDays((previous) => previous.filter((_, position) => position !== index))
    setDirtyDays(true)
  }

  const moveDay = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= days.length) return
    setDays((previous) => {
      const next = [...previous]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setDirtyDays(true)
  }

  const addStop = (dayIndex: number) => {
    setDays((previous) =>
      previous.map((day, position) =>
        position === dayIndex
          ? {
              ...day,
              stops: [
                ...day.stops,
                { timeSlot: '', title: '', description: '', estimatedCost: '' },
              ],
            }
          : day,
      ),
    )
    setDirtyDays(true)
  }

  const removeStop = (dayIndex: number, stopIndex: number) => {
    setDays((previous) =>
      previous.map((day, position) =>
        position === dayIndex
          ? { ...day, stops: day.stops.filter((_, index) => index !== stopIndex) }
          : day,
      ),
    )
    setDirtyDays(true)
  }

  const moveStop = (dayIndex: number, stopIndex: number, direction: -1 | 1) => {
    setDays((previous) =>
      previous.map((day, position) => {
        if (position !== dayIndex) return day
        const target = stopIndex + direction
        if (target < 0 || target >= day.stops.length) return day
        const stops = [...day.stops]
        ;[stops[stopIndex], stops[target]] = [stops[target], stops[stopIndex]]
        return { ...day, stops }
      }),
    )
    setDirtyDays(true)
  }

  const removeTemplate = async () => {
    try {
      await api.itineraries.remove(id)
      success('Template deleted.')
      navigate('/admin/itineraries')
    } catch (reason) {
      fail(reason)
      throw reason
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Loading template…" />
        <LoadingBlock rows={8} />
      </div>
    )
  }

  if (loadError || !template) {
    return (
      <div className="space-y-4">
        <PageHeader title="Template not found" />
        <InlineAlert tone="error">{loadError ?? 'This template no longer exists.'}</InlineAlert>
        <Link to="/admin/itineraries">
          <AdminButton>
            <ArrowLeft size={13} /> Back to templates
          </AdminButton>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin/itineraries"
          className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-pine"
        >
          <ArrowLeft size={13} /> Itinerary templates
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <AdminButton onClick={() => setPreview(true)}>
            <Eye size={13} /> Preview
          </AdminButton>
          <AdminButton
            variant="primary"
            loading={savingMeta}
            onClick={() => void saveMeta('PUBLISHED')}
          >
            <Send size={13} /> {template.status === 'PUBLISHED' ? 'Update live template' : 'Publish'}
          </AdminButton>
          <AdminButton variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={13} /> Delete
          </AdminButton>
        </div>
      </div>

      <PageHeader
        title={template.title}
        description={`${template.days.length} day${template.days.length === 1 ? '' : 's'} · updated ${formatDate(template.updatedAt)}`}
        actions={<StatusBadge status={template.status} />}
      />

      {flash ? <InlineAlert tone={flash.tone}>{flash.text}</InlineAlert> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <AdminCard title="Template details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" error={metaErrors.title} required className="sm:col-span-2">
                <TextInput
                  value={meta.title}
                  onChange={(value) => setMeta((previous) => ({ ...previous, title: value }))}
                />
              </Field>
              <Field label="Slug" error={metaErrors.slug} hint="Generated from the title if left blank.">
                <TextInput
                  value={meta.slug}
                  onChange={(value) => setMeta((previous) => ({ ...previous, slug: value }))}
                />
              </Field>
              <Field label="Destination" error={metaErrors.destinationId}>
                <Select
                  value={meta.destinationId}
                  onChange={(value) => setMeta((previous) => ({ ...previous, destinationId: value }))}
                >
                  <option value="">No specific destination</option>
                  {destinations.map((destination) => (
                    <option key={destination.id} value={destination.id}>
                      {destination.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Difficulty" error={metaErrors.difficulty}>
                <TextInput
                  value={meta.difficulty}
                  onChange={(value) => setMeta((previous) => ({ ...previous, difficulty: value }))}
                />
              </Field>
              <Field label="Estimated cost (Rs.)" error={metaErrors.estimatedCost}>
                <TextInput
                  type="number"
                  min={0}
                  value={meta.estimatedCost}
                  onChange={(value) => setMeta((previous) => ({ ...previous, estimatedCost: value }))}
                />
              </Field>
              <Field label="Summary" error={metaErrors.summary} className="sm:col-span-2">
                <TextArea
                  value={meta.summary}
                  onChange={(value) => setMeta((previous) => ({ ...previous, summary: value }))}
                  rows={3}
                />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
              <p className="text-[11px] text-ink-mute">
                Saving the day plan sets the duration to {days.length || 0} day{days.length === 1 ? '' : 's'}.
              </p>
              <AdminButton loading={savingMeta} onClick={() => void saveMeta()}>
                <Save size={12} /> Save details
              </AdminButton>
            </div>
          </AdminCard>

          <AdminCard
            title="Day-by-day plan"
            description="Ordered template days and stops. Drag-free arrows keep the order explicit."
            actions={
              <div className="flex items-center gap-2">
                {dirtyDays ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-saffron">
                    Unsaved plan
                  </span>
                ) : null}
                <AdminButton size="sm" loading={savingDays} variant="primary" onClick={() => void saveDays()}>
                  <Save size={12} /> Save plan
                </AdminButton>
              </div>
            }
          >
            {daysError ? (
              <div className="mb-3">
                <InlineAlert tone="error">{daysError}</InlineAlert>
              </div>
            ) : null}

            <div className="space-y-4">
              {days.map((day, dayIndex) => (
                <section key={dayIndex} className="rounded-xl border border-line bg-paper/40">
                  <header className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pine text-[11px] font-semibold text-paper">
                      {dayIndex + 1}
                    </span>
                    <TextInput
                      value={day.title}
                      onChange={(value) => updateDay(dayIndex, { title: value })}
                      placeholder="Day title"
                      className="min-w-[160px] flex-1 !py-1.5"
                    />
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        aria-label="Move day up"
                        disabled={dayIndex === 0}
                        onClick={() => moveDay(dayIndex, -1)}
                        className="rounded p-1 text-ink-mute hover:bg-paper-2 disabled:opacity-25"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        aria-label="Move day down"
                        disabled={dayIndex === days.length - 1}
                        onClick={() => moveDay(dayIndex, 1)}
                        className="rounded p-1 text-ink-mute hover:bg-paper-2 disabled:opacity-25"
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        type="button"
                        aria-label="Remove day"
                        onClick={() => removeDay(dayIndex)}
                        className="rounded p-1 text-clay hover:bg-[#f7e2dc]"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </header>

                  <div className="space-y-3 p-3">
                    <TextArea
                      value={day.description}
                      onChange={(value) => updateDay(dayIndex, { description: value })}
                      rows={2}
                      placeholder="Optional notes for this day"
                    />

                    <div className="space-y-2">
                      {day.stops.map((stop, stopIndex) => (
                        <div
                          key={stopIndex}
                          className="rounded-lg border border-line bg-[#fffdf8] p-2.5"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <TextInput
                              value={stop.timeSlot}
                              onChange={(value) => updateStop(dayIndex, stopIndex, { timeSlot: value })}
                              placeholder="Time (e.g. Morning)"
                              className="!py-1.5 sm:max-w-[150px]"
                            />
                            <TextInput
                              value={stop.title}
                              onChange={(value) => updateStop(dayIndex, stopIndex, { title: value })}
                              placeholder="Stop title"
                              className="min-w-[140px] flex-1 !py-1.5"
                            />
                            <TextInput
                              type="number"
                              min={0}
                              value={stop.estimatedCost}
                              onChange={(value) =>
                                updateStop(dayIndex, stopIndex, { estimatedCost: value })
                              }
                              placeholder="Cost"
                              className="!w-[100px] !py-1.5"
                            />
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                aria-label="Move stop up"
                                disabled={stopIndex === 0}
                                onClick={() => moveStop(dayIndex, stopIndex, -1)}
                                className="rounded p-1 text-ink-mute hover:bg-paper-2 disabled:opacity-25"
                              >
                                <ArrowUp size={11} />
                              </button>
                              <button
                                type="button"
                                aria-label="Move stop down"
                                disabled={stopIndex === day.stops.length - 1}
                                onClick={() => moveStop(dayIndex, stopIndex, 1)}
                                className="rounded p-1 text-ink-mute hover:bg-paper-2 disabled:opacity-25"
                              >
                                <ArrowDown size={11} />
                              </button>
                              <button
                                type="button"
                                aria-label="Remove stop"
                                onClick={() => removeStop(dayIndex, stopIndex)}
                                className="rounded p-1 text-clay hover:bg-[#f7e2dc]"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          </div>
                          <TextArea
                            value={stop.description}
                            onChange={(value) =>
                              updateStop(dayIndex, stopIndex, { description: value })
                            }
                            rows={1}
                            placeholder="Notes"
                            className="mt-2 !py-1.5 text-xs"
                          />
                        </div>
                      ))}
                    </div>

                    <AdminButton size="sm" onClick={() => addStop(dayIndex)}>
                      <Plus size={11} /> Add stop
                    </AdminButton>
                  </div>
                </section>
              ))}

              <AdminButton onClick={addDay}>
                <Plus size={12} /> Add day
              </AdminButton>
            </div>
          </AdminCard>
        </div>

        <div className="space-y-5">
          <AdminCard title="Publishing">
            <div className="space-y-4">
              <Field label="Status">
                <Select
                  value={meta.status}
                  onChange={(value) => setMeta((previous) => ({ ...previous, status: value as ContentStatus }))}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </Select>
              </Field>
              <AdminButton variant="primary" loading={savingMeta} className="w-full" onClick={() => void saveMeta()}>
                <Save size={12} /> Save with this status
              </AdminButton>
              <p className="text-[11px] leading-relaxed text-ink-soft">
                Templates are admin-authored reading material. They do not create or modify a
                traveller’s personal saved trips.
              </p>
            </div>
          </AdminCard>

          <AdminCard title="At a glance">
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-mute">Days</dt>
                <dd className="font-medium">{days.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-mute">Stops</dt>
                <dd className="font-medium">
                  {days.reduce((sum, day) => sum + day.stops.length, 0)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-mute">Estimated cost</dt>
                <dd className="font-medium">{npr(template.estimatedCost)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-mute">Destination</dt>
                <dd className="text-right font-medium">{template.destination?.name ?? 'None'}</dd>
              </div>
            </dl>
          </AdminCard>
        </div>
      </div>

      <Modal
        open={preview}
        onClose={() => setPreview(false)}
        title={template.title}
        description="Full template preview. Unpublished templates are not visible on the public site."
        wide
        footer={
          <AdminButton variant="secondary" onClick={() => setPreview(false)}>
            Close preview
          </AdminButton>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={template.status} />
            {template.destination ? <span className="chip">{template.destination.name}</span> : null}
            {template.difficulty ? <span className="chip">{template.difficulty}</span> : null}
            <span className="chip">{days.length} days</span>
            {template.estimatedCost !== null ? (
              <span className="chip">{npr(template.estimatedCost)} estimate</span>
            ) : null}
          </div>
          {template.summary ? (
            <p className="text-sm leading-relaxed text-ink-soft">{template.summary}</p>
          ) : null}
          <ol className="space-y-3">
            {days.map((day, index) => (
              <li key={index} className="rounded-xl border border-line bg-paper/50 p-3.5">
                <p className="font-display text-lg">
                  Day {index + 1} · {day.title || 'Untitled day'}
                </p>
                {day.description ? (
                  <p className="mt-1 text-xs leading-relaxed text-ink-soft">{day.description}</p>
                ) : null}
                {day.stops.length > 0 ? (
                  <ul className="mt-2 space-y-1.5 border-t border-line pt-2">
                    {day.stops.map((stop, stopIndex) => (
                      <li key={stopIndex} className="text-xs">
                        <span className="font-medium">
                          {stop.timeSlot ? `${stop.timeSlot} · ` : ''}
                          {stop.title || 'Untitled stop'}
                        </span>
                        {stop.estimatedCost ? (
                          <span className="text-ink-mute"> · {npr(Number(stop.estimatedCost))} estimate</span>
                        ) : null}
                        {stop.description ? (
                          <span className="block text-[11px] text-ink-soft">{stop.description}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this template?"
        description={
          <>
            <strong>{template.title}</strong> and all of its days and stops will be permanently
            deleted. This does not affect any traveller’s saved trips.
          </>
        }
        confirmLabel="Delete template"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={removeTemplate}
      />
    </div>
  )
}
