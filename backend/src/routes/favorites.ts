import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { ApiError, asyncHandler } from '../lib/api-error.js'
import { param } from '../lib/params.js'
import { requireAuth } from '../middleware/auth.js'

export const favoritesRouter = Router()

favoritesRouter.use(requireAuth)

favoritesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.userId! },
      include: {
        destination: {
          include: { category: true },
        },
      },
      orderBy: { destination: { name: 'asc' } },
    })

    res.json(favorites)
  }),
)

favoritesRouter.post(
  '/:destinationId',
  asyncHandler(async (req, res) => {
    const destination = await prisma.destination.findUnique({
      where: { id: param(req, 'destinationId') },
      select: { id: true },
    })

    if (!destination) {
      throw new ApiError(404, 'Destination not found')
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_destinationId: {
          userId: req.userId!,
          destinationId: destination.id,
        },
      },
      include: { destination: { include: { category: true } } },
    })

    if (existing) {
      res.json(existing)
      return
    }

    const favorite = await prisma.favorite.create({
      data: { userId: req.userId!, destinationId: destination.id },
      include: { destination: { include: { category: true } } },
    })

    res.status(201).json(favorite)
  }),
)

favoritesRouter.delete(
  '/:destinationId',
  asyncHandler(async (req, res) => {
    await prisma.favorite.deleteMany({
      where: { userId: req.userId!, destinationId: param(req, 'destinationId') },
    })

    res.status(204).send()
  }),
)
