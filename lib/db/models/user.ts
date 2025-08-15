import { z } from 'zod'

// User roles enum - matching the auth.ts definitions
export const UserRole = {
  PROPERTY_OWNER: 'PROPERTY_OWNER',
  COMMUNITY_MANAGER: 'COMMUNITY_MANAGER',
  TENANT: 'TENANT'
} as const

export type UserRoleType = typeof UserRole[keyof typeof UserRole]

// User status enum
export const UserStatus = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  PENDING: 'Pending',
  LOCKED: 'Locked'
} as const

export type UserStatusType = typeof UserStatus[keyof typeof UserStatus]

// Password validation schema
export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')

// User validation schema
export const UserSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required'),
  passwordHash: z.string().min(1, 'Password hash is required'),
  role: z.enum(['PROPERTY_OWNER', 'COMMUNITY_MANAGER', 'TENANT']),
  status: z.enum(['Active', 'Inactive', 'Pending', 'Locked']),
  propertyIds: z.array(z.string().uuid()).default([]),
  isActive: z.boolean().default(true),
  lastLoginAt: z.date().optional(),
  failedLoginAttempts: z.number().int().min(0).default(0),
  lockedUntil: z.date().optional(),
  emailVerified: z.boolean().default(false),
  emailVerificationToken: z.string().optional(),
  passwordResetToken: z.string().optional(),
  passwordResetExpires: z.date().optional(),
  invitedBy: z.string().uuid().optional(),
  invitedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// User creation schema (for registration/invitation)
export const CreateUserSchema = UserSchema.omit({
  id: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  failedLoginAttempts: true,
  lockedUntil: true
})

// User update schema
export const UpdateUserSchema = UserSchema.partial().omit({
  id: true,
  createdAt: true,
  passwordHash: true
})

// Login schema
export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
})

// Password reset request schema
export const PasswordResetRequestSchema = z.object({
  email: z.string().email('Invalid email format')
})

// Password reset schema
export const PasswordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: PasswordSchema
})

// User invitation schema
export const UserInvitationSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['PROPERTY_OWNER', 'COMMUNITY_MANAGER', 'TENANT']),
  propertyIds: z.array(z.string().uuid()).default([])
})

// Change password schema
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: PasswordSchema
})

// Types
export type User = z.infer<typeof UserSchema>
export type CreateUser = z.infer<typeof CreateUserSchema>
export type UpdateUser = z.infer<typeof UpdateUserSchema>
export type LoginCredentials = z.infer<typeof LoginSchema>
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>
export type PasswordReset = z.infer<typeof PasswordResetSchema>
export type UserInvitation = z.infer<typeof UserInvitationSchema>
export type ChangePassword = z.infer<typeof ChangePasswordSchema>

// Helper functions
export function isUserLocked(user: User): boolean {
  return user.status === UserStatus.LOCKED || 
         (user.lockedUntil && user.lockedUntil > new Date())
}

export function shouldLockUser(failedAttempts: number): boolean {
  return failedAttempts >= 5
}

export function getLockDuration(failedAttempts: number): number {
  // Progressive lockout: 5 min, 15 min, 30 min, 1 hour, 2 hours
  const durations = [5, 15, 30, 60, 120]
  const index = Math.min(failedAttempts - 5, durations.length - 1)
  return durations[index] * 60 * 1000 // Convert to milliseconds
}
