import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { seedDefaultUsers } from '@/lib/db/operations/user'
import { getUserByEmail } from '@/lib/db/operations/user'
import { seedPermifyOnBoot } from '@/lib/permify/seed'

// Dev-only seeding by default; allow explicit opt-in seeding in production via SEED_ON_BOOT=true
if (process.env.NODE_ENV !== 'production' || process.env.SEED_ON_BOOT === 'true') {
  // Fire and forget; seeding is idempotent
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  (async () => {
    await seedDefaultUsers()
    // If requested, seed Permify schema and grant admin access to configured admin
    if (process.env.PERMIFY_SEED_ON_BOOT === 'true') {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@coliving-danang.com'
      const admin = await getUserByEmail(adminEmail)
      await seedPermifyOnBoot(admin?.id)
    }
  })()
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
