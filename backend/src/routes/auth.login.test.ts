import assert from 'node:assert/strict'
import test from 'node:test'
import bcrypt from 'bcrypt'
import { verifyPassword } from './auth.js'
import { DUMMY_PASSWORD_HASH, SALT_ROUNDS } from '../lib/password.js'

/**
 * Timing test for the login password check (B-03).
 *
 * The two branches the endpoint can take are:
 *   - the email exists  → bcrypt.compare(attempt, user.passwordHash)
 *   - the email is unknown → bcrypt.compare(attempt, DUMMY_PASSWORD_HASH)
 *
 * If the second ever stopped running bcrypt, its median would collapse to a few
 * milliseconds while the first stayed at ~60 ms — far outside the 20 ms budget
 * asserted here, so the test fails rather than silently letting the oracle back in.
 *
 * `npm test` pins BCRYPT_ROUNDS=10 so 25 interleaved bcrypt pairs stay ~3 s
 * instead of ~12 s; the comparison under test is the parity between the two
 * branches, which holds at any cost.
 */

/** What a real account's stored hash looks like: same cost as the API uses. */
const KNOWN_ACCOUNT_HASH = bcrypt.hashSync('Correct#Horse1', SALT_ROUNDS)
const ATTEMPT = 'Wrong#Horse1'
const RUNS = 25
const MAX_MEDIAN_GAP_MS = 20

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

test('unknown email costs the same as a wrong password', async () => {
  const knownAccount: number[] = []
  const unknownAccount: number[] = []

  // Interleaved, so CPU frequency drift and GC pauses hit both branches equally.
  for (let run = 0; run < RUNS; run += 1) {
    let started = performance.now()
    assert.equal(await verifyPassword(ATTEMPT, KNOWN_ACCOUNT_HASH), false)
    knownAccount.push(performance.now() - started)

    started = performance.now()
    assert.equal(await verifyPassword(ATTEMPT, undefined), false)
    unknownAccount.push(performance.now() - started)
  }

  const knownMedian = median(knownAccount)
  const unknownMedian = median(unknownAccount)
  const gap = Math.abs(knownMedian - unknownMedian)

  assert.ok(
    gap < MAX_MEDIAN_GAP_MS,
    `timing gap between known and unknown email is ${gap.toFixed(1)} ms (limit ${MAX_MEDIAN_GAP_MS} ms)`,
  )
  // Both branches must have done real bcrypt work; a skipped compare would be ~0 ms.
  assert.ok(unknownMedian > 5, `unknown-email branch returned in ${unknownMedian.toFixed(1)} ms — bcrypt was skipped`)
})

test('the dummy hash is a real bcrypt hash at the configured cost and never matches', async () => {
  // A decoy left at an old cost would re-open the enumeration oracle.
  assert.equal(bcrypt.getRounds(DUMMY_PASSWORD_HASH), SALT_ROUNDS)
  assert.match(DUMMY_PASSWORD_HASH, new RegExp(`^\\$2[aby]\\$${SALT_ROUNDS}\\$[./A-Za-z0-9]{53}$`))
  assert.equal(await verifyPassword('anything-at-all', null), false)
  assert.equal(await verifyPassword('anything-at-all', DUMMY_PASSWORD_HASH), false)
})
