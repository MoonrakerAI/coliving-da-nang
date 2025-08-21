import { PermifyClient, isPermifyEnabled } from './client'

// Minimal Permify schema using Zanzibar-style DSL
// Entities: user, app
// Relations: app.admin -> users with administrative access
// Permissions: admin_access = admin
const SCHEMA = `
entity user {}

entity app {
  relation admin @user
  permission admin_access = admin
}
`

export async function ensurePermifySchema() {
  if (!isPermifyEnabled()) return
  const tenantId = process.env.PERMIFY_TENANT_ID as string
  const client = PermifyClient.fromEnv()
  await client.writeSchema(tenantId, SCHEMA)
}

export async function ensureAdminAccessFor(userId: string) {
  if (!isPermifyEnabled()) return
  const tenantId = process.env.PERMIFY_TENANT_ID as string
  const client = PermifyClient.fromEnv()
  await client.writeRelationships(tenantId, [
    { entity: 'app:root', relation: 'admin', subject: `user:${userId}` },
  ])
}

// Bootstraps Permify schema and assigns admin access to the configured admin user
export async function seedPermifyOnBoot(adminUserId?: string) {
  if (!isPermifyEnabled()) return
  if (process.env.PERMIFY_SEED_ON_BOOT !== 'true') return
  await ensurePermifySchema()
  if (adminUserId) {
    await ensureAdminAccessFor(adminUserId)
  }
}
