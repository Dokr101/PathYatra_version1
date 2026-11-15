import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, FolderTree, Pencil, Plus, Trash2 } from 'lucide-react'
import type { AdminCategory } from '../../lib/api'
import { apiErrorMessage } from '../../lib/api'
import { fieldErrors, useAdminApi, useFlash, usePageTitle } from '../../lib/adminHooks'
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
} from '../../components/admin/AdminUI'

interface CategoryForm {
  name: string
  slug: string
  description: string
  sortOrder: string
  isActive: boolean
}

const EMPTY: CategoryForm = { name: '', slug: '', description: '', sortOrder: '0', isActive: true }

export function AdminCategories() {
  usePageTitle('Categories')
  const api = useAdminApi()
  const { flash, success, fail } = useFlash()

  const [items, setItems] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<AdminCategory | 'new' | null>(null)
  const [form, setForm] = useState<CategoryForm>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<AdminCategory | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    api.categories
      .list()
      .then((result) => setItems(result.items))
      .catch((reason: unknown) => setError(apiErrorMessage(reason)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return items.filter((category) => {
      if (activeFilter === 'true' && !category.isActive) return false
      if (activeFilter === 'false' && category.isActive) return false
      if (!term) return true
      return `${category.name} ${category.slug} ${category.description ?? ''}`
        .toLowerCase()
        .includes(term)
    })
  }, [items, query, activeFilter])

  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => setPage(1), [query, activeFilter])

  const openNew = () => {
    const nextOrder = items.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1
    setEditing('new')
    setForm({ ...EMPTY, sortOrder: String(nextOrder) })
    setErrors({})
  }

  const openEdit = (category: AdminCategory) => {
    setEditing(category)
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      sortOrder: String(category.sortOrder),
      isActive: category.isActive,
    })
    setErrors({})
  }

  const save = async () => {
    if (form.name.trim().length < 2) {
      setErrors({ name: 'Enter a category name.' })
      return
    }
    setSaving(true)
    const body = {
      name: form.name,
      slug: form.slug || undefined,
      description: form.description,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    }
    try {
      if (editing === 'new') {
        await api.categories.create(body)
        success('Category created.')
      } else if (editing) {
        await api.categories.update(editing.id, body)
        success('Category updated.')
      }
      setEditing(null)
      load()
    } catch (reason) {
      setErrors(fieldErrors(reason))
      fail(reason)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (category: AdminCategory) => {
    try {
      await api.categories.update(category.id, { isActive: !category.isActive })
      success(category.isActive ? `“${category.name}” deactivated.` : `“${category.name}” activated.`)
      load()
    } catch (reason) {
      fail(reason)
    }
  }

  const move = async (category: AdminCategory, direction: -1 | 1) => {
    const index = items.findIndex((item) => item.id === category.id)
    const target = items[index + direction]
    if (!target) return
    const next = [...items]
    next[index] = target
    next[index + direction] = category
    setItems(next)
    try {
      await api.categories.reorder(next.map((item) => item.id))
      success('Category order saved.')
    } catch (reason) {
      fail(reason)
      load()
    }
  }

  const remove = async () => {
    if (!deleting) return
    try {
      await api.categories.remove(deleting.id)
      success(`“${deleting.name}” deleted.`)
      setDeleting(null)
      load()
    } catch (reason) {
      fail(reason)
      throw reason
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories"
        description="The four public groups used by Explore. Reorder them, or deactivate one without deleting it."
        actions={
          <AdminButton variant="primary" onClick={openNew}>
            <Plus size={14} /> New category
          </AdminButton>
        }
      />

      {flash ? <InlineAlert tone={flash.tone}>{flash.text}</InlineAlert> : null}
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      <AdminCard>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchBox value={query} onChange={setQuery} placeholder="Search categories…" className="flex-1" />
          <Select value={activeFilter} onChange={setActiveFilter} className="sm:w-48">
            <option value="">All categories</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </Select>
        </div>

        {loading && items.length === 0 ? (
          <LoadingBlock rows={4} />
        ) : paged.length === 0 ? (
          <div className="py-12 text-center">
            <FolderTree size={20} className="mx-auto mb-2 text-ink-mute" />
            <p className="text-sm text-ink-soft">No categories match this search.</p>
          </div>
        ) : (
          <>
            <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
              {paged.map((category) => (
                <li key={category.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      aria-label={`Move ${category.name} up`}
                      disabled={items.findIndex((item) => item.id === category.id) === 0}
                      onClick={() => void move(category, -1)}
                      className="rounded p-0.5 text-ink-mute hover:bg-paper-2 hover:text-ink disabled:opacity-25"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${category.name} down`}
                      disabled={items.findIndex((item) => item.id === category.id) === items.length - 1}
                      onClick={() => void move(category, 1)}
                      className="rounded p-0.5 text-ink-mute hover:bg-paper-2 hover:text-ink disabled:opacity-25"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ink">{category.name}</p>
                      <StatusBadge status={category.isActive ? 'ACTIVE' : 'DISABLED'} />
                      <span className="chip">{category._count?.destinations ?? 0} destinations</span>
                    </div>
                    <p className="truncate text-[11px] text-ink-mute">
                      /{category.slug}
                      {category.description ? ` · ${category.description}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <AdminButton size="sm" onClick={() => void toggleActive(category)}>
                      {category.isActive ? 'Deactivate' : 'Activate'}
                    </AdminButton>
                    <AdminButton size="sm" onClick={() => openEdit(category)}>
                      <Pencil size={11} /> Edit
                    </AdminButton>
                    <AdminButton size="sm" variant="danger" onClick={() => setDeleting(category)}>
                      <Trash2 size={11} />
                    </AdminButton>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <Pagination
                page={page}
                totalPages={totalPages}
                total={filtered.length}
                pageSize={pageSize}
                onPage={setPage}
              />
            </div>
          </>
        )}
      </AdminCard>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New category' : 'Edit category'}
        description="Categories group destinations on the public Explore page."
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </AdminButton>
            <AdminButton variant="primary" loading={saving} onClick={() => void save()}>
              {editing === 'new' ? 'Create category' : 'Save changes'}
            </AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name" error={errors.name} required>
            <TextInput
              value={form.name}
              onChange={(value) => setForm((previous) => ({ ...previous, name: value }))}
              placeholder="Adventure & High Passes"
            />
          </Field>
          <Field label="Slug" error={errors.slug} hint="Leave blank to generate from the name.">
            <TextInput
              value={form.slug}
              onChange={(value) => setForm((previous) => ({ ...previous, slug: value }))}
              placeholder="adventure"
            />
          </Field>
          <Field label="Description" error={errors.description}>
            <TextArea
              value={form.description}
              onChange={(value) => setForm((previous) => ({ ...previous, description: value }))}
              rows={2}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sort order" error={errors.sortOrder} hint="Lower numbers appear first.">
              <TextInput
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(value) => setForm((previous) => ({ ...previous, sortOrder: value }))}
              />
            </Field>
            <Field label="Active">
              <label className="flex items-center gap-2 rounded-xl border border-line bg-[#fffdf8] px-3 py-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, isActive: event.target.checked }))
                  }
                  className="h-4 w-4 accent-pine"
                />
                Show this category on the public site
              </label>
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this category?"
        description={
          deleting ? (
            <>
              <strong>{deleting.name}</strong> has {deleting._count?.destinations ?? 0} destination(s).
              A category with destinations cannot be deleted; reassign them first. Deleting an empty
              category cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete category"
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
      />
    </div>
  )
}
