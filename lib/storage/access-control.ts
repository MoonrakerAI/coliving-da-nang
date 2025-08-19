import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { createHash, randomBytes } from 'crypto';

export interface SecureUrlOptions {
  expiresIn?: number; // seconds
  allowedOperations?: ('view' | 'download' | 'delete')[];
  ipRestriction?: string;
}

export interface AccessLog {
  userId: string;
  propertyId: string;
  photoId: string;
  operation: 'view' | 'download' | 'delete' | 'upload';
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
}

/**
 * Check if user has access to a property's photos
 */
export async function checkPropertyAccess(
  propertyId: string,
  userId?: string
): Promise<{ hasAccess: boolean; role?: string; error?: string }> {
  try {
    // Get user session if not provided
    if (!userId) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return { hasAccess: false, error: 'Not authenticated' };
      }
      userId = session.user.id;
    }

    // TODO: Implement actual property access check against database
    // This would check if user is owner, manager, or has viewing permissions
    // For now, return true for authenticated users
    
    // Mock implementation - replace with actual database query
    const mockUserPropertyAccess = {
      hasAccess: true,
      role: 'owner', // Could be 'owner', 'manager', 'viewer'
    };

    return mockUserPropertyAccess;
  } catch (error) {
    return {
      hasAccess: false,
      error: `Access check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Generate a secure, time-limited URL for photo access
 */
export function generateSecurePhotoUrl(
  photoUrl: string,
  propertyId: string,
  options: SecureUrlOptions = {}
): string {
  const {
    expiresIn = 3600, // 1 hour default
    allowedOperations = ['view'],
    ipRestriction,
  } = options;

  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  const nonce = randomBytes(16).toString('hex');
  
  // Create signature payload
  const payload = {
    url: photoUrl,
    propertyId,
    expiresAt,
    operations: allowedOperations.sort(),
    nonce,
    ...(ipRestriction && { ip: ipRestriction }),
  };

  // Generate signature (in production, use a proper secret key)
  const secret = process.env.PHOTO_ACCESS_SECRET || 'default-secret-change-in-production';
  const signature = createHash('sha256')
    .update(JSON.stringify(payload) + secret)
    .digest('hex');

  // Encode the secure token
  const token = Buffer.from(JSON.stringify({
    ...payload,
    signature,
  })).toString('base64url');

  // Return secure URL with token
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${baseUrl}/api/photos/secure/${encodeURIComponent(token)}`;
}

/**
 * Validate a secure photo URL token
 */
export function validateSecurePhotoToken(
  token: string,
  requestIp?: string
): { valid: boolean; photoUrl?: string; error?: string } {
  try {
    // Decode token
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    const { signature, ip, expiresAt, url, ...payload } = decoded;

    // Check expiration
    if (Date.now() / 1000 > expiresAt) {
      return { valid: false, error: 'Token expired' };
    }

    // Check IP restriction if specified
    if (ip && requestIp && ip !== requestIp) {
      return { valid: false, error: 'IP address mismatch' };
    }

    // Verify signature
    const secret = process.env.PHOTO_ACCESS_SECRET || 'default-secret-change-in-production';
    const expectedSignature = createHash('sha256')
      .update(JSON.stringify({ ...payload, url, expiresAt, ...(ip && { ip }) }) + secret)
      .digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true, photoUrl: url };
  } catch (error) {
    return {
      valid: false,
      error: `Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Log photo access for audit purposes
 */
export async function logPhotoAccess(log: AccessLog): Promise<void> {
  try {
    // TODO: Implement actual audit logging to database
    // This should store access logs for compliance and security monitoring
    
    console.log('Photo Access Log:', {
      timestamp: log.timestamp.toISOString(),
      userId: log.userId,
      propertyId: log.propertyId,
      photoId: log.photoId,
      operation: log.operation,
      success: log.success,
      ipAddress: log.ipAddress,
      error: log.error,
    });

    // In production, this would insert into an audit_logs table
    // await db.auditLog.create({ data: log });
  } catch (error) {
    console.error('Failed to log photo access:', error);
    // Don't throw error - logging failure shouldn't break the main operation
  }
}

/**
 * Check if user can perform specific operation on photo
 */
export async function checkPhotoOperationPermission(
  photoId: string,
  propertyId: string,
  operation: 'view' | 'download' | 'delete' | 'edit',
  userId?: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    // Check property access first
    const propertyAccess = await checkPropertyAccess(propertyId, userId);
    if (!propertyAccess.hasAccess) {
      return { allowed: false, reason: propertyAccess.error || 'No property access' };
    }

    // Define operation permissions by role
    const rolePermissions = {
      owner: ['view', 'download', 'delete', 'edit'],
      manager: ['view', 'download', 'edit'],
      viewer: ['view', 'download'],
    };

    const userRole = propertyAccess.role as keyof typeof rolePermissions;
    const allowedOperations = rolePermissions[userRole] || [];

    if (!allowedOperations.includes(operation)) {
      return { 
        allowed: false, 
        reason: `Role '${userRole}' not permitted to ${operation} photos` 
      };
    }

    return { allowed: true };
  } catch (error) {
    return {
      allowed: false,
      reason: `Permission check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Rate limiting for photo operations
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  userId: string,
  operation: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; resetTime?: number } {
  const key = `${userId}:${operation}`;
  const now = Date.now();
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset or initialize
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }
  
  if (current.count >= maxRequests) {
    return { allowed: false, resetTime: current.resetTime };
  }
  
  current.count++;
  return { allowed: true };
}

/**
 * Clean up expired rate limit entries
 */
export function cleanupRateLimit(): void {
  const now = Date.now();
  rateLimitStore.forEach((value, key) => {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  });
}

// Clean up rate limit store every 5 minutes
setInterval(cleanupRateLimit, 5 * 60 * 1000);
