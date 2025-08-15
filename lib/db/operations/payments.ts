import { db } from '../index'
import { 
  Payment, 
  CreatePaymentInput, 
  UpdatePaymentInput,
  PaymentFilters,
  PaymentSchema,
  CreatePaymentSchema,
  UpdatePaymentSchema,
  PaymentFiltersSchema
} from '../models/payment'
import { v4 as uuidv4 } from 'uuid'

// Generate Redis keys for payment data
const getPaymentKey = (id: string) => `payment:${id}`
const getTenantPaymentsKey = (tenantId: string) => `tenant:${tenantId}:payments`
const getPropertyPaymentsKey = (propertyId: string) => `property:${propertyId}:payments`
const getAllPaymentsKey = () => 'payments:all'
const getPaymentsByStatusKey = (status: string) => `payments:status:${status}`

// Create a new payment
export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  try {
    // Validate input
    const validatedInput = CreatePaymentSchema.parse(input)
    
    // Generate ID and timestamps
    const id = uuidv4()
    const now = new Date()
    
    const payment: Payment = {
      ...validatedInput,
      id,
      createdAt: now,
      updatedAt: now
    }

    // Validate complete payment object
    const validatedPayment = PaymentSchema.parse(payment)

    // Store in Redis
    const paymentKey = getPaymentKey(id)
    const tenantPaymentsKey = getTenantPaymentsKey(payment.tenantId)
    const propertyPaymentsKey = getPropertyPaymentsKey(payment.propertyId)
    const allPaymentsKey = getAllPaymentsKey()
    const statusKey = getPaymentsByStatusKey(payment.status)

    // Use pipeline for atomic operations
    const pipeline = db.pipeline()
    
    // Store payment data as hash
    pipeline.hset(paymentKey, {
      ...validatedPayment,
      createdAt: validatedPayment.createdAt.toISOString(),
      updatedAt: validatedPayment.updatedAt.toISOString(),
      dueDate: validatedPayment.dueDate.toISOString(),
      paidDate: validatedPayment.paidDate?.toISOString() || ''
    })
    
    // Add to various indexes
    pipeline.sadd(tenantPaymentsKey, id)
    pipeline.sadd(propertyPaymentsKey, id)
    pipeline.sadd(allPaymentsKey, id)
    pipeline.sadd(statusKey, id)
    
    await pipeline.exec()

    return validatedPayment
  } catch (error) {
    console.error('Error creating payment:', error)
    throw error
  }
}

// Get payment by ID
export async function getPayment(id: string): Promise<Payment | null> {
  try {
    const paymentKey = getPaymentKey(id)
    const data = await db.hgetall(paymentKey)
    
    if (!data || Object.keys(data).length === 0) {
      return null
    }

    // Check for soft delete
    if (data.deletedAt) {
      return null
    }

    // Parse stored data back to proper types
    const payment = {
      ...data,
      amountCents: parseInt(data.amountCents),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      dueDate: new Date(data.dueDate),
      paidDate: data.paidDate ? new Date(data.paidDate) : undefined
    }

    return PaymentSchema.parse(payment)
  } catch (error) {
    console.error('Error fetching payment:', error)
    return null
  }
}

// Update payment
export async function updatePayment(input: UpdatePaymentInput): Promise<Payment | null> {
  try {
    const validatedInput = UpdatePaymentSchema.parse(input)
    const { id, ...updates } = validatedInput

    // Get existing payment
    const existingPayment = await getPayment(id)
    if (!existingPayment) {
      throw new Error('Payment not found')
    }

    // Merge updates with existing data
    const updatedPayment: Payment = {
      ...existingPayment,
      ...updates,
      updatedAt: new Date()
    }

    // Validate updated payment
    const validatedPayment = PaymentSchema.parse(updatedPayment)

    // Update in Redis
    const paymentKey = getPaymentKey(id)
    
    // If status changed, update status indexes
    if (updates.status && updates.status !== existingPayment.status) {
      const oldStatusKey = getPaymentsByStatusKey(existingPayment.status)
      const newStatusKey = getPaymentsByStatusKey(updates.status)
      
      const pipeline = db.pipeline()
      pipeline.srem(oldStatusKey, id)
      pipeline.sadd(newStatusKey, id)
      await pipeline.exec()
    }

    await db.hset(paymentKey, {
      ...validatedPayment,
      createdAt: validatedPayment.createdAt.toISOString(),
      updatedAt: validatedPayment.updatedAt.toISOString(),
      dueDate: validatedPayment.dueDate.toISOString(),
      paidDate: validatedPayment.paidDate?.toISOString() || ''
    })

    return validatedPayment
  } catch (error) {
    console.error('Error updating payment:', error)
    throw error
  }
}

// Soft delete payment
export async function deletePayment(id: string): Promise<boolean> {
  try {
    const existingPayment = await getPayment(id)
    if (!existingPayment) {
      return false
    }

    // Soft delete by setting deletedAt
    const paymentKey = getPaymentKey(id)
    await db.hset(paymentKey, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    return true
  } catch (error) {
    console.error('Error deleting payment:', error)
    return false
  }
}

// Get payments with filters
export async function getPayments(filters?: PaymentFilters): Promise<Payment[]> {
  try {
    let paymentIds: string[] = []

    if (filters) {
      const validatedFilters = PaymentFiltersSchema.parse(filters)
      
      // Start with the most specific filter
      if (validatedFilters.tenantId) {
        const tenantPaymentsKey = getTenantPaymentsKey(validatedFilters.tenantId)
        paymentIds = await db.smembers(tenantPaymentsKey)
      } else if (validatedFilters.propertyId) {
        const propertyPaymentsKey = getPropertyPaymentsKey(validatedFilters.propertyId)
        paymentIds = await db.smembers(propertyPaymentsKey)
      } else if (validatedFilters.status) {
        const statusKey = getPaymentsByStatusKey(validatedFilters.status)
        paymentIds = await db.smembers(statusKey)
      } else {
        const allPaymentsKey = getAllPaymentsKey()
        paymentIds = await db.smembers(allPaymentsKey)
      }
    } else {
      const allPaymentsKey = getAllPaymentsKey()
      paymentIds = await db.smembers(allPaymentsKey)
    }
    
    if (!paymentIds || paymentIds.length === 0) {
      return []
    }

    // Get all payments in parallel
    const payments = await Promise.all(
      paymentIds.map(id => getPayment(id))
    )

    // Filter out null values and apply additional filters
    let filteredPayments = payments.filter((payment): payment is Payment => payment !== null)

    if (filters) {
      const validatedFilters = PaymentFiltersSchema.parse(filters)
      
      // Apply additional filters that couldn't be done at the Redis level
      if (validatedFilters.paymentMethod) {
        filteredPayments = filteredPayments.filter(p => p.paymentMethod === validatedFilters.paymentMethod)
      }
      
      if (validatedFilters.dueDateFrom) {
        filteredPayments = filteredPayments.filter(p => p.dueDate >= validatedFilters.dueDateFrom!)
      }
      
      if (validatedFilters.dueDateTo) {
        filteredPayments = filteredPayments.filter(p => p.dueDate <= validatedFilters.dueDateTo!)
      }
      
      if (validatedFilters.paidDateFrom && validatedFilters.paidDateTo) {
        filteredPayments = filteredPayments.filter(p => 
          p.paidDate && 
          p.paidDate >= validatedFilters.paidDateFrom! && 
          p.paidDate <= validatedFilters.paidDateTo!
        )
      }
    }

    // Sort by due date (most recent first)
    return filteredPayments.sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime())
  } catch (error) {
    console.error('Error fetching payments:', error)
    return []
  }
}

// Get overdue payments
export async function getOverduePayments(propertyId?: string): Promise<Payment[]> {
  try {
    const filters: PaymentFilters = {
      status: 'Pending',
      dueDateTo: new Date()
    }
    
    if (propertyId) {
      filters.propertyId = propertyId
    }

    const overduePayments = await getPayments(filters)
    
    // Mark overdue payments
    const updatePromises = overduePayments.map(payment => 
      updatePayment({ id: payment.id, status: 'Overdue' })
    )
    
    await Promise.all(updatePromises)
    
    return overduePayments.map(p => ({ ...p, status: 'Overdue' as const }))
  } catch (error) {
    console.error('Error fetching overdue payments:', error)
    return []
  }
}

// Mark payment as paid
export async function markPaymentPaid(id: string, paidDate?: Date): Promise<Payment | null> {
  try {
    return await updatePayment({
      id,
      status: 'Paid',
      paidDate: paidDate || new Date()
    })
  } catch (error) {
    console.error('Error marking payment as paid:', error)
    throw error
  }
}

// Get payments by status (used by reminder scheduler)
export async function getPaymentsByStatus(statuses: string[]): Promise<Payment[]> {
  try {
    const allPaymentIds = new Set<string>()
    
    // Get payment IDs for each status
    for (const status of statuses) {
      const statusKey = getPaymentsByStatusKey(status)
      const paymentIds = await db.smembers(statusKey)
      paymentIds.forEach(id => allPaymentIds.add(id))
    }
    
    if (allPaymentIds.size === 0) {
      return []
    }
    
    // Get all payments in parallel
    const payments = await Promise.all(
      Array.from(allPaymentIds).map(id => getPayment(id))
    )
    
    // Filter out null values and sort by due date
    return payments
      .filter((payment): payment is Payment => payment !== null)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
  } catch (error) {
    console.error('Error fetching payments by status:', error)
    return []
  }
}

// Get payment by ID (alias for compatibility)
export async function getPaymentById(id: string): Promise<Payment | null> {
  return getPayment(id)
}
