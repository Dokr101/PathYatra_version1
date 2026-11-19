import type { RequestHandler } from 'express'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * CSRF guard for a cookie-authenticated API.
 *
 * The session cookie is `SameSite=Strict`, which already keeps it off cross-site
 * form posts. This adds the other half: any state-changing request that *does*
 * carry an Origin must come from a site this API serves. Same-site-but-different
 * origin (a subdomain, or a browser that treats localhost ports as same-site)
 * and any future relaxations of SameSite are covered by the allowlist.
 *
 * Requests without an Origin header — curl, server-to-server, the test suite —
 * are allowed, since they cannot be produced by a victim's browser on their own.
 */
export function requireTrustedOrigin(allowedOrigins: string[]): RequestHandler {
  const allowed = new Set(allowedOrigins.map((origin) => origin.replace(/\/$/, '')))

  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) {
      next()
      return
    }

    const origin = req.headers.origin
    if (!origin) {
      next()
      return
    }

    if (allowed.has(origin.replace(/\/$/, ''))) {
      next()
      return
    }

    res.status(403).json({ error: 'Request blocked: untrusted origin' })
  }
}
