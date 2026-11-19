// Must stay the first import: Sentry initialises before Express is loaded, so
// its instrumentation can wrap the framework. A no-op when SENTRY_DSN is unset.
import './lib/observability.js'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Prisma } from '@prisma/client'
import cors from 'cors'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import { env } from './lib/env.js'
import { logger } from './lib/logger.js'
import { prisma } from './lib/prisma.js'
import { errorHandler, notFoundHandler } from './lib/api-error.js'
import { flushErrorReporting } from './lib/observability.js'
import { requireTrustedOrigin } from './lib/csrf.js'
import { authRouter } from './routes/auth.js'
import { destinationsRouter } from './routes/destinations.js'
import { favoritesRouter } from './routes/favorites.js'
import { itinerariesRouter } from './routes/itineraries.js'
import { reviewsRouter } from './routes/reviews.js'
import { adminRouter } from './routes/admin/index.js'

const app = express()

/*
 * Money columns are Prisma Decimal. Decimal.js serialises to a string, which
 * would quietly change the API contract, so every response converts them back
 * to a number at the JSON boundary. Values are 2-decimal money, far inside
 * Number.MAX_SAFE_INTEGER, so nothing is lost here.
 */
app.set('json replacer', (_key: string, value: unknown) =>
  Prisma.Decimal.isDecimal(value) ? (value as Prisma.Decimal).toNumber() : value,
)

/*
 * Must be set before anything reads req.ip or req.protocol — the rate limiters,
 * the request logger and Helmet all do. With the correct hop count, the limiters
 * key on the real client address instead of the proxy's, and req.protocol
 * reflects X-Forwarded-Proto so HTTPS-only decisions behave behind TLS
 * termination. Left at 0, Express trusts no proxy, which is right for local dev.
 */
if (env.trustProxyHops > 0) {
  app.set('trust proxy', env.trustProxyHops)
}

// Only the configured site origins may call the API from a browser.
app.use(
  cors({
    origin(origin, callback) {
      // No Origin header: curl, server-to-server, same-origin static files.
      if (!origin) {
        callback(null, true)
        return
      }
      callback(null, env.allowedOrigins.includes(origin.replace(/\/$/, '')))
    },
    credentials: true,
  }),
)

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.open-meteo.com'],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
    // Destination photos are fetched by the site origin, not this one.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)

/** One line per request: id, method, path, status and duration. */
app.use((req, res, next) => {
  const headerId = req.headers['x-request-id']
  const requestId = typeof headerId === 'string' && headerId.length > 0 ? headerId : randomUUID()
  res.setHeader('x-request-id', requestId)
  const startedAt = Date.now()

  res.on('finish', () => {
    logger.info(
      {
        requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        ms: Date.now() - startedAt,
      },
      'request',
    )
  })

  next()
})

// A blunt ceiling for everything under /api; stricter limits sit on auth routes.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests. Try again in 15 minutes.' },
  }),
)

app.use(express.json({ limit: '1mb' }))

// Static assets: destination photos and the PathYatra logo.
const currentDir = path.dirname(fileURLToPath(import.meta.url))
app.use(express.static(path.join(currentDir, '..', 'public')))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

// Sessions are cookie-based, so state-changing requests must come from a site
// this API serves (see lib/csrf.ts).
app.use('/api', requireTrustedOrigin(env.allowedOrigins))

app.use('/api/auth', authRouter)
app.use('/api/destinations', destinationsRouter)
app.use('/api/itineraries', itinerariesRouter)
app.use('/api/favorites', favoritesRouter)
// Mounted at /api because it serves both /destinations/:slug/reviews and /reviews.
app.use('/api', reviewsRouter)

// Admin API: session cookie (or Bearer token) + ADMIN/SUPER_ADMIN role on every route.
app.use('/api/admin', adminRouter)

app.use(notFoundHandler)
app.use(errorHandler)

const server = app.listen(env.port, () => {
  logger.info(
    { port: env.port, origins: env.allowedOrigins, trustProxyHops: env.trustProxyHops },
    'PathYatra API listening',
  )
})

server.on('error', (error) => {
  logger.error({ err: error }, 'API server error')
  process.exitCode = 1
})

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down')
  server.close(() => {
    void Promise.allSettled([flushErrorReporting(), prisma.$disconnect()]).finally(() => {
      logger.info('server closed')
      process.exit(0)
    })
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
