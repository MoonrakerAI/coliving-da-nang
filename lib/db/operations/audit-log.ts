import { v4 as uuidv4 } from 'uuid'
import { 
  AuditLog, 
  CreateAuditLog, 
  AuditLogQuery,
  AuditLogSchema,
  CreateAuditLogSchema,
  AuditLogQuerySchema,
  AuditEventType,
  getEventSeverity
} from '../models/audit-log'

// In-memory storage for development (replace with actual database in production)
let auditLogs: AuditLog[] = []

// Create audit log entry
export async function createAuditLog(logData: CreateAuditLog): Promise<AuditLog> {
  // Validate input
  const validatedData = CreateAuditLogSchema.parse(logData)
  
  // Auto-determine severity if not provided
  const severity = validatedData.severity || getEventSeverity(validatedData.eventType)
  
  // Create audit log entry
  const auditLog: AuditLog = {
    id: uuidv4(),
    ...validatedData,
    severity,
    timestamp: new Date()
  }
  
  // Validate complete audit log object
  const validatedLog = AuditLogSchema.parse(auditLog)
  
  // Store audit log
  auditLogs.push(validatedLog)
  
  // Log to console for development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[AUDIT] ${validatedLog.eventType}: ${validatedLog.details?.message || 'No details'}`)
  }
  
  return validatedLog
}

// Query audit logs
export async function queryAuditLogs(query: AuditLogQuery): Promise<{
  logs: AuditLog[]
  total: number
  hasMore: boolean
}> {
  // Validate query parameters
  const validatedQuery = AuditLogQuerySchema.parse(query)
  
  let filteredLogs = [...auditLogs]
  
  // Apply filters
  if (validatedQuery.eventTypes && validatedQuery.eventTypes.length > 0) {
    filteredLogs = filteredLogs.filter(log => 
      validatedQuery.eventTypes!.includes(log.eventType)
    )
  }
  
  if (validatedQuery.userId) {
    filteredLogs = filteredLogs.filter(log => log.userId === validatedQuery.userId)
  }
  
  if (validatedQuery.targetUserId) {
    filteredLogs = filteredLogs.filter(log => log.targetUserId === validatedQuery.targetUserId)
  }
  
  if (validatedQuery.severity) {
    filteredLogs = filteredLogs.filter(log => log.severity === validatedQuery.severity)
  }
  
  if (validatedQuery.startDate) {
    filteredLogs = filteredLogs.filter(log => log.timestamp >= validatedQuery.startDate!)
  }
  
  if (validatedQuery.endDate) {
    filteredLogs = filteredLogs.filter(log => log.timestamp <= validatedQuery.endDate!)
  }
  
  if (validatedQuery.ipAddress) {
    filteredLogs = filteredLogs.filter(log => log.ipAddress === validatedQuery.ipAddress)
  }
  
  // Sort by timestamp (newest first)
  filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  
  const total = filteredLogs.length
  const startIndex = validatedQuery.offset
  const endIndex = startIndex + validatedQuery.limit
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex)
  const hasMore = endIndex < total
  
  return {
    logs: paginatedLogs,
    total,
    hasMore
  }
}

// Get audit logs for a specific user
export async function getUserAuditLogs(userId: string, limit: number = 50): Promise<AuditLog[]> {
  const query: AuditLogQuery = {
    userId,
    limit,
    offset: 0
  }
  
  const result = await queryAuditLogs(query)
  return result.logs
}

// Get recent audit logs
export async function getRecentAuditLogs(limit: number = 100): Promise<AuditLog[]> {
  const query: AuditLogQuery = {
    limit,
    offset: 0
  }
  
  const result = await queryAuditLogs(query)
  return result.logs
}

// Get security-related audit logs
export async function getSecurityAuditLogs(limit: number = 100): Promise<AuditLog[]> {
  const securityEventTypes = [
    AuditEventType.LOGIN_FAILED,
    AuditEventType.ACCOUNT_LOCKED,
    AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
    AuditEventType.PERMISSION_DENIED,
    AuditEventType.SUSPICIOUS_ACTIVITY
  ]
  
  const query: AuditLogQuery = {
    eventTypes: securityEventTypes,
    limit,
    offset: 0
  }
  
  const result = await queryAuditLogs(query)
  return result.logs
}

// Helper functions for common audit logging scenarios

export async function logAuthenticationEvent(
  eventType: typeof AuditEventType.LOGIN_SUCCESS | typeof AuditEventType.LOGIN_FAILED | typeof AuditEventType.LOGOUT,
  userId?: string,
  ipAddress?: string,
  userAgent?: string,
  details?: Record<string, any>
): Promise<AuditLog> {
  return createAuditLog({
    eventType,
    userId,
    ipAddress,
    userAgent,
    details
  })
}

export async function logUserManagementEvent(
  eventType: typeof AuditEventType.USER_CREATED | typeof AuditEventType.USER_UPDATED | typeof AuditEventType.USER_DELETED | typeof AuditEventType.USER_INVITED,
  performedBy: string,
  targetUserId?: string,
  ipAddress?: string,
  userAgent?: string,
  details?: Record<string, any>
): Promise<AuditLog> {
  return createAuditLog({
    eventType,
    userId: performedBy,
    targetUserId,
    ipAddress,
    userAgent,
    details
  })
}

export async function logSecurityEvent(
  eventType: typeof AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT | typeof AuditEventType.PERMISSION_DENIED | typeof AuditEventType.SUSPICIOUS_ACTIVITY,
  userId?: string,
  ipAddress?: string,
  userAgent?: string,
  resource?: string,
  details?: Record<string, any>
): Promise<AuditLog> {
  return createAuditLog({
    eventType,
    userId,
    ipAddress,
    userAgent,
    resource,
    details
  })
}

export async function logPasswordEvent(
  eventType: typeof AuditEventType.PASSWORD_RESET_REQUESTED | typeof AuditEventType.PASSWORD_RESET_COMPLETED | typeof AuditEventType.PASSWORD_CHANGED,
  userId: string,
  ipAddress?: string,
  userAgent?: string,
  details?: Record<string, any>
): Promise<AuditLog> {
  return createAuditLog({
    eventType,
    userId,
    ipAddress,
    userAgent,
    details
  })
}

// Clean up old audit logs (retention policy)
export async function cleanupOldAuditLogs(retentionDays: number = 90): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
  
  const initialCount = auditLogs.length
  auditLogs = auditLogs.filter(log => log.timestamp > cutoffDate)
  const removedCount = initialCount - auditLogs.length
  
  if (removedCount > 0) {
    console.log(`Cleaned up ${removedCount} old audit log entries`)
  }
  
  return removedCount
}

// Get audit log statistics
export async function getAuditLogStats(): Promise<{
  totalLogs: number
  logsByEventType: Record<string, number>
  logsBySeverity: Record<string, number>
  recentActivity: number // logs in last 24 hours
}> {
  const totalLogs = auditLogs.length
  
  // Count by event type
  const logsByEventType: Record<string, number> = {}
  auditLogs.forEach(log => {
    logsByEventType[log.eventType] = (logsByEventType[log.eventType] || 0) + 1
  })
  
  // Count by severity
  const logsBySeverity: Record<string, number> = {}
  auditLogs.forEach(log => {
    logsBySeverity[log.severity] = (logsBySeverity[log.severity] || 0) + 1
  })
  
  // Count recent activity (last 24 hours)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const recentActivity = auditLogs.filter(log => log.timestamp > yesterday).length
  
  return {
    totalLogs,
    logsByEventType,
    logsBySeverity,
    recentActivity
  }
}
