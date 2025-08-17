// User roles for role-based access control (matching database model)
export enum UserRole {
  PROPERTY_OWNER = 'PROPERTY_OWNER',
  COMMUNITY_MANAGER = 'COMMUNITY_MANAGER', 
  TENANT = 'TENANT'
}

// Note: NextAuth.js utilities are available in ./auth-config.ts for API routes only
// This file contains only client-safe utilities to avoid Edge Runtime issues

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

