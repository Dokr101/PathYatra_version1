import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BedDouble, Pencil, Plus, Trash2, UtensilsCrossed } from 'lucide-react'
import type {
  AdminDestination,
  AdminPlace,
  ContentStatus,
  PlaceType,
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
  InlineAlert,
  Field,
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

interface PlaceForm {
  destinationId: string
  name: string
  type: PlaceType
  description: string
  address: string
  phone: string
  website: string
  priceRange: string
  amenities: string
  latitude: string
  longitude: string
  status: ContentStatus
}

const EMPTY: PlaceForm = {
  destinationId: '',
  name: '',
  type: 'HOTEL',
  description: '',
  address: '',
  phone: '',
  website: '',
  priceRange: '',
  amenities: '',
  latitude: '',
  longitude: '',
  status: 'DRAFT',
}

function toForm(place: AdminPlace): PlaceForm {
  return {
    destinationId: place.destinationId,
    name: place.name,
    type: place.type,
    description: place.description ?? '',
    address: place.address ?? '',
    phone: place.phone ?? '',
    website: place.website ?? '',
    priceRange: place.priceRange ?? '',
    amenities: place.amenities ?? '',
    latitude: place.latitude === null ? '' : String(place.latitude),
    longitude: place.longitude === null ? '' : String(place.longitude),
    status: place.status,
  }
}

export function AdminPlaces() {
  usePageTitle('Hotels & Restaurants')
  const api = useAdminApi()
  const { flash, success, fail } = useFlash()

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounced(query)
  const [destinationId, setDestinationId] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [destinations, setDestinations] = useState<AdminDestination[]>([])
  const [editing, setEditing] = useState<AdminPlace | 'new' | null>(null)
  const [form, setForm] = useState<PlaceForm>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<AdminPlace | null>(null)

  useEffect(() => {
    api.destinations
      .list({ pageSize: 100, sort: 'name', order: 'asc' })
      .then((result) => setDestinations(result.items))
      .catch(() => undefined)
  }, [api])

  useEffect(() => setPage(1), [debouncedQuery, destinationId, type, status])

  const { data, loading, error, reload } = usePagedList(
    (signal) =>
      api.places.list({
        q: debouncedQuery,
        destinationId,
        type,
        status,
        page,
        pageSize: 20,
      }, signal),
    [debouncedQuery, destinationId, type, status, page],
  )

  const openNew = () => {
    setEditing('new')
    setForm({ ...EMPTY, destinationId })
    setErrors({})
  }

  const openEdit = (place: AdminPlace) => {
    setEditing(place)
    setForm(toForm(place))
    setErrors({})
  }

  const save = async () => {
    const clientErrors: Record<string, string> = {}
    if (!form.destinationId) clientErrors.destinationId = 'Choose a destination.'
    if (form.name.trim().length < 2) clientErrors.name = 'Enter a name.'
    if (form.website && !/^https?:\/\//i.test(form.website))
      clientErrors.website = 'Start the website with http:// or https://.'
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return

    setSaving(true)
    const body = {
      ...form,
      latitude: form.latitude || null,
      longitude: form.longitude || null,
    }
    try {
      if (editing === 'new') {
        await api.places.create(body)
        success('Place created.')
      } else if (editing) {
        await api.places.update(editing.id, body)
        success('Place updated.')
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
      await api.places.remove(deleting.id)
      success('Place deleted.')
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
        title="Hotels & Restaurants"
        description="Practical stays and places to eat. This is a directory only — there is no booking, availability or payment flow."
        actions={
          <AdminButton variant="primary" onClick={openNew}>
            <Plus size={14} /> New place
          </AdminButton>
        }
      />

      {flash ? <InlineAlert tone={flash.tone}>{flash.text}</InlineAlert> : null}
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      <div className="rounded-2xl border border-line bg-[#fffdf8] p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <SearchBox value={query} onChange={setQuery} placeholder="Search places or addresses…" />
          <Select value={destinationId} onChange={setDestinationId}>
            <option value="">All destinations</option>
            {destinations.map((destination) => (
              <option key={destination.id} value={destination.id}>
                {destination.name}
              </option>
            ))}
          </Select>
          <Select value={type} onChange={setType}>
            <option value="">Hotels & restaurants</option>
            <option value="HOTEL">Hotels</option>
            <option value="RESTAURANT">Restaurants</option>
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
            <BedDouble size={22} className="mx-auto mb-3 text-ink-mute" />
            <h3 className="font-display text-xl">No places match this view</h3>
            <p className="mt-1.5 text-sm text-ink-soft">
              Add a teahouse, hotel or restaurant. Contact details and a price range help travellers
              verify it themselves.
            </p>
            <AdminButton variant="primary" className="mt-5" onClick={openNew}>
              <Plus size={13} /> New place
            </AdminButton>
          </div>
        ) : data ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper-2/50 text-[11px] uppercase tracking-[0.08em] text-ink-mute">
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-3 py-3 font-semibold">Destination</th>
                    <th className="px-3 py-3 font-semibold">Type</th>
                    <th className="px-3 py-3 font-semibold">Price range</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Updated</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.items.map((place) => (
                    <tr key={place.id} className="hover:bg-paper-2/30">
                      <td className="px-4 py-3">
                        <p className="flex items-center gap-1.5 font-medium">
                          {place.type === 'HOTEL' ? (
                            <BedDouble size={12} className="text-ink-mute" />
                          ) : (
                            <UtensilsCrossed size={12} className="text-ink-mute" />
                          )}
                          {place.name}
                        </p>
                        {place.address ? (
                          <p className="text-[11px] text-ink-mute">{place.address}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          to={`/admin/destinations/${place.destinationId}/edit`}
                          className="text-xs text-pine hover:underline"
                        >
                          {place.destination.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={place.type} />
                      </td>
                      <td className="px-3 py-3 text-xs text-ink-soft">{place.priceRange || '—'}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={place.status} />
                      </td>
                      <td className="px-3 py-3">
                        <UpdatedCell date={place.updatedAt} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(place)}
                            aria-label={`Edit ${place.name}`}
                            className="rounded-full border border-line bg-[#fffdf8] p-1.5 text-ink-soft hover:bg-paper-2"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(place)}
                            aria-label={`Delete ${place.name}`}
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
        title={editing === 'new' ? 'New place' : 'Edit place'}
        description="Directory information only. Nothing here can be booked or paid for."
        wide
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </AdminButton>
            <AdminButton variant="primary" loading={saving} onClick={() => void save()}>
              Save place
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
              onChange={(value) => setForm((previous) => ({ ...previous, type: value as PlaceType }))}
            >
              <option value="HOTEL">Hotel / stay</option>
              <option value="RESTAURANT">Restaurant / food</option>
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
          <Field label="Address" error={errors.address}>
            <TextInput
              value={form.address}
              onChange={(value) => setForm((previous) => ({ ...previous, address: value }))}
            />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <TextInput
              value={form.phone}
              onChange={(value) => setForm((previous) => ({ ...previous, phone: value }))}
            />
          </Field>
          <Field label="Website" error={errors.website}>
            <TextInput
              type="url"
              value={form.website}
              onChange={(value) => setForm((previous) => ({ ...previous, website: value }))}
              placeholder="https://…"
            />
          </Field>
          <Field label="Price range" error={errors.priceRange} hint="A range, e.g. Rs. 1,500–3,000.">
            <TextInput
              value={form.priceRange}
              onChange={(value) => setForm((previous) => ({ ...previous, priceRange: value }))}
            />
          </Field>
          <Field label="Amenities" error={errors.amenities} hint="Comma separated." className="sm:col-span-2">
            <TextArea
              value={form.amenities}
              onChange={(value) => setForm((previous) => ({ ...previous, amenities: value }))}
              rows={2}
            />
          </Field>
          <Field label="Latitude" error={errors.latitude}>
            <TextInput
              type="number"
              step="any"
              value={form.latitude}
              onChange={(value) => setForm((previous) => ({ ...previous, latitude: value }))}
            />
          </Field>
          <Field label="Longitude" error={errors.longitude}>
            <TextInput
              type="number"
              step="any"
              value={form.longitude}
              onChange={(value) => setForm((previous) => ({ ...previous, longitude: value }))}
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
        title="Delete this place?"
        description={
          deleting ? (
            <>
              <strong>{deleting.name}</strong> will be removed from its destination directory. This
              cannot be undone; archive it instead if you may need it again.
            </>
          ) : null
        }
        confirmLabel="Delete place"
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
      />
    </div>
  )
}
