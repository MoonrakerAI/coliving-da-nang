import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/payments/batch/route'
import { createPayment } from '@/lib/db/operations/payment'
import { PaymentMethod, PaymentStatus } from '@/lib/db/models/payment'

// Mock the database operations
vi.mock('@/lib/db/operations/payment')
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve({ user: { id: 'test-user' } }))
}))

describe('/api/payments/batch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST', () => {
    const validCSVContent = `tenantId,propertyId,amountCents,currency,paymentMethod,status,dueDate,paidDate,reference,description,notes
tenant-1,property-1,150000,USD,Stripe,Paid,2025-01-01,2025-01-01,RENT-JAN-001,Monthly Rent - January 2025,
tenant-2,property-1,120000,USD,PayPal,Pending,2025-01-01,,,Monthly Rent - January 2025,`

    it('should process valid CSV file successfully', async () => {
      vi.mocked(createPayment).mockResolvedValue({
        id: 'payment-id',
        tenantId: 'tenant-1',
        propertyId: 'property-1',
        amountCents: 150000,
        currency: 'USD',
        paymentMethod: PaymentMethod.STRIPE,
        status: PaymentStatus.PAID,
        dueDate: new Date('2025-01-01'),
        paidDate: new Date('2025-01-01'),
        description: 'Monthly Rent - January 2025',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      const file = new File([validCSVContent], 'payments.csv', { type: 'text/csv' })
      const formData = new FormData()
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/payments/batch', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(2)
      expect(data.failed).toBe(0)
      expect(data.errors).toHaveLength(0)
      expect(createPayment).toHaveBeenCalledTimes(2)
    })

    it('should handle CSV with invalid data', async () => {
      const invalidCSVContent = `tenantId,propertyId,amountCents,currency,paymentMethod,status,dueDate,paidDate,reference,description,notes
invalid-tenant,property-1,-100,USD,Stripe,Paid,2025-01-01,2025-01-01,RENT-JAN-001,Monthly Rent - January 2025,`

      const file = new File([invalidCSVContent], 'payments.csv', { type: 'text/csv' })
      const formData = new FormData()
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/payments/batch', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(0)
      expect(data.failed).toBe(1)
      expect(data.errors).toHaveLength(1)
      expect(data.errors[0].row).toBe(2)
    })

    it('should return 400 for non-CSV file', async () => {
      const file = new File(['not csv content'], 'payments.txt', { type: 'text/plain' })
      const formData = new FormData()
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/payments/batch', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 when no file is provided', async () => {
      const formData = new FormData()

      const request = new NextRequest('http://localhost:3000/api/payments/batch', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 401 when user is not authenticated', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(null)

      const file = new File([validCSVContent], 'payments.csv', { type: 'text/csv' })
      const formData = new FormData()
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/payments/batch', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })
})
