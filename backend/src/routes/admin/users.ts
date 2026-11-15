import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { ApiError, asyncHandler, parseBody } from '../../lib/api-error.js'
import { param } from '../../lib/params.js'
import { userRoleSchema, userStatusSchema } from '../../schemas/admin.js'
import {
  listMeta,
  pagination,
  queryString,
  searchTerm,
  writeAudit,
} from '../../lib/admin.js'

export const adminUsersRouter = Router()

const safeUser = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { itineraries: true, reviews: true, favorites: true } },
} as const

async function superAdminCount() {
  return prisma.user.count({ where: { role: 'SUPER_ADMIN', isActive: true } })
}

adminUsersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = pagination(req)
    const q = searchTerm(req)
    const role = queryString(req, 'role')
    const active = queryString(req, 'isActive')

    const where = {
      ...(q
        ? { OR: [{ fullName: { contains: q } }, { email: { contains: q } }] }
        : {}),
      ...(role ? { role: role as 'USER' | 'ADMIN' | 'SUPER_ADMIN' } : {}),
      ...(active === 'true' ? { isActive: true } : active === 'false' ? { isActive: false } : {}),
    }

    const [items, total, counts] = await Promise.all([
      prisma.user.findMany({
        where,
        select: safeUser,
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      prisma.user.count({ where }),
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    ])

    res.json({
      items,
      ...listMeta(total, page),
      roleCounts: Object.fromEntries(counts.map((row) => [row.role, row._count._all])),
    })
  }),
)

adminUsersRouter.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const id = param(req, 'id')
    const { isActive } = parseBody(userStatusSchema, req.body)
    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) throw new ApiError(404, 'User not found')
    if (target.id === req.userId) {
      throw new ApiError(400, 'You cannot disable your own account')
    }

    if (!isActive) {
      if (target.role !== 'USER' && req.userRole !== 'SUPER_ADMIN') {
        throw new ApiError(403, 'Only a super admin can disable an administrator account')
      }
      if (target.role === 'SUPER_ADMIN' && (await superAdminCount()) <= 1) {
        throw new ApiError(400, 'At least one active super admin must remain')
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: safeUser,
    })

    await writeAudit({
      adminId: req.userId!,
      action: isActive ? 'user.enable' : 'user.disable',
      entityType: 'User',
      entityId: id,
      summary: `${isActive ? 'Reactivated' : 'Disabled'} account ${user.email}`,
    })

    res.json(user)
  }),
)

adminUsersRouter.patch(
  '/:id/role',
  asyncHandler(async (req, res) => {
    if (req.userRole !== 'SUPER_ADMIN') {
      throw new ApiError(403, 'Only a super admin can change roles')
    }

    const id = param(req, 'id')
    const { role } = parseBody(userRoleSchema, req.body)
    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) throw new ApiError(404, 'User not found')
    if (target.id === req.userId) {
      throw new ApiError(400, 'You cannot change your own role')
    }
    if (
      target.role === 'SUPER_ADMIN' &&
      role !== 'SUPER_ADMIN' &&
      (await superAdminCount()) <= 1
    ) {
      throw new ApiError(400, 'At least one active super admin must remain')
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: safeUser,
    })

    await writeAudit({
      adminId: req.userId!,
      action: 'user.role',
      entityType: 'User',
      entityId: id,
      summary: `Changed ${user.email} from ${target.role} to ${role}`,
    })

    res.json(user)
  }),
)
