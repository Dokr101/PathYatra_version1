import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { Prisma } from '@prisma/client'
import multer from 'multer'
import { z } from 'zod'
import { logger } from './logger.js'
import { captureException } from './observability.js'

export class ApiError extends Error {
  status: number
  fields?: Record<string, string>

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

export function parseBody<Schema extends z.ZodType>(
  schema: Schema,
  body: unknown,
): z.infer<Schema> {
  const result = schema.safeParse(body ?? {})

  if (!result.success) {
    const fields: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const key = issue.path.length > 0 ? issue.path.join('.') : '_'
      if (!fields[key]) fields[key] = issue.message
    }
    throw new ApiError(400, 'Validation failed', fields)
  }

  return result.data
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>

export function asyncHandler(handler: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next)
  }
}

/**
 * Nothing matched. The body is deliberately static: the requested URL is
 * attacker-controlled, so echoing it back invites reflected XSS in anything
 * that renders this JSON. The attempt goes to the log instead, where pino
 * escapes it.
 */
export function notFoundHandler(req: Request, res: Response) {
  logger.info({ method: req.method, path: req.originalUrl }, 'unmatched route')
  res.status(404).json({ error: 'Not found' })
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: err.message,
      ...(err.fields ? { fields: err.fields } : {}),
    })
    return
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Each image must be 5 MB or smaller'
        : err.code === 'LIMIT_FILE_COUNT'
          ? 'Upload at most 10 images at a time'
          : `Upload failed: ${err.message}`
    res.status(400).json({ error: message, fields: { images: message } })
    return
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = err.meta?.target
      const targetName = Array.isArray(target) ? target.join(', ') : String(target ?? 'value')
      res.status(409).json({
        error: 'That value is already in use',
        fields: { [targetName]: 'Already exists' },
      })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Not found' })
      return
    }
  }

  // Sentry groups the failure; the log keeps the same error in the local stream
  // (and in the container/host logs) with pino's redaction rules applied.
  captureException(err, { method: req.method, path: req.originalUrl })
  logger.error({ err }, 'unhandled error')
  res.status(500).json({ error: 'Internal server error' })
}
