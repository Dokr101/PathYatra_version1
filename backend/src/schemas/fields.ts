import { z } from 'zod'

/** Treats an empty string or null as "not provided" and coerces to a Date. */
export const optionalDate = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.date().optional(),
)

/** Treats an empty string as null and coerces to a Date. */
export const nullableDate = z.preprocess(
  (value) => (value === '' || value === null ? null : value),
  z.coerce.date().nullish(),
)
