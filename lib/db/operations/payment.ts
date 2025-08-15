import { v4 as uuidv4 } from 'uuid'
import { 
  Payment, 
  CreatePayment, 
  UpdatePayment,
  PaymentSchema,
  CreatePaymentSchema,
  UpdatePaymentSchema,
  PaymentStatus,
  PaymentMethod
} from '../models/payment'

// In-memory storage for development (replace with actual database in production)
let payments: Payment[] = []

// Payment CRUD operations
export async function createPayment(paymentData: CreatePayment): Promise<Payment> {
  // Validate input
  const validatedData = CreatePaymentSchema.parse(paymentData)
  
  // Create payment
  const now = new Date()
  const payment: Payment = {
    id: uuidv4(),
    ...validatedData,
    createdAt: now,
    updatedAt: now
  }
  
  // Validate complete payment object
  const validatedPayment = PaymentSchema.parse(payment)
  
  // Store payment
  payments.push(validatedPayment)
  
  return validatedPayment
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  return payments.find(p => p.id === id && !p.deletedAt) || null
}

export async function getAllPayments(): Promise<Payment[]> {
  return payments.filter(p => !p.deletedAt)
}

export async function getPaymentsByProperty(propertyId: string): Promise<Payment[]> {
  return payments.filter(p => p.propertyId === propertyId && !p.deletedAt)
}

export async function getPaymentsByTenant(tenantId: string): Promise<Payment[]> {
  return payments.filter(p => p.tenantId === tenantId && !p.deletedAt)
}

export async function getPaymentsByStatus(status: keyof typeof PaymentStatus): Promise<Payment[]> {
  return payments.filter(p => p.status === status && !p.deletedAt)
}

export async function updatePayment(id: string, updates: UpdatePayment): Promise<Payment | null> {
  const paymentIndex = payments.findIndex(p => p.id === id && !p.deletedAt)
  if (paymentIndex === -1) {
    return null
  }
  
  // Validate updates
  const validatedUpdates = UpdatePaymentSchema.parse(updates)
  
  // Update payment
  const updatedPayment = {
    ...payments[paymentIndex],
    ...validatedUpdates,
    updatedAt: new Date()
  }
  
  // Validate complete payment object
  const validatedPayment = PaymentSchema.parse(updatedPayment)
  
  payments[paymentIndex] = validatedPayment
  return validatedPayment
}

export async function deletePayment(id: string): Promise<boolean> {
  const paymentIndex = payments.findIndex(p => p.id === id && !p.deletedAt)
  if (paymentIndex === -1) {
    return false
  }
  
  // Soft delete
  payments[paymentIndex] = {
    ...payments[paymentIndex],
    deletedAt: new Date(),
    updatedAt: new Date()
  }
  
  return true
}

// Payment status operations
export async function markPaymentAsPaid(id: string, paidDate?: Date, reference?: string): Promise<Payment | null> {
  return updatePayment(id, {
    status: PaymentStatus.PAID,
    paidDate: paidDate || new Date(),
    reference
  })
}

export async function markPaymentAsOverdue(id: string): Promise<Payment | null> {
  return updatePayment(id, {
    status: PaymentStatus.OVERDUE
  })
}

// Bulk operations
export async function bulkUpdatePaymentStatus(
  paymentIds: string[], 
  status: keyof typeof PaymentStatus,
  additionalData?: Partial<Payment>
): Promise<Payment[]> {
  const updatedPayments: Payment[] = []
  
  for (const id of paymentIds) {
    const updated = await updatePayment(id, {
      status,
      ...additionalData
    })
    if (updated) {
      updatedPayments.push(updated)
    }
  }
  
  return updatedPayments
}

// Payment filtering and sorting
export async function getFilteredPayments(filters: {
  propertyId?: string
  tenantId?: string
  status?: keyof typeof PaymentStatus
  startDate?: Date
  endDate?: Date
  paymentMethod?: keyof typeof PaymentMethod
}): Promise<Payment[]> {
  let filteredPayments = payments.filter(p => !p.deletedAt)
  
  if (filters.propertyId) {
    filteredPayments = filteredPayments.filter(p => p.propertyId === filters.propertyId)
  }
  
  if (filters.tenantId) {
    filteredPayments = filteredPayments.filter(p => p.tenantId === filters.tenantId)
  }
  
  if (filters.status) {
    filteredPayments = filteredPayments.filter(p => p.status === filters.status)
  }
  
  if (filters.startDate) {
    filteredPayments = filteredPayments.filter(p => new Date(p.dueDate) >= filters.startDate!)
  }
  
  if (filters.endDate) {
    filteredPayments = filteredPayments.filter(p => new Date(p.dueDate) <= filters.endDate!)
  }
  
  if (filters.paymentMethod) {
    filteredPayments = filteredPayments.filter(p => p.paymentMethod === filters.paymentMethod)
  }
  
  return filteredPayments
}

export async function sortPayments(
  payments: Payment[], 
  sortBy: 'dueDate' | 'amount' | 'status' | 'createdAt',
  order: 'asc' | 'desc' = 'asc'
): Promise<Payment[]> {
  return [...payments].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'dueDate':
        comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        break
      case 'amount':
        comparison = a.amountCents - b.amountCents
        break
      case 'status':
        comparison = a.status.localeCompare(b.status)
        break
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
    }
    
    return order === 'desc' ? -comparison : comparison
  })
}

// Payment statistics
export async function getPaymentStatistics(propertyId?: string): Promise<{
  total: number
  paid: number
  pending: number
  overdue: number
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  overdueAmount: number
}> {
  let relevantPayments = payments.filter(p => !p.deletedAt)
  
  if (propertyId) {
    relevantPayments = relevantPayments.filter(p => p.propertyId === propertyId)
  }
  
  const stats = {
    total: relevantPayments.length,
    paid: relevantPayments.filter(p => p.status === PaymentStatus.PAID).length,
    pending: relevantPayments.filter(p => p.status === PaymentStatus.PENDING).length,
    overdue: relevantPayments.filter(p => p.status === PaymentStatus.OVERDUE).length,
    totalAmount: relevantPayments.reduce((sum, p) => sum + p.amountCents, 0),
    paidAmount: relevantPayments.filter(p => p.status === PaymentStatus.PAID).reduce((sum, p) => sum + p.amountCents, 0),
    pendingAmount: relevantPayments.filter(p => p.status === PaymentStatus.PENDING).reduce((sum, p) => sum + p.amountCents, 0),
    overdueAmount: relevantPayments.filter(p => p.status === PaymentStatus.OVERDUE).reduce((sum, p) => sum + p.amountCents, 0)
  }
  
  return stats
}

// Seed sample payments for development
export async function seedSamplePayments(): Promise<void> {
  // Check if payments already exist
  if (payments.length > 0) {
    return
  }
  
  // Sample tenant and property IDs (these would come from actual data)
  const sampleTenantIds = [
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440003'
  ]
  
  const samplePropertyId = '550e8400-e29b-41d4-a716-446655440000'
  
  // Create sample payments
  const samplePayments: CreatePayment[] = [
    {
      tenantId: sampleTenantIds[0],
      propertyId: samplePropertyId,
      amountCents: 150000, // $1,500
      currency: 'USD',
      paymentMethod: PaymentMethod.STRIPE,
      status: PaymentStatus.PAID,
      dueDate: new Date('2025-01-01'),
      paidDate: new Date('2024-12-28'),
      description: 'Monthly Rent - January 2025',
      reference: 'RENT-JAN-2025-001'
    },
    {
      tenantId: sampleTenantIds[1],
      propertyId: samplePropertyId,
      amountCents: 120000, // $1,200
      currency: 'USD',
      paymentMethod: PaymentMethod.PAYPAL,
      status: PaymentStatus.PENDING,
      dueDate: new Date('2025-01-01'),
      description: 'Monthly Rent - January 2025'
    },
    {
      tenantId: sampleTenantIds[2],
      propertyId: samplePropertyId,
      amountCents: 180000, // $1,800
      currency: 'USD',
      paymentMethod: PaymentMethod.WIRE,
      status: PaymentStatus.OVERDUE,
      dueDate: new Date('2024-12-01'),
      description: 'Monthly Rent - December 2024',
      notes: 'Payment reminder sent on 2024-12-15'
    }
  ]
  
  for (const paymentData of samplePayments) {
    await createPayment(paymentData)
  }
  
  console.log(`Seeded ${samplePayments.length} sample payments`)
}
