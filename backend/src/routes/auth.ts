import { createHash } from 'node:crypto'
import { Router } from 'express'
import bcrypt from 'bcrypt'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import { prisma } from '../lib/prisma.js'
import { ApiError, asyncHandler, parseBody } from '../lib/api-error.js'
import { changePasswordSchema, loginSchema, registerSchema } from '../schemas/auth.js'
import { signToken } from '../lib/jwt.js'
import { clearAuthCookie, readAuthCookie, setAuthCookie } from '../lib/auth-cookie.js'
import { getUserId, requireAuth } from '../middleware/auth.js'
import { publicUser } from '../lib/serializers.js'
import { DUMMY_PASSWORD_HASH, hashPassword, needsRehash } from '../lib/password.js'
import { logger } from '../lib/logger.js'

export const authRouter = Router()

/**
 * Always runs bcrypt, with or without an account hash, and always reports false
 * when there is no account. Keeping the compare outside the `if (user)` branch is
 * the whole point: login timing must not depend on whether the email exists.
 */
export async function verifyPassword(
  password: string,
  passwordHash?: string | null,
): Promise<boolean> {
  const matches = await bcrypt.compare(password, passwordHash ?? DUMMY_PASSWORD_HASH)
  return Boolean(passwordHash) && matches
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Try again in 15 minutes.' },
})

/** Account creation is cheap to script, so it is capped hard per IP. */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this address. Try again in an hour.' },
})

/**
 * Registration answers 409 for an address that already has an account, which is
 * a deliberate product decision (immediate sign-up with no email delivery).
 * This bucket limits how often a single address can be probed, so switching IPs
 * no longer gives an unlimited enumeration budget per target. The address is
 * hashed: the limiter store never holds raw emails.
 */
const registerEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const raw = (req.body as { email?: unknown } | undefined)?.email
    const email = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
    return email
      ? `email:${createHash('sha256').update(email).digest('hex')}`
      : `ip:${ipKeyGenerator(req.ip ?? '')}`
  },
  message: { error: 'Too many attempts for this email address. Try again in an hour.' },
})

authRouter.post(
  '/register',
  // Email first so a repeated address gets its own message before the shared IP
  // bucket answers for a different one.
  registerEmailLimiter,
  registerLimiter,
  asyncHandler(async (req, res) => {
    const data = parseBody(registerSchema, req.body)

    // Hash before the lookup: otherwise a duplicate address answers ~100 ms
    // faster than a new one, which is a second enumeration channel.
    const [existing, passwordHash] = await Promise.all([
      prisma.user.findUnique({ where: { email: data.email }, select: { id: true } }),
      hashPassword(data.password),
    ])
    if (existing) {
      throw new ApiError(409, 'An account with that email already exists', {
        email: 'This email is already registered',
      })
    }

    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        passwordHash,
        role: 'USER',
        isActive: true,
      },
      // The hash was just written; never read it back into memory.
      select: { id: true, fullName: true, email: true, role: true, createdAt: true, tokenVersion: true },
    })

    // The token goes into an HttpOnly cookie, never into the response body.
    setAuthCookie(res, signToken(user.id, user.tokenVersion))
    res.status(201).json({ user: publicUser(user) })
  }),
)

authRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const data = parseBody(loginSchema, req.body)

    const user = await prisma.user.findUnique({ where: { email: data.email } })
    // Runs bcrypt even when `user` is null, so a missing account costs the same
    // as a wrong password and cannot be detected by response time.
    const passwordMatches = await verifyPassword(data.password, user?.passwordHash)

    if (!user || !passwordMatches) {
      throw new ApiError(401, 'Invalid email or password')
    }
    if (!user.isActive) {
      throw new ApiError(403, 'This account has been disabled. Contact an administrator.')
    }

    // The one moment the plaintext is available: if this hash predates a cost
    // increase, re-hash it now (D-18). Best-effort — a failed upgrade must not
    // turn a correct password into a 500, and the next login retries it.
    if (needsRehash(user.passwordHash)) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: await hashPassword(data.password) },
          select: { id: true },
        })
      } catch (error) {
        logger.warn({ err: error, userId: user.id }, 'password rehash on login failed')
      }
    }

    setAuthCookie(res, signToken(user.id, user.tokenVersion))
    res.json({ user: publicUser(user) })
  }),
)

/**
 * Signs the caller out everywhere: bumping tokenVersion invalidates this token
 * and every other copy of it, so a stolen bearer token dies here instead of
 * living out its full 24-hour TTL.
 */
authRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.user.update({
      where: { id: getUserId(req) },
      data: { tokenVersion: { increment: 1 } },
    })
    clearAuthCookie(res)
    res.status(204).end()
  }),
)

/**
 * Re-issues the session cookie for a request that is already authenticated.
 * The new token carries the account's current tokenVersion, and the cookie gets
 * a fresh 24-hour max-age; nothing is extended past the JWT's own `exp`.
 */
authRouter.post(
  '/refresh',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: getUserId(req) },
      select: { id: true, tokenVersion: true, isActive: true },
    })
    if (!user || !user.isActive) {
      clearAuthCookie(res)
      throw new ApiError(401, 'Session ended. Sign in again.')
    }

    setAuthCookie(res, signToken(user.id, user.tokenVersion))
    res.json({ ok: true })
  }),
)

/**
 * Self-service password change for travellers (admins use /api/admin/settings).
 * Mirrors that handler: verify the current password, re-hash, bump the version,
 * and hand back a token minted for the new version so this device stays signed in.
 */
authRouter.post(
  '/password/change',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = parseBody(changePasswordSchema, req.body)

    // Same as the admin handler: only the hash is needed for the comparison.
    const user = await prisma.user.findUnique({
      where: { id: getUserId(req) },
      select: { id: true, passwordHash: true },
    })
    if (!user) throw new ApiError(401, 'Account no longer exists')

    const matches = await bcrypt.compare(data.currentPassword, user.passwordHash)
    if (!matches) {
      throw new ApiError(400, 'Current password is incorrect', {
        currentPassword: 'Current password is incorrect',
      })
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(data.newPassword),
        tokenVersion: { increment: 1 },
      },
      select: { id: true, tokenVersion: true },
    })

    // Every older token is dead now; this device continues on the fresh cookie.
    setAuthCookie(res, signToken(updated.id, updated.tokenVersion))
    res.json({ ok: true })
  }),
)

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    // Only the fields publicUser serializes: the password hash never has to
    // enter memory here, so no future log or error dumper can leak it.
    const user = await prisma.user.findUnique({
      where: { id: getUserId(req) },
      select: { id: true, fullName: true, email: true, role: true, createdAt: true },
    })
    if (!user) {
      throw new ApiError(401, 'Account no longer exists')
    }

    res.json({ user: publicUser(user) })
  }),
)
