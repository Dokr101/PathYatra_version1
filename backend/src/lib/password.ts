import { randomBytes } from 'node:crypto'
import bcrypt from 'bcrypt'

/**
 * Single source of truth for password hashing.
 *
 * bcrypt's cost factor is the only knob that decides how expensive a stolen hash
 * dump is to crack: each step doubles the work, so moving from the old cost 10 to
 * 12 makes an offline attack four times slower. OWASP's Password Storage Cheat
 * Sheet puts the floor at 12 for bcrypt, which is what `BCRYPT_ROUNDS` defaults
 * to here.
 *
 * The value is read once at boot so registration, password changes and the admin
 * seeder cannot drift apart. Lower it only for tests or hardware that cannot
 * afford ~250 ms per hash — never to make production sign-in faster.
 */
const MIN_ROUNDS = 4
const MAX_ROUNDS = 15
const DEFAULT_ROUNDS = 12

function readSaltRounds(): number {
  const raw = process.env.BCRYPT_ROUNDS?.trim()
  if (!raw) return DEFAULT_ROUNDS

  const rounds = Number(raw)
  if (!Number.isInteger(rounds) || rounds < MIN_ROUNDS || rounds > MAX_ROUNDS) {
    throw new Error(
      `BCRYPT_ROUNDS must be an integer between ${MIN_ROUNDS} and ${MAX_ROUNDS}. OWASP recommends 12 or higher; unset it to use the default (${DEFAULT_ROUNDS}).`,
    )
  }
  return rounds
}

export const SALT_ROUNDS = readSaltRounds()

/**
 * A real bcrypt hash of a thrown-away random string, generated at the configured
 * cost.
 *
 * When an email has no account there is nothing to compare against, and skipping
 * bcrypt would make "no such user" measurably faster than "wrong password" — an
 * oracle for enumerating registered emails. Comparing against this hash costs the
 * same work as a real one. It is generated at boot rather than hard-coded so its
 * cost always matches `SALT_ROUNDS`; a fixed cost-10 decoy would leak the gap
 * again the moment the cost is raised. It cannot match a real password: the value
 * it hashes was never stored.
 */
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync(randomBytes(32).toString('hex'), SALT_ROUNDS)

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * True when a stored hash was made with a cheaper cost than the current setting.
 * `bcrypt.getRounds` throws on anything that is not a bcrypt hash, which can only
 * happen if a hash was written by hand; there is nothing to upgrade in that case.
 */
export function needsRehash(passwordHash: string): boolean {
  try {
    return bcrypt.getRounds(passwordHash) < SALT_ROUNDS
  } catch {
    return false
  }
}
