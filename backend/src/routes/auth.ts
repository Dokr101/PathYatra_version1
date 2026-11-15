import { Router } from 'express'
import bcrypt from 'bcrypt'
import { rateLimit } from 'express-rate-limit'
import { prisma } from '../lib/prisma.js'
import { ApiError, asyncHandler, parseBody } from '../lib/api-error.js'
import { loginSchema, registerSchema } from '../schemas/auth.js'
import { signToken } from '../lib/jwt.js'
import { requireAuth } from '../middleware/auth.js'
import { publicUser } from '../lib/serializers.js'

export const authRouter = Router()

const SALT_ROUNDS = 10

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Try again in 15 minutes.' },
})

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const data = parseBody(registerSchema, req.body)

    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) {
      throw new ApiError(409, 'An account with that email already exists', {
        email: 'This email is already registered',
      })
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS)
    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        passwordHash,
        role: 'USER',
        isActive: true,
      },
    })

    res.status(201).json({ token: signToken(user.id), user: publicUser(user) })
  }),
)

authRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const data = parseBody(loginSchema, req.body)

    const user = await prisma.user.findUnique({ where: { email: data.email } })
    const passwordMatches = user
      ? await bcrypt.compare(data.password, user.passwordHash)
      : false

    if (!user || !passwordMatches) {
      throw new ApiError(401, 'Invalid email or password')
    }
    if (!user.isActive) {
      throw new ApiError(403, 'This account has been disabled. Contact an administrator.')
    }

    res.json({ token: signToken(user.id), user: publicUser(user) })
  }),
)

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user) {
      throw new ApiError(401, 'Account no longer exists')
    }

    res.json({ user: publicUser(user) })
  }),
)
