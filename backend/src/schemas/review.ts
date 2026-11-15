import { z } from 'zod'
import { nullableDate } from './fields.js'

export const createReviewSchema = z.object({
  destinationId: z.string().min(1, 'Choose a destination'),
  rating: z.coerce
    .number()
    .int('Rating must be a whole number')
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
  comment: z.string().trim().max(2000, 'Comment must be 2,000 characters or fewer').nullish(),
  travelDate: nullableDate,
})
