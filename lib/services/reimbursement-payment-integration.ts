import { ReimbursementRequest, PaymentRecordingInput } from '@/lib/db/models/reimbursement'
import { recordReimbursementPayment, getReimbursementRequestById } from '@/lib/db/operations/reimbursements'
import { markExpenseReimbursed } from '@/lib/db/operations/expenses'

/**
 * Service to integrate reimbursement payments with the main payment system
 */
export class ReimbursementPaymentIntegrationService {
  
  /**
   * Record a reimbursement payment and update related expense
   */
  static async recordPayment(
    reimbursementId: string, 
    paymentData: PaymentRecordingInput
  ): Promise<ReimbursementRequest> {
    try {
      // Get the reimbursement request
      const reimbursement = await getReimbursementRequestById(reimbursementId)
      if (!reimbursement) {
        throw new Error('Reimbursement request not found')
      }

      if (reimbursement.status !== 'Approved') {
        throw new Error(`Cannot record payment for reimbursement with status: ${reimbursement.status}`)
      }

      // Record the reimbursement payment
      const updatedReimbursement = await recordReimbursementPayment(paymentData)
      if (!updatedReimbursement) {
        throw new Error('Failed to record reimbursement payment')
      }

      // Update the related expense to mark it as reimbursed
      try {
        await markExpenseReimbursed(
          reimbursement.expenseId, 
          paymentData.paidDate || new Date()
        )
      } catch (expenseError) {
        console.error('Warning: Failed to update expense reimbursement status:', expenseError)
        // Don't fail the entire operation if expense update fails
      }

      // TODO: Send notification to requestor
      await this.sendPaymentNotification(updatedReimbursement)

      // TODO: Create audit log entry
      await this.createPaymentAuditLog(updatedReimbursement, paymentData)

      return updatedReimbursement
    } catch (error) {
      console.error('Error in reimbursement payment integration:', error)
      throw error
    }
  }

  /**
   * Validate payment data before processing
   */
  static validatePaymentData(paymentData: PaymentRecordingInput): string[] {
    const errors: string[] = []

    // Validate payment method
    if (!paymentData.paymentMethod) {
      errors.push('Payment method is required')
    }

    // Validate payment reference for certain methods
    if (['Stripe', 'PayPal', 'Wire'].includes(paymentData.paymentMethod)) {
      if (!paymentData.paymentReference?.trim()) {
        errors.push(`Payment reference is required for ${paymentData.paymentMethod} payments`)
      }
    }

    // Validate Stripe payment intent format
    if (paymentData.paymentMethod === 'Stripe' && paymentData.paymentReference) {
      if (!paymentData.paymentReference.startsWith('pi_')) {
        errors.push('Stripe payment reference must be a payment intent ID (starting with "pi_")')
      }
    }

    // Validate payment date
    if (paymentData.paidDate && paymentData.paidDate > new Date()) {
      errors.push('Payment date cannot be in the future')
    }

    return errors
  }

  /**
   * Send payment notification to requestor
   */
  private static async sendPaymentNotification(reimbursement: ReimbursementRequest): Promise<void> {
    try {
      // TODO: Implement email notification
      console.log(`Sending payment notification for reimbursement ${reimbursement.id}`)
      
      // This would integrate with the email service
      // const emailData = {
      //   to: reimbursement.requestorId, // Would need to resolve to email
      //   template: 'reimbursement-paid',
      //   data: {
      //     reimbursementId: reimbursement.id,
      //     amount: reimbursement.amountCents,
      //     currency: reimbursement.currency,
      //     paymentMethod: reimbursement.paymentMethod,
      //     paidDate: reimbursement.paidDate
      //   }
      // }
      // await EmailService.send(emailData)
    } catch (error) {
      console.error('Failed to send payment notification:', error)
      // Don't throw - notification failure shouldn't fail the payment
    }
  }

  /**
   * Create audit log entry for payment
   */
  private static async createPaymentAuditLog(
    reimbursement: ReimbursementRequest, 
    paymentData: PaymentRecordingInput
  ): Promise<void> {
    try {
      // TODO: Implement audit logging
      console.log(`Creating audit log for payment of reimbursement ${reimbursement.id}`)
      
      // This would integrate with the audit log service
      // const auditData = {
      //   action: 'REIMBURSEMENT_PAYMENT_RECORDED',
      //   entityType: 'ReimbursementRequest',
      //   entityId: reimbursement.id,
      //   userId: paymentData.paidBy,
      //   details: {
      //     amount: reimbursement.amountCents,
      //     paymentMethod: reimbursement.paymentMethod,
      //     paymentReference: reimbursement.paymentReference,
      //     paidDate: reimbursement.paidDate
      //   },
      //   timestamp: new Date()
      // }
      // await AuditLogService.create(auditData)
    } catch (error) {
      console.error('Failed to create audit log:', error)
      // Don't throw - audit log failure shouldn't fail the payment
    }
  }

  /**
   * Get payment statistics for reporting
   */
  static async getPaymentStatistics(
    propertyId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    totalPaid: number
    totalAmount: number
    byPaymentMethod: Record<string, { count: number; amount: number }>
    byMonth: Record<string, { count: number; amount: number }>
  }> {
    try {
      // TODO: Implement payment statistics
      // This would query the reimbursement operations for paid requests
      // and aggregate the data for reporting
      
      return {
        totalPaid: 0,
        totalAmount: 0,
        byPaymentMethod: {},
        byMonth: {}
      }
    } catch (error) {
      console.error('Error getting payment statistics:', error)
      throw error
    }
  }

  /**
   * Reconcile payments with external payment systems
   */
  static async reconcilePayments(
    paymentMethod: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    matched: number
    unmatched: number
    discrepancies: Array<{
      reimbursementId: string
      issue: string
      details: any
    }>
  }> {
    try {
      // TODO: Implement payment reconciliation
      // This would compare reimbursement payments with external payment system records
      
      console.log(`Reconciling ${paymentMethod} payments from ${startDate} to ${endDate}`)
      
      return {
        matched: 0,
        unmatched: 0,
        discrepancies: []
      }
    } catch (error) {
      console.error('Error reconciling payments:', error)
      throw error
    }
  }

  /**
   * Generate payment receipt for reimbursement
   */
  static async generatePaymentReceipt(reimbursementId: string): Promise<{
    receiptData: any
    downloadUrl?: string
  }> {
    try {
      const reimbursement = await getReimbursementRequestById(reimbursementId)
      if (!reimbursement) {
        throw new Error('Reimbursement request not found')
      }

      if (reimbursement.status !== 'Paid') {
        throw new Error('Cannot generate receipt for unpaid reimbursement')
      }

      // TODO: Generate PDF receipt
      const receiptData = {
        reimbursementId: reimbursement.id,
        expenseId: reimbursement.expenseId,
        amount: reimbursement.amountCents,
        currency: reimbursement.currency,
        paymentMethod: reimbursement.paymentMethod,
        paymentReference: reimbursement.paymentReference,
        paidDate: reimbursement.paidDate,
        requestorId: reimbursement.requestorId,
        propertyId: reimbursement.propertyId,
        generatedAt: new Date()
      }

      return {
        receiptData,
        // downloadUrl: await PDFService.generateReceipt(receiptData)
      }
    } catch (error) {
      console.error('Error generating payment receipt:', error)
      throw error
    }
  }
}
