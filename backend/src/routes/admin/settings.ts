import { Router } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../../lib/prisma.js'
import { ApiError, asyncHandler, parseBody } from '../../lib/api-error.js'
import { passwordSchema, profileSchema, settingsSchema } from '../../schemas/admin.js'
import { publicUser } from '../../lib/serializers.js'
import { writeAudit } from '../../lib/admin.js'
import { signToken } from '../../lib/jwt.js'
import { setAuthCookie } from '../../lib/auth-cookie.js'
import { getUserId } from '../../middleware/auth.js'
import { hashPassword } from '../../lib/password.js'

export const adminSettingsRouter = Router()

const DEFAULT_SETTINGS = {
  siteName: 'PathYatra',
  contactEmail: null,
  contactPhone: null,
}

async function loadSettings() {
  const settings = await prisma.siteSetting.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', ...DEFAULT_SETTINGS },
  })

  // The join table + cascade is the source of truth, so a deleted destination
  // simply disappears here instead of leaving an id behind in a JSON string.
  const featured = await prisma.featuredDestination.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { destinationId: true, destination: { select: { id: true, name: true, slug: true } } },
  })

  return {
    id: settings.id,
    siteName: settings.siteName,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    updatedAt: settings.updatedAt,
    featuredDestinationIds: featured.map((row) => row.destinationId),
    featuredDestinations: featured.map((row) => row.destination),
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

    // De-duplicate before touching the table: destinationId is the primary key.
    const featuredIds = data.featuredDestinationIds
      ? [...new Set(data.featuredDestinationIds)]
      : undefined

    if (featuredIds?.length) {
      const found = await prisma.destination.count({ where: { id: { in: featuredIds } } })
      if (found !== featuredIds.length) {
        throw new ApiError(400, 'One or more featured destinations no longer exist')
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.siteSetting.upsert({
        where: { id: 'singleton' },
        update: {
          siteName: data.siteName,
          contactEmail: data.contactEmail ?? null,
          contactPhone: data.contactPhone ?? null,
        },
        create: {
          id: 'singleton',
          siteName: data.siteName,
          contactEmail: data.contactEmail ?? null,
          contactPhone: data.contactPhone ?? null,
        },
      })

      if (featuredIds) {
        // Replace the whole ordered set: delete + insert keeps sortOrder dense
        // and lets the FK reject any id that vanished since the check above.
        await tx.featuredDestination.deleteMany({})
        if (featuredIds.length > 0) {
          await tx.featuredDestination.createMany({
            data: featuredIds.map((destinationId, index) => ({ destinationId, sortOrder: index })),
          })
        }
      }
    })

    await writeAudit({
      adminId: getUserId(req),
      action: 'settings.update',
      entityType: 'SiteSetting',
      entityId: 'singleton',
      summary: 'Updated site settings',
    })

    res.json(await loadSettings())
  }),
)

adminSettingsRouter.patch(
  '/profile',
  asyncHandler(async (req, res) => {
    const data = parseBody(profileSchema, req.body)
    const clash = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } })
    if (clash && clash.id !== req.userId) {
      throw new ApiError(409, 'That email is already in use', {
        email: 'This email is already registered',
      })
    }

    const user = await prisma.user.update({
      where: { id: getUserId(req) },
      data: { fullName: data.fullName, email: data.email },
      // Exactly what publicUser reads; nothing else from the row is loaded.
      select: { id: true, fullName: true, email: true, role: true, createdAt: true },
    })

    await writeAudit({
      adminId: getUserId(req),
      action: 'admin.profile',
      entityType: 'User',
      entityId: getUserId(req),
      summary: 'Updated own admin profile',
    })

    res.json({ user: publicUser(user) })
  }),
)

adminSettingsRouter.post(
  '/password',
  asyncHandler(async (req, res) => {
    const data = parseBody(passwordSchema, req.body)
    // This is the one place that needs the hash, and it needs nothing else.
    const user = await prisma.user.findUnique({
      where: { id: getUserId(req) },
      select: { id: true, passwordHash: true },
    })
    if (!user) throw new ApiError(404, 'Account not found')

    const matches = await bcrypt.compare(data.currentPassword, user.passwordHash)
    if (!matches) {
      throw new ApiError(400, 'Current password is incorrect', {
        currentPassword: 'Current password is incorrect',
      })
    }

    // Bumping the version invalidates every token issued before this change.
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(data.newPassword),
        tokenVersion: { increment: 1 },
      },
      select: { id: true, tokenVersion: true },
    })

    await writeAudit({
      adminId: user.id,
      action: 'admin.password',
      entityType: 'User',
      entityId: user.id,
      summary: 'Changed own password',
    })

    // The caller keeps working: the cookie is re-minted for the new version.
    setAuthCookie(res, signToken(updated.id, updated.tokenVersion))
    res.json({ ok: true })
  }),
)
