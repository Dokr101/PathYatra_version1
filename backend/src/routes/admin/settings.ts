import { Router } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../../lib/prisma.js'
import { ApiError, asyncHandler, parseBody } from '../../lib/api-error.js'
import { passwordSchema, profileSchema, settingsSchema } from '../../schemas/admin.js'
import { publicUser } from '../../lib/serializers.js'
import { writeAudit } from '../../lib/admin.js'

export const adminSettingsRouter = Router()

const DEFAULT_SETTINGS = {
  siteName: 'PathYatra',
  contactEmail: null,
  contactPhone: null,
  featuredDestinationIds: '[]',
}

async function loadSettings() {
  const settings = await prisma.siteSetting.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', ...DEFAULT_SETTINGS },
  })

  let featuredIds: string[] = []
  try {
    const parsed = JSON.parse(settings.featuredDestinationIds)
    if (Array.isArray(parsed)) featuredIds = parsed.filter((id) => typeof id === 'string')
  } catch {
    featuredIds = []
  }

  const featuredDestinations = featuredIds.length
    ? await prisma.destination.findMany({
        where: { id: { in: featuredIds } },
        select: { id: true, name: true, slug: true },
      })
    : []

  return {
    id: settings.id,
    siteName: settings.siteName,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    updatedAt: settings.updatedAt,
    featuredDestinationIds: featuredIds,
    featuredDestinations,
  }
}

adminSettingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await loadSettings())
  }),
)

adminSettingsRouter.patch(
  '/',
  asyncHandler(async (req, res) => {
    const data = parseBody(settingsSchema, req.body)

    if (data.featuredDestinationIds?.length) {
      const found = await prisma.destination.count({
        where: { id: { in: data.featuredDestinationIds } },
      })
      if (found !== data.featuredDestinationIds.length) {
        throw new ApiError(400, 'One or more featured destinations no longer exist')
      }
    }

    const settings = await prisma.siteSetting.upsert({
      where: { id: 'singleton' },
      update: {
        siteName: data.siteName,
        contactEmail: data.contactEmail ?? null,
        contactPhone: data.contactPhone ?? null,
        ...(data.featuredDestinationIds
          ? { featuredDestinationIds: JSON.stringify(data.featuredDestinationIds) }
          : {}),
      },
      create: {
        id: 'singleton',
        siteName: data.siteName,
        contactEmail: data.contactEmail ?? null,
        contactPhone: data.contactPhone ?? null,
        featuredDestinationIds: JSON.stringify(data.featuredDestinationIds ?? []),
      },
    })

    await writeAudit({
      adminId: req.userId!,
      action: 'settings.update',
      entityType: 'SiteSetting',
      entityId: 'singleton',
      summary: 'Updated site settings',
    })

    res.json({
      id: settings.id,
      siteName: settings.siteName,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      updatedAt: settings.updatedAt,
      featuredDestinationIds: data.featuredDestinationIds ?? [],
    })
  }),
)

adminSettingsRouter.patch(
  '/profile',
  asyncHandler(async (req, res) => {
    const data = parseBody(profileSchema, req.body)
    const clash = await prisma.user.findUnique({ where: { email: data.email } })
    if (clash && clash.id !== req.userId) {
      throw new ApiError(409, 'That email is already in use', {
        email: 'This email is already registered',
      })
    }

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: { fullName: data.fullName, email: data.email },
    })

    await writeAudit({
      adminId: req.userId!,
      action: 'admin.profile',
      entityType: 'User',
      entityId: req.userId!,
      summary: 'Updated own admin profile',
    })

    res.json({ user: publicUser(user) })
  }),
)

adminSettingsRouter.post(
  '/password',
  asyncHandler(async (req, res) => {
    const data = parseBody(passwordSchema, req.body)
    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user) throw new ApiError(404, 'Account not found')

    const matches = await bcrypt.compare(data.currentPassword, user.passwordHash)
    if (!matches) {
      throw new ApiError(400, 'Current password is incorrect', {
        currentPassword: 'Current password is incorrect',
      })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(data.newPassword, 10) },
    })

    await writeAudit({
      adminId: user.id,
      action: 'admin.password',
      entityType: 'User',
      entityId: user.id,
      summary: 'Changed own password',
    })

    res.json({ ok: true })
  }),
)
