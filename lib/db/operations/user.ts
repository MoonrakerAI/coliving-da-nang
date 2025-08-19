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
import { db } from '../../db'

// Helper: normalize emails for consistent indexing
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

// Environment control: prefer KV in production; allow opt-in in dev via USE_KV=true
const USE_KV = process.env.NODE_ENV === 'production' || process.env.USE_KV === 'true'

// KV key helpers
const userKey = (id: string) => `user:${id}`
const emailKey = (email: string) => `user:email:${normalizeEmail(email)}`
const userIdsKey = 'user:ids'

// In-memory fallback (used only when KV is not desired/available in non-prod)
const memoryUsers: Map<string, User> = new Map()
const memoryEmailIdx: Map<string, string> = new Map()

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
  const existing = await getUserByEmail(validatedData.email)
  if (existing) throw new Error('User with this email already exists')
  
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
  
  // Store user (KV or memory)
  if (USE_KV) {
    await db.set(userKey(validatedUser.id), validatedUser)
    await db.set(emailKey(validatedUser.email), validatedUser.id)
    // Track IDs in a set for listing
    // @ts-ignore vercel/kv supports sadd
    await db.sadd(userIdsKey, validatedUser.id)
  } else {
    memoryUsers.set(validatedUser.id, validatedUser)
    memoryEmailIdx.set(normalizeEmail(validatedUser.email), validatedUser.id)
  }
  
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
  if (USE_KV) {
    const user = await db.get<User>(userKey(id))
    return user || null
  }
  return memoryUsers.get(id) || null
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const key = emailKey(email)
  if (USE_KV) {
    const id = await db.get<string>(key)
    if (!id) return null
    const user = await db.get<User>(userKey(id))
    return user || null
  }
  const id = memoryEmailIdx.get(normalizeEmail(email))
  return id ? (memoryUsers.get(id) || null) : null
}

export async function updateUser(id: string, updates: UpdateUser): Promise<User | null> {
  const current = await getUserById(id)
  if (!current) return null
  const validatedUpdates = UpdateUserSchema.parse(updates)
  const updatedUser = { ...current, ...validatedUpdates, updatedAt: new Date() }
  const validatedUser = UserSchema.parse(updatedUser)
  if (USE_KV) {
    await db.set(userKey(id), validatedUser)
    // If email changed, update index
    if (validatedUser.email !== current.email) {
      await db.del(emailKey(current.email))
      await db.set(emailKey(validatedUser.email), id)
    }
  } else {
    memoryUsers.set(id, validatedUser)
    if (validatedUser.email !== current.email) {
      memoryEmailIdx.delete(normalizeEmail(current.email))
      memoryEmailIdx.set(normalizeEmail(validatedUser.email), id)
    }
  }
  return validatedUser
}

export async function deleteUser(id: string): Promise<boolean> {
  const user = await getUserById(id)
  if (!user) return false
  if (USE_KV) {
    await db.del(userKey(id))
    await db.del(emailKey(user.email))
    // @ts-ignore vercel/kv supports srem
    await db.srem(userIdsKey, id)
  } else {
    memoryUsers.delete(id)
    memoryEmailIdx.delete(normalizeEmail(user.email))
  }
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
  
  // Return the latest stored user
  return (await getUserById(user.id))
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
  // KV search: iterate IDs and find matching token (small scale acceptable). For larger scale, add token index.
  const candidate = await findUserByPredicate(async (u) => 
    !!u.passwordResetToken && u.passwordResetToken === token && !!u.passwordResetExpires && u.passwordResetExpires > new Date()
  )
  if (!candidate) return false
  const passwordHash = await hashPassword(newPassword)
  await setUserPassword(candidate.id, passwordHash)
  await updateUser(candidate.id, {
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
  const user = await getUserById(userId)
  if (!user) return null
  const updated = UserSchema.parse({ ...user, passwordHash, updatedAt: new Date() })
  if (USE_KV) {
    await db.set(userKey(userId), updated)
  } else {
    memoryUsers.set(userId, updated)
  }
  return updated
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
  const pending = await findUserByPredicate(async (u) => u.emailVerificationToken === token && u.status === UserStatus.PENDING)
  if (!pending) return null
  const passwordHash = await hashPassword(password)
  await setUserPassword(pending.id, passwordHash)
  const updatedUser = await updateUser(pending.id, {
    status: UserStatus.ACTIVE,
    emailVerified: true,
    emailVerificationToken: undefined
  })
  return updatedUser
}

// Query operations
export async function getAllUsers(): Promise<User[]> {
  if (USE_KV) {
    // @ts-ignore vercel/kv supports smembers
    const ids: string[] = (await db.smembers(userIdsKey)) || []
    if (ids.length === 0) return []
    // @ts-ignore vercel/kv supports mget
    const keys = ids.map((id) => userKey(id))
    const usersArr = (await db.mget<User[]>(...keys)) as unknown as (User | null)[]
    return usersArr.filter(Boolean) as User[]
  }
  return Array.from(memoryUsers.values())
}

export async function getUsersByRole(role: keyof typeof UserRole): Promise<User[]> {
  const list = await getAllUsers()
  return list.filter(u => u.role === role)
}

export async function getUsersByProperty(propertyId: string): Promise<User[]> {
  const list = await getAllUsers()
  return list.filter(u => u.propertyIds.includes(propertyId))
}

// Seed default admin user for development
export async function seedDefaultUsers(): Promise<void> {
  // Use env-configured admin for development convenience (dev-only; caller guards production)
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@coliving-danang.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!'

  // Check if admin user already exists (by configured email)
  const existingAdmin = await getUserByEmail(adminEmail)
  if (existingAdmin) {
    // Optionally update password if provided via env
    if (process.env.ADMIN_PASSWORD) {
      const passwordHash = await hashPassword(adminPassword)
      await setUserPassword(existingAdmin.id, passwordHash)
    }

    // Ensure role/status/flags are correct for admin
    await updateUser(existingAdmin.id, {
      role: UserRole.PROPERTY_OWNER,
      status: UserStatus.ACTIVE,
      isActive: true,
      emailVerified: true,
    })

    console.log(`Admin user ensured: ${adminEmail}`)
    return
  }
  
  // Create default admin user if missing
  await createUser({
    email: adminEmail,
    name: 'System Administrator',
    password: adminPassword,
    role: UserRole.PROPERTY_OWNER,
    status: UserStatus.ACTIVE,
    propertyIds: [],
    isActive: true,
    emailVerified: true
  })
  
  console.log(`Default admin user created: ${adminEmail}`)
}

// Utility: iterate users to find a match. Optimized for small datasets.
async function findUserByPredicate(predicate: (u: User) => boolean | Promise<boolean>): Promise<User | null> {
  if (USE_KV) {
    // @ts-ignore
    const ids: string[] = (await db.smembers(userIdsKey)) || []
    for (const id of ids) {
      const u = await db.get<User>(userKey(id))
      if (u && (await predicate(u))) return u
    }
    return null
  }
  for (const u of memoryUsers.values()) {
    if (await predicate(u)) return u
  }
  return null
}
