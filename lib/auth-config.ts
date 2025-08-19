import { NextAuthOptions, getServerSession } from 'next-auth'
import { JWT } from 'next-auth/jwt'
import CredentialsProvider from 'next-auth/providers/credentials'
import { authenticateUser } from './db/operations/user'
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

// Authentication utilities for API routes
export async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new Error('Authentication required')
  }
  return session
}

export async function getSession() {
  return await getServerSession(authOptions)
}
