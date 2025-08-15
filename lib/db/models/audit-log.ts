import { z } from 'zod'

// Audit event types
export const AuditEventType = {
  // Authentication events
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED',
  
  // User management events
  USER_CREATED: 'USER_CREATED',
  USER_INVITED: 'USER_INVITED',
  USER_ACTIVATED: 'USER_ACTIVATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
  
  // Session events
  SESSION_CREATED: 'SESSION_CREATED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_INVALIDATED: 'SESSION_INVALIDATED',
  
  // Security events
  UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY'
} as const

export type AuditEventTypeType = typeof AuditEventType[keyof typeof AuditEventType]

// Audit log severity levels
export const AuditSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
} as const

export type AuditSeverityType = typeof AuditSeverity[keyof typeof AuditSeverity]

// Audit log validation schema
export const AuditLogSchema = z.object({
  id: z.string().uuid('Invalid audit log ID format'),
  eventType: z.enum([
    'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_RESET_REQUESTED',
    'PASSWORD_RESET_COMPLETED', 'PASSWORD_CHANGED', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED',
    'USER_CREATED', 'USER_INVITED', 'USER_ACTIVATED', 'USER_UPDATED', 'USER_DELETED',
    'USER_ROLE_CHANGED', 'USER_STATUS_CHANGED', 'SESSION_CREATED', 'SESSION_EXPIRED',
    'SESSION_INVALIDATED', 'UNAUTHORIZED_ACCESS_ATTEMPT', 'PERMISSION_DENIED', 'SUSPICIOUS_ACTIVITY'
  ]),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  userId: z.string().uuid().optional(), // User who performed the action
  targetUserId: z.string().uuid().optional(), // User who was affected by the action
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  resource: z.string().optional(), // Resource that was accessed/modified
  details: z.record(z.any()).optional(), // Additional event-specific data
  timestamp: z.date(),
  sessionId: z.string().optional()
})

// Audit log creation schema
export const CreateAuditLogSchema = AuditLogSchema.omit({
  id: true,
  timestamp: true
})

// Audit log query schema
export const AuditLogQuerySchema = z.object({
  eventTypes: z.array(z.string()).optional(),
  userId: z.string().uuid().optional(),
  targetUserId: z.string().uuid().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  ipAddress: z.string().optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0)
})

// Types
export type AuditLog = z.infer<typeof AuditLogSchema>
export type CreateAuditLog = z.infer<typeof CreateAuditLogSchema>
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>

// Helper functions to determine severity
export function getEventSeverity(eventType: AuditEventTypeType): AuditSeverityType {
  const severityMap: Record<AuditEventTypeType, AuditSeverityType> = {
    // Low severity
    [AuditEventType.LOGIN_SUCCESS]: AuditSeverity.LOW,
    [AuditEventType.LOGOUT]: AuditSeverity.LOW,
    [AuditEventType.SESSION_CREATED]: AuditSeverity.LOW,
    [AuditEventType.USER_UPDATED]: AuditSeverity.LOW,
    
    // Medium severity
    [AuditEventType.PASSWORD_CHANGED]: AuditSeverity.MEDIUM,
    [AuditEventType.USER_CREATED]: AuditSeverity.MEDIUM,
    [AuditEventType.USER_INVITED]: AuditSeverity.MEDIUM,
    [AuditEventType.USER_ACTIVATED]: AuditSeverity.MEDIUM,
    [AuditEventType.SESSION_EXPIRED]: AuditSeverity.MEDIUM,
    [AuditEventType.SESSION_INVALIDATED]: AuditSeverity.MEDIUM,
    
    // High severity
    [AuditEventType.LOGIN_FAILED]: AuditSeverity.HIGH,
    [AuditEventType.PASSWORD_RESET_REQUESTED]: AuditSeverity.HIGH,
    [AuditEventType.PASSWORD_RESET_COMPLETED]: AuditSeverity.HIGH,
    [AuditEventType.USER_ROLE_CHANGED]: AuditSeverity.HIGH,
    [AuditEventType.USER_STATUS_CHANGED]: AuditSeverity.HIGH,
    [AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT]: AuditSeverity.HIGH,
    [AuditEventType.PERMISSION_DENIED]: AuditSeverity.HIGH,
    
    // Critical severity
    [AuditEventType.ACCOUNT_LOCKED]: AuditSeverity.CRITICAL,
    [AuditEventType.ACCOUNT_UNLOCKED]: AuditSeverity.CRITICAL,
    [AuditEventType.USER_DELETED]: AuditSeverity.CRITICAL,
    [AuditEventType.SUSPICIOUS_ACTIVITY]: AuditSeverity.CRITICAL
  }
  
  return severityMap[eventType] || AuditSeverity.MEDIUM
}

// Helper function to format audit log for display
export function formatAuditLogMessage(log: AuditLog): string {
  const messages: Record<AuditEventTypeType, string> = {
    [AuditEventType.LOGIN_SUCCESS]: 'User logged in successfully',
    [AuditEventType.LOGIN_FAILED]: 'Failed login attempt',
    [AuditEventType.LOGOUT]: 'User logged out',
    [AuditEventType.PASSWORD_RESET_REQUESTED]: 'Password reset requested',
    [AuditEventType.PASSWORD_RESET_COMPLETED]: 'Password reset completed',
    [AuditEventType.PASSWORD_CHANGED]: 'Password changed',
    [AuditEventType.ACCOUNT_LOCKED]: 'Account locked due to failed login attempts',
    [AuditEventType.ACCOUNT_UNLOCKED]: 'Account unlocked',
    [AuditEventType.USER_CREATED]: 'New user created',
    [AuditEventType.USER_INVITED]: 'User invitation sent',
    [AuditEventType.USER_ACTIVATED]: 'User account activated',
    [AuditEventType.USER_UPDATED]: 'User information updated',
    [AuditEventType.USER_DELETED]: 'User account deleted',
    [AuditEventType.USER_ROLE_CHANGED]: 'User role changed',
    [AuditEventType.USER_STATUS_CHANGED]: 'User status changed',
    [AuditEventType.SESSION_CREATED]: 'Session created',
    [AuditEventType.SESSION_EXPIRED]: 'Session expired',
    [AuditEventType.SESSION_INVALIDATED]: 'Session invalidated',
    [AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT]: 'Unauthorized access attempt',
    [AuditEventType.PERMISSION_DENIED]: 'Permission denied',
    [AuditEventType.SUSPICIOUS_ACTIVITY]: 'Suspicious activity detected'
  }
  
  return messages[log.eventType] || 'Unknown event'
}
