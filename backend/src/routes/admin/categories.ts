import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { ApiError, asyncHandler, parseBody } from '../../lib/api-error.js'
import { param } from '../../lib/params.js'
import { reorderSchema, categorySchema } from '../../schemas/admin.js'
import { queryString, reorderByIds, searchTerm, uniqueSlug, writeAudit } from '../../lib/admin.js'

export const adminCategoriesRouter = Router()

adminCategoriesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = searchTerm(req)
    const active = queryString(req, 'isActive')
    const categories = await prisma.category.findMany({
      where: {
        ...(q ? { name: { contains: q } } : {}),
        ...(active === 'true' ? { isActive: true } : active === 'false' ? { isActive: false } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { destinations: true } } },
    })
    res.json({ items: categories, total: categories.length })
  }),
)

adminCategoriesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = parseBody(categorySchema, req.body)
    const slug = await uniqueSlug(data.slug || data.name, (candidate) =>
      prisma.category.findUnique({ where: { slug: candidate }, select: { id: true } }),
    )
    const last = await prisma.category.findFirst({ orderBy: { sortOrder: 'desc' } })
    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description ?? null,
        sortOrder: data.sortOrder ?? (last?.sortOrder ?? 0) + 1,
        isActive: data.isActive ?? true,
      },
      include: { _count: { select: { destinations: true } } },
    })
    await writeAudit({
      adminId: req.userId!,
      action: 'category.create',
      entityType: 'Category',
      entityId: category.id,
      summary: `Created category “${category.name}”`,
    })
    res.status(201).json(category)
  }),
)

adminCategoriesRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = param(req, 'id')
    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) throw new ApiError(404, 'Category not found')
    const data = parseBody(categorySchema.partial(), req.body)
    let slug = existing.slug
    if (data.slug || data.name) {
      slug = await uniqueSlug(
        data.slug || data.name || existing.name,
        (candidate) => prisma.category.findUnique({ where: { slug: candidate }, select: { id: true } }),
        id,
      )
    }
    const category = await prisma.category.update({
      where: { id },
      data: { ...data, slug },
      include: { _count: { select: { destinations: true } } },
    })
    await writeAudit({
      adminId: req.userId!,
      action: 'category.update',
      entityType: 'Category',
      entityId: id,
      summary: `Updated category “${category.name}”${data.isActive === false ? ' (deactivated)' : ''}`,
    })
    res.json(category)
  }),
)

adminCategoriesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = param(req, 'id')
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { destinations: true } } },
    })
    if (!category) throw new ApiError(404, 'Category not found')
    if (category._count.destinations > 0) {
      throw new ApiError(
        409,
        `“${category.name}” still has ${category._count.destinations} destination(s). Reassign them to another category first.`,
        { category: 'Reassign destinations before deleting this category' },
      )
    }
    await prisma.category.delete({ where: { id } })
    await writeAudit({
      adminId: req.userId!,
      action: 'category.delete',
      entityType: 'Category',
      entityId: id,
      summary: `Deleted category “${category.name}”`,
    })
    res.json({ ok: true })
  }),
)

adminCategoriesRouter.post(
  '/reorder',
  asyncHandler(async (req, res) => {
    const { ids } = parseBody(reorderSchema, req.body)
    await reorderByIds('category', ids)
    await writeAudit({
      adminId: req.userId!,
      action: 'category.reorder',
      entityType: 'Category',
      summary: `Reordered ${ids.length} categories`,
    })
    res.json({ ok: true })
  }),
)
