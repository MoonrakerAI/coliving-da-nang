import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { UserRole } from './lib/auth'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Role-based access control
    if (token) {
      const userRole = token.role as UserRole
      
      // Admin-only routes (Property Owner only)
      if (pathname.startsWith('/admin') || pathname.startsWith('/settings')) {
        if (userRole !== UserRole.PROPERTY_OWNER) {
          return NextResponse.redirect(new URL('/dashboard', req.url))
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
        if (userRole !== UserRole.PROPERTY_OWNER) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
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
    '/api/:path*',
    '/payments/:path*',
    '/expenses/:path*',
    '/tenants/:path*'
  ]
}
