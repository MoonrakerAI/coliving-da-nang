import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { 
  createUser, 
  authenticateUser, 
  getUserByEmail,
  initiatePasswordReset,
  resetPassword,
  createUserInvitation,
  activateUserInvitation,
  seedDefaultUsers
} from '@/lib/db/operations/user'
import { UserRole, UserStatus } from '@/lib/db/models/user'
import { 
  queryAuditLogs, 
  getUserAuditLogs,
  getSecurityAuditLogs 
} from '@/lib/db/operations/audit-log'
import { AuditEventType } from '@/lib/db/models/audit-log'

describe('Authentication System', () => {
  beforeEach(async () => {
    // Clear any existing data before each test
    // In a real implementation, you'd reset the database
  })

  afterEach(async () => {
    // Clean up after each test
  })

  describe('User Creation and Management', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'TestPassword123!',
        role: UserRole.COMMUNITY_MANAGER,
        status: UserStatus.ACTIVE,
        propertyIds: ['prop-1'],
        isActive: true,
        emailVerified: true
      }

      const user = await createUser(userData, 'admin-id', '127.0.0.1', 'test-agent')
      
      expect(user.id).toBeDefined()
      expect(user.email).toBe(userData.email)
      expect(user.name).toBe(userData.name)
      expect(user.role).toBe(userData.role)
      expect(user.passwordHash).toBeDefined()
      expect(user.passwordHash).not.toBe(userData.password) // Should be hashed
    })

    it('should prevent duplicate email addresses', async () => {
      const userData = {
        email: 'duplicate@example.com',
        name: 'First User',
        password: 'Password123!',
        role: UserRole.TENANT,
        status: UserStatus.ACTIVE,
        propertyIds: [],
        isActive: true,
        emailVerified: true
      }

      // Create first user
      await createUser(userData)

      // Try to create second user with same email
      const duplicateUserData = { ...userData, name: 'Second User' }
      
      await expect(createUser(duplicateUserData)).rejects.toThrow('User with this email already exists')
    })
  })

  describe('Authentication', () => {
    it('should authenticate valid credentials', async () => {
      const userData = {
        email: 'auth-test@example.com',
        name: 'Auth Test User',
        password: 'ValidPassword123!',
        role: UserRole.COMMUNITY_MANAGER,
        status: UserStatus.ACTIVE,
        propertyIds: ['prop-1'],
        isActive: true,
        emailVerified: true
      }

      await createUser(userData)
      
      const authenticatedUser = await authenticateUser(
        userData.email, 
        userData.password,
        '127.0.0.1',
        'test-agent'
      )
      
      expect(authenticatedUser).toBeTruthy()
      expect(authenticatedUser?.email).toBe(userData.email)
      expect(authenticatedUser?.lastLoginAt).toBeDefined()
    })

    it('should reject invalid credentials', async () => {
      const userData = {
        email: 'invalid-test@example.com',
        name: 'Invalid Test User',
        password: 'ValidPassword123!',
        role: UserRole.TENANT,
        status: UserStatus.ACTIVE,
        propertyIds: [],
        isActive: true,
        emailVerified: true
      }

      await createUser(userData)
      
      const authenticatedUser = await authenticateUser(
        userData.email, 
        'WrongPassword123!',
        '127.0.0.1',
        'test-agent'
      )
      
      expect(authenticatedUser).toBeNull()
    })

    it('should lock account after failed attempts', async () => {
      const userData = {
        email: 'lockout-test@example.com',
        name: 'Lockout Test User',
        password: 'ValidPassword123!',
        role: UserRole.TENANT,
        status: UserStatus.ACTIVE,
        propertyIds: [],
        isActive: true,
        emailVerified: true
      }

      await createUser(userData)
      
      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await authenticateUser(
          userData.email, 
          'WrongPassword123!',
          '127.0.0.1',
          'test-agent'
        ).catch(() => {}) // Ignore errors
      }
      
      // Account should now be locked
      await expect(
        authenticateUser(userData.email, userData.password, '127.0.0.1', 'test-agent')
      ).rejects.toThrow('Account is locked')
    })
  })

  describe('Password Reset', () => {
    it('should initiate password reset', async () => {
      const userData = {
        email: 'reset-test@example.com',
        name: 'Reset Test User',
        password: 'OriginalPassword123!',
        role: UserRole.TENANT,
        status: UserStatus.ACTIVE,
        propertyIds: [],
        isActive: true,
        emailVerified: true
      }

      await createUser(userData)
      
      const resetToken = await initiatePasswordReset(userData.email)
      
      expect(resetToken).toBeTruthy()
      expect(typeof resetToken).toBe('string')
    })

    it('should reset password with valid token', async () => {
      const userData = {
        email: 'reset-valid@example.com',
        name: 'Reset Valid User',
        password: 'OriginalPassword123!',
        role: UserRole.TENANT,
        status: UserStatus.ACTIVE,
        propertyIds: [],
        isActive: true,
        emailVerified: true
      }

      await createUser(userData)
      
      const resetToken = await initiatePasswordReset(userData.email)
      const newPassword = 'NewPassword123!'
      
      const success = await resetPassword(resetToken!, newPassword)
      expect(success).toBe(true)
      
      // Should be able to authenticate with new password
      const authenticatedUser = await authenticateUser(
        userData.email, 
        newPassword,
        '127.0.0.1',
        'test-agent'
      )
      expect(authenticatedUser).toBeTruthy()
      
      // Should not be able to authenticate with old password
      const oldPasswordAuth = await authenticateUser(
        userData.email, 
        userData.password,
        '127.0.0.1',
        'test-agent'
      )
      expect(oldPasswordAuth).toBeNull()
    })
  })

  describe('User Invitations', () => {
    it('should create user invitation', async () => {
      const invitationData = {
        email: 'invited@example.com',
        name: 'Invited User',
        role: UserRole.COMMUNITY_MANAGER,
        status: UserStatus.PENDING,
        propertyIds: ['prop-1'],
        isActive: true,
        emailVerified: false
      }

      const invitedUser = await createUserInvitation(invitationData, 'admin-id')
      
      expect(invitedUser.email).toBe(invitationData.email)
      expect(invitedUser.status).toBe(UserStatus.PENDING)
      expect(invitedUser.emailVerificationToken).toBeDefined()
      expect(invitedUser.invitedBy).toBe('admin-id')
    })

    it('should activate user invitation', async () => {
      const invitationData = {
        email: 'activate@example.com',
        name: 'Activate User',
        role: UserRole.TENANT,
        status: UserStatus.PENDING,
        propertyIds: [],
        isActive: true,
        emailVerified: false
      }

      const invitedUser = await createUserInvitation(invitationData, 'admin-id')
      const newPassword = 'ActivatedPassword123!'
      
      const activatedUser = await activateUserInvitation(
        invitedUser.emailVerificationToken!,
        newPassword
      )
      
      expect(activatedUser).toBeTruthy()
      expect(activatedUser?.status).toBe(UserStatus.ACTIVE)
      expect(activatedUser?.emailVerified).toBe(true)
      
      // Should be able to authenticate with new password
      const authenticatedUser = await authenticateUser(
        invitationData.email,
        newPassword,
        '127.0.0.1',
        'test-agent'
      )
      expect(authenticatedUser).toBeTruthy()
    })
  })

  describe('Audit Logging', () => {
    it('should log authentication events', async () => {
      const userData = {
        email: 'audit-test@example.com',
        name: 'Audit Test User',
        password: 'AuditPassword123!',
        role: UserRole.TENANT,
        status: UserStatus.ACTIVE,
        propertyIds: [],
        isActive: true,
        emailVerified: true
      }

      const user = await createUser(userData)
      
      // Perform authentication
      await authenticateUser(
        userData.email,
        userData.password,
        '127.0.0.1',
        'test-agent'
      )
      
      // Check audit logs
      const userLogs = await getUserAuditLogs(user.id)
      
      expect(userLogs.length).toBeGreaterThan(0)
      
      const loginLog = userLogs.find(log => log.eventType === AuditEventType.LOGIN_SUCCESS)
      expect(loginLog).toBeDefined()
      expect(loginLog?.userId).toBe(user.id)
      expect(loginLog?.ipAddress).toBe('127.0.0.1')
    })

    it('should log failed authentication attempts', async () => {
      const userData = {
        email: 'failed-audit@example.com',
        name: 'Failed Audit User',
        password: 'FailedPassword123!',
        role: UserRole.TENANT,
        status: UserStatus.ACTIVE,
        propertyIds: [],
        isActive: true,
        emailVerified: true
      }

      const user = await createUser(userData)
      
      // Perform failed authentication
      await authenticateUser(
        userData.email,
        'WrongPassword123!',
        '127.0.0.1',
        'test-agent'
      )
      
      // Check security audit logs
      const securityLogs = await getSecurityAuditLogs()
      const failedLoginLog = securityLogs.find(
        log => log.eventType === AuditEventType.LOGIN_FAILED && log.userId === user.id
      )
      
      expect(failedLoginLog).toBeDefined()
      expect(failedLoginLog?.details?.email).toBe(userData.email)
    })
  })

  describe('Default Admin User', () => {
    it('should seed default admin user', async () => {
      await seedDefaultUsers()
      
      const adminUser = await getUserByEmail('admin@coliving-danang.com')
      
      expect(adminUser).toBeTruthy()
      expect(adminUser?.role).toBe(UserRole.PROPERTY_OWNER)
      expect(adminUser?.isActive).toBe(true)
      expect(adminUser?.emailVerified).toBe(true)
      
      // Should be able to authenticate with default credentials
      const authenticatedAdmin = await authenticateUser(
        'admin@coliving-danang.com',
        'Admin123!',
        '127.0.0.1',
        'test-agent'
      )
      expect(authenticatedAdmin).toBeTruthy()
    })
  })

  describe('Role-Based Access Control', () => {
    it('should enforce role hierarchy', async () => {
      const { hasRole } = await import('@/lib/auth')
      
      // Property owner should have all roles
      expect(hasRole(UserRole.PROPERTY_OWNER, UserRole.PROPERTY_OWNER)).toBe(true)
      expect(hasRole(UserRole.PROPERTY_OWNER, UserRole.COMMUNITY_MANAGER)).toBe(true)
      expect(hasRole(UserRole.PROPERTY_OWNER, UserRole.TENANT)).toBe(true)
      
      // Community manager should have manager and tenant roles
      expect(hasRole(UserRole.COMMUNITY_MANAGER, UserRole.PROPERTY_OWNER)).toBe(false)
      expect(hasRole(UserRole.COMMUNITY_MANAGER, UserRole.COMMUNITY_MANAGER)).toBe(true)
      expect(hasRole(UserRole.COMMUNITY_MANAGER, UserRole.TENANT)).toBe(true)
      
      // Tenant should only have tenant role
      expect(hasRole(UserRole.TENANT, UserRole.PROPERTY_OWNER)).toBe(false)
      expect(hasRole(UserRole.TENANT, UserRole.COMMUNITY_MANAGER)).toBe(false)
      expect(hasRole(UserRole.TENANT, UserRole.TENANT)).toBe(true)
    })

    it('should enforce property-based access', async () => {
      const { canAccessProperty } = await import('@/lib/auth')
      
      // Property owner can access any property
      expect(canAccessProperty(UserRole.PROPERTY_OWNER, [], 'any-property')).toBe(true)
      
      // Manager can only access assigned properties
      expect(canAccessProperty(UserRole.COMMUNITY_MANAGER, ['prop-1'], 'prop-1')).toBe(true)
      expect(canAccessProperty(UserRole.COMMUNITY_MANAGER, ['prop-1'], 'prop-2')).toBe(false)
      
      // Tenant can only access assigned properties
      expect(canAccessProperty(UserRole.TENANT, ['prop-1'], 'prop-1')).toBe(true)
      expect(canAccessProperty(UserRole.TENANT, ['prop-1'], 'prop-2')).toBe(false)
    })
  })
})
