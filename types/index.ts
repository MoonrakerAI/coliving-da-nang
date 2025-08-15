// Re-export all types from database models for consistency
export * from '../lib/db/models/tenant'
export * from '../lib/db/models/property'
export * from '../lib/db/models/payment'
export * from '../lib/db/models/expense'

// Legacy User types for compatibility (to be migrated)
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  propertyId?: string
  createdAt: Date
  updatedAt: Date
}

export enum UserRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  TENANT = 'tenant'
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Form types for UI components
export interface CreatePropertyForm {
  name: string
  address: {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  roomCount: number
  settings: {
    allowPets: boolean
    smokingAllowed: boolean
    maxOccupancy: number
    checkInTime: string
    checkOutTime: string
    wifiPassword?: string
    parkingAvailable: boolean
  }
  houseRules: string[]
  ownerId: string
}

export interface CreateTenantForm {
  email: string
  firstName: string
  lastName: string
  phone: string
  emergencyContact: {
    name: string
    phone: string
    relationship: string
  }
  propertyId: string
  roomNumber: string
  leaseStart: string
  leaseEnd: string
  monthlyRentCents: number
  depositCents: number
  profilePhoto?: string
}

export interface CreatePaymentForm {
  tenantId: string
  propertyId: string
  amountCents: number
  currency: string
  paymentMethod: string
  description: string
  dueDate: string
  reference?: string
  notes?: string
}

export interface CreateExpenseForm {
  propertyId: string
  userId: string
  amountCents: number
  currency: string
  category: string
  description: string
  expenseDate: string
  receiptPhotos?: string[]
  needsReimbursement: boolean
  location?: {
    latitude: number
    longitude: number
    address?: string
    placeName?: string
  }
}

// Dashboard and analytics types
export interface PropertyDashboard {
  property: Property
  tenants: Tenant[]
  recentPayments: Payment[]
  overduePayments: Payment[]
  recentExpenses: Expense[]
  monthlyRevenue: number
  monthlyExpenses: number
  occupancyRate: number
}

export interface PaymentSummary {
  totalPaid: number
  totalPending: number
  totalOverdue: number
  paymentsByMethod: Record<string, number>
  paymentsByStatus: Record<string, number>
}

export interface ExpenseSummary {
  totalExpenses: number
  expensesByCategory: Record<string, number>
  pendingReimbursements: number
  averageMonthlyExpenses: number
}
