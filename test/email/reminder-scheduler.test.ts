import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { processAutomatedReminders, sendManualReminder } from '@/lib/email/reminder-scheduler'

// Mock dependencies
vi.mock('@/lib/db/operations/payments', () => ({
  getPaymentsByStatus: vi.fn(),
  getPaymentById: vi.fn()
}))

vi.mock('@/lib/db/operations/tenants', () => ({
  getTenantById: vi.fn()
}))

vi.mock('@/lib/db/operations/properties', () => ({
  getPropertyById: vi.fn()
}))

vi.mock('@/lib/db/operations/reminders', () => ({
  createReminderLog: vi.fn(),
  getReminderHistory: vi.fn()
}))

vi.mock('@/lib/email/reminder-sender', () => ({
  sendPaymentReminder: vi.fn(),
  checkRateLimit: vi.fn()
}))

describe('Reminder Scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('processAutomatedReminders', () => {
    it('should process pending and overdue payments', async () => {
      const { getPaymentsByStatus } = await import('@/lib/db/operations/payments')
      const { getTenantById } = await import('@/lib/db/operations/tenants')
      const { getPropertyById } = await import('@/lib/db/operations/properties')
      const { sendPaymentReminder, checkRateLimit } = await import('@/lib/email/reminder-sender')
      const { getReminderHistory, createReminderLog } = await import('@/lib/db/operations/reminders')

      // Mock payment data
      const mockPayments = [
        {
          id: 'payment-1',
          tenantId: 'tenant-1',
          propertyId: 'property-1',
          amount: 150000,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          status: 'pending',
          reference: 'PAY-001'
        }
      ]

      const mockTenant = {
        id: 'tenant-1',
        name: 'John Doe',
        email: 'john@example.com'
      }

      const mockProperty = {
        id: 'property-1',
        name: 'Test Property',
        contactEmail: 'management@test.com',
        paymentMethods: ['Bank Transfer', 'Cash']
      }

      vi.mocked(getPaymentsByStatus).mockResolvedValue(mockPayments)
      vi.mocked(getTenantById).mockResolvedValue(mockTenant)
      vi.mocked(getPropertyById).mockResolvedValue(mockProperty)
      vi.mocked(getReminderHistory).mockResolvedValue([])
      vi.mocked(checkRateLimit).mockReturnValue(true)
      vi.mocked(sendPaymentReminder).mockResolvedValue({
        success: true,
        messageId: 'test-message-id'
      })
      vi.mocked(createReminderLog).mockResolvedValue({} as any)

      const result = await processAutomatedReminders()

      expect(result.processed).toBe(1)
      expect(result.sent).toBe(1)
      expect(result.skipped).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should skip payments that already have reminders sent today', async () => {
      const { getPaymentsByStatus } = await import('@/lib/db/operations/payments')
      const { getReminderHistory } = await import('@/lib/db/operations/reminders')

      const mockPayments = [
        {
          id: 'payment-1',
          tenantId: 'tenant-1',
          propertyId: 'property-1',
          amount: 150000,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        }
      ]

      const mockReminderHistory = [
        {
          id: 'reminder-1',
          paymentId: 'payment-1',
          sentAt: new Date().toISOString(), // Today
          reminderType: 'upcoming'
        }
      ]

      vi.mocked(getPaymentsByStatus).mockResolvedValue(mockPayments)
      vi.mocked(getReminderHistory).mockResolvedValue(mockReminderHistory)

      const result = await processAutomatedReminders()

      expect(result.processed).toBe(1)
      expect(result.sent).toBe(0)
      expect(result.skipped).toBe(1)
    })

    it('should handle errors gracefully', async () => {
      const { getPaymentsByStatus } = await import('@/lib/db/operations/payments')

      vi.mocked(getPaymentsByStatus).mockRejectedValue(new Error('Database error'))

      const result = await processAutomatedReminders()

      expect(result.processed).toBe(0)
      expect(result.sent).toBe(0)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Database error')
    })

    it('should respect rate limiting', async () => {
      const { getPaymentsByStatus } = await import('@/lib/db/operations/payments')
      const { getTenantById } = await import('@/lib/db/operations/tenants')
      const { getPropertyById } = await import('@/lib/db/operations/properties')
      const { checkRateLimit } = await import('@/lib/email/reminder-sender')
      const { getReminderHistory } = await import('@/lib/db/operations/reminders')

      const mockPayments = [
        {
          id: 'payment-1',
          tenantId: 'tenant-1',
          propertyId: 'property-1',
          amount: 150000,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        }
      ]

      vi.mocked(getPaymentsByStatus).mockResolvedValue(mockPayments)
      vi.mocked(getTenantById).mockResolvedValue({ id: 'tenant-1', name: 'John', email: 'john@test.com' })
      vi.mocked(getPropertyById).mockResolvedValue({ id: 'property-1', name: 'Test Property' })
      vi.mocked(getReminderHistory).mockResolvedValue([])
      vi.mocked(checkRateLimit).mockReturnValue(false) // Rate limit exceeded

      const result = await processAutomatedReminders()

      expect(result.processed).toBe(1)
      expect(result.sent).toBe(0)
      expect(result.skipped).toBe(1)
    })
  })

  describe('sendManualReminder', () => {
    const { getPaymentById } = vi.mocked(require('@/lib/db/operations/payments'))
    const { getTenantById } = vi.mocked(require('@/lib/db/operations/tenants'))
    const { getPropertyById } = vi.mocked(require('@/lib/db/operations/properties'))
    const { sendPaymentReminder, checkRateLimit } = vi.mocked(require('@/lib/email/reminder-sender'))
    const { createReminderLog } = vi.mocked(require('@/lib/db/operations/reminders'))

    it('should send manual reminder successfully', async () => {

      const mockPayment = {
        id: 'payment-1',
        tenantId: 'tenant-1',
        propertyId: 'property-1',
        amount: 150000,
        dueDate: new Date().toISOString(),
        status: 'pending'
      }

      const mockTenant = {
        id: 'tenant-1',
        name: 'John Doe',
        email: 'john@example.com'
      }

      const mockProperty = {
        id: 'property-1',
        name: 'Test Property',
        contactEmail: 'management@test.com',
        paymentMethods: ['Bank Transfer']
      }

      vi.mocked(getPaymentById).mockResolvedValue(mockPayment)
      vi.mocked(getTenantById).mockResolvedValue(mockTenant)
      vi.mocked(getPropertyById).mockResolvedValue(mockProperty)
      vi.mocked(checkRateLimit).mockReturnValue(true)
      vi.mocked(sendPaymentReminder).mockResolvedValue({
        success: true,
        messageId: 'test-message-id'
      })
      vi.mocked(createReminderLog).mockResolvedValue({} as any)

      const result = await sendManualReminder('payment-1', 'due')

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should handle payment not found', async () => {
      getPaymentById.mockResolvedValue(null)

      const result = await sendManualReminder('nonexistent-payment', 'due')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Payment not found')
    })

    it('should handle email sending failure', async () => {
      getPaymentById.mockResolvedValue({
        id: 'payment-1',
        tenantId: 'tenant-1',
        propertyId: 'property-1'
      } as any)
      vi.mocked(getTenantById).mockResolvedValue({ id: 'tenant-1', name: 'John', email: 'john@test.com' })
      vi.mocked(getPropertyById).mockResolvedValue({ id: 'property-1', name: 'Test Property' })
      vi.mocked(checkRateLimit).mockReturnValue(true)
      vi.mocked(sendPaymentReminder).mockResolvedValue({
        success: false,
        error: 'Email service unavailable'
      })
      vi.mocked(createReminderLog).mockResolvedValue({} as any)

      const result = await sendManualReminder('payment-1', 'due')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to send reminder')
    })
  })
})
