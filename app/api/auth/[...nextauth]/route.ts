import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { seedDefaultUsers } from '@/lib/db/operations/user'

// Dev-only seeding by default; allow explicit opt-in seeding in production via SEED_ON_BOOT=true
if (process.env.NODE_ENV !== 'production' || process.env.SEED_ON_BOOT === 'true') {
  // Fire and forget; seeding is idempotent
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  seedDefaultUsers()
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
