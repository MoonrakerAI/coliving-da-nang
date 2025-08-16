import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EmailNotificationService } from '../email-notification'
import { ReimbursementRequest } from '@/lib/db/models/reimbursement'

// Mock reimbursement data for testing
const mockReimbursement: ReimbursementRequest = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  expenseId: '123e4567-e89b-12d3-a456-426614174001',
  requestorId: '123e4567-e89b-12d3-a456-426614174002',
  propertyId: '123e4567-e89b-12d3-a456-426614174003',
  amountCents: 5000,
  currency: 'USD',
  status: 'Requested',
  reason: 'Office supplies for property maintenance',
  createdAt: new Date('2024-01-10'),
  updatedAt: new Date('2024-01-10'),
  statusHistory: [
    {
      status: 'Requested',
      changedAt: new Date('2024-01-10'),
      changedBy: '123e4567-e89b-12d3-a456-426614174002'
    }
  ]
}

const mockRecipient = {
  email: 'test@example.com',
  name: 'Test User',
  role: 'requestor' as const
}

describe('EmailNotificationService', () => {
  beforeEach(() => {
    // Reset environment variables
    process.env.NODE_ENV = 'test'
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
    
    // Clear console mocks
    vi.clearAllMocks()
  })

  describe('generateReimbursementNotificationTemplate', () => {
    it('should generate requested notification template', () => {
      const template = EmailNotificationService.generateReimbursementNotificationTemplate(
        'requested',
        { reimbursement: mockReimbursement },
        { ...mockRecipient, role: 'approver' }
      )

      expect(template.subject).toBe('New Reimbursement Request - $50.00')
      expect(template.htmlBody).toContain('New Reimbursement Request')
      expect(template.htmlBody).toContain('$50.00')
      expect(template.htmlBody).toContain('Office supplies for property maintenance')
      expect(template.htmlBody).toContain('Review Request')
      expect(template.textBody).toContain('New Reimbursement Request - $50.00')
      expect(template.textBody).toContain('Office supplies for property maintenance')
    })

    it('should generate approved notification template', () => {
      const approvedReimbursement = { ...mockReimbursement, status: 'Approved' as const }
      const template = EmailNotificationService.generateReimbursementNotificationTemplate(
        'approved',
        { 
          reimbursement: approvedReimbursement,
          comment: 'Approved for valid business expense'
        },
        mockRecipient
      )

      expect(template.subject).toBe('Reimbursement Approved - $50.00')
      expect(template.htmlBody).toContain('✅ Reimbursement Approved')
      expect(template.htmlBody).toContain('$50.00')
      expect(template.htmlBody).toContain('Approved for valid business expense')
      expect(template.textBody).toContain('Reimbursement Approved - $50.00')
      expect(template.textBody).toContain('Approved for valid business expense')
    })

    it('should generate denied notification template', () => {
      const deniedReimbursement = { ...mockReimbursement, status: 'Denied' as const }
      const template = EmailNotificationService.generateReimbursementNotificationTemplate(
        'denied',
        { 
          reimbursement: deniedReimbursement,
          comment: 'Insufficient documentation provided'
        },
        mockRecipient
      )

      expect(template.subject).toBe('Reimbursement Request Denied - $50.00')
      expect(template.htmlBody).toContain('❌ Reimbursement Request Denied')
      expect(template.htmlBody).toContain('$50.00')
      expect(template.htmlBody).toContain('Insufficient documentation provided')
      expect(template.textBody).toContain('Reimbursement Request Denied - $50.00')
      expect(template.textBody).toContain('Insufficient documentation provided')
    })

    it('should generate paid notification template', () => {
      const paidReimbursement = { 
        ...mockReimbursement, 
        status: 'Paid' as const,
        paymentMethod: 'Stripe',
        paymentReference: 'pi_1234567890abcdef',
        paidDate: new Date('2024-01-15')
      }
      const template = EmailNotificationService.generateReimbursementNotificationTemplate(
        'paid',
        { reimbursement: paidReimbursement },
        mockRecipient
      )

      expect(template.subject).toBe('Reimbursement Payment Processed - $50.00')
      expect(template.htmlBody).toContain('💰 Payment Processed')
      expect(template.htmlBody).toContain('$50.00')
      expect(template.htmlBody).toContain('Stripe')
      expect(template.htmlBody).toContain('pi_1234567890abcdef')
      expect(template.textBody).toContain('Reimbursement Payment Processed - $50.00')
      expect(template.textBody).toContain('Stripe')
    })

    it('should throw error for unknown notification type', () => {
      expect(() => {
        EmailNotificationService.generateReimbursementNotificationTemplate(
          'unknown' as any,
          { reimbursement: mockReimbursement },
          mockRecipient
        )
      }).toThrow('Unknown notification type: unknown')
    })

    it('should handle missing optional fields gracefully', () => {
      const minimalReimbursement = {
        ...mockReimbursement,
        reason: undefined,
        paymentMethod: undefined,
        paymentReference: undefined
      }

      const template = EmailNotificationService.generateReimbursementNotificationTemplate(
        'requested',
        { reimbursement: minimalReimbursement },
        mockRecipient
      )

      expect(template.htmlBody).toContain('No reason provided')
      expect(template.textBody).toContain('No reason provided')
    })
  })

  describe('sendNotification', () => {
    let consoleSpy: any

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    it('should log notification in development mode', async () => {
      process.env.NODE_ENV = 'development'
      
      const template = {
        subject: 'Test Subject',
        htmlBody: '<h1>Test HTML</h1>',
        textBody: 'Test text content'
      }

      const result = await EmailNotificationService.sendNotification(mockRecipient, template)

      expect(result).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith('📧 Email Notification:', expect.objectContaining({
        to: 'test@example.com',
        subject: 'Test Subject'
      }))
    })

    it('should handle errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Mock a failure by throwing an error
      const originalSetTimeout = global.setTimeout
      global.setTimeout = vi.fn(() => {
        throw new Error('Network error')
      }) as any

      const template = {
        subject: 'Test Subject',
        htmlBody: '<h1>Test HTML</h1>',
        textBody: 'Test text content'
      }

      const result = await EmailNotificationService.sendNotification(mockRecipient, template)

      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to send email notification:', expect.any(Error))

      // Restore original setTimeout
      global.setTimeout = originalSetTimeout
    })
  })

  describe('sendReimbursementStatusNotification', () => {
    let sendNotificationSpy: any

    beforeEach(() => {
      sendNotificationSpy = vi.spyOn(EmailNotificationService, 'sendNotification')
        .mockResolvedValue(true)
    })

    it('should send notification to appropriate recipients for requested status', async () => {
      const result = await EmailNotificationService.sendReimbursementStatusNotification(
        'requested',
        { reimbursement: mockReimbursement }
      )

      expect(result.sent).toBe(1)
      expect(result.failed).toBe(0)
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'property-owner@coliving-danang.com',
          role: 'approver'
        }),
        expect.objectContaining({
          subject: 'New Reimbursement Request - $50.00'
        })
      )
    })

    it('should send notification to requestor for approved status', async () => {
      const result = await EmailNotificationService.sendReimbursementStatusNotification(
        'approved',
        { reimbursement: mockReimbursement }
      )

      expect(result.sent).toBe(1)
      expect(result.failed).toBe(0)
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'requestor@coliving-danang.com',
          role: 'requestor'
        }),
        expect.objectContaining({
          subject: 'Reimbursement Approved - $50.00'
        })
      )
    })

    it('should send notification to requestor for denied status', async () => {
      const result = await EmailNotificationService.sendReimbursementStatusNotification(
        'denied',
        { reimbursement: mockReimbursement }
      )

      expect(result.sent).toBe(1)
      expect(result.failed).toBe(0)
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'requestor@coliving-danang.com',
          role: 'requestor'
        }),
        expect.objectContaining({
          subject: 'Reimbursement Request Denied - $50.00'
        })
      )
    })

    it('should send notifications to multiple recipients for paid status', async () => {
      const result = await EmailNotificationService.sendReimbursementStatusNotification(
        'paid',
        { reimbursement: mockReimbursement }
      )

      expect(result.sent).toBe(2)
      expect(result.failed).toBe(0)
      expect(sendNotificationSpy).toHaveBeenCalledTimes(2)
      
      // Check that both requestor and admin were notified
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'requestor@coliving-danang.com',
          role: 'requestor'
        }),
        expect.any(Object)
      )
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'admin@coliving-danang.com',
          role: 'admin'
        }),
        expect.any(Object)
      )
    })

    it('should handle notification failures gracefully', async () => {
      sendNotificationSpy.mockResolvedValueOnce(false) // First call fails
      sendNotificationSpy.mockResolvedValueOnce(true)  // Second call succeeds

      const result = await EmailNotificationService.sendReimbursementStatusNotification(
        'paid',
        { reimbursement: mockReimbursement }
      )

      expect(result.sent).toBe(1)
      expect(result.failed).toBe(1)
    })

    it('should handle exceptions during notification sending', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      sendNotificationSpy.mockRejectedValue(new Error('Email service unavailable'))

      const result = await EmailNotificationService.sendReimbursementStatusNotification(
        'requested',
        { reimbursement: mockReimbursement }
      )

      expect(result.sent).toBe(0)
      expect(result.failed).toBe(1)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send notification to'),
        expect.any(Error)
      )
    })
  })

  describe('template content validation', () => {
    it('should include all required elements in HTML templates', () => {
      const template = EmailNotificationService.generateReimbursementNotificationTemplate(
        'requested',
        { reimbursement: mockReimbursement },
        mockRecipient
      )

      // Check HTML structure
      expect(template.htmlBody).toContain('<!DOCTYPE html>')
      expect(template.htmlBody).toContain('<html>')
      expect(template.htmlBody).toContain('<head>')
      expect(template.htmlBody).toContain('<body>')
      expect(template.htmlBody).toContain('<style>')
      
      // Check content elements
      expect(template.htmlBody).toContain('Coliving Da Nang')
      expect(template.htmlBody).toContain(mockReimbursement.id)
      expect(template.htmlBody).toContain('$50.00')
      expect(template.htmlBody).toContain('Office supplies for property maintenance')
    })

    it('should format currency correctly for different amounts', () => {
      const largeAmountReimbursement = {
        ...mockReimbursement,
        amountCents: 123456 // $1,234.56
      }

      const template = EmailNotificationService.generateReimbursementNotificationTemplate(
        'approved',
        { reimbursement: largeAmountReimbursement },
        mockRecipient
      )

      expect(template.subject).toContain('$1,234.56')
      expect(template.htmlBody).toContain('$1,234.56')
      expect(template.textBody).toContain('$1,234.56')
    })

    it('should include proper URLs in templates', () => {
      const template = EmailNotificationService.generateReimbursementNotificationTemplate(
        'requested',
        { reimbursement: mockReimbursement },
        mockRecipient
      )

      expect(template.htmlBody).toContain(`http://localhost:3000/reimbursements/requests/${mockReimbursement.id}`)
      expect(template.htmlBody).toContain(`http://localhost:3000/expenses/${mockReimbursement.expenseId}`)
      expect(template.textBody).toContain(`http://localhost:3000/reimbursements/requests/${mockReimbursement.id}`)
    })
  })
})
