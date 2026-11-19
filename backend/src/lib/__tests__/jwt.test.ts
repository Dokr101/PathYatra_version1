import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'
import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'

/**
 * Token tests: the sign/verify round trip and the two rules the middleware
 * enforces with it — a disabled account is refused, and a token whose
 * `tokenVersion` is behind the account's is refused. That second rule is what
 * makes password changes and admin status toggles sign every device out.
 *
 * env.ts refuses to load without a real secret, and CI has no backend/.env, so
 * provide test values when they are absent. dotenv does not override variables
 * that are already set, so a developer's .env still wins locally.
 */
process.env.JWT_SECRET ??= 'test-only-secret-0123456789abcdef0123456789abcdef'
process.env.ADMIN_SEED_PASSWORD ??= 'test-only-bootstrap-password'

const { signToken, verifyToken } = await import('../jwt.js')
const { requireAuth } = await import('../../middleware/auth.js')
const { prisma } = await import('../prisma.js')

type StubbedUser = {
  id: string
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
  isActive: boolean
  tokenVersion: number
}

/**
 * Prisma model delegates are resolved through a proxy, so `mock.method` cannot
 * replace `findUnique`. Swapping the `user` property on the client instance is
 * enough for the middleware, and the original delegate is restored after each
 * test.
 */
const originalUser = prisma.user

function stubUser(user: StubbedUser | null) {
  Object.defineProperty(prisma, 'user', {
    configurable: true,
    value: { findUnique: async () => user },
  })
}

afterEach(() => {
  Object.defineProperty(prisma, 'user', { configurable: true, value: originalUser })
})

function requestWithToken(token?: string): Request {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  } as unknown as Request
}

function fakeResponse(): Response & { statusCode: number; body: unknown } {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(payload: unknown) {
      res.body = payload
      return res
    },
  }
  return res as unknown as Response & { statusCode: number; body: unknown }
}

/** requireAuth resolves its database lookup in a promise chain. */
const flush = () => new Promise((resolve) => setImmediate(resolve))

async function runMiddleware(token?: string) {
  const req = requestWithToken(token)
  const res = fakeResponse()
  let nextCalled = false
  requireAuth(req, res, () => {
    nextCalled = true
  })
  await flush()
  return { req, res, nextCalled }
}

test('a signed token verifies back to the same subject and version', () => {
  const token = signToken('user-123')
  const payload = verifyToken(token)

  assert.equal(payload.sub, 'user-123')
  assert.equal(payload.ver, 0, 'tokens minted without a version are treated as version 0')
  assert.notEqual(signToken('user-123', 7), token, 'the version is part of the signed payload')
  assert.equal(verifyToken(signToken('user-123', 7)).ver, 7)
})

test('only HS256 is accepted; other algorithms are refused', () => {
  const secret = process.env.JWT_SECRET!

  const hs384 = jwt.sign({ sub: 'user-123', ver: 0 }, secret, { algorithm: 'HS384' })
  assert.throws(() => verifyToken(hs384), /invalid algorithm/i)

  // alg: none is the classic bypass; it must never reach the payload checks.
  const unsigned = jwt.sign({ sub: 'user-123', ver: 0 }, '', { algorithm: 'none' })
  assert.throws(() => verifyToken(unsigned))
})

test('a tampered token is rejected rather than decoded', () => {
  const token = signToken('user-123')
  assert.throws(() => verifyToken(`${token}tampered`))
  assert.throws(() => verifyToken('not-a-token'))
})

test('the middleware accepts a token whose version matches the account', async () => {
  stubUser({ id: 'user-123', role: 'USER', isActive: true, tokenVersion: 3 })
  const { res, req, nextCalled } = await runMiddleware(signToken('user-123', 3))

  assert.equal(nextCalled, true)
  assert.equal(res.statusCode, 0)
  assert.equal(req.userId, 'user-123')
  assert.equal(req.userRole, 'USER')
})

test('the middleware rejects a token whose version is stale', async () => {
  // Password changed or admin re-enabled the account after this token was minted.
  stubUser({ id: 'user-123', role: 'USER', isActive: true, tokenVersion: 4 })
  const { res, nextCalled } = await runMiddleware(signToken('user-123', 3))

  assert.equal(nextCalled, false)
  assert.equal(res.statusCode, 401)
  assert.deepEqual(res.body, { error: 'This session has ended. Sign in again.' })
})

test('the middleware rejects a disabled account even with a current token', async () => {
  stubUser({ id: 'user-123', role: 'USER', isActive: false, tokenVersion: 2 })
  const { res, nextCalled } = await runMiddleware(signToken('user-123', 2))

  assert.equal(nextCalled, false)
  assert.equal(res.statusCode, 403)
  assert.deepEqual(res.body, { error: 'This account has been disabled' })
})

test('the middleware rejects missing, invalid and deleted-account tokens', async () => {
  const none = await runMiddleware()
  assert.equal(none.nextCalled, false)
  assert.equal(none.res.statusCode, 401)

  const invalid = await runMiddleware('not-a-token')
  assert.equal(invalid.res.statusCode, 401)
  assert.deepEqual(invalid.res.body, { error: 'Invalid or expired token' })

  stubUser(null)
  const deleted = await runMiddleware(signToken('ghost'))
  assert.equal(deleted.res.statusCode, 401)
  assert.deepEqual(deleted.res.body, { error: 'Account no longer exists' })
})
