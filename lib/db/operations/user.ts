import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { 
  User, 
  CreateUser, 
  UpdateUser, 
  UserSchema,
  CreateUserSchema,
  UpdateUserSchema,
  UserStatus,
  UserRole,
  isUserLocked,
  shouldLockUser,
  getLockDuration
} from '../models/user'
import { 
  logAuthenticationEvent, 
  logUserManagementEvent, 
  logPasswordEvent,
  logSecurityEvent,
  createAuditLog
} from './audit-log'
import { AuditEventType } from '../models/audit-log'

// In-memory storage for development (replace with actual database in production)
const users: User[] = []

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Token generation
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// User CRUD operations
export async function createUser(
  userData: CreateUser & { password: string },
  createdBy?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<User> {
  const { password, ...userDataWithoutPassword } = userData
  
  // Validate input
  const validatedData = CreateUserSchema.parse(userDataWithoutPassword)
  
  // Check if user already exists
  const existingUser = users.find(u => u.email === validatedData.email)
  if (existingUser) {
    throw new Error('User with this email already exists')
  }
  
  // Hash password
  const passwordHash = await hashPassword(password)
  
  // Create user
  const now = new Date()
  const rawUser = {
    id: uuidv4(),
    ...validatedData,
    passwordHash,
    createdAt: now,
    updatedAt: now
  }
  
  // Validate complete user object (apply defaults like failedLoginAttempts)
  const validatedUser = UserSchema.parse(rawUser)
  
  // Store user
  users.push(validatedUser)
  
  // Log user creation
  await logUserManagementEvent(
    AuditEventType.USER_CREATED,
    createdBy || validatedUser.id,
    validatedUser.id,
    ipAddress,
    userAgent,
    { email: validatedUser.email, role: validatedUser.role }
  )
  
  return validatedUser
}

export async function getUserById(id: string): Promise<User | null> {
  return users.find(u => u.id === id) || null
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return users.find(u => u.email === email) || null
}

export async function updateUser(id: string, updates: UpdateUser): Promise<User | null> {
  const userIndex = users.findIndex(u => u.id === id)
  if (userIndex === -1) {
    return null
  }
  
  // Validate updates
  const validatedUpdates = UpdateUserSchema.parse(updates)
  
  // Update user
  const updatedUser = {
    ...users[userIndex],
    ...validatedUpdates,
    updatedAt: new Date()
  }
  
  // Validate complete user object
  const validatedUser = UserSchema.parse(updatedUser)
  
  users[userIndex] = validatedUser
  return validatedUser
}

export async function deleteUser(id: string): Promise<boolean> {
  const userIndex = users.findIndex(u => u.id === id)
  if (userIndex === -1) {
    return false
  }
  
  users.splice(userIndex, 1)
  return true
}

// Authentication operations
export async function authenticateUser(
  email: string, 
  password: string, 
  ipAddress?: string, 
  userAgent?: string
): Promise<User | null> {
  const user = await getUserByEmail(email)
  if (!user) {
    // Log failed login attempt
    await logAuthenticationEvent(
      AuditEventType.LOGIN_FAILED,
      undefined,
      ipAddress,
      userAgent,
      { email, reason: 'User not found' }
    )
    return null
  }
  
  // Check if user is locked
  if (isUserLocked(user)) {
    await logSecurityEvent(
      AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
      user.id,
      ipAddress,
      userAgent,
      undefined,
      { email, reason: 'Account locked' }
    )
    throw new Error('Account is locked due to too many failed login attempts')
  }
  
  // Check if user is active
  if (!user.isActive || user.status !== UserStatus.ACTIVE) {
    await logAuthenticationEvent(
      AuditEventType.LOGIN_FAILED,
      user.id,
      ipAddress,
      userAgent,
      { email, reason: 'Account not active' }
    )
    throw new Error('Account is not active')
  }
  
  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash)
  
  if (!isValidPassword) {
    // Increment failed login attempts
    const failedAttempts = user.failedLoginAttempts + 1
    const updates: UpdateUser = {
      failedLoginAttempts: failedAttempts
    }
    
    // Lock user if too many failed attempts
    if (shouldLockUser(failedAttempts)) {
      const lockDuration = getLockDuration(failedAttempts)
      updates.lockedUntil = new Date(Date.now() + lockDuration)
      updates.status = UserStatus.LOCKED
      
      await createAuditLog({
        eventType: AuditEventType.ACCOUNT_LOCKED,
        userId: user.id,
        ipAddress,
        userAgent,
        details: { email, failedAttempts }
      })
    }
    
    await updateUser(user.id, updates)
    
    // Log failed login attempt
    await logAuthenticationEvent(
      AuditEventType.LOGIN_FAILED,
      user.id,
      ipAddress,
      userAgent,
      { email, failedAttempts }
    )
    
    return null
  }
  
  // Successful login - reset failed attempts and update last login
  await updateUser(user.id, {
    failedLoginAttempts: 0,
    lockedUntil: undefined,
    lastLoginAt: new Date(),
    status: UserStatus.ACTIVE
  })
  
  // Log successful login
  await logAuthenticationEvent(
    AuditEventType.LOGIN_SUCCESS,
    user.id,
    ipAddress,
    userAgent,
    { email }
  )
  
  return user
}

// Password reset operations
export async function initiatePasswordReset(email: string): Promise<string | null> {
  const user = await getUserByEmail(email)
  if (!user) {
    // Don't reveal if email exists or not
    return null
  }
  
  const resetToken = generateSecureToken()
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  
  await updateUser(user.id, {
    passwordResetToken: resetToken,
    passwordResetExpires: resetExpires
  })
  
  return resetToken
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const user = users.find(u => 
    u.passwordResetToken === token && 
    u.passwordResetExpires && 
    u.passwordResetExpires > new Date()
  )
  
  if (!user) {
    return false
  }
  
  const passwordHash = await hashPassword(newPassword)
  await setUserPassword(user.id, passwordHash)
  await updateUser(user.id, {
    passwordResetToken: undefined,
    passwordResetExpires: undefined,
    failedLoginAttempts: 0,
    lockedUntil: undefined,
    status: UserStatus.ACTIVE
  })
  
  return true
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
  const user = await getUserById(userId)
  if (!user) {
    return false
  }
  
  // Verify current password
  const isValidPassword = await verifyPassword(currentPassword, user.passwordHash)
  if (!isValidPassword) {
    return false
  }
  
  // Hash new password
  const passwordHash = await hashPassword(newPassword)
  
  // Update password
  await setUserPassword(userId, passwordHash)
  
  return true
}

// Internal helper to update password hash (since UpdateUserSchema omits passwordHash)
async function setUserPassword(userId: string, passwordHash: string): Promise<User | null> {
  const idx = users.findIndex(u => u.id === userId)
  if (idx === -1) return null
  const updated = { ...users[idx], passwordHash, updatedAt: new Date() }
  const validated = UserSchema.parse(updated)
  users[idx] = validated
  return validated
}

// User invitation operations
export async function createUserInvitation(invitationData: CreateUser, invitedBy: string): Promise<User> {
  // Generate a temporary password for the invited user
  const temporaryPassword = generateSecureToken().substring(0, 12) + 'A1!'
  
  const user = await createUser({
    ...invitationData,
    password: temporaryPassword,
    status: UserStatus.PENDING,
    invitedBy,
    invitedAt: new Date(),
    emailVerificationToken: generateSecureToken()
  })
  
  return user
}

export async function activateUserInvitation(token: string, password: string): Promise<User | null> {
  const user = users.find(u => u.emailVerificationToken === token && u.status === UserStatus.PENDING)
  if (!user) {
    return null
  }
  
  const passwordHash = await hashPassword(password)
  await setUserPassword(user.id, passwordHash)
  const updatedUser = await updateUser(user.id, {
    status: UserStatus.ACTIVE,
    emailVerified: true,
    emailVerificationToken: undefined
  })
  
  return updatedUser
}

// Query operations
export async function getAllUsers(): Promise<User[]> {
  return [...users]
}

export async function getUsersByRole(role: keyof typeof UserRole): Promise<User[]> {
  return users.filter(u => u.role === role)
}

export async function getUsersByProperty(propertyId: string): Promise<User[]> {
  return users.filter(u => u.propertyIds.includes(propertyId))
}

// Seed default admin user for development
export async function seedDefaultUsers(): Promise<void> {
  // Check if admin user already exists
  const adminExists = users.find(u => u.email === 'admin@coliving-danang.com')
  if (adminExists) {
    return
  }
  
  // Create default admin user
  await createUser({
    email: 'admin@coliving-danang.com',
    name: 'System Administrator',
    password: 'Admin123!',
    role: UserRole.PROPERTY_OWNER,
    status: UserStatus.ACTIVE,
    propertyIds: [],
    isActive: true,
    emailVerified: true
  })
  
  console.log('Default admin user created: admin@coliving-danang.com / Admin123!')
}
