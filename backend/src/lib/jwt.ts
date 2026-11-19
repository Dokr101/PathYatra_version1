import jwt from 'jsonwebtoken'
import { env } from './env.js'

/** Short session: a leaked token stops working within a day. */
const TOKEN_TTL = '24h'

/**
 * HS256 only, on both sides. Pinning the algorithm on verify stops a token
 * signed with a different alg (including asymmetric ones, where the shared
 * secret could be interpreted as a public key) from ever being considered.
 */
const JWT_ALGORITHM = 'HS256' as const

export function signToken(userId: string, tokenVersion = 0): string {
  return jwt.sign({ sub: userId, ver: tokenVersion }, env.jwtSecret, {
    expiresIn: TOKEN_TTL,
    algorithm: JWT_ALGORITHM,
  })
}

export function verifyToken(token: string): { sub: string; ver: number } {
  const payload = jwt.verify(token, env.jwtSecret, { algorithms: [JWT_ALGORITHM] })
  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw new Error('Invalid token payload')
  }
  // Tokens minted before tokenVersion existed are treated as version 0.
  const ver = typeof payload.ver === 'number' ? payload.ver : 0
  return { sub: payload.sub, ver }
}
