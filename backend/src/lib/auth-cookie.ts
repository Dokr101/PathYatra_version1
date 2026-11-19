import type { Request, Response } from 'express'

/**
 * The session lives in an HttpOnly cookie, never in JavaScript-readable storage:
 * XSS can act as the user while the page is open, but it cannot read or exfiltrate
 * the token. `SameSite=Strict` keeps it off cross-site requests entirely.
 *
 * `Secure` is on in production only — the Vite dev server and API run over plain
 * HTTP on localhost, where a Secure cookie would be dropped by the browser.
 */
export const AUTH_COOKIE = 'pathyatra_session'

/** Matches the JWT lifetime in lib/jwt.ts (24h). */
const MAX_AGE_MS = 24 * 60 * 60 * 1000

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
  }
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), maxAge: MAX_AGE_MS })
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, cookieOptions())
}

/**
 * Reads one cookie without pulling in a parsing dependency. Express only ships
 * the writer, and the header grammar here is simple: `a=1; b=2`.
 */
export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie
  if (!header) return null

  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator === -1) continue
    if (part.slice(0, separator).trim() !== name) continue
    const value = part.slice(separator + 1).trim()
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }
  return null
}

export function readAuthCookie(req: Request): string | null {
  return readCookie(req, AUTH_COOKIE)
}
