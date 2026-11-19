import pino from 'pino'
import { env } from './env.js'

/** One JSON logger for the process; request lines are written by the access middleware. */
export const logger = pino({
  level: env.logLevel,
  base: { service: 'pathyatra-api' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'err.config.headers.authorization',
      'err.config.headers.cookie',
    ],
    censor: '[redacted]',
  },
})
