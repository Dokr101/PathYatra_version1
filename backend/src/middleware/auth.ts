import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { ApiError } from '../lib/api-error.js'
import { readAuthCookie } from '../lib/auth-cookie.js'
import { verifyToken } from '../lib/jwt.js'
import { prisma } from '../lib/prisma.js'

/**
 * Browser sessions authenticate with the HttpOnly cookie. The Bearer header is
 * still accepted for scripts and API clients; it is never used by the web app,
 * so an XSS has nothing readable to send.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization
  const bearer = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
  const token = bearer || readAuthCookie(req)

  if (!token) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  let userId: string
  let tokenVersion: number
  try {
    const payload = verifyToken(token)
    userId = payload.sub
    tokenVersion = payload.ver
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  prisma.user
    .findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true, tokenVersion: true },
    })
    .then((user) => {
      if (!user) {
        res.status(401).json({ error: 'Account no longer exists' })
        return
      }
      if (!user.isActive) {
        res.status(403).json({ error: 'This account has been disabled' })
        return
      }
      // Bumped on password change, so every older token stops working.
      if (user.tokenVersion !== tokenVersion) {
        res.status(401).json({ error: 'This session has ended. Sign in again.' })
        return
      }
      req.userId = user.id
      req.userRole = user.role
      next()
    })
    .catch((error: Error) => next(error))
}

/**
 * The account id `requireAuth` verified. Routes call this instead of asserting
 * `req.userId`, so a handler mounted without the middleware fails loudly with a
 * 401 instead of handing `undefined` to Prisma.
 */
export function getUserId(req: Request): string {
  const userId = req.userId
  if (!userId) throw new ApiError(401, 'Authentication required')
  return userId
}

export const requireAdmin: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.userRole !== 'ADMIN' && req.userRole !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Administrator access required' })
    return
  }
  next()
}
