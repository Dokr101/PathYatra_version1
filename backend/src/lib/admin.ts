import type { Request } from 'express'
import { prisma } from './prisma.js'

export interface Pagination {
  page: number
  pageSize: number
  skip: number
  take: number
}

export function pagination(req: Request): Pagination {
  const rawPage = Number(req.query.page)
  const rawSize = Number(req.query.pageSize)
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const pageSize =
    Number.isInteger(rawSize) && rawSize > 0 ? Math.min(rawSize, 100) : 20
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

export function listMeta(total: number, { page, pageSize }: Pagination) {
  return { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

export function searchTerm(req: Request): string {
  return typeof req.query.q === 'string' ? req.query.q.trim() : ''
}

export function queryString(req: Request, name: string): string {
  return typeof req.query[name] === 'string' ? (req.query[name] as string) : ''
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export async function uniqueSlug(
  requested: string,
  exists: (slug: string) => Promise<{ id: string } | null>,
  ignoreId?: string,
): Promise<string> {
  const base = slugify(requested) || `item-${Date.now().toString(36)}`
  let candidate = base
  let suffix = 2
  while (true) {
    const found = await exists(candidate)
    if (!found || found.id === ignoreId) return candidate
    candidate = `${base}-${suffix++}`
  }
}

export async function reorderByIds(
  model: 'category' | 'destinationImage',
  ids: string[],
): Promise<void> {
  await prisma.$transaction(
    ids.map((id, index) =>
      model === 'category'
        ? prisma.category.update({ where: { id }, data: { sortOrder: index } })
        : prisma.destinationImage.update({ where: { id }, data: { sortOrder: index } }),
    ),
  )
}

export async function writeAudit(input: {
  adminId: string
  action: string
  entityType: string
  entityId?: string | null
  summary: string
}) {
  await prisma.auditLog.create({
    data: {
      adminId: input.adminId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary,
    },
  })
}
