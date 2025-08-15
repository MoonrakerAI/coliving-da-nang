import { NextAuthOptions } from 'next-auth'
import { JWT } from 'next-auth/jwt'

// User roles for role-based access control
export enum UserRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  TENANT = 'tenant'
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
    propertyId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    propertyId?: string
  }
}

// NextAuth configuration
export const authOptions: NextAuthOptions = {
  providers: [
    // Providers will be configured here
    // For now, we'll use a placeholder structure
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.propertyId = user.propertyId
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.propertyId = token.propertyId
      }
      return session
    },
  },
  pages: {
    signIn: '/signin',
  },
  session: {
    strategy: 'jwt',
  },
}

// Helper functions for role-based access control
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy = {
    [UserRole.OWNER]: 3,
    [UserRole.MANAGER]: 2,
    [UserRole.TENANT]: 1,
  }
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

export function canAccessProperty(userRole: UserRole, userPropertyId?: string, targetPropertyId?: string): boolean {
  // Owners can access all properties
  if (userRole === UserRole.OWNER) {
    return true
  }
  
  // Managers and tenants can only access their assigned property
  return userPropertyId === targetPropertyId
}
