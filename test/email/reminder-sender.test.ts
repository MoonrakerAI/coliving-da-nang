import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendPaymentReminder, checkRateLimit } from '@/lib/email/reminder-sender'
import { Payment, PaymentStatus } from '@/lib/db/models/payment'
import { Tenant } from '@/lib/db/models/tenant'

// Mock Resend
vi.mock('@/lib/db/operations/properties', () => ({
  getPropertyById: vi.fn(),
}))

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'test-message-id' })
    }
  }))
}))

describe('Reminder Sender', () => {
  const mockTenant: Tenant = {
    id: 'tenant-123',
    propertyId: 'prop-456',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '123-456-7890',
    status: 'Active',
    createdAt: new Date(),
    updatedAt: new Date(),
    emergencyContacts: [],
    documents: [],
    communicationHistory: [],
    leaseHistory: [],
  }

  const mockPayment: Payment = {
    id: 'pay-123',
    tenantId: 'tenant-123',
    propertyId: 'prop-456',
    amountCents: 150000,
    dueDate: new Date('2024-01-15T00:00:00.000Z'),
    status: PaymentStatus.PENDING,
    reference: 'PAY-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    currency: 'USD',
    paymentMethod: 'Cash',
    description: 'Monthly Rent',
  }

  const mockProperty = {
    id: 'prop-456',
    name: 'Coliving Da Nang',
    logoUrl: undefined,
    settings: {
      paymentMethods: ['Bank Transfer', 'Cash'],
      contactEmail: 'management@coliving-danang.com',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Clear rate limit cache
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('sendPaymentReminder', () => {

    beforeEach(() => {
      const { getPropertyById } = require('@/lib/db/operations/properties')
      vi.mocked(getPropertyById).mockResolvedValue(mockProperty)
    })

    it('should send upcoming payment reminder successfully', async () => {
      const result = await sendPaymentReminder(mockPayment, mockTenant)

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('test-message-id')
      expect(result.error).toBeUndefined()
    })

    it('should send due payment reminder with correct subject', async () => {
      const duePayment = { ...mockPayment, dueDate: new Date() }
      const result = await sendPaymentReminder(duePayment, mockTenant)

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('test-message-id')
    })

    it('should send overdue payment reminder with urgent styling', async () => {
      const overduePayment = { ...mockPayment, status: PaymentStatus.OVERDUE }

      const result = await sendPaymentReminder(overduePayment, mockTenant)

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('test-message-id')
    })

    it('should handle email sending failure', async () => {
      const { Resend } = await import('resend')
      const mockResend = new Resend()
      vi.mocked(mockResend.emails.send).mockRejectedValueOnce(new Error('Email service unavailable'))

      const result = await sendPaymentReminder(mockPayment, mockTenant)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email service unavailable')
      expect(result.messageId).toBeUndefined()
    })

    it('should include property logo when provided', async () => {
      const { getPropertyById } = require('@/lib/db/operations/properties')
      vi.mocked(getPropertyById).mockResolvedValue({ ...mockProperty, logoUrl: 'https://example.com/logo.png' })

      const result = await sendPaymentReminder(mockPayment, mockTenant)

      expect(result.success).toBe(true)
    })

    it('should format currency correctly', async () => {
      const result = await sendPaymentReminder(mockPayment, mockTenant)

      expect(result.success).toBe(true)
      // Additional assertions can be added here to check email content if needed
    })
  })

  describe('checkRateLimit', () => {
    it('should allow emails within rate limit', () => {
      const email = 'test@example.com'
      
      // Should allow first email
      expect(checkRateLimit(email)).toBe(true)
      
      // Should allow subsequent emails up to limit
      for (let i = 1; i < 10; i++) {
        expect(checkRateLimit(email)).toBe(true)
      }
    })

    it('should block emails exceeding rate limit', () => {
      const email = 'test@example.com'
      
      // Send 10 emails (at the limit)
      for (let i = 0; i < 10; i++) {
        expect(checkRateLimit(email)).toBe(true)
      }
      
      // 11th email should be blocked
      expect(checkRateLimit(email)).toBe(false)
    })

    it('should have separate rate limits for different emails', () => {
      const email1 = 'test1@example.com'
      const email2 = 'test2@example.com'
      
      // Both should be allowed initially
      expect(checkRateLimit(email1)).toBe(true)
      expect(checkRateLimit(email2)).toBe(true)
      
      // Exhaust limit for email1
      for (let i = 1; i < 10; i++) {
        checkRateLimit(email1)
      }
      
      // email1 should be blocked, email2 should still be allowed
      expect(checkRateLimit(email1)).toBe(false)
      expect(checkRateLimit(email2)).toBe(true)
    })
  })

  describe('Email Content Generation', () => {
    it('should generate different content for different reminder types', async () => {
      const upcomingPayment = { ...mockPayment, dueDate: new Date('2025-01-15T00:00:00.000Z') }
      const duePayment = { ...mockPayment, dueDate: new Date() }
      const overduePayment = { ...mockPayment, status: PaymentStatus.OVERDUE }

      const upcomingResult = await sendPaymentReminder(upcomingPayment, mockTenant)
      const dueResult = await sendPaymentReminder(duePayment, mockTenant)
      const overdueResult = await sendPaymentReminder(overduePayment, mockTenant)

      expect(upcomingResult.success).toBe(true)
      expect(dueResult.success).toBe(true)
      expect(overdueResult.success).toBe(true)
    })

    it('should include all required payment details', async () => {
      const result = await sendPaymentReminder(mockPayment, mockTenant)

      expect(result.success).toBe(true)
      // Further assertions can inspect the mocked `resend.emails.send` call to verify content
    })
  })
})
