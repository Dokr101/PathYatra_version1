import jwt from 'jsonwebtoken'
import { env } from './env.js'

const TOKEN_TTL = '7d'

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: TOKEN_TTL })
}

export function verifyToken(token: string): { sub: string } {
  const payload = jwt.verify(token, env.jwtSecret)
  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw new Error('Invalid token payload')
  }
  return { sub: payload.sub }
}
