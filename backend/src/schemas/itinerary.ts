import { z } from 'zod'
import { nullableDate } from './fields.js'

const stopSchema = z.object({
  timeSlot: z.string().trim().min(1, 'Time slot is required').max(40),
  title: z.string().trim().min(1, 'Stop title is required').max(140),
  description: z.string().trim().max(2000).nullish(),
  estimatedCost: z.coerce.number().min(0, 'Cost cannot be negative').nullish(),
  sortOrder: z.coerce.number().int().min(0).optional(),
})

const daySchema = z.object({
  dayNumber: z.coerce.number().int().min(1, 'Day number must be 1 or higher'),
  dayDate: nullableDate,
  notes: z.string().trim().max(4000).nullish(),
  stops: z.array(stopSchema).max(50).optional(),
})

const itineraryFields = z.object({
  destinationId: z.string().min(1).optional(),
  destinationSlug: z.string().min(1).optional(),
  title: z.string().trim().min(1, 'Title is required').max(140),
  startingPoint: z.string().trim().max(140).nullish(),
  startDate: nullableDate,
  endDate: nullableDate,
  numTravelers: z.coerce
    .number()
    .int()
    .min(1, 'At least one traveller is required')
    .max(50, 'Traveller count is too high')
    .default(1),
  totalBudget: z.coerce.number().min(0, 'Budget cannot be negative').nullish(),
  status: z.enum(['draft', 'upcoming', 'completed']).default('draft'),
  days: z.array(daySchema).max(60).optional(),
})

export const createItinerarySchema = itineraryFields.refine(
  (value) => Boolean(value.destinationId || value.destinationSlug),
  { message: 'Choose a destination', path: ['destinationId'] },
)

export const updateItinerarySchema = itineraryFields.partial()

export type DayInput = z.infer<typeof daySchema>
export type StopInput = z.infer<typeof stopSchema>
