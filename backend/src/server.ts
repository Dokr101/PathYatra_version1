import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import { env } from './lib/env.js'
import { prisma } from './lib/prisma.js'
import { errorHandler, notFoundHandler } from './lib/api-error.js'
import { authRouter } from './routes/auth.js'
import { destinationsRouter } from './routes/destinations.js'
import { favoritesRouter } from './routes/favorites.js'
import { itinerariesRouter } from './routes/itineraries.js'
import { reviewsRouter } from './routes/reviews.js'
import { adminRouter } from './routes/admin/index.js'

const app = express()

app.use(cors())
app.use(express.json({ limit: '1mb' }))

// Static assets: destination photos and the PathYatra logo.
const currentDir = path.dirname(fileURLToPath(import.meta.url))
app.use(express.static(path.join(currentDir, '..', 'public')))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRouter)
app.use('/api/destinations', destinationsRouter)
app.use('/api/itineraries', itinerariesRouter)
app.use('/api/favorites', favoritesRouter)
// Mounted at /api because it serves both /destinations/:slug/reviews and /reviews.
app.use('/api', reviewsRouter)

// Admin API: Bearer token + ADMIN/SUPER_ADMIN role required on every route.
app.use('/api/admin', adminRouter)

app.use(notFoundHandler)
app.use(errorHandler)

const server = app.listen(env.port, () => {
  console.log(`PathYatra API listening on http://localhost:${env.port}`)
})

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down.`)
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0))
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
