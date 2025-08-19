import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { logAuthenticationEvent, logSecurityEvent, createAuditLog } from '@/lib/db/operations/audit-log'
import { AuditEventType } from '@/lib/db/models/audit-log'

// Session security configuration
export const SESSION_CONFIG = {
  maxAge: 24 * 60 * 60, // 24 hours in seconds
  updateAge: 60 * 60, // Update session every hour
  maxConcurrentSessions: 3, // Maximum concurrent sessions per user
  sessionTimeoutWarning: 5 * 60, // Show warning 5 minutes before expiry
} as const

// CSRF token generation and validation
export function generateCSRFToken(): string {
  return crypto.randomUUID()
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  // In a real implementation, you'd store and validate CSRF tokens properly
  // For now, we'll do a basic validation
  return !!(token && token.length > 0 && sessionToken && sessionToken.length > 0)
}

// Session management utilities
export async function getSessionInfo(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const ipAddress = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || undefined
  
  return {
    session,
    ipAddress,
    userAgent
  }
}

export function getClientIP(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  // Fallback to connection remote address
  return request.ip || 'unknown'
}

// Session validation and security checks
export async function validateSession(request: NextRequest): Promise<{
  isValid: boolean
  session: any
  securityFlags: string[]
}> {
  const { session, ipAddress, userAgent } = await getSessionInfo(request)
  const securityFlags: string[] = []
  
  if (!session?.user) {
    return {
      isValid: false,
      session: null,
      securityFlags: ['NO_SESSION']
    }
  }
  
  // Check for suspicious activity
  if (await detectSuspiciousActivity(session.user.id, ipAddress, userAgent)) {
    securityFlags.push('SUSPICIOUS_ACTIVITY')
    
    await logSecurityEvent(
      AuditEventType.SUSPICIOUS_ACTIVITY,
      session.user.id,
      ipAddress,
      userAgent,
      request.nextUrl.pathname,
      { reason: 'Suspicious activity detected' }
    )
  }
  
  // Check session age and update if needed
  const sessionAge = Date.now() - new Date(session.expires).getTime()
  if (sessionAge > SESSION_CONFIG.maxAge * 1000) {
    securityFlags.push('SESSION_EXPIRED')
    
    await createAuditLog({
      eventType: AuditEventType.SESSION_EXPIRED,
      userId: session.user.id,
      ipAddress,
      userAgent,
      details: { reason: 'Session timeout' }
    })
    
    return {
      isValid: false,
      session: null,
      securityFlags
    }
  }
  
  return {
    isValid: true,
    session,
    securityFlags
  }
}

// Detect suspicious activity patterns
async function detectSuspiciousActivity(
  userId: string, 
  ipAddress?: string, 
  userAgent?: string
): Promise<boolean> {
  // Simple suspicious activity detection
  // In a real implementation, you'd have more sophisticated detection
  
  const suspiciousPatterns = [
    // Multiple rapid requests from same IP
    // Unusual user agent strings
    // Geographic anomalies
    // Time-based anomalies
  ]
  
  // For now, just return false - implement actual detection logic as needed
  return false
}

// Session cleanup and invalidation
export async function invalidateSession(
  userId: string, 
  sessionId?: string,
  reason: string = 'Manual logout',
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  // Log session invalidation
  await createAuditLog({
    eventType: AuditEventType.SESSION_INVALIDATED,
    userId,
    ipAddress,
    userAgent,
    details: { reason: 'Manual session invalidation' }
  })
  
  // In a real implementation, you'd remove the session from storage
  console.log(`Session invalidated for user ${userId}: ${reason}`)
}

// Rate limiting for authentication attempts
const authAttempts = new Map<string, { count: number; lastAttempt: Date }>()

export function checkRateLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
  const now = new Date()
  const attempts = authAttempts.get(identifier)
  
  if (!attempts) {
    authAttempts.set(identifier, { count: 1, lastAttempt: now })
    return true
  }
  
  // Reset if window has passed
  if (now.getTime() - attempts.lastAttempt.getTime() > windowMs) {
    authAttempts.set(identifier, { count: 1, lastAttempt: now })
    return true
  }
  
  // Check if limit exceeded
  if (attempts.count >= maxAttempts) {
    return false
  }
  
  // Increment counter
  attempts.count++
  attempts.lastAttempt = now
  authAttempts.set(identifier, attempts)
  
  return true
}

// Security headers for authentication pages
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  }
}

// Property-based access control
export function canAccessProperty(
  userRole: string,
  userPropertyIds: string[],
  targetPropertyId?: string
): boolean {
  // Property owners can access all properties
  if (userRole === 'PROPERTY_OWNER') {
    return true
  }
  
  // Managers and tenants can only access their assigned properties
  return targetPropertyId ? userPropertyIds.includes(targetPropertyId) : false
}

// Multi-property context switching
export function getAccessibleProperties(
  userRole: string,
  userPropertyIds: string[],
  allProperties: Array<{ id: string; name: string }>
): Array<{ id: string; name: string }> {
  // Property owners can access all properties
  if (userRole === 'PROPERTY_OWNER') {
    return allProperties
  }
  
  // Filter to only user's assigned properties
  return allProperties.filter(property => 
    userPropertyIds.includes(property.id)
  )
}

// Session monitoring and cleanup
export async function cleanupExpiredSessions(): Promise<number> {
  // In a real implementation, you'd clean up expired sessions from storage
  console.log('Cleaning up expired sessions...')
  return 0
}

// Security audit helpers
export async function logSecurityAudit(
  eventType: string,
  userId?: string,
  details?: Record<string, any>,
  request?: NextRequest
): Promise<void> {
  const ipAddress = request ? getClientIP(request) : undefined
  const userAgent = request?.headers.get('user-agent') || undefined
  
  await logSecurityEvent(
    eventType as any,
    userId,
    ipAddress,
    userAgent,
    request?.nextUrl.pathname,
    details
  )
}
