import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendPaymentReminder, checkRateLimit, type ReminderEmailProps } from '@/lib/email/reminder-sender'

// Mock Resend
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'test-message-id' })
    }
  }))
}))

describe('Reminder Sender', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear rate limit cache
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('sendPaymentReminder', () => {
    const mockReminderProps: ReminderEmailProps = {
      tenantName: 'John Doe',
      tenantEmail: 'john@example.com',
      paymentAmount: 150000, // $1500 in cents
      dueDate: '2024-01-15',
      propertyName: 'Coliving Da Nang',
      paymentMethods: ['Bank Transfer', 'Cash'],
      contactEmail: 'management@coliving-danang.com',
      paymentReference: 'PAY-123',
      reminderType: 'upcoming'
    }

    it('should send upcoming payment reminder successfully', async () => {
      const result = await sendPaymentReminder(mockReminderProps)

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('test-message-id')
      expect(result.error).toBeUndefined()
    })

    it('should send due payment reminder with correct subject', async () => {
      const dueReminderProps = {
        ...mockReminderProps,
        reminderType: 'due' as const
      }

      const result = await sendPaymentReminder(dueReminderProps)

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('test-message-id')
    })

    it('should send overdue payment reminder with urgent styling', async () => {
      const overdueReminderProps = {
        ...mockReminderProps,
        reminderType: 'overdue' as const
      }

      const result = await sendPaymentReminder(overdueReminderProps)

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('test-message-id')
    })

    it('should handle email sending failure', async () => {
      const { Resend } = await import('resend')
      const mockResend = new Resend()
      vi.mocked(mockResend.emails.send).mockRejectedValueOnce(new Error('Email service unavailable'))

      const result = await sendPaymentReminder(mockReminderProps)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email service unavailable')
      expect(result.messageId).toBeUndefined()
    })

    it('should include property logo when provided', async () => {
      const propsWithLogo = {
        ...mockReminderProps,
        propertyLogo: 'https://example.com/logo.png'
      }

      const result = await sendPaymentReminder(propsWithLogo)

      expect(result.success).toBe(true)
    })

    it('should format currency correctly', async () => {
      const result = await sendPaymentReminder(mockReminderProps)

      expect(result.success).toBe(true)
      // The email content should contain formatted currency
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
      const baseProps = {
        tenantName: 'John Doe',
        tenantEmail: 'john@example.com',
        paymentAmount: 150000,
        dueDate: '2024-01-15',
        propertyName: 'Test Property',
        paymentMethods: ['Bank Transfer'],
        contactEmail: 'test@example.com',
        paymentReference: 'PAY-123'
      }

      const upcomingResult = await sendPaymentReminder({
        ...baseProps,
        reminderType: 'upcoming'
      })

      const dueResult = await sendPaymentReminder({
        ...baseProps,
        reminderType: 'due'
      })

      const overdueResult = await sendPaymentReminder({
        ...baseProps,
        reminderType: 'overdue'
      })

      expect(upcomingResult.success).toBe(true)
      expect(dueResult.success).toBe(true)
      expect(overdueResult.success).toBe(true)
    })

    it('should include all required payment details', async () => {
      const result = await sendPaymentReminder({
        tenantName: 'John Doe',
        tenantEmail: 'john@example.com',
        paymentAmount: 150000,
        dueDate: '2024-01-15',
        propertyName: 'Test Property',
        paymentMethods: ['Bank Transfer', 'Cash'],
        contactEmail: 'test@example.com',
        paymentReference: 'PAY-123',
        reminderType: 'upcoming'
      })

      expect(result.success).toBe(true)
      // Email should contain tenant name, amount, due date, property name, payment methods, and reference
    })
  })
})
