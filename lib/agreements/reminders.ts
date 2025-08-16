import { getAllAgreements, updateAgreement } from '@/lib/db/operations/agreements'
import { AgreementNotificationService } from './notifications'
import { Agreement } from '@/lib/db/models/agreement'

export interface ReminderSchedule {
  id: string
  agreementId: string
  reminderType: 'initial' | 'followup' | 'urgent' | 'final'
  scheduledFor: Date
  urgencyLevel: 'low' | 'medium' | 'high'
  sent: boolean
  sentAt?: Date
  attempts: number
  lastAttempt?: Date
  nextAttempt?: Date
}

export interface ReminderConfig {
  enabled: boolean
  schedules: {
    initial: number // days after sending
    followup: number[] // days after initial reminder
    urgent: number // days before expiry
    final: number // days before expiry
  }
  maxAttempts: number
  escalationEnabled: boolean
  businessHoursOnly: boolean
  excludeWeekends: boolean
}

// Default reminder configuration
const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  enabled: true,
  schedules: {
    initial: 3, // 3 days after sending
    followup: [7, 14], // 7 and 14 days after initial
    urgent: 3, // 3 days before expiry
    final: 1 // 1 day before expiry
  },
  maxAttempts: 3,
  escalationEnabled: true,
  businessHoursOnly: true,
  excludeWeekends: true
}

export class AutomatedReminderService {
  private static config: ReminderConfig = DEFAULT_REMINDER_CONFIG

  /**
   * Process all pending reminders
   */
  static async processReminders(): Promise<{
    processed: number
    sent: number
    failed: number
    skipped: number
  }> {
    try {
      console.log('Starting automated reminder processing...')
      
      const stats = {
        processed: 0,
        sent: 0,
        failed: 0,
        skipped: 0
      }

      if (!this.config.enabled) {
        console.log('Automated reminders are disabled')
        return stats
      }

      // Get all agreements that need reminders
      const agreements = await this.getAgreementsNeedingReminders()
      console.log(`Found ${agreements.length} agreements that may need reminders`)

      for (const agreement of agreements) {
        stats.processed++
        
        try {
          const reminderSent = await this.processAgreementReminders(agreement)
          if (reminderSent) {
            stats.sent++
          } else {
            stats.skipped++
          }
        } catch (error) {
          console.error(`Failed to process reminders for agreement ${agreement.id}:`, error)
          stats.failed++
        }
      }

      console.log('Reminder processing completed:', stats)
      return stats
    } catch (error) {
      console.error('Error processing automated reminders:', error)
      throw error
    }
  }

  /**
   * Process reminders for a specific agreement
   */
  static async processAgreementReminders(agreement: Agreement): Promise<boolean> {
    try {
      // Skip if agreement is not in a state that needs reminders
      if (!['Sent', 'Viewed'].includes(agreement.status)) {
        return false
      }

      // Skip if agreement has expired
      const now = new Date()
      if (now > agreement.expirationDate) {
        return false
      }

      // Calculate days since sent and days until expiry
      const daysSinceSent = Math.floor((now.getTime() - agreement.sentDate.getTime()) / (1000 * 60 * 60 * 24))
      const daysUntilExpiry = Math.ceil((agreement.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      // Check if we should send a reminder
      const reminderType = this.determineReminderType(agreement, daysSinceSent, daysUntilExpiry)
      
      if (!reminderType) {
        return false
      }

      // Check if we've already sent this type of reminder recently
      if (await this.hasRecentReminder(agreement, reminderType)) {
        return false
      }

      // Check business hours and weekend restrictions
      if (!this.isValidReminderTime(now)) {
        console.log(`Skipping reminder for agreement ${agreement.id} - outside business hours`)
        return false
      }

      // Determine urgency level
      const urgencyLevel = this.determineUrgencyLevel(daysUntilExpiry)

      // Send reminder
      await this.sendReminder(agreement, reminderType, urgencyLevel)

      // Update agreement with reminder info
      await updateAgreement({
        id: agreement.id,
        lastReminderDate: now,
        reminderCount: (agreement.reminderCount || 0) + 1
      })

      console.log(`Sent ${reminderType} reminder for agreement ${agreement.id}`)
      return true
    } catch (error) {
      console.error(`Error processing reminders for agreement ${agreement.id}:`, error)
      throw error
    }
  }

  /**
   * Send a specific reminder
   */
  static async sendReminder(
    agreement: Agreement,
    reminderType: string,
    urgencyLevel: 'low' | 'medium' | 'high'
  ): Promise<void> {
    try {
      const signingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/agreements/sign/${agreement.id}`
      
      await AgreementNotificationService.sendReminderEmail(
        agreement,
        urgencyLevel,
        signingUrl,
        reminderType
      )
    } catch (error) {
      console.error('Error sending reminder email:', error)
      throw error
    }
  }

  /**
   * Get agreements that might need reminders
   */
  private static async getAgreementsNeedingReminders(): Promise<Agreement[]> {
    try {
      const allAgreements = await getAllAgreements()
      
      return allAgreements.filter(agreement => {
        // Only process agreements in Sent or Viewed status
        if (!['Sent', 'Viewed'].includes(agreement.status)) {
          return false
        }

        // Skip expired agreements
        const now = new Date()
        if (now > agreement.expirationDate) {
          return false
        }

        // Skip if we've hit max attempts
        const reminderCount = agreement.reminderCount || 0
        if (reminderCount >= this.config.maxAttempts) {
          return false
        }

        return true
      })
    } catch (error) {
      console.error('Error getting agreements needing reminders:', error)
      return []
    }
  }

  /**
   * Determine what type of reminder to send
   */
  private static determineReminderType(
    agreement: Agreement,
    daysSinceSent: number,
    daysUntilExpiry: number
  ): string | null {
    const reminderCount = agreement.reminderCount || 0

    // Final reminder (1 day before expiry)
    if (daysUntilExpiry <= this.config.schedules.final && reminderCount < this.config.maxAttempts) {
      return 'final'
    }

    // Urgent reminder (3 days before expiry)
    if (daysUntilExpiry <= this.config.schedules.urgent && reminderCount < this.config.maxAttempts) {
      return 'urgent'
    }

    // Follow-up reminders
    for (const followupDay of this.config.schedules.followup) {
      if (daysSinceSent >= followupDay && reminderCount < this.config.maxAttempts) {
        return 'followup'
      }
    }

    // Initial reminder
    if (daysSinceSent >= this.config.schedules.initial && reminderCount === 0) {
      return 'initial'
    }

    return null
  }

  /**
   * Check if we've sent a reminder recently
   */
  private static async hasRecentReminder(agreement: Agreement, reminderType: string): Promise<boolean> {
    // If we have a last reminder date, check if it was recent
    if (agreement.lastReminderDate) {
      const hoursSinceLastReminder = (Date.now() - agreement.lastReminderDate.getTime()) / (1000 * 60 * 60)
      
      // Don't send reminders more than once per day
      if (hoursSinceLastReminder < 24) {
        return true
      }
    }

    return false
  }

  /**
   * Determine urgency level based on days until expiry
   */
  private static determineUrgencyLevel(daysUntilExpiry: number): 'low' | 'medium' | 'high' {
    if (daysUntilExpiry <= 1) {
      return 'high'
    } else if (daysUntilExpiry <= 3) {
      return 'medium'
    } else {
      return 'low'
    }
  }

  /**
   * Check if current time is valid for sending reminders
   */
  private static isValidReminderTime(now: Date): boolean {
    if (!this.config.businessHoursOnly && !this.config.excludeWeekends) {
      return true
    }

    const hour = now.getHours()
    const dayOfWeek = now.getDay() // 0 = Sunday, 6 = Saturday

    // Check weekend restriction
    if (this.config.excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      return false
    }

    // Check business hours (9 AM to 6 PM)
    if (this.config.businessHoursOnly && (hour < 9 || hour >= 18)) {
      return false
    }

    return true
  }

  /**
   * Update reminder configuration
   */
  static updateConfig(newConfig: Partial<ReminderConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('Reminder configuration updated:', this.config)
  }

  /**
   * Get current reminder configuration
   */
  static getConfig(): ReminderConfig {
    return { ...this.config }
  }

  /**
   * Schedule reminders for a new agreement
   */
  static async scheduleReminders(agreement: Agreement): Promise<void> {
    try {
      if (!this.config.enabled) {
        return
      }

      console.log(`Scheduling reminders for agreement ${agreement.id}`)
      
      // This would typically create scheduled jobs in a job queue
      // For now, we'll just log the intended schedule
      const now = new Date()
      const schedules = []

      // Initial reminder
      const initialDate = new Date(agreement.sentDate)
      initialDate.setDate(initialDate.getDate() + this.config.schedules.initial)
      schedules.push({ type: 'initial', date: initialDate })

      // Follow-up reminders
      this.config.schedules.followup.forEach(days => {
        const followupDate = new Date(agreement.sentDate)
        followupDate.setDate(followupDate.getDate() + days)
        schedules.push({ type: 'followup', date: followupDate })
      })

      // Urgent reminder
      const urgentDate = new Date(agreement.expirationDate)
      urgentDate.setDate(urgentDate.getDate() - this.config.schedules.urgent)
      schedules.push({ type: 'urgent', date: urgentDate })

      // Final reminder
      const finalDate = new Date(agreement.expirationDate)
      finalDate.setDate(finalDate.getDate() - this.config.schedules.final)
      schedules.push({ type: 'final', date: finalDate })

      console.log(`Scheduled ${schedules.length} reminders for agreement ${agreement.id}:`, schedules)
    } catch (error) {
      console.error('Error scheduling reminders:', error)
    }
  }

  /**
   * Cancel reminders for an agreement (when signed or cancelled)
   */
  static async cancelReminders(agreementId: string, reason: string = 'Agreement completed'): Promise<void> {
    try {
      console.log(`Cancelling reminders for agreement ${agreementId}: ${reason}`)
      
      // This would typically remove scheduled jobs from a job queue
      // For now, we'll just log the cancellation
    } catch (error) {
      console.error('Error cancelling reminders:', error)
    }
  }

  /**
   * Get reminder statistics
   */
  static async getReminderStats(days: number = 30): Promise<{
    totalReminders: number
    remindersByType: Record<string, number>
    remindersByUrgency: Record<string, number>
    successRate: number
    averageResponseTime: number
  }> {
    try {
      // This would typically query reminder logs from a database
      // For now, return mock statistics
      return {
        totalReminders: 0,
        remindersByType: {
          initial: 0,
          followup: 0,
          urgent: 0,
          final: 0
        },
        remindersByUrgency: {
          low: 0,
          medium: 0,
          high: 0
        },
        successRate: 0,
        averageResponseTime: 0
      }
    } catch (error) {
      console.error('Error getting reminder statistics:', error)
      throw error
    }
  }
}
