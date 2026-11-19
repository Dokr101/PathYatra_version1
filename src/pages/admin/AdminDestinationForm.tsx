import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Archive,
  ExternalLink,
  Eye,
  Images,
  Info,
  MapPin,
  Save,
  Send,
  Star,
} from 'lucide-react'
import type {
  AdminCategory,
  AdminDestination,
  AdminTravelInfo,
  ContentStatus,
} from '../../lib/api'
import { apiErrorMessage } from '../../lib/api'
import {
  fieldErrors,
  useAdminApi,
  useFlash,
  usePageTitle,
} from '../../lib/adminHooks'
import { clearPublicDestinationsCache } from '../../lib/publicDestinations'
import { ConfirmDialog } from '../../components/admin/ConfirmDialog'
import {
  AdminButton,
  AdminCard,
  Field,
  InlineAlert,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  TextArea,
  TextInput,
} from '../../components/admin/AdminUI'
import { formatDate } from '../../lib/adminFormat'

interface FormState {
  name: string
  slug: string
  categoryId: string
  province: string
  district: string
  shortDescription: string
  overview: string
  highlights: string
  localFood: string
  travelEssentials: string
  bestSeason: string
  recommendedDurationDays: string
  difficultyLevel: string
  costPerPersonPerDay: string
  latitude: string
  longitude: string
  imagePath: string
  status: ContentStatus
}

const EMPTY: FormState = {
  name: '',
  slug: '',
  categoryId: '',
  province: '',
  district: '',
  shortDescription: '',
  overview: '',
  highlights: '',
  localFood: '',
  travelEssentials: '',
  bestSeason: '',
  recommendedDurationDays: '',
  difficultyLevel: 'easy',
  costPerPersonPerDay: '',
  latitude: '',
  longitude: '',
  imagePath: '',
  status: 'DRAFT',
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function text(value: string | number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
}

export function AdminDestinationForm() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  usePageTitle(isNew ? 'New destination' : 'Edit destination')
  const api = useAdminApi()
  const navigate = useNavigate()
  const location = useLocation()
  const { flash, success, fail } = useFlash()

  const [form, setForm] = useState<FormState>(EMPTY)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [destination, setDestination] = useState<AdminDestination | null>(null)
  const [travelInfo, setTravelInfo] = useState<AdminTravelInfo[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [slugTouched, setSlugTouched] = useState(!isNew)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }))

  useEffect(() => {
    api.categories
      .list()
      .then((result) => {
        setCategories(result.items)
        if (isNew) {
          const active = result.items.find((category) => category.isActive) ?? result.items[0]
          if (active) setForm((previous) => ({ ...previous, categoryId: previous.categoryId || active.id }))
        }
      })
      .catch(() => undefined)
  }, [api, isNew])

  const hydrate = (data: AdminDestination) => {
    setDestination(data)
    setForm({
      name: data.name,
      slug: data.slug,
      categoryId: data.categoryId,
      province: text(data.province),
      district: text(data.district),
      shortDescription: text(data.shortDescription),
      overview: text(data.overview),
      highlights: text(data.highlights),
      localFood: text(data.localFood),
      travelEssentials: text(data.travelEssentials),
      bestSeason: text(data.bestSeason),
      recommendedDurationDays: text(data.recommendedDurationDays),
      difficultyLevel: data.difficultyLevel || 'easy',
      costPerPersonPerDay: text(data.costPerPersonPerDay),
      latitude: text(data.latitude),
      longitude: text(data.longitude),
      imagePath: text(data.imagePath),
      status: data.status,
    })
  }

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    setLoadError(null)
    api.destinations
      .get(id)
      .then((data) => {
        if (active) hydrate(data)
      })
      .catch((reason: unknown) => {
        if (active) setLoadError(apiErrorMessage(reason))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    api.travelInfo
      .list({ destinationId: id, pageSize: 5 })
      .then((result) => {
        if (active) setTravelInfo(result.items)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [api, id])

  useEffect(() => {
    // Router state only changes on navigation, so this stays a one-shot toast.
    const state = location.state as { created?: boolean } | null
    if (state?.created) success('Destination created as a draft. Review it, then publish when ready.')
  }, [location.state, success])

  const cover = useMemo(
    () => destination?.images.find((image) => image.isCover) ?? destination?.images[0] ?? null,
    [destination],
  )

  const changeName = (value: string) => {
    setForm((previous) => ({
      ...previous,
      name: value,
      slug: slugTouched ? previous.slug : slugify(value),
    }))
  }

  const validateForPublish = (status: ContentStatus): Record<string, string> => {
    if (status !== 'PUBLISHED') return {}
    const next: Record<string, string> = {}
    if (form.name.trim().length < 2) next.name = 'A published destination needs a name.'
    if (!form.categoryId) next.categoryId = 'Choose a category before publishing.'
    if (form.shortDescription.trim().length < 10)
      next.shortDescription = 'Add a short description (at least 10 characters) before publishing.'
    if (form.overview.trim().length < 20)
      next.overview = 'Add an overview before publishing.'
    return next
  }

  const save = async (statusOverride?: ContentStatus) => {
    const nextStatus = statusOverride ?? form.status
    const clientErrors = validateForPublish(nextStatus)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) {
      fail('Fix the highlighted fields before publishing.')
      return
    }

    setSaving(true)
    const body = {
      ...form,
      slug: form.slug || slugify(form.name),
      status: nextStatus,
      recommendedDurationDays: form.recommendedDurationDays || null,
      costPerPersonPerDay: form.costPerPersonPerDay || null,
      latitude: form.latitude || null,
      longitude: form.longitude || null,
    }
    try {
      if (isNew) {
        const created = await api.destinations.create(body)
        // Public pages cache destinations at module scope; drop it so "View
        // site" shows this record instead of the previous list.
        clearPublicDestinationsCache()
        success('Destination created.')
        navigate(`/admin/destinations/${created.id}/edit`, { replace: true, state: { created: true } })
      } else {
        const updated = await api.destinations.update(id!, body)
        clearPublicDestinationsCache()
        hydrate(updated)
        success(
          nextStatus === 'PUBLISHED'
            ? 'Saved and published. It is live on Explore.'
            : nextStatus === 'ARCHIVED'
              ? 'Destination archived. Saved trips keep their reference.'
              : 'Changes saved.',
        )
      }
    } catch (reason) {
      setErrors(fieldErrors(reason))
      fail(reason)
    } finally {
      setSaving(false)
    }
  }

  const setCover = async (imageId: string) => {
    try {
      await api.media.setCover(imageId)
      clearPublicDestinationsCache()
      const refreshed = await api.destinations.get(id!)
      hydrate(refreshed)
      success('Cover image updated.')
    } catch (reason) {
      fail(reason)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Loading destination…" />
        <LoadingBlock rows={8} />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <PageHeader title="Destination not found" />
        <InlineAlert tone="error">{loadError}</InlineAlert>
        <Link to="/admin/destinations">
          <AdminButton>
            <ArrowLeft size={14} /> Back to destinations
          </AdminButton>
        </Link>
      </div>
    )
  }

  const categoryName = categories.find((category) => category.id === form.categoryId)?.name ?? '—'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin/destinations"
          className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-pine"
        >
          <ArrowLeft size={13} /> Destinations
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <AdminButton onClick={() => setPreview(true)}>
            <Eye size={13} /> Preview
          </AdminButton>
          {!isNew && destination?.status === 'PUBLISHED' ? (
            <a href={`/explore/${destination.slug}`} target="_blank" rel="noopener noreferrer">
              <AdminButton>
                <ExternalLink size={13} /> Public page
              </AdminButton>
            </a>
          ) : null}
          {!isNew && form.status !== 'ARCHIVED' ? (
            <AdminButton variant="danger" onClick={() => setArchiveOpen(true)}>
              <Archive size={13} /> Archive
            </AdminButton>
          ) : null}
          <AdminButton variant="secondary" loading={saving} onClick={() => void save()}>
            <Save size={13} /> Save changes
          </AdminButton>
          <AdminButton
            variant="primary"
            loading={saving}
            onClick={() => void save('PUBLISHED')}
          >
            <Send size={13} /> {form.status === 'PUBLISHED' ? 'Update live page' : 'Publish'}
          </AdminButton>
        </div>
      </div>

      <PageHeader
        title={isNew ? 'New destination' : form.name || 'Untitled destination'}
        description={
          isNew
            ? 'Start with the essentials. New destinations are saved as drafts until you publish them.'
            : `Created ${destination ? formatDate(destination.createdAt) : ''} · last updated ${destination ? formatDate(destination.updatedAt) : ''}`
        }
        actions={<StatusBadge status={form.status} />}
      />

      {flash ? <InlineAlert tone={flash.tone}>{flash.text}</InlineAlert> : null}
      {Object.keys(errors).length > 0 ? (
        <InlineAlert tone="error">
          Some fields need attention. The first message is shown beside its field.
        </InlineAlert>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <AdminCard title="Basic details" description="How the destination is named and introduced.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" error={errors.name} required className="sm:col-span-2">
                <TextInput value={form.name} onChange={changeName} placeholder="e.g. Pokhara Lakeside" />
              </Field>
              <Field
                label="Slug"
                error={errors.slug}
                hint="Used in the public URL /explore/<slug>. Leave blank to generate from the name."
              >
                <TextInput
                  value={form.slug}
                  onChange={(value) => {
                    setSlugTouched(true)
                    set('slug', slugify(value))
                  }}
                  placeholder="pokhara-lakeside"
                />
              </Field>
              <Field label="Category" error={errors.categoryId} required>
                <Select value={form.categoryId} onChange={(value) => set('categoryId', value)}>
                  <option value="">Choose a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                      {category.isActive ? '' : ' (inactive)'}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Short description"
                error={errors.shortDescription}
                hint="One or two sentences used on cards and search results."
                className="sm:col-span-2"
              >
                <TextArea
                  value={form.shortDescription}
                  onChange={(value) => set('shortDescription', value)}
                  rows={2}
                  placeholder="What makes this place worth the journey?"
                />
              </Field>
              <Field
                label="Overview"
                error={errors.overview}
                hint="Full introduction. Blank lines become paragraphs on the public page."
                className="sm:col-span-2"
              >
                <TextArea
                  value={form.overview}
                  onChange={(value) => set('overview', value)}
                  rows={7}
                />
              </Field>
              <Field label="Highlights" hint="One per line.">
                <TextArea value={form.highlights} onChange={(value) => set('highlights', value)} rows={5} />
              </Field>
              <Field label="Local food" hint="One per line.">
                <TextArea value={form.localFood} onChange={(value) => set('localFood', value)} rows={5} />
              </Field>
              <Field label="Travel essentials" hint="One per line." className="sm:col-span-2">
                <TextArea
                  value={form.travelEssentials}
                  onChange={(value) => set('travelEssentials', value)}
                  rows={4}
                />
              </Field>
            </div>
          </AdminCard>

          <AdminCard title="Location & practicalities" description="Province, coordinates and trip facts.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Province" error={errors.province}>
                <TextInput value={form.province} onChange={(value) => set('province', value)} placeholder="Gandaki" />
              </Field>
              <Field label="District" error={errors.district}>
                <TextInput value={form.district} onChange={(value) => set('district', value)} placeholder="Kaski" />
              </Field>
              <Field label="Best season" error={errors.bestSeason}>
                <TextInput value={form.bestSeason} onChange={(value) => set('bestSeason', value)} placeholder="October–November" />
              </Field>
              <Field label="Difficulty" error={errors.difficultyLevel}>
                <Select value={form.difficultyLevel} onChange={(value) => set('difficultyLevel', value)}>
                  <option value="easy">Easy</option>
                  <option value="moderate">Moderate</option>
                  <option value="challenging">Challenging</option>
                  <option value="difficult">Difficult</option>
                </Select>
              </Field>
              <Field label="Recommended days" error={errors.recommendedDurationDays}>
                <TextInput
                  type="number"
                  min={1}
                  max={60}
                  value={form.recommendedDurationDays}
                  onChange={(value) => set('recommendedDurationDays', value)}
                />
              </Field>
              <Field label="Cost per person / day (Rs.)" error={errors.costPerPersonPerDay}>
                <TextInput
                  type="number"
                  min={0}
                  value={form.costPerPersonPerDay}
                  onChange={(value) => set('costPerPersonPerDay', value)}
                />
              </Field>
              <Field label="Latitude" error={errors.latitude}>
                <TextInput type="number" step="any" min={-90} max={90} value={form.latitude} onChange={(value) => set('latitude', value)} />
              </Field>
              <Field label="Longitude" error={errors.longitude}>
                <TextInput type="number" step="any" min={-180} max={180} value={form.longitude} onChange={(value) => set('longitude', value)} />
              </Field>
              <Field label="Fallback image path" hint="Used only when no Cloudinary cover is set.">
                <TextInput value={form.imagePath} onChange={(value) => set('imagePath', value)} placeholder="/images/pokhara.jpg" />
              </Field>
            </div>
          </AdminCard>

          <AdminCard
            title="Images"
            description="Cover and gallery images uploaded through the Image Library."
            actions={
              id ? (
                <a href={`/admin/media?destinationId=${id}`} target="_blank" rel="noopener noreferrer">
                  <AdminButton size="sm">
                    <Images size={12} /> Manage images
                  </AdminButton>
                </a>
              ) : (
                <AdminButton size="sm" disabled title="Save the destination first">
                  Save first to add images
                </AdminButton>
              )
            }
          >
            {!id ? (
              <p className="text-xs text-ink-soft">
                Save this destination first, then upload a cover and gallery in the Image Library.
              </p>
            ) : destination && destination.images.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {destination.images.map((image) => (
                  <figure key={image.id} className="overflow-hidden rounded-xl border border-line">
                    <img src={image.url} alt={image.altText ?? ''} className="h-28 w-full object-cover" />
                    <figcaption className="flex items-center justify-between gap-1 bg-paper-2/60 px-2 py-1.5">
                      <span className="truncate text-[11px] text-ink-mute">
                        {image.altText || image.caption || 'Untitled'}
                      </span>
                      {image.isCover ? (
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-pine">
                          <Star size={9} className="fill-marigold text-marigold" /> Cover
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void setCover(image.id)}
                          className="shrink-0 text-[11px] text-pine hover:underline"
                        >
                          Set cover
                        </button>
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-line bg-paper/60 px-4 py-6 text-center text-xs text-ink-soft">
                {form.imagePath
                  ? 'Using the fallback image path. Upload a Cloudinary cover to replace it.'
                  : 'No images yet. Upload one in the Image Library and set it as the cover.'}
              </div>
            )}
          </AdminCard>

          <AdminCard
            title="Travel information"
            description="Verified guidance shown on the public page. Notes stay labelled with their source and status."
            actions={
              id ? (
                <Link to={`/admin/travel-info?destinationId=${id}`}>
                  <AdminButton size="sm">
                    <Info size={12} /> Manage
                  </AdminButton>
                </Link>
              ) : null
            }
          >
            {travelInfo.length === 0 ? (
              <p className="text-xs text-ink-soft">
                No travel information yet. Add permits, transport or safety notes from Travel
                Information.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {travelInfo.map((info) => (
                  <li key={info.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{info.title}</p>
                      <p className="text-[11px] text-ink-mute">
                        {info.sourceName || 'No source'} · verified {formatDate(info.lastVerifiedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={info.statusLabel} />
                      <StatusBadge status={info.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>

        <div className="space-y-5">
          <AdminCard title="Publishing" description="Only published destinations are public.">
            <div className="space-y-4">
              <Field label="Status">
                <Select value={form.status} onChange={(value) => set('status', value as ContentStatus)}>
                  <option value="DRAFT">Draft — hidden from the public site</option>
                  <option value="PUBLISHED">Published — visible on Explore</option>
                  <option value="ARCHIVED">Archived — hidden, kept for history</option>
                </Select>
              </Field>
              <ul className="space-y-1.5 text-[11px] text-ink-soft">
                <li>✓ Drafts can be previewed here at any time.</li>
                <li>✓ Publishing needs a name, category, short description and overview.</li>
                <li>✓ Archived destinations keep saved-trip references.</li>
              </ul>
              <AdminButton variant="primary" loading={saving} className="w-full" onClick={() => void save()}>
                <Save size={13} /> Save with this status
              </AdminButton>
            </div>
          </AdminCard>

          <AdminCard title="Preview card">
            <div className="overflow-hidden rounded-xl border border-line">
              {cover?.url || form.imagePath ? (
                <img
                  src={cover?.url ?? form.imagePath}
                  alt=""
                  className="h-32 w-full object-cover"
                />
              ) : (
                <div className="flex h-32 items-center justify-center bg-paper-2 text-ink-mute">
                  <MapPin size={22} />
                </div>
              )}
              <div className="space-y-1.5 p-3">
                <StatusBadge status={form.status} />
                <p className="font-display text-lg leading-tight">{form.name || 'Untitled destination'}</p>
                <p className="text-[11px] text-ink-mute">
                  {categoryName}
                  {form.province ? ` · ${form.province}` : ''}
                </p>
                <p className="line-clamp-3 text-[11px] leading-relaxed text-ink-soft">
                  {form.shortDescription || 'No short description yet.'}
                </p>
              </div>
            </div>
          </AdminCard>
        </div>
      </div>

      <Modal
        open={preview}
        onClose={() => setPreview(false)}
        title={form.name || 'Destination preview'}
        description="This is how the content reads. Nothing is public until you publish."
        wide
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setPreview(false)}>
              Close
            </AdminButton>
            {form.status !== 'PUBLISHED' ? (
              <AdminButton
                variant="primary"
                loading={saving}
                onClick={() => {
                  setPreview(false)
                  void save('PUBLISHED')
                }}
              >
                <Send size={13} /> Publish now
              </AdminButton>
            ) : null}
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={form.status} />
            <span className="chip">{categoryName}</span>
            {form.province ? <span className="chip">{form.province}</span> : null}
            {form.district ? <span className="chip">{form.district}</span> : null}
          </div>
          {cover?.url || form.imagePath ? (
            <img
              src={cover?.url ?? form.imagePath}
              alt=""
              className="h-56 w-full rounded-xl object-cover"
            />
          ) : null}
          <p className="font-display text-2xl">{form.name || 'Untitled'}</p>
          <p className="text-sm leading-relaxed text-ink-soft">
            {form.shortDescription || 'No short description.'}
          </p>
          {form.overview ? (
            <div className="space-y-3 text-sm leading-relaxed text-ink-soft">
              {form.overview.split(/\n{2,}/).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-paper-2 px-3 py-2 text-xs text-ink-mute">
              Add an overview before publishing.
            </p>
          )}
          {form.highlights ? (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
                Highlights
              </p>
              <ul className="list-inside list-disc space-y-0.5 text-sm text-ink-soft">
                {form.highlights.split('\n').filter(Boolean).map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={archiveOpen}
        title="Archive this destination?"
        description={
          <>
            <strong>{form.name}</strong> will disappear from Explore. Its images, activities, travel
            information and any saved trips stay intact. You can restore it by publishing again.
          </>
        }
        confirmLabel="Archive destination"
        onCancel={() => setArchiveOpen(false)}
        onConfirm={async () => {
          await save('ARCHIVED')
          setArchiveOpen(false)
        }}
      />
    </div>
  )
}
