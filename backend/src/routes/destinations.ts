import { Router } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { ApiError, asyncHandler } from '../lib/api-error.js'
import { param } from '../lib/params.js'
import {
  destinationInclude,
  noRating,
  ratingSummaries,
  ratingSummary,
  serializeDestination,
} from '../lib/serializers.js'
import { listMeta, pagination, queryString, searchTerm } from '../lib/admin.js'

export const destinationsRouter = Router()

/** Upper bound for a free-text catalogue search; keeps the LIKE clause small. */
const MAX_QUERY_LENGTH = 80

/**
 * Public catalogue: published destinations only, one page at a time.
 *
 * The response is `{ items, total, page, pageSize, totalPages }`. `pageSize` is
 * capped at 100 by `pagination()`, so a single unauthenticated request can no
 * longer pull the whole table and every relation under it.
 *
 * Filters: `q` (name/province/district), `categoryId`, `province`.
 */
destinationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = pagination(req)
    const q = searchTerm(req).slice(0, MAX_QUERY_LENGTH)
    const categoryId = queryString(req, 'categoryId').trim()
    const province = queryString(req, 'province').trim()

    const where: Prisma.DestinationWhereInput = { status: 'PUBLISHED' }
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { province: { contains: q } },
        { district: { contains: q } },
      ]
    }
    if (categoryId) where.categoryId = categoryId
    if (province) where.province = { equals: province }

    const [total, destinations] = await prisma.$transaction([
      prisma.destination.count({ where }),
      prisma.destination.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: page.skip,
        take: page.take,
        include: destinationInclude,
      }),
    ])

    const ratings = await ratingSummaries(destinations.map((item) => item.id))
    res.json({
      items: destinations.map((item) => serializeDestination(item, ratings.get(item.id) ?? noRating)),
      ...listMeta(total, page),
    })
  }),
)

/**
 * Small, cheap selection for the homepage: the most-saved published
 * destinations. Fixed at six rows, so it never becomes a second unbounded list.
 */
destinationsRouter.get(
  '/featured',
  asyncHandler(async (_req, res) => {
    const items = await prisma.destination.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ favorites: { _count: 'desc' } }, { updatedAt: 'desc' }, { name: 'asc' }],
      take: 6,
      include: destinationInclude,
    })

    const ratings = await ratingSummaries(items.map((item) => item.id))
    res.json({ items: items.map((item) => serializeDestination(item, ratings.get(item.id) ?? noRating)) })
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

    res.json(serializeDestination(destination, await ratingSummary(destination.id)))
  }),
)
