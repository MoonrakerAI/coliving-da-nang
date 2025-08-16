import { 
  createAgreement,
  updateAgreement,
  getAgreement,
  populateTemplateContent,
  getAgreementTemplate
} from '@/lib/db/operations/agreements'
import { getProperty } from '@/lib/db/operations/properties'
import {
  sendAgreementEmail,
  sendAgreementReminderEmail,
  sendAgreementCompletedEmail,
  validateEmailDelivery,
  trackEmailDelivery,
  AgreementEmailData,
  ReminderEmailData
} from './notifications'
import {
  Agreement,
  CreateAgreementInput,
  TemplateVariableValue,
  AgreementStatusType
} from '@/lib/db/models/agreement'
import { v4 as uuidv4 } from 'uuid'

export interface SendAgreementRequest {
  templateId: string
  prospectName: string
  prospectEmail: string
  prospectPhone?: string
  variableValues: TemplateVariableValue[]
  customMessage?: string
  expirationDays?: number
  ownerName?: string
  ownerEmail?: string
}

export interface SendAgreementResponse {
  agreementId: string
  agreementUrl: string
  expirationDate: Date
  emailSent: boolean
}

export class AgreementSendingService {
  
  // Send a new agreement to a prospect
  static async sendAgreement(
    request: SendAgreementRequest,
    createdBy: string
  ): Promise<SendAgreementResponse> {
    try {
      // Validate email
      if (!await validateEmailDelivery(request.prospectEmail)) {
        throw new Error('Invalid email address')
      }

      // Get template and property information
      const template = await getAgreementTemplate(request.templateId)
      if (!template) {
        throw new Error('Template not found')
      }

      const property = await getProperty(template.propertyId)
      if (!property) {
        throw new Error('Property not found')
      }

      // Calculate expiration date
      const expirationDays = request.expirationDays || 7
      const expirationDate = new Date()
      expirationDate.setDate(expirationDate.getDate() + expirationDays)

      // Create agreement record
      const agreementInput: CreateAgreementInput = {
        templateId: request.templateId,
        propertyId: template.propertyId,
        prospectEmail: request.prospectEmail,
        prospectName: request.prospectName,
        prospectPhone: request.prospectPhone,
        status: 'Sent',
        sentDate: new Date(),
        expirationDate,
        agreementData: this.convertVariableValuesToRecord(request.variableValues),
        createdBy
      }

      const agreement = await createAgreement(agreementInput)

      // Generate secure agreement URL
      const agreementUrl = this.generateSecureAgreementUrl(agreement.id)

      // Prepare email data
      const emailData: AgreementEmailData = {
        prospectName: request.prospectName,
        prospectEmail: request.prospectEmail,
        propertyName: property.name,
        propertyAddress: this.formatPropertyAddress(property),
        agreementUrl,
        expirationDate,
        ownerName: request.ownerName,
        ownerEmail: request.ownerEmail,
        customMessage: request.customMessage
      }

      // Send email
      await sendAgreementEmail(emailData)
      
      // Track email delivery
      await trackEmailDelivery(agreement.id, 'initial')

      // Schedule first reminder
      await this.scheduleNextReminder(agreement.id, expirationDate)

      return {
        agreementId: agreement.id,
        agreementUrl,
        expirationDate,
        emailSent: true
      }
    } catch (error) {
      console.error('Error sending agreement:', error)
      throw error
    }
  }

  // Resend agreement email
  static async resendAgreement(agreementId: string): Promise<boolean> {
    try {
      const agreement = await getAgreement(agreementId)
      if (!agreement) {
        throw new Error('Agreement not found')
      }

      if (!['Sent', 'Viewed'].includes(agreement.status)) {
        throw new Error('Agreement cannot be resent in current status')
      }

      const template = await getAgreementTemplate(agreement.templateId)
      const property = await getProperty(agreement.propertyId)

      if (!template || !property) {
        throw new Error('Template or property not found')
      }

      const agreementUrl = this.generateSecureAgreementUrl(agreement.id)

      const emailData: AgreementEmailData = {
        prospectName: agreement.prospectName,
        prospectEmail: agreement.prospectEmail,
        propertyName: property.name,
        propertyAddress: this.formatPropertyAddress(property),
        agreementUrl,
        expirationDate: agreement.expirationDate,
        customMessage: 'This is a resent copy of your agreement.'
      }

      await sendAgreementEmail(emailData)
      await trackEmailDelivery(agreement.id, 'initial')

      return true
    } catch (error) {
      console.error('Error resending agreement:', error)
      throw error
    }
  }

  // Send reminder for pending agreement
  static async sendReminder(agreementId: string): Promise<boolean> {
    try {
      const agreement = await getAgreement(agreementId)
      if (!agreement) {
        throw new Error('Agreement not found')
      }

      if (!['Sent', 'Viewed'].includes(agreement.status)) {
        return false // No reminder needed for signed/completed agreements
      }

      const template = await getAgreementTemplate(agreement.templateId)
      const property = await getProperty(agreement.propertyId)

      if (!template || !property) {
        throw new Error('Template or property not found')
      }

      const now = new Date()
      const daysUntilExpiration = Math.ceil(
        (agreement.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysUntilExpiration <= 0) {
        // Agreement expired, mark as expired
        await updateAgreement({
          id: agreementId,
          status: 'Expired'
        })
        return false
      }

      const reminderNumber = agreement.remindersSent + 1
      const agreementUrl = this.generateSecureAgreementUrl(agreement.id)

      const reminderData: ReminderEmailData = {
        prospectName: agreement.prospectName,
        prospectEmail: agreement.prospectEmail,
        propertyName: property.name,
        propertyAddress: this.formatPropertyAddress(property),
        agreementUrl,
        expirationDate: agreement.expirationDate,
        reminderNumber,
        daysUntilExpiration
      }

      await sendAgreementReminderEmail(reminderData)
      
      // Update agreement with reminder info
      await updateAgreement({
        id: agreementId,
        remindersSent: reminderNumber,
        lastReminderDate: now,
        nextReminderDate: this.calculateNextReminderDate(now, daysUntilExpiration, reminderNumber)
      })

      await trackEmailDelivery(agreement.id, 'reminder')

      return true
    } catch (error) {
      console.error('Error sending reminder:', error)
      throw error
    }
  }

  // Mark agreement as viewed (webhook from DocuSign or direct access)
  static async markAsViewed(agreementId: string): Promise<void> {
    try {
      const agreement = await getAgreement(agreementId)
      if (!agreement || agreement.status !== 'Sent') {
        return
      }

      await updateAgreement({
        id: agreementId,
        status: 'Viewed',
        viewedDate: new Date()
      })
    } catch (error) {
      console.error('Error marking agreement as viewed:', error)
      throw error
    }
  }

  // Mark agreement as signed
  static async markAsSigned(
    agreementId: string, 
    docusignEnvelopeId?: string,
    signedDocumentUrl?: string
  ): Promise<void> {
    try {
      const agreement = await getAgreement(agreementId)
      if (!agreement || !['Sent', 'Viewed'].includes(agreement.status)) {
        return
      }

      await updateAgreement({
        id: agreementId,
        status: 'Signed',
        signedDate: new Date(),
        docusignEnvelopeId,
        signedDocumentUrl
      })
    } catch (error) {
      console.error('Error marking agreement as signed:', error)
      throw error
    }
  }

  // Complete agreement and send confirmation
  static async completeAgreement(agreementId: string): Promise<void> {
    try {
      const agreement = await getAgreement(agreementId)
      if (!agreement || agreement.status !== 'Signed') {
        return
      }

      // Update agreement status
      await updateAgreement({
        id: agreementId,
        status: 'Completed',
        completedDate: new Date()
      })

      // Send completion email
      const template = await getAgreementTemplate(agreement.templateId)
      const property = await getProperty(agreement.propertyId)

      if (template && property) {
        const agreementUrl = this.generateSecureAgreementUrl(agreement.id)

        const emailData: AgreementEmailData = {
          prospectName: agreement.prospectName,
          prospectEmail: agreement.prospectEmail,
          propertyName: property.name,
          propertyAddress: this.formatPropertyAddress(property),
          agreementUrl,
          expirationDate: agreement.expirationDate
        }

        await sendAgreementCompletedEmail(emailData)
        await trackEmailDelivery(agreement.id, 'completed')
      }
    } catch (error) {
      console.error('Error completing agreement:', error)
      throw error
    }
  }

  // Get agreements requiring reminders
  static async getAgreementsRequiringReminders(): Promise<Agreement[]> {
    try {
      // This would typically query agreements where nextReminderDate <= now
      // For now, return empty array - would be implemented with proper database query
      return []
    } catch (error) {
      console.error('Error getting agreements requiring reminders:', error)
      return []
    }
  }

  // Process automated reminders (to be called by scheduled job)
  static async processAutomatedReminders(): Promise<void> {
    try {
      const agreements = await this.getAgreementsRequiringReminders()
      
      for (const agreement of agreements) {
        try {
          await this.sendReminder(agreement.id)
        } catch (error) {
          console.error(`Failed to send reminder for agreement ${agreement.id}:`, error)
        }
      }
    } catch (error) {
      console.error('Error processing automated reminders:', error)
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  private static convertVariableValuesToRecord(values: TemplateVariableValue[]): Record<string, any> {
    const record: Record<string, any> = {}
    values.forEach(value => {
      record[value.name] = value.value
    })
    return record
  }

  private static generateSecureAgreementUrl(agreementId: string): string {
    // In production, this would generate a secure, time-limited URL
    // For now, return a basic URL structure
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return `${baseUrl}/agreements/sign/${agreementId}`
  }

  private static formatPropertyAddress(property: any): string {
    if (!property.address) return 'Address not available'
    
    const { street, city, state, postalCode, country } = property.address
    return `${street}, ${city}, ${state} ${postalCode}, ${country}`
  }

  private static async scheduleNextReminder(agreementId: string, expirationDate: Date): Promise<void> {
    // Calculate first reminder date (3 days after sending, or 2 days before expiration, whichever is sooner)
    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000))
    const twoDaysBeforeExpiration = new Date(expirationDate.getTime() - (2 * 24 * 60 * 60 * 1000))
    
    const nextReminderDate = threeDaysFromNow < twoDaysBeforeExpiration 
      ? threeDaysFromNow 
      : twoDaysBeforeExpiration

    await updateAgreement({
      id: agreementId,
      nextReminderDate
    })
  }

  private static calculateNextReminderDate(
    lastReminderDate: Date, 
    daysUntilExpiration: number, 
    reminderNumber: number
  ): Date | undefined {
    // Stop sending reminders after 3 attempts or if less than 1 day until expiration
    if (reminderNumber >= 3 || daysUntilExpiration <= 1) {
      return undefined
    }

    // Send next reminder in 2 days, or 1 day before expiration, whichever is sooner
    const twoDaysFromLastReminder = new Date(lastReminderDate.getTime() + (2 * 24 * 60 * 60 * 1000))
    const oneDayBeforeExpiration = new Date(Date.now() + ((daysUntilExpiration - 1) * 24 * 60 * 60 * 1000))
    
    return twoDaysFromLastReminder < oneDayBeforeExpiration 
      ? twoDaysFromLastReminder 
      : oneDayBeforeExpiration
  }
}

// Utility functions for external use
export async function sendNewAgreement(request: SendAgreementRequest, createdBy: string): Promise<SendAgreementResponse> {
  return AgreementSendingService.sendAgreement(request, createdBy)
}

export async function resendExistingAgreement(agreementId: string): Promise<boolean> {
  return AgreementSendingService.resendAgreement(agreementId)
}

export async function sendAgreementReminder(agreementId: string): Promise<boolean> {
  return AgreementSendingService.sendReminder(agreementId)
}

export async function processScheduledReminders(): Promise<void> {
  return AgreementSendingService.processAutomatedReminders()
}
