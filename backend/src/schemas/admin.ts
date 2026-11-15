import { z } from 'zod'

const text = (max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().max(max, `Keep this under ${max} characters`).nullable().optional(),
  )

const optionalDate = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? null : value),
  z.coerce.date().nullable().optional(),
)

const optionalNumber = (min: number, max: number, label: string) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : Number(value)),
    z
      .number()
      .min(min, `${label} must be at least ${min}`)
      .max(max, `${label} must be at most ${max}`)
      .nullable()
      .optional(),
  )

const status = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])

export const categorySchema = z.object({
  name: z.string().trim().min(2, 'Enter a category name').max(60),
  slug: text(80),
  description: text(400),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
  isActive: z.coerce.boolean().optional(),
})

export const destinationSchema = z.object({
  name: z.string().trim().min(2, 'Enter a destination name').max(120),
  slug: text(100),
  categoryId: z.string().min(1, 'Choose a category'),
  province: text(60),
  district: text(60),
  shortDescription: text(400),
  overview: text(8000),
  highlights: text(4000),
  localFood: text(3000),
  travelEssentials: text(4000),
  bestSeason: text(200),
  recommendedDurationDays: optionalNumber(1, 60, 'Duration'),
  difficultyLevel: z.enum(['easy', 'moderate', 'challenging', 'difficult']).optional(),
  costPerPersonPerDay: optionalNumber(0, 1_000_000, 'Cost'),
  latitude: optionalNumber(-90, 90, 'Latitude'),
  longitude: optionalNumber(-180, 180, 'Longitude'),
  imagePath: text(500),
  status: status.optional(),
})

export const activitySchema = z.object({
  destinationId: z.string().min(1, 'Choose a destination'),
  name: z.string().trim().min(2, 'Enter a name').max(120),
  type: z.enum(['ACTIVITY', 'ATTRACTION']).optional(),
  description: text(2000),
  durationHours: optionalNumber(0, 240, 'Duration'),
  costEstimate: optionalNumber(0, 1_000_000, 'Estimated cost'),
  costUpdatedAt: optionalDate,
  difficulty: text(60),
  bestSeason: text(120),
  status: status.optional(),
})

export const placeSchema = z.object({
  destinationId: z.string().min(1, 'Choose a destination'),
  name: z.string().trim().min(2, 'Enter a name').max(120),
  type: z.enum(['HOTEL', 'RESTAURANT']).optional(),
  description: text(2000),
  address: text(200),
  phone: text(40),
  website: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().url('Enter a valid URL').max(300).nullable().optional(),
  ),
  priceRange: text(60),
  amenities: text(1000),
  latitude: optionalNumber(-90, 90, 'Latitude'),
  longitude: optionalNumber(-180, 180, 'Longitude'),
  status: status.optional(),
})

export const templateSchema = z.object({
  destinationId: text(60),
  title: z.string().trim().min(2, 'Enter a template title').max(140),
  slug: text(100),
  summary: text(2000),
  difficulty: text(60),
  durationDays: z.coerce.number().int().min(1, 'At least one day').max(60),
  estimatedCost: optionalNumber(0, 10_000_000, 'Estimated cost'),
  status: status.optional(),
})

const stopSchema = z.object({
  id: z.string().optional(),
  timeSlot: text(40),
  title: z.string().trim().min(1, 'Each stop needs a title').max(140),
  description: text(1000),
  estimatedCost: optionalNumber(0, 1_000_000, 'Estimated cost'),
})

const daySchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, 'Each day needs a title').max(140),
  description: text(2000),
  stops: z.array(stopSchema).max(30).optional(),
})

export const templateDaysSchema = z.object({
  days: z.array(daySchema).min(1, 'Add at least one day').max(60),
})

export const travelInfoSchema = z.object({
  destinationId: z.string().min(1, 'Choose a destination'),
  title: z.string().trim().min(2, 'Enter a title').max(140),
  category: text(60),
  content: z.string().trim().min(5, 'Add the information travellers need').max(5000),
  sourceName: text(120),
  sourceUrl: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().url('Enter a valid source URL').max(500).nullable().optional(),
  ),
  lastVerifiedAt: optionalDate,
  validFrom: optionalDate,
  validUntil: optionalDate,
  statusLabel: z.enum(['VERIFIED', 'ESTIMATE', 'GENERAL_GUIDANCE']).optional(),
  status: status.optional(),
})

export const reviewModerationSchema = z.object({
  status: z.enum(['APPROVED', 'HIDDEN']),
  moderationNote: text(500),
})

export const userStatusSchema = z.object({
  isActive: z.boolean(),
})

export const userRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']),
})

export const settingsSchema = z.object({
  siteName: z.string().trim().min(2).max(80),
  contactEmail: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().email('Enter a valid email').nullable().optional(),
  ),
  contactPhone: text(40),
  featuredDestinationIds: z.array(z.string()).max(12).optional(),
})

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your name').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
})

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters')
      .regex(/[A-Z]/, 'Add at least one uppercase letter')
      .regex(/[0-9]/, 'Add at least one number')
      .regex(/[^A-Za-z0-9]/, 'Add at least one symbol')
      .max(72, 'Password must be 72 characters or fewer'),
    confirmPassword: z.string().min(1, 'Confirm the new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const mediaUpdateSchema = z.object({
  destinationId: text(60),
  altText: text(200),
  caption: text(300),
  credit: text(160),
  isCover: z.coerce.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
})

export const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
})
