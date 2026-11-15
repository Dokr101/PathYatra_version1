import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { ApiError, asyncHandler } from '../lib/api-error.js'
import { param } from '../lib/params.js'
import { destinationInclude, serializeDestination } from '../lib/serializers.js'

export const destinationsRouter = Router()

/** Public catalogue: published destinations only. */
destinationsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const destinations = await prisma.destination.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { name: 'asc' },
      include: destinationInclude,
    })

    res.json(destinations.map(serializeDestination))
  }),
)

destinationsRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const destination = await prisma.destination.findFirst({
      where: { slug: param(req, 'slug'), status: 'PUBLISHED' },
      include: destinationInclude,
    })

    if (!destination) {
      throw new ApiError(404, 'Destination not found')
    }

    res.json(serializeDestination(destination))
  }),
)
