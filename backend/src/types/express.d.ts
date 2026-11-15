import 'express'
import type { UserRole } from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      userId?: string
      userRole?: UserRole
    }
  }
}

export {}
