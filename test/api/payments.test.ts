import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/payments/route'
import { createPayment, getAllPayments } from '@/lib/db/operations/payment'
import { PaymentMethod, PaymentStatus } from '@/lib/db/models/payment'

// Mock the database operations
vi.mock('@/lib/db/operations/payment', () => ({
  createPayment: vi.fn(),
  getAllPayments: vi.fn(),
  getPaymentById: vi.fn(),
  updatePayment: vi.fn(),
  deletePayment: vi.fn(),
  seedSamplePayments: vi.fn()
}))
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve({ user: { id: 'test-user' } }))
}))

const mockPayments = [
  {
    id: '1',
    tenantId: 'tenant-1',
    propertyId: 'property-1',
    amountCents: 150000,
    currency: 'USD',
    paymentMethod: PaymentMethod.STRIPE,
    status: PaymentStatus.PAID,
    dueDate: new Date('2025-01-01'),
    paidDate: new Date('2025-01-01'),
    description: 'Monthly Rent - January 2025',
    reference: 'RENT-JAN-001',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    tenantId: 'tenant-2',
    propertyId: 'property-1',
    amountCents: 120000,
    currency: 'USD',
    paymentMethod: PaymentMethod.PAYPAL,
    status: PaymentStatus.PENDING,
    dueDate: new Date('2025-01-01'),
    description: 'Monthly Rent - January 2025',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

describe('/api/payments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return all payments when no filters are applied', async () => {
      vi.mocked(getAllPayments).mockResolvedValue(mockPayments)

      const request = new NextRequest('http://localhost:3000/api/payments')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.payments).toHaveLength(2)
      expect(data.total).toBe(2)
    })

    it('should filter payments by status', async () => {
      const paidPayments = mockPayments.filter(p => p.status === PaymentStatus.PAID)
      vi.mocked(getAllPayments).mockResolvedValue(paidPayments)

      const request = new NextRequest('http://localhost:3000/api/payments?status=Paid')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.payments).toHaveLength(1)
      expect(data.payments[0].status).toBe(PaymentStatus.PAID)
    })

    it('should return 401 when user is not authenticated', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/payments')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })

  describe('POST', () => {
    const validPaymentData = {
      tenantId: 'tenant-1',
      propertyId: 'property-1',
      amountCents: 150000,
      currency: 'USD',
      paymentMethod: PaymentMethod.STRIPE,
      status: PaymentStatus.PAID,
      dueDate: new Date('2025-01-01'),
      paidDate: new Date('2025-01-01'),
      description: 'Monthly Rent - January 2025'
    }

    it('should create a new payment successfully', async () => {
      const createdPayment = { ...validPaymentData, id: 'new-payment-id', createdAt: new Date(), updatedAt: new Date() }
      vi.mocked(createPayment).mockResolvedValue(createdPayment)

      const request = new NextRequest('http://localhost:3000/api/payments', {
        method: 'POST',
        body: JSON.stringify(validPaymentData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.message).toBe('Payment recorded successfully')
      expect(data.payment.id).toBe('new-payment-id')
      expect(createPayment).toHaveBeenCalledWith(validPaymentData)
    })

    it('should return 400 for invalid payment data', async () => {
      const invalidData = { ...validPaymentData, amountCents: -100 } // Invalid negative amount

      const request = new NextRequest('http://localhost:3000/api/payments', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 401 when user is not authenticated', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/payments', {
        method: 'POST',
        body: JSON.stringify(validPaymentData)
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(createPayment).mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/payments', {
        method: 'POST',
        body: JSON.stringify(validPaymentData)
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })
})
