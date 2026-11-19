import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { ApiError, asyncHandler } from '../../lib/api-error.js'
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  listMeta,
  pagination,
  queryString,
  searchTerm,
} from '../../lib/admin.js'

export const adminAuditLogsRouter = Router()

const entityTypeSchema = z.enum(AUDIT_ENTITY_TYPES)
const actionSchema = z.enum(AUDIT_ACTIONS)

/**
 * An empty parameter means "no filter". Anything else has to be a value the API
 * actually writes, so a typo is a 400 instead of a silently empty table.
 */
function filterParam<T extends string>(
  schema: z.ZodType<T>,
  raw: string,
  label: string,
  allowed: readonly string[],
): T | '' {
  const value = raw.trim()
  if (!value) return ''
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    throw new ApiError(400, `Unknown ${label} filter. Use one of: ${allowed.join(', ')}.`)
  }
  return parsed.data
}

adminAuditLogsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = pagination(req)
    const q = searchTerm(req)
    const entityType = filterParam(
      entityTypeSchema,
      queryString(req, 'entityType'),
      'entity type',
      AUDIT_ENTITY_TYPES,
    )
    const action = filterParam(actionSchema, queryString(req, 'action'), 'audit action', AUDIT_ACTIONS)
    const adminId = queryString(req, 'adminId')
    const from = queryString(req, 'from')
    const to = queryString(req, 'to')

    const where = {
      ...(q ? { OR: [{ summary: { contains: q } }, { action: { contains: q } }] } : {}),
      ...(entityType ? { entityType } : {}),
      ...(action ? { action } : {}),
      ...(adminId ? { adminId } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    }

    const [items, total, entityTypes] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { admin: { select: { id: true, fullName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        select: { entityType: true },
        distinct: ['entityType'],
        orderBy: { entityType: 'asc' },
      }),
    ])

    res.json({
      items,
      ...listMeta(total, page),
      entityTypes: entityTypes.map((row) => row.entityType),
    })
  }),
)
