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
    .max(80, 'Name must be 80 characters or fewer'),
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
