import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { asyncHandler } from '../../lib/api-error.js'
import {
  listMeta,
  pagination,
  queryString,
  searchTerm,
} from '../../lib/admin.js'

export const adminAuditLogsRouter = Router()

adminAuditLogsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = pagination(req)
    const q = searchTerm(req)
    const entityType = queryString(req, 'entityType')
    const action = queryString(req, 'action')
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
