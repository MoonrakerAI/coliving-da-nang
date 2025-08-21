import { headers as nextHeaders } from 'next/headers'

export type PermifyClientOptions = {
  baseUrl: string
  apiToken?: string
}

function getBaseHeaders(apiToken?: string) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiToken) h['Authorization'] = `Bearer ${apiToken}`
  return h
}

export class PermifyClient {
  private baseUrl: string
  private apiToken?: string

  constructor(opts: PermifyClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '')
    this.apiToken = opts.apiToken
  }

  static fromEnv() {
    const baseUrl = process.env.PERMIFY_BASE_URL
    if (!baseUrl) throw new Error('PERMIFY_BASE_URL is not set')
    return new PermifyClient({ baseUrl, apiToken: process.env.PERMIFY_API_TOKEN })
  }

  async writeSchema(tenantId: string, schema: string) {
    const res = await fetch(`${this.baseUrl}/v1/schema/write`, {
      method: 'POST',
      headers: getBaseHeaders(this.apiToken),
      body: JSON.stringify({ tenant_id: tenantId, schema }),
      // Avoid Next fetch caching for control-plane writes
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Permify writeSchema failed: ${res.status}`)
    return res.json()
  }

  async writeRelationships(tenantId: string, tuples: Array<{ entity: string; relation: string; subject: string }>) {
    const res = await fetch(`${this.baseUrl}/v1/relationship/write`, {
      method: 'POST',
      headers: getBaseHeaders(this.apiToken),
      body: JSON.stringify({
        tenant_id: tenantId,
        tuples: tuples.map(t => ({
          entity: { type: t.entity.split(':')[0], id: t.entity.split(':')[1] },
          relation: t.relation,
          subject: (() => {
            const [type, idOrRel] = t.subject.split(':')
            // support subject like user:123 or property:1#manager
            const [id, rel] = idOrRel.split('#')
            return rel ? { type, id, relation: rel } : { type, id }
          })(),
        })),
      }),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Permify writeRelationships failed: ${res.status}`)
    return res.json()
  }

  async checkPermission(tenantId: string, entity: string, permission: string, subject: string, context?: Record<string, unknown>) {
    const res = await fetch(`${this.baseUrl}/v1/permission/check`, {
      method: 'POST',
      headers: getBaseHeaders(this.apiToken),
      body: JSON.stringify({
        tenant_id: tenantId,
        entity: { type: entity.split(':')[0], id: entity.split(':')[1] },
        permission,
        subject: { type: subject.split(':')[0], id: subject.split(':')[1] },
        context: context ? { tuples: context } : undefined,
      }),
      // Do not cache checks; they are dynamic
      cache: 'no-store',
      // Ensure fetch is not treated as static during build
      next: { revalidate: 0 },
    })
    if (!res.ok) throw new Error(`Permify checkPermission failed: ${res.status}`)
    const data = await res.json()
    return data?.can === 'RESULT_ALLOWED'
  }
}

export function isPermifyEnabled() {
  return process.env.PERMIFY_ENABLED === 'true' && !!process.env.PERMIFY_BASE_URL && !!process.env.PERMIFY_TENANT_ID
}

export async function canAccess(entity: string, permission: string, userId: string) {
  if (!isPermifyEnabled()) return null // null = not evaluated
  const tenantId = process.env.PERMIFY_TENANT_ID as string
  const client = PermifyClient.fromEnv()
  try {
    return await client.checkPermission(tenantId, entity, permission, `user:${userId}`)
  } catch (e) {
    console.error('Permify check error', e)
    return false
  }
}
