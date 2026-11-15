import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { verifyToken } from '../lib/jwt.js'
import { prisma } from '../lib/prisma.js'

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const token = header.slice('Bearer '.length).trim()
  if (!token) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  let userId: string
  try {
    userId = verifyToken(token).sub
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  prisma.user
    .findUnique({ where: { id: userId }, select: { id: true, role: true, isActive: true } })
    .then((user) => {
      if (!user) {
        res.status(401).json({ error: 'Account no longer exists' })
        return
      }
      if (!user.isActive) {
        res.status(403).json({ error: 'This account has been disabled' })
        return
      }
      req.userId = user.id
      req.userRole = user.role
      next()
    })
    .catch((error: Error) => next(error))
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
