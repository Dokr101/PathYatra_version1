import 'dotenv/config'
import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_SEED_PASSWORD

  if (!email || !password) {
    throw new Error(
      'Set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD before running prisma/seed-admin.ts.',
    )
  }
  if (password.length < 8) {
    throw new Error('ADMIN_SEED_PASSWORD must be at least 8 characters.')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', isActive: true, passwordHash },
    create: {
      email,
      fullName: process.env.ADMIN_SEED_NAME?.trim() || 'PathYatra Admin',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
    select: { id: true, email: true, role: true },
  })

  console.log(`Admin ready: ${user.email} (${user.role})`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
