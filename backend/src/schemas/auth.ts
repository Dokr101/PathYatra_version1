import { z } from 'zod'

const emailField = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.string().email('Enter a valid email address'),
)

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Enter your full name')
    .max(80, 'Name must be 80 characters or fewer')
    // Letters in any script, spaces, hyphens, apostrophes, commas and full
    // stops. Digits and other symbols are rejected, not silently stripped.
    .regex(
      /^[\p{L}\p{M}][\p{L}\p{M} .,'’-]*$/u,
      'Use letters only — no numbers or symbols in your name',
    ),
  email: emailField,
  password: z
    .string()
    .min(8, 'Use at least 8 characters for the password')
    .regex(/[A-Z]/, 'Add at least one uppercase letter')
    .regex(/[0-9]/, 'Add at least one number')
    .regex(/[^A-Za-z0-9]/, 'Add at least one symbol')
    .max(72, 'Password must be 72 characters or fewer'),
})

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
})

/** Same policy as registration, so a changed password is never weaker than a new one. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters for the password')
      .regex(/[A-Z]/, 'Add at least one uppercase letter')
      .regex(/[0-9]/, 'Add at least one number')
      .regex(/[^A-Za-z0-9]/, 'Add at least one symbol')
      .max(72, 'Password must be 72 characters or fewer'),
    confirmPassword: z.string().min(1, 'Confirm the new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })
