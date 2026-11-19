import * as Sentry from '@sentry/node'
import { env } from './env.js'

/**
 * Error reporting for the API.
 *
 * With no `SENTRY_DSN` nothing is initialised: no client, no network calls, and
 * `captureException` is a no-op — local development and tests stay offline.
 *
 * With a DSN, unhandled errors are grouped in Sentry, tagged with the
 * environment (and a release when `SENTRY_RELEASE` is set), and 10% of requests
 * are traced through the Express integration.
 */
export const sentryEnabled = env.sentryDsn.length > 0

if (sentryEnabled) {
  Sentry.init({
    dsn: env.sentryDsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: 0.1,
    // Sentry 11 replaced sendDefaultPii with per-category collection. Nothing
    // identifying leaves the process: no cookies, headers, bodies, query strings
    // or user identity — only the error, the environment and the extra context
    // this module passes explicitly.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    integrations: [Sentry.expressIntegration()],
  })
}

/**
 * Report a caught error with a little non-identifying context. The request path
 * is enough to find the route; headers, cookies and bodies are deliberately not
 * attached.
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!sentryEnabled) return
  Sentry.captureException(error, context ? { extra: context } : undefined)
}

/** Let queued events leave the process before shutdown. */
export function flushErrorReporting(timeoutMs = 2000): Promise<boolean> {
  if (!sentryEnabled) return Promise.resolve(true)
  return Sentry.flush(timeoutMs)
}
