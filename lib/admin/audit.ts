import { kv } from '@vercel/kv';

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateAuditLogParams {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const auditEntry: AuditLogEntry = {
      id: auditId,
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      changes: params.changes,
      timestamp: new Date(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    };

    // Store audit log entry
    await kv.set(`audit:${auditId}`, auditEntry);
    
    // Add to user's audit trail
    const userAuditKey = `audit:user:${params.userId}`;
    const userAuditList = await kv.get(userAuditKey) as string[] || [];
    userAuditList.unshift(auditId);
    
    // Keep only last 1000 entries per user
    if (userAuditList.length > 1000) {
      userAuditList.splice(1000);
    }
    
    await kv.set(userAuditKey, userAuditList);
    
    // Add to resource audit trail
    const resourceAuditKey = `audit:resource:${params.resource}:${params.resourceId}`;
    const resourceAuditList = await kv.get(resourceAuditKey) as string[] || [];
    resourceAuditList.unshift(auditId);
    
    // Keep only last 500 entries per resource
    if (resourceAuditList.length > 500) {
      resourceAuditList.splice(500);
    }
    
    await kv.set(resourceAuditKey, resourceAuditList);
    
    // Add to global audit index
    const globalAuditKey = 'audit:global';
    const globalAuditList = await kv.get(globalAuditKey) as string[] || [];
    globalAuditList.unshift(auditId);
    
    // Keep only last 10000 entries globally
    if (globalAuditList.length > 10000) {
      globalAuditList.splice(10000);
    }
    
    await kv.set(globalAuditKey, globalAuditList);
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid breaking the main operation
  }
}

export async function getAuditLogs(options: {
  userId?: string;
  resource?: string;
  resourceId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: AuditLogEntry[]; total: number }> {
  try {
    let auditIds: string[] = [];
    
    if (options.userId) {
      auditIds = await kv.get(`audit:user:${options.userId}`) as string[] || [];
    } else if (options.resource && options.resourceId) {
      auditIds = await kv.get(`audit:resource:${options.resource}:${options.resourceId}`) as string[] || [];
    } else {
      auditIds = await kv.get('audit:global') as string[] || [];
    }
    
    // Apply pagination
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    const paginatedIds = auditIds.slice(offset, offset + limit);
    
    // Fetch audit entries
    const auditEntries = await Promise.all(
      paginatedIds.map(async (id) => {
        const entry = await kv.get(`audit:${id}`) as AuditLogEntry;
        return entry;
      })
    );
    
    let filteredEntries = auditEntries.filter(Boolean);
    
    // Apply action filter
    if (options.action) {
      filteredEntries = filteredEntries.filter(entry => entry.action === options.action);
    }
    
    return {
      logs: filteredEntries,
      total: auditIds.length,
    };
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    return { logs: [], total: 0 };
  }
}

export async function getUserAuditTrail(userId: string, limit = 100): Promise<AuditLogEntry[]> {
  try {
    const result = await getAuditLogs({ userId, limit });
    return result.logs;
  } catch (error) {
    console.error('Failed to get user audit trail:', error);
    return [];
  }
}

export async function getResourceAuditTrail(
  resource: string, 
  resourceId: string, 
  limit = 100
): Promise<AuditLogEntry[]> {
  try {
    const result = await getAuditLogs({ resource, resourceId, limit });
    return result.logs;
  } catch (error) {
    console.error('Failed to get resource audit trail:', error);
    return [];
  }
}
