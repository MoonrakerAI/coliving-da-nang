import { describe, it, expect, beforeEach } from 'vitest'
import { 
  createPayment, 
  getAllPayments, 
  getPaymentsByStatus,
  updatePayment,
  markPaymentAsPaid,
  getFilteredPayments,
  sortPayments,
  getPaymentStatistics,
  seedSamplePayments
} from '../lib/db/operations/payment'
import { PaymentStatus, PaymentMethod } from '../lib/db/models/payment'

describe('Payment Dashboard Operations', () => {
  beforeEach(async () => {
    // Clear existing payments and seed fresh data
    const allPayments = await getAllPayments()
    for (const payment of allPayments) {
      // In a real implementation, you'd have a proper delete function
    }
    await seedSamplePayments()
  })

  describe('Payment CRUD Operations', () => {
    it('should create a new payment', async () => {
      const paymentData = {
        tenantId: '550e8400-e29b-41d4-a716-446655440004',
        propertyId: '550e8400-e29b-41d4-a716-446655440000',
        amountCents: 200000, // $2,000
        currency: 'USD',
        paymentMethod: PaymentMethod.STRIPE,
        status: PaymentStatus.PENDING,
        dueDate: new Date('2025-02-01'),
        description: 'Monthly Rent - February 2025'
      }

      const payment = await createPayment(paymentData)

      expect(payment).toBeDefined()
      expect(payment.id).toBeDefined()
      expect(payment.amountCents).toBe(200000)
      expect(payment.status).toBe(PaymentStatus.PENDING)
      expect(payment.description).toBe('Monthly Rent - February 2025')
      expect(payment.createdAt).toBeDefined()
      expect(payment.updatedAt).toBeDefined()
    })

    it('should get all payments', async () => {
      const payments = await getAllPayments()
      
      expect(Array.isArray(payments)).toBe(true)
      expect(payments.length).toBeGreaterThan(0)
      
      // Check that sample payments were seeded
      const paidPayments = payments.filter(p => p.status === PaymentStatus.PAID)
      const pendingPayments = payments.filter(p => p.status === PaymentStatus.PENDING)
      const overduePayments = payments.filter(p => p.status === PaymentStatus.OVERDUE)
      
      expect(paidPayments.length).toBeGreaterThan(0)
      expect(pendingPayments.length).toBeGreaterThan(0)
      expect(overduePayments.length).toBeGreaterThan(0)
    })

    it('should update payment status', async () => {
      const payments = await getAllPayments()
      const pendingPayment = payments.find(p => p.status === PaymentStatus.PENDING)
      
      expect(pendingPayment).toBeDefined()
      
      if (pendingPayment) {
        const updatedPayment = await updatePayment(pendingPayment.id, {
          status: PaymentStatus.PAID,
          paidDate: new Date()
        })
        
        expect(updatedPayment).toBeDefined()
        expect(updatedPayment?.status).toBe(PaymentStatus.PAID)
        expect(updatedPayment?.paidDate).toBeDefined()
      }
    })

    it('should mark payment as paid', async () => {
      // Create a fresh pending payment for this test
      const paymentData = {
        tenantId: '550e8400-e29b-41d4-a716-446655440005',
        propertyId: '550e8400-e29b-41d4-a716-446655440000',
        amountCents: 150000,
        currency: 'USD',
        paymentMethod: PaymentMethod.STRIPE,
        status: PaymentStatus.PENDING,
        dueDate: new Date('2025-03-01'),
        description: 'Test Payment for Mark as Paid'
      }
      
      const pendingPayment = await createPayment(paymentData)
      expect(pendingPayment).toBeDefined()
      expect(pendingPayment.status).toBe(PaymentStatus.PENDING)
      
      const paidDate = new Date()
      const reference = 'TEST-PAYMENT-REF-001'
      
      const updatedPayment = await markPaymentAsPaid(pendingPayment.id, paidDate, reference)
      
      expect(updatedPayment).toBeDefined()
      expect(updatedPayment?.status).toBe(PaymentStatus.PAID)
      expect(updatedPayment?.paidDate).toBeDefined()
      expect(updatedPayment?.reference).toBe(reference)
    })
  })

  describe('Payment Filtering and Sorting', () => {
    it('should filter payments by status', async () => {
      const paidPayments = await getPaymentsByStatus(PaymentStatus.PAID)
      const pendingPayments = await getPaymentsByStatus(PaymentStatus.PENDING)
      const overduePayments = await getPaymentsByStatus(PaymentStatus.OVERDUE)
      
      expect(Array.isArray(paidPayments)).toBe(true)
      expect(Array.isArray(pendingPayments)).toBe(true)
      expect(Array.isArray(overduePayments)).toBe(true)
      
      // Verify all payments have the correct status
      paidPayments.forEach(payment => {
        expect(payment.status).toBe(PaymentStatus.PAID)
      })
      
      pendingPayments.forEach(payment => {
        expect(payment.status).toBe(PaymentStatus.PENDING)
      })
      
      overduePayments.forEach(payment => {
        expect(payment.status).toBe(PaymentStatus.OVERDUE)
      })
    })

    it('should filter payments by date range', async () => {
      const startDate = new Date('2024-12-01')
      const endDate = new Date('2025-01-31')
      
      const filteredPayments = await getFilteredPayments({
        startDate,
        endDate
      })
      
      expect(Array.isArray(filteredPayments)).toBe(true)
      
      filteredPayments.forEach(payment => {
        const dueDate = new Date(payment.dueDate)
        expect(dueDate >= startDate).toBe(true)
        expect(dueDate <= endDate).toBe(true)
      })
    })

    it('should sort payments by due date', async () => {
      const payments = await getAllPayments()
      
      const sortedAsc = await sortPayments(payments, 'dueDate', 'asc')
      const sortedDesc = await sortPayments(payments, 'dueDate', 'desc')
      
      expect(sortedAsc.length).toBe(payments.length)
      expect(sortedDesc.length).toBe(payments.length)
      
      // Check ascending order
      for (let i = 1; i < sortedAsc.length; i++) {
        const prevDate = new Date(sortedAsc[i - 1].dueDate)
        const currDate = new Date(sortedAsc[i].dueDate)
        expect(prevDate <= currDate).toBe(true)
      }
      
      // Check descending order
      for (let i = 1; i < sortedDesc.length; i++) {
        const prevDate = new Date(sortedDesc[i - 1].dueDate)
        const currDate = new Date(sortedDesc[i].dueDate)
        expect(prevDate >= currDate).toBe(true)
      }
    })

    it('should sort payments by amount', async () => {
      const payments = await getAllPayments()
      
      const sortedAsc = await sortPayments(payments, 'amount', 'asc')
      const sortedDesc = await sortPayments(payments, 'amount', 'desc')
      
      // Check ascending order
      for (let i = 1; i < sortedAsc.length; i++) {
        expect(sortedAsc[i - 1].amountCents <= sortedAsc[i].amountCents).toBe(true)
      }
      
      // Check descending order
      for (let i = 1; i < sortedDesc.length; i++) {
        expect(sortedDesc[i - 1].amountCents >= sortedDesc[i].amountCents).toBe(true)
      }
    })
  })

  describe('Payment Statistics', () => {
    it('should calculate payment statistics', async () => {
      const stats = await getPaymentStatistics()
      
      expect(stats).toBeDefined()
      expect(typeof stats.total).toBe('number')
      expect(typeof stats.paid).toBe('number')
      expect(typeof stats.pending).toBe('number')
      expect(typeof stats.overdue).toBe('number')
      expect(typeof stats.totalAmount).toBe('number')
      expect(typeof stats.paidAmount).toBe('number')
      expect(typeof stats.pendingAmount).toBe('number')
      expect(typeof stats.overdueAmount).toBe('number')
      
      // Verify totals add up
      expect(stats.paid + stats.pending + stats.overdue).toBe(stats.total)
      expect(stats.paidAmount + stats.pendingAmount + stats.overdueAmount).toBe(stats.totalAmount)
      
      // Verify positive amounts
      expect(stats.totalAmount).toBeGreaterThanOrEqual(0)
      expect(stats.paidAmount).toBeGreaterThanOrEqual(0)
      expect(stats.pendingAmount).toBeGreaterThanOrEqual(0)
      expect(stats.overdueAmount).toBeGreaterThanOrEqual(0)
    })

    it('should calculate statistics for specific property', async () => {
      const propertyId = '550e8400-e29b-41d4-a716-446655440000'
      const stats = await getPaymentStatistics(propertyId)
      
      expect(stats).toBeDefined()
      expect(stats.total).toBeGreaterThan(0)
      
      // Verify all payments belong to the property
      const allPayments = await getAllPayments()
      const propertyPayments = allPayments.filter(p => p.propertyId === propertyId)
      expect(stats.total).toBe(propertyPayments.length)
    })
  })

  describe('Payment Validation', () => {
    it('should validate payment creation data', async () => {
      const invalidPaymentData = {
        tenantId: '', // Invalid: empty string
        propertyId: 'test-property-001',
        amountCents: -1000, // Invalid: negative amount
        currency: 'USD',
        paymentMethod: PaymentMethod.STRIPE,
        status: PaymentStatus.PENDING,
        dueDate: new Date('2025-02-01'),
        description: 'Test Payment'
      }

      await expect(createPayment(invalidPaymentData as any)).rejects.toThrow()
    })

    it('should validate payment update data', async () => {
      const payments = await getAllPayments()
      const payment = payments[0]
      
      const invalidUpdateData = {
        amountCents: -5000 // Invalid: negative amount
      }

      await expect(updatePayment(payment.id, invalidUpdateData as any)).rejects.toThrow()
    })
  })

  describe('Dashboard Integration', () => {
    it('should provide data for dashboard summary cards', async () => {
      const payments = await getAllPayments()
      const stats = await getPaymentStatistics()
      
      // Verify dashboard can calculate summary data
      const summaryData = {
        totalPayments: stats.total,
        paidPayments: stats.paid,
        pendingPayments: stats.pending,
        overduePayments: stats.overdue,
        totalRevenue: stats.paidAmount / 100, // Convert cents to dollars
        pendingRevenue: stats.pendingAmount / 100,
        overdueRevenue: stats.overdueAmount / 100
      }
      
      expect(summaryData.totalPayments).toBe(payments.length)
      expect(summaryData.paidPayments + summaryData.pendingPayments + summaryData.overduePayments).toBe(summaryData.totalPayments)
      expect(summaryData.totalRevenue).toBeGreaterThanOrEqual(0)
      expect(summaryData.pendingRevenue).toBeGreaterThanOrEqual(0)
      expect(summaryData.overdueRevenue).toBeGreaterThanOrEqual(0)
    })

    it('should support dashboard filtering requirements', async () => {
      // Test all filter combinations that the dashboard uses
      const allPayments = await getAllPayments()
      
      // Status filters
      const statusFilters = [PaymentStatus.PAID, PaymentStatus.PENDING, PaymentStatus.OVERDUE]
      for (const status of statusFilters) {
        const filtered = await getFilteredPayments({ status })
        expect(Array.isArray(filtered)).toBe(true)
        filtered.forEach(payment => {
          expect(payment.status).toBe(status)
        })
      }
      
      // Date range filters
      const dateFiltered = await getFilteredPayments({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-12-31')
      })
      expect(Array.isArray(dateFiltered)).toBe(true)
      
      // Combined filters
      const combinedFiltered = await getFilteredPayments({
        status: PaymentStatus.PENDING,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-12-31')
      })
      expect(Array.isArray(combinedFiltered)).toBe(true)
      combinedFiltered.forEach(payment => {
        expect(payment.status).toBe(PaymentStatus.PENDING)
      })
    })
  })
})

describe('Payment Dashboard API Integration', () => {
  it('should handle payment status updates via API format', async () => {
    const payments = await getAllPayments()
    const testPayment = payments.find(p => p.status === PaymentStatus.PENDING)
    
    if (testPayment) {
      // Simulate API update format
      const updateData = {
        status: PaymentStatus.PAID,
        paidDate: new Date().toISOString()
      }
      
      const updatedPayment = await updatePayment(testPayment.id, {
        status: updateData.status,
        paidDate: new Date(updateData.paidDate)
      })
      
      expect(updatedPayment?.status).toBe(PaymentStatus.PAID)
      expect(updatedPayment?.paidDate).toBeDefined()
    }
  })

  it('should provide data in format expected by dashboard components', async () => {
    const payments = await getAllPayments()
    const stats = await getPaymentStatistics()
    
    // Verify data structure matches component expectations
    payments.forEach(payment => {
      expect(payment).toHaveProperty('id')
      expect(payment).toHaveProperty('tenantId')
      expect(payment).toHaveProperty('propertyId')
      expect(payment).toHaveProperty('amountCents')
      expect(payment).toHaveProperty('currency')
      expect(payment).toHaveProperty('paymentMethod')
      expect(payment).toHaveProperty('status')
      expect(payment).toHaveProperty('dueDate')
      expect(payment).toHaveProperty('description')
      expect(payment).toHaveProperty('createdAt')
      expect(payment).toHaveProperty('updatedAt')
    })
    
    // Verify stats structure
    expect(stats).toHaveProperty('total')
    expect(stats).toHaveProperty('paid')
    expect(stats).toHaveProperty('pending')
    expect(stats).toHaveProperty('overdue')
    expect(stats).toHaveProperty('totalAmount')
    expect(stats).toHaveProperty('paidAmount')
    expect(stats).toHaveProperty('pendingAmount')
    expect(stats).toHaveProperty('overdueAmount')
  })
})
