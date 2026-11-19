import 'dotenv/config'
import { readFileSync } from 'node:fs'

/**
 * Secrets must be real before the API will start.
 *
 * The shipped `.env.example` deliberately holds unusable placeholders. If one of
 * them reaches a running process, the deployment is using a value that is public
 * in the repository — a forged-token or known-password incident — so boot fails
 * loudly instead of serving traffic.
 */
const FALLBACK_PLACEHOLDERS = {
  JWT_SECRET: 'replace-with-a-random-string-of-at-least-32-characters',
  ADMIN_SEED_PASSWORD: 'use-a-long-random-password',
} as const

const MIN_JWT_SECRET_LENGTH = 32
const MIN_ADMIN_PASSWORD_LENGTH = 12

/**
 * Placeholders from backend/.env.example, read from the file when it is present
 * so the check cannot drift away from the template, with the fallbacks above for
 * deployments that only ship `dist/`.
 */
function readExamplePlaceholders(): Record<string, string> {
  const found: Record<string, string> = { ...FALLBACK_PLACEHOLDERS }
  try {
    const text = readFileSync(new URL('../../.env.example', import.meta.url), 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
      if (!match) continue
      const [, key, raw] = match
      if (key !== 'JWT_SECRET' && key !== 'ADMIN_SEED_PASSWORD') continue
      const value = raw.trim().replace(/^["']|["']$/g, '')
      if (value) found[key] = value
    }
  } catch {
    // No template next to the build: the fallbacks still guard the known values.
  }
  return found
}

const EXAMPLE_PLACEHOLDERS = readExamplePlaceholders()

function readJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET is missing or shorter than ${MIN_JWT_SECRET_LENGTH} characters. Set it in backend/.env (generate one with: openssl rand -hex 32).`,
    )
  }
  if (secret === EXAMPLE_PLACEHOLDERS.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET is still the placeholder from backend/.env.example. Generate a real secret with: openssl rand -hex 32 — then restart the API and treat any token signed with the old value as compromised.',
    )
  }
  return secret
}

/**
 * Only the `seed:admin` script needs this value, but it is validated at boot too:
 * a copied example file must never be able to bootstrap an admin whose password is
 * printed in the repository.
 */
function assertAdminSeedPasswordIsReal(): void {
  const password = process.env.ADMIN_SEED_PASSWORD?.trim()
  if (!password) return

  if (password === EXAMPLE_PLACEHOLDERS.ADMIN_SEED_PASSWORD) {
    throw new Error(
      'ADMIN_SEED_PASSWORD is still the placeholder from backend/.env.example. Set a unique bootstrap password (12+ characters) before starting the API.',
    )
  }
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(
      `ADMIN_SEED_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters. Generate one with: openssl rand -base64 24`,
    )
  }
}

/**
 * How many reverse proxies sit in front of the API (nginx, ALB, CDN).
 *
 * Express defaults to trusting none, so behind a proxy every request would look
 * like it came from the proxy's own address: the rate limiters would throttle
 * the whole site as one client, and `req.protocol` would read as HTTP even when
 * TLS terminated upstream. Declaring the hop count is what makes req.ip, the
 * rate limits and the Secure-cookie/HSTS decisions correct.
 *
 * 0 (default) means the API is reached directly, which is the local setup.
 */
function readTrustProxyHops(): number {
  const raw = process.env.TRUST_PROXY_HOPS?.trim()
  if (!raw) return 0

  const hops = Number(raw)
  if (!Number.isInteger(hops) || hops < 0 || hops > 10) {
    throw new Error(
      'TRUST_PROXY_HOPS must be an integer between 0 and 10. Use 0 when nothing sits in front of the API, 1 for a single nginx/ALB layer.',
    )
  }
  return hops
}

function readPort(): number {
  const parsed = Number(process.env.PORT)
  if (Number.isInteger(parsed) && parsed > 0 && parsed < 65_536) return parsed
  return 3001
}

/** Comma-separated browser origins allowed to call the API, e.g. the Vite dev server. */
function readAllowedOrigins(): string[] {
  const configured = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)
  return configured.length > 0 ? configured : ['http://localhost:3000']
}

function readLogLevel(): string {
  const level = process.env.LOG_LEVEL?.trim().toLowerCase()
  return level && ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'].includes(level)
    ? level
    : 'info'
}

export const env = {
  port: readPort(),
  trustProxyHops: readTrustProxyHops(),
  jwtSecret: readJwtSecret(),
  allowedOrigins: readAllowedOrigins(),
  logLevel: readLogLevel(),
  /** Empty disables error reporting entirely (no client, no network calls). */
  sentryDsn: process.env.SENTRY_DSN?.trim() ?? '',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY?.trim() ?? '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET?.trim() ?? '',
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER?.trim() || 'pathyatra',
}

// Runs at import time: an unusable bootstrap password stops the process here.
assertAdminSeedPasswordIsReal()
