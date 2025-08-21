import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { UserRole } from './lib/auth'
import { canAccess, isPermifyEnabled } from './lib/permify/client'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Ensure API routes return JSON for unauthorized instead of HTML
    if (pathname.startsWith('/api')) {
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Role-based access control
    if (token) {
      const userRole = token.role as UserRole
      
      // Admin-only routes (Property Owner only)
      if (pathname.startsWith('/admin') || pathname.startsWith('/settings')) {
        // If Permify is enabled, enforce policy; otherwise fallback to role gate
        if (isPermifyEnabled()) {
          // Synchronous middleware: we cannot await here. Switch to NextResponse.rewrite to an API check if needed.
          // For simplicity, keep role fallback in middleware and do fine-grained checks in server actions/API.
          if (userRole !== UserRole.PROPERTY_OWNER) {
            return NextResponse.redirect(new URL('/dashboard', req.url))
          }
        } else {
          if (userRole !== UserRole.PROPERTY_OWNER) {
            return NextResponse.redirect(new URL('/dashboard', req.url))
          }
        }
      }
      
      // Manager and Owner routes
      if (pathname.startsWith('/expenses') || pathname.startsWith('/payments')) {
        if (userRole === UserRole.TENANT) {
          return NextResponse.redirect(new URL('/dashboard', req.url))
        }
      }
      
      // API route protection with role checking
      if (pathname.startsWith('/api/admin')) {
        if (isPermifyEnabled()) {
          // We can't await in middleware; enforce again inside the route using Permify check helper.
          if (userRole !== UserRole.PROPERTY_OWNER) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
          }
        } else {
          if (userRole !== UserRole.PROPERTY_OWNER) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
          }
        }
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Allow API routes through; we'll enforce inside the middleware above
        if (pathname.startsWith('/api/')) {
          return true
        }

        // Public routes that don't require authentication
        const publicRoutes = ['/signin', '/forgot-password', '/reset-password', '/api/auth']
        if (publicRoutes.some(route => pathname.startsWith(route))) {
          return true
        }
        
        // All other routes require authentication
        if (pathname.startsWith('/dashboard') || 
            pathname.startsWith('/admin') || 
            pathname.startsWith('/settings') ||
            pathname.startsWith('/expenses') ||
            pathname.startsWith('/payments') ||
            pathname.startsWith('/tenants') ||
            pathname.startsWith('/api/')) {
          return !!token
        }
        
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/api/:path*',
    '/payments/:path*',
    '/expenses/:path*',
    '/tenants/:path*'
  ]
}
