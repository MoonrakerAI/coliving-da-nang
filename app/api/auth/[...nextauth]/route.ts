import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { seedDefaultUsers } from '@/lib/db/operations/user'

// Dev-only: ensure default admin exists for local testing
if (process.env.NODE_ENV !== 'production') {
  // Fire and forget; seeding is idempotent
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  seedDefaultUsers()
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
