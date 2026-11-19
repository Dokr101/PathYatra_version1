import type { Request } from 'express'
import { ApiError } from './api-error.js'
import { prisma } from './prisma.js'

export interface Pagination {
  page: number
  pageSize: number
  skip: number
  take: number
}

/**
 * A page number this large is never a real request; the cap stops a crafted
 * `?page=1e308` from turning into an infinite OFFSET (and a 500) on public routes.
 */
const MAX_PAGE = 10_000

export function pagination(
  req: Request,
  options: { defaultPageSize?: number; maxPageSize?: number } = {},
): Pagination {
  const rawPage = Number(req.query.page)
  const rawSize = Number(req.query.pageSize)
  const defaultSize = options.defaultPageSize ?? 20
  const maxSize = options.maxPageSize ?? 100
  const page =
    Number.isInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, MAX_PAGE) : 1
  const pageSize =
    Number.isInteger(rawSize) && rawSize > 0 ? Math.min(rawSize, maxSize) : defaultSize
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

/**
 * Upper bound on slug probes. Without it, a table seeded with `name-2` through
 * `name-9999` turns one admin create into thousands of sequential queries; past
 * this many candidates the request is refused instead of scanning further.
 */
const MAX_SLUG_ATTEMPTS = 100

export async function uniqueSlug(
  requested: string,
  exists: (slug: string) => Promise<{ id: string } | null>,
  ignoreId?: string,
): Promise<string> {
  const base = slugify(requested) || `item-${Date.now().toString(36)}`
  let candidate = base
  let suffix = 2
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const found = await exists(candidate)
    if (!found || found.id === ignoreId) return candidate
    candidate = `${base}-${suffix++}`
  }
  throw new ApiError(409, 'Could not generate a unique slug. Try a different name or slug.')
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

/**
 * Every action the admin API records. The audit-log filter validates against
 * this tuple and writeAudit only accepts it, so a typo is a compile error here
 * rather than an unfilterable row later.
 */
export const AUDIT_ACTIONS = [
  'activity.create',
  'activity.update',
  'activity.delete',
  'category.create',
  'category.update',
  'category.delete',
  'category.reorder',
  'destination.create',
  'destination.update',
  'destination.archive',
  'destination.delete',
  'template.create',
  'template.update',
  'template.archive',
  'template.days',
  'template.delete',
  'media.upload',
  'media.cover',
  'media.delete',
  'place.create',
  'place.update',
  'place.delete',
  'review.approve',
  'review.hide',
  'travelInfo.create',
  'travelInfo.update',
  'travelInfo.delete',
  'settings.update',
  'admin.profile',
  'admin.password',
  'user.enable',
  'user.disable',
  'user.role',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

/** Entity names the admin API writes to AuditLog.entityType. */
export const AUDIT_ENTITY_TYPES = [
  'Activity',
  'Category',
  'Destination',
  'DestinationImage',
  'ItineraryTemplate',
  'Place',
  'Review',
  'SiteSetting',
  'TravelInfo',
  'User',
] as const

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number]

export async function writeAudit(input: {
  adminId: string
  action: AuditAction
  entityType: AuditEntityType
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
