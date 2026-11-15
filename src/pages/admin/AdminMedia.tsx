import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Images, Pencil, Star, Trash2, Upload, X } from 'lucide-react'
import type { AdminDestination, AdminImage } from '../../lib/api'
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
  TextArea,
  TextInput,
} from '../../components/admin/AdminUI'

interface StagedFile {
  file: File
  url: string
}

interface MediaMeta {
  destinationId: string
  altText: string
  caption: string
  credit: string
  isCover: boolean
}

const EMPTY_META: MediaMeta = {
  destinationId: '',
  altText: '',
  caption: '',
  credit: '',
  isCover: false,
}

export function AdminMedia() {
  usePageTitle('Image Library')
  const api = useAdminApi()
  const { flash, success, fail } = useFlash()
  const [params, setParams] = useSearchParams()
  const fileInput = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState(params.get('q') ?? '')
  const debouncedQuery = useDebounced(query)
  const [destinationId, setDestinationId] = useState(params.get('destinationId') ?? '')
  const [page, setPage] = useState(1)
  const [destinations, setDestinations] = useState<AdminDestination[]>([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [staged, setStaged] = useState<StagedFile[]>([])
  const [meta, setMeta] = useState<MediaMeta>({
    ...EMPTY_META,
    destinationId: params.get('destinationId') ?? '',
  })
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState<AdminImage | null>(null)
  const [editForm, setEditForm] = useState<MediaMeta>(EMPTY_META)
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleting, setDeleting] = useState<AdminImage | null>(null)

  useEffect(() => {
    api.destinations
      .list({ pageSize: 100, sort: 'name', order: 'asc' })
      .then((result) => setDestinations(result.items))
      .catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const next = new URLSearchParams()
    if (destinationId) next.set('destinationId', destinationId)
    setParams(next, { replace: true })
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationId])

  const { data, loading, error, reload } = usePagedList(
    () =>
      api.media.list({
        q: debouncedQuery,
        destinationId,
        page,
        pageSize: 24,
      }),
    [debouncedQuery, destinationId, page],
  )

  const destinationName = useMemo(() => {
    const map = new Map(destinations.map((destination) => [destination.id, destination.name]))
    return (id: string | null) => (id ? map.get(id) ?? 'Unknown destination' : 'Unassigned')
  }, [destinations])

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const next: StagedFile[] = []
    const rejected: string[] = []
    for (const file of Array.from(files)) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        rejected.push(`${file.name} is not JPEG, PNG or WebP.`)
        continue
      }
      if (file.size > 5 * 1024 * 1024) {
        rejected.push(`${file.name} is larger than 5 MB.`)
        continue
      }
      next.push({ file, url: URL.createObjectURL(file) })
    }
    setStaged((previous) => [...previous, ...next].slice(0, 10))
    setUploadError(rejected[0] ?? null)
    if (fileInput.current) fileInput.current.value = ''
  }

  const removeStaged = (index: number) => {
    setStaged((previous) => {
      URL.revokeObjectURL(previous[index].url)
      return previous.filter((_, position) => position !== index)
    })
  }

  const closeUpload = (force = false) => {
    if (uploading && !force) return
    for (const item of staged) URL.revokeObjectURL(item.url)
    setStaged([])
    setMeta({ ...EMPTY_META, destinationId })
    setUploadError(null)
    setUploadOpen(false)
  }

  const upload = async () => {
    if (staged.length === 0) {
      setUploadError('Choose at least one image.')
      return
    }
    setUploading(true)
    setUploadError(null)
    try {
      await api.media.upload(
        staged.map((item) => item.file),
        {
          destinationId: meta.destinationId,
          altText: meta.altText,
          caption: meta.caption,
          credit: meta.credit,
          isCover: meta.isCover && Boolean(meta.destinationId),
        },
      )
      success(`${staged.length} image${staged.length === 1 ? '' : 's'} uploaded.`)
      closeUpload(true)
      reload()
    } catch (reason) {
      setUploadError(apiErrorMessage(reason))
    } finally {
      setUploading(false)
    }
  }

  const openEdit = (image: AdminImage) => {
    setEditing(image)
    setEditForm({
      destinationId: image.destinationId ?? '',
      altText: image.altText ?? '',
      caption: image.caption ?? '',
      credit: image.credit ?? '',
      isCover: image.isCover,
    })
    setEditErrors({})
  }

  const saveEdit = async () => {
    if (!editing) return
    setSavingEdit(true)
    try {
      await api.media.update(editing.id, {
        destinationId: editForm.destinationId,
        altText: editForm.altText,
        caption: editForm.caption,
        credit: editForm.credit,
        isCover: editForm.isCover,
      })
      success('Image details saved.')
      setEditing(null)
      reload()
    } catch (reason) {
      setEditErrors(fieldErrors(reason))
      fail(reason)
    } finally {
      setSavingEdit(false)
    }
  }

  const setCover = async (image: AdminImage) => {
    try {
      await api.media.setCover(image.id)
      success('Cover image updated.')
      reload()
    } catch (reason) {
      fail(reason)
    }
  }

  const remove = async () => {
    if (!deleting) return
    try {
      await api.media.remove(deleting.id)
      success('Image deleted.')
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
        title="Image Library"
        description="Uploads go to Cloudinary; only the URL and metadata are stored. JPEG, PNG or WebP, up to 5 MB each."
        actions={
          <AdminButton variant="primary" onClick={() => setUploadOpen(true)}>
            <Upload size={14} /> Upload images
          </AdminButton>
        }
      />

      {flash ? <InlineAlert tone={flash.tone}>{flash.text}</InlineAlert> : null}
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      <div className="rounded-2xl border border-line bg-[#fffdf8] p-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_260px]">
          <SearchBox value={query} onChange={setQuery} placeholder="Search alt text, caption or credit…" />
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
          <LoadingBlock rows={6} label="Loading images" />
        </div>
      ) : data && data.items.length === 0 ? (
        <AdminCard>
          <div className="py-12 text-center">
            <Images size={24} className="mx-auto mb-3 text-ink-mute" />
            <h3 className="font-display text-xl">No images here yet</h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-soft">
              Upload supplied photographs, then link them to destinations and choose a cover.
            </p>
            <AdminButton variant="primary" className="mt-5" onClick={() => setUploadOpen(true)}>
              <Upload size={13} /> Upload the first image
            </AdminButton>
          </div>
        </AdminCard>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.items.map((image) => (
              <figure
                key={image.id}
                className="overflow-hidden rounded-2xl border border-line bg-[#fffdf8]"
              >
                <div className="relative h-40 bg-paper-2">
                  <img
                    src={image.url}
                    alt={image.altText ?? ''}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  {image.isCover ? (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-pine px-2 py-0.5 text-[10px] font-semibold text-paper">
                      <Star size={9} className="fill-marigold text-marigold" /> Cover
                    </span>
                  ) : null}
                </div>
                <figcaption className="space-y-1.5 p-3">
                  <p className="truncate text-xs font-medium text-ink">
                    {image.altText || image.caption || 'Untitled image'}
                  </p>
                  <p className="truncate text-[11px] text-ink-mute">
                    {destinationName(image.destinationId)}
                    {image.credit ? ` · ${image.credit}` : ''}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {image.destinationId && !image.isCover ? (
                      <AdminButton size="sm" onClick={() => void setCover(image)}>
                        <Star size={10} /> Cover
                      </AdminButton>
                    ) : null}
                    <AdminButton size="sm" onClick={() => openEdit(image)}>
                      <Pencil size={10} /> Details
                    </AdminButton>
                    <AdminButton size="sm" variant="danger" onClick={() => setDeleting(image)}>
                      <Trash2 size={10} />
                    </AdminButton>
                  </div>
                </figcaption>
              </figure>
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
        open={uploadOpen}
        onClose={closeUpload}
        title="Upload images"
        description="Nothing is uploaded until you confirm. Review the previews and metadata first."
        wide
        footer={
          <>
            <AdminButton variant="secondary" onClick={closeUpload} disabled={uploading}>
              Cancel
            </AdminButton>
            <AdminButton variant="primary" loading={uploading} onClick={() => void upload()}>
              <Upload size={13} /> Upload {staged.length || ''}
            </AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              addFiles(event.dataTransfer.files)
            }}
            className="rounded-xl border border-dashed border-line bg-paper/60 px-4 py-8 text-center"
          >
            <Upload size={20} className="mx-auto mb-2 text-ink-mute" />
            <p className="text-sm text-ink">Drop images here, or choose files</p>
            <p className="mt-1 text-[11px] text-ink-mute">JPEG, PNG or WebP · up to 5 MB each · 10 at a time</p>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => addFiles(event.target.files)}
              className="hidden"
              id="admin-image-input"
            />
            <label
              htmlFor="admin-image-input"
              className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-[#fffdf8] px-3 py-1.5 text-xs font-medium hover:bg-paper-2"
            >
              Choose files
            </label>
          </div>

          {uploadError ? <InlineAlert tone="error">{uploadError}</InlineAlert> : null}

          {staged.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {staged.map((item, index) => (
                <div key={item.url} className="relative overflow-hidden rounded-lg border border-line">
                  <img src={item.url} alt="" className="h-24 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeStaged(index)}
                    aria-label={`Remove ${item.file.name}`}
                    className="absolute right-1 top-1 rounded-full bg-ink/70 p-1 text-paper hover:bg-ink"
                  >
                    <X size={10} />
                  </button>
                  <p className="truncate bg-paper-2/80 px-1.5 py-1 text-[10px] text-ink-soft">
                    {item.file.name}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Destination" hint="Leave unassigned to keep this in the library for later.">
              <Select
                value={meta.destinationId}
                onChange={(value) => setMeta((previous) => ({ ...previous, destinationId: value }))}
              >
                <option value="">Unassigned</option>
                {destinations.map((destination) => (
                  <option key={destination.id} value={destination.id}>
                    {destination.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Credit" hint="Photographer or source.">
              <TextInput
                value={meta.credit}
                onChange={(value) => setMeta((previous) => ({ ...previous, credit: value }))}
              />
            </Field>
            <Field label="Alt text" hint="Describe the image for screen readers." className="sm:col-span-2">
              <TextInput
                value={meta.altText}
                onChange={(value) => setMeta((previous) => ({ ...previous, altText: value }))}
              />
            </Field>
            <Field label="Caption" className="sm:col-span-2">
              <TextArea
                value={meta.caption}
                onChange={(value) => setMeta((previous) => ({ ...previous, caption: value }))}
                rows={2}
              />
            </Field>
            <label className="flex items-center gap-2 text-xs text-ink-soft sm:col-span-2">
              <input
                type="checkbox"
                checked={meta.isCover}
                disabled={!meta.destinationId}
                onChange={(event) =>
                  setMeta((previous) => ({ ...previous, isCover: event.target.checked }))
                }
                className="h-4 w-4 accent-pine disabled:opacity-40"
              />
              Make the first image the destination cover (requires a destination)
            </label>
          </div>
        </div>
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Image details"
        description="Metadata only. The file itself is not modified."
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setEditing(null)} disabled={savingEdit}>
              Cancel
            </AdminButton>
            <AdminButton variant="primary" loading={savingEdit} onClick={() => void saveEdit()}>
              Save details
            </AdminButton>
          </>
        }
      >
        {editing ? (
          <div className="space-y-4">
            <img
              src={editing.url}
              alt={editing.altText ?? ''}
              className="h-40 w-full rounded-xl object-cover"
            />
            <Field label="Destination" error={editErrors.destinationId}>
              <Select
                value={editForm.destinationId}
                onChange={(value) => setEditForm((previous) => ({ ...previous, destinationId: value }))}
              >
                <option value="">Unassigned</option>
                {destinations.map((destination) => (
                  <option key={destination.id} value={destination.id}>
                    {destination.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Alt text" error={editErrors.altText}>
              <TextInput
                value={editForm.altText}
                onChange={(value) => setEditForm((previous) => ({ ...previous, altText: value }))}
              />
            </Field>
            <Field label="Caption" error={editErrors.caption}>
              <TextArea
                value={editForm.caption}
                onChange={(value) => setEditForm((previous) => ({ ...previous, caption: value }))}
                rows={2}
              />
            </Field>
            <Field label="Credit" error={editErrors.credit}>
              <TextInput
                value={editForm.credit}
                onChange={(value) => setEditForm((previous) => ({ ...previous, credit: value }))}
              />
            </Field>
            <label className="flex items-center gap-2 text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={editForm.isCover}
                disabled={!editForm.destinationId}
                onChange={(event) =>
                  setEditForm((previous) => ({ ...previous, isCover: event.target.checked }))
                }
                className="h-4 w-4 accent-pine"
              />
              Use as the destination cover
            </label>
            <p className="text-[11px] text-ink-mute">Public ID: {editing.publicId}</p>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this image?"
        description={
          deleting ? (
            <>
              The image will be removed from the library and from Cloudinary. If it was a cover,
              that destination will need another one. This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete image"
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
      />
    </div>
  )
}
