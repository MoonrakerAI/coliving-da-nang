import { NextAuthOptions } from 'next-auth'
import { JWT } from 'next-auth/jwt'
import CredentialsProvider from 'next-auth/providers/credentials'
import { authenticateUser, seedDefaultUsers } from './db/operations/user'
import { seedSamplePayments } from './db/operations/payment'
import { LoginSchema } from './db/models/user'
import { UserRole as DBUserRole } from './db/models/user'

// User roles for role-based access control (matching database model)
export enum UserRole {
  PROPERTY_OWNER = 'PROPERTY_OWNER',
  COMMUNITY_MANAGER = 'COMMUNITY_MANAGER', 
  TENANT = 'TENANT'
}

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      propertyId?: string
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: UserRole
    propertyIds: string[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    propertyIds: string[]
  }
}

// Seed default users and sample payments on startup
if (typeof window === 'undefined') {
  seedDefaultUsers().catch(console.error)
  seedSamplePayments().catch(console.error)
}

// NextAuth configuration
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Validate input format
          const validatedCredentials = LoginSchema.parse({
            email: credentials.email,
            password: credentials.password
          })

          // Authenticate user
          const user = await authenticateUser(
            validatedCredentials.email, 
            validatedCredentials.password
          )

          if (!user) {
            return null
          }

          // Return user object for NextAuth
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as UserRole,
            propertyIds: user.propertyIds
          }
        } catch (error) {
          console.error('Authentication error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.propertyIds = user.propertyIds
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.propertyIds = token.propertyIds
      }
      return session
    },
  },
  pages: {
    signIn: '/signin',
    error: '/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// Helper functions for role-based access control
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy = {
    [UserRole.PROPERTY_OWNER]: 3,
    [UserRole.COMMUNITY_MANAGER]: 2,
    [UserRole.TENANT]: 1,
  }
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

export function canAccessProperty(userRole: UserRole, userPropertyIds: string[], targetPropertyId?: string): boolean {
  // Property owners can access all properties
  if (userRole === UserRole.PROPERTY_OWNER) {
    return true
  }
  
  // Managers and tenants can only access their assigned properties
  return targetPropertyId ? userPropertyIds.includes(targetPropertyId) : false
}

// Helper function to check if user has minimum role level
export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  const roleHierarchy = {
    [UserRole.PROPERTY_OWNER]: 3,
    [UserRole.COMMUNITY_MANAGER]: 2,
    [UserRole.TENANT]: 1,
  }
  
  return roleHierarchy[userRole] >= roleHierarchy[minimumRole]
}

// Helper function to get user permissions
export function getUserPermissions(role: UserRole) {
  const permissions = {
    [UserRole.PROPERTY_OWNER]: {
      canManageUsers: true,
      canManageProperties: true,
      canViewAllPayments: true,
      canManageExpenses: true,
      canViewReports: true,
      canManageSettings: true
    },
    [UserRole.COMMUNITY_MANAGER]: {
      canManageUsers: false,
      canManageProperties: false,
      canViewAllPayments: true,
      canManageExpenses: true,
      canViewReports: true,
      canManageSettings: false
    },
    [UserRole.TENANT]: {
      canManageUsers: false,
      canManageProperties: false,
      canViewAllPayments: false,
      canManageExpenses: false,
      canViewReports: false,
      canManageSettings: false
    }
  }
  
  return permissions[role]
}
