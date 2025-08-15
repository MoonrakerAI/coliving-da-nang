import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST, GET } from '@/app/api/cron/payment-reminders/route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/email/reminder-scheduler', () => ({
  processAutomatedReminders: vi.fn()
}))

vi.mock('@/lib/db/operations/reminders', () => ({
  cleanupOldReminderLogs: vi.fn()
}))

describe('/api/cron/payment-reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock environment variable
    process.env.CRON_SECRET = 'test-secret'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.CRON_SECRET
  })

  describe('POST', () => {
    it('should process reminders successfully with valid authorization', async () => {
      const { processAutomatedReminders } = await import('@/lib/email/reminder-scheduler')
      const { cleanupOldReminderLogs } = await import('@/lib/db/operations/reminders')

      vi.mocked(processAutomatedReminders).mockResolvedValue({
        processed: 5,
        sent: 3,
        skipped: 2,
        errors: []
      })
      vi.mocked(cleanupOldReminderLogs).mockResolvedValue(10)

      const request = new NextRequest('http://localhost:3000/api/cron/payment-reminders', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-secret'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.results.processed).toBe(5)
      expect(data.results.sent).toBe(3)
      expect(data.results.skipped).toBe(2)
      expect(data.results.cleanedUpLogs).toBe(10)
    })

    it('should reject unauthorized requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/payment-reminders', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer wrong-secret'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle processing errors gracefully', async () => {
      const { processAutomatedReminders } = await import('@/lib/email/reminder-scheduler')

      vi.mocked(processAutomatedReminders).mockRejectedValue(new Error('Processing failed'))

      const request = new NextRequest('http://localhost:3000/api/cron/payment-reminders', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-secret'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Processing failed')
    })

    it('should work without CRON_SECRET in development', async () => {
      delete process.env.CRON_SECRET

      const { processAutomatedReminders } = await import('@/lib/email/reminder-scheduler')
      const { cleanupOldReminderLogs } = await import('@/lib/db/operations/reminders')

      vi.mocked(processAutomatedReminders).mockResolvedValue({
        processed: 1,
        sent: 1,
        skipped: 0,
        errors: []
      })
      vi.mocked(cleanupOldReminderLogs).mockResolvedValue(0)

      const request = new NextRequest('http://localhost:3000/api/cron/payment-reminders', {
        method: 'POST'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('GET', () => {
    it('should return status information with valid authorization', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/payment-reminders', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer test-secret'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('Payment reminder cron job endpoint is active')
      expect(data.nextScheduledRun).toBe('Daily at 9:00 AM UTC')
    })

    it('should reject unauthorized GET requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/payment-reminders', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer wrong-secret'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })
})
