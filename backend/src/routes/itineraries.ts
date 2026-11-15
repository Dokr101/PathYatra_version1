import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { ApiError, asyncHandler, parseBody } from '../lib/api-error.js'
import { param } from '../lib/params.js'
import { requireAuth } from '../middleware/auth.js'
import {
  createItinerarySchema,
  updateItinerarySchema,
  type DayInput,
} from '../schemas/itinerary.js'
import { itineraryInclude } from '../lib/serializers.js'

export const itinerariesRouter = Router()

itinerariesRouter.use(requireAuth)

async function resolveDestinationId(input: {
  destinationId?: string
  destinationSlug?: string
}): Promise<string | undefined> {
  if (input.destinationId) {
    const destination = await prisma.destination.findUnique({
      where: { id: input.destinationId },
      select: { id: true },
    })
    if (destination) return destination.id
  }

  if (input.destinationSlug) {
    const destination = await prisma.destination.findUnique({
      where: { slug: input.destinationSlug },
      select: { id: true },
    })
    if (destination) return destination.id
  }

  if (input.destinationId || input.destinationSlug) {
    throw new ApiError(400, 'Validation failed', { destinationId: 'Destination not found' })
  }

  return undefined
}

function buildDays(days: DayInput[]) {
  return days.map((day) => ({
    dayNumber: day.dayNumber,
    dayDate: day.dayDate ?? null,
    notes: day.notes ?? null,
    stops: day.stops?.length
      ? {
          create: day.stops.map((stop, index) => ({
            timeSlot: stop.timeSlot,
            title: stop.title,
            description: stop.description ?? null,
            estimatedCost: stop.estimatedCost ?? null,
            sortOrder: stop.sortOrder ?? index,
          })),
        }
      : undefined,
  }))
}

itinerariesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const itineraries = await prisma.itinerary.findMany({
      where: { userId: req.userId! },
      orderBy: [{ startDate: 'desc' }, { title: 'asc' }],
      include: itineraryInclude,
    })

    res.json(itineraries)
  }),
)

itinerariesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const itinerary = await prisma.itinerary.findFirst({
      where: { id: param(req, 'id'), userId: req.userId! },
      include: itineraryInclude,
    })

    if (!itinerary) {
      throw new ApiError(404, 'Itinerary not found')
    }

    res.json(itinerary)
  }),
)

itinerariesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = parseBody(createItinerarySchema, req.body)
    const destinationId = await resolveDestinationId(data)

    if (!destinationId) {
      throw new ApiError(400, 'Validation failed', { destinationId: 'Choose a destination' })
    }

    const itinerary = await prisma.itinerary.create({
      data: {
        userId: req.userId!,
        destinationId,
        title: data.title,
        startingPoint: data.startingPoint ?? null,
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        numTravelers: data.numTravelers,
        totalBudget: data.totalBudget ?? null,
        status: data.status,
        days: data.days?.length ? { create: buildDays(data.days) } : undefined,
      },
      include: itineraryInclude,
    })

    res.status(201).json(itinerary)
  }),
)

const updateItinerary = asyncHandler(async (req, res) => {
  const data = parseBody(updateItinerarySchema, req.body)

  const existing = await prisma.itinerary.findFirst({
    where: { id: param(req, 'id'), userId: req.userId! },
    select: { id: true },
  })

  if (!existing) {
    throw new ApiError(404, 'Itinerary not found')
  }

  const destinationId = await resolveDestinationId(data)

  const itinerary = await prisma.$transaction(async (tx) => {
    if (data.days !== undefined) {
      await tx.itineraryDay.deleteMany({ where: { itineraryId: existing.id } })
    }

    return tx.itinerary.update({
      where: { id: existing.id },
      data: {
        ...(destinationId ? { destinationId } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.startingPoint !== undefined ? { startingPoint: data.startingPoint ?? null } : {}),
        ...(data.startDate !== undefined ? { startDate: data.startDate ?? null } : {}),
        ...(data.endDate !== undefined ? { endDate: data.endDate ?? null } : {}),
        ...(data.numTravelers !== undefined ? { numTravelers: data.numTravelers } : {}),
        ...(data.totalBudget !== undefined ? { totalBudget: data.totalBudget ?? null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.days?.length ? { days: { create: buildDays(data.days) } } : {}),
      },
      include: itineraryInclude,
    })
  })

  res.json(itinerary)
})

itinerariesRouter.patch('/:id', updateItinerary)
itinerariesRouter.put('/:id', updateItinerary)

itinerariesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await prisma.itinerary.deleteMany({
      where: { id: param(req, 'id'), userId: req.userId! },
    })

    if (result.count === 0) {
      throw new ApiError(404, 'Itinerary not found')
    }

    res.status(204).send()
  }),
)
