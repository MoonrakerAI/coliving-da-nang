import { sendEmail } from '@/lib/email'
import { Payment } from '@/lib/db/models/payment'

export interface PaymentConfirmationData {
  payment: Payment
  tenant: {
    name: string
    email: string
  }
  property: {
    name: string
    address: string
  }
}

/**
 * Send payment confirmation email to tenant
 */
export async function sendPaymentConfirmation(payment: Payment): Promise<boolean> {
  try {
    // Get tenant and property information
    const { tenant, property } = await getPaymentRelatedData(payment)

    const emailData = {
      to: tenant.email,
      subject: `Payment Confirmation - ${property.name}`,
      template: 'payment-confirmation',
      data: {
        tenantName: tenant.name,
        propertyName: property.name,
        propertyAddress: property.address,
        paymentAmount: (payment.amountCents / 100).toFixed(2),
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.paidDate?.toLocaleDateString() || new Date().toLocaleDateString(),
        dueDate: payment.dueDate.toLocaleDateString(),
        reference: payment.reference || payment.id.slice(0, 8),
        description: payment.description,
        receiptNumber: `RCP-${payment.id.slice(0, 8).toUpperCase()}`
      }
    }

    await sendEmail(emailData)
    console.log(`Payment confirmation sent to ${tenant.email} for payment ${payment.id}`)
    return true

  } catch (error) {
    console.error('Error sending payment confirmation:', error)
    return false
  }
}

/**
 * Send payment failure notification
 */
export async function sendPaymentFailureNotification(payment: Payment, reason?: string): Promise<boolean> {
  try {
    const { tenant, property } = await getPaymentRelatedData(payment)

    const emailData = {
      to: tenant.email,
      subject: `Payment Issue - ${property.name}`,
      template: 'payment-failure',
      data: {
        tenantName: tenant.name,
        propertyName: property.name,
        paymentAmount: (payment.amountCents / 100).toFixed(2),
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        dueDate: payment.dueDate.toLocaleDateString(),
        reference: payment.reference || payment.id.slice(0, 8),
        description: payment.description,
        failureReason: reason || 'Payment could not be processed',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com'
      }
    }

    await sendEmail(emailData)
    console.log(`Payment failure notification sent to ${tenant.email} for payment ${payment.id}`)
    return true

  } catch (error) {
    console.error('Error sending payment failure notification:', error)
    return false
  }
}

/**
 * Send refund confirmation email
 */
export async function sendRefundConfirmation(refundPayment: Payment, originalPayment: Payment): Promise<boolean> {
  try {
    const { tenant, property } = await getPaymentRelatedData(originalPayment)

    const emailData = {
      to: tenant.email,
      subject: `Refund Processed - ${property.name}`,
      template: 'refund-confirmation',
      data: {
        tenantName: tenant.name,
        propertyName: property.name,
        refundAmount: (Math.abs(refundPayment.amountCents) / 100).toFixed(2),
        currency: refundPayment.currency,
        paymentMethod: originalPayment.paymentMethod,
        refundDate: refundPayment.paidDate?.toLocaleDateString() || new Date().toLocaleDateString(),
        originalPaymentDate: originalPayment.paidDate?.toLocaleDateString() || 'N/A',
        originalReference: originalPayment.reference || originalPayment.id.slice(0, 8),
        refundReference: refundPayment.reference || refundPayment.id.slice(0, 8),
        originalDescription: originalPayment.description,
        refundReason: extractRefundReason(refundPayment.notes)
      }
    }

    await sendEmail(emailData)
    console.log(`Refund confirmation sent to ${tenant.email} for refund ${refundPayment.id}`)
    return true

  } catch (error) {
    console.error('Error sending refund confirmation:', error)
    return false
  }
}

/**
 * Send batch payment confirmation summary
 */
export async function sendBatchPaymentSummary(
  results: { successful: Payment[]; failed: Array<{ payment: any; error: string }> },
  adminEmail: string
): Promise<boolean> {
  try {
    const emailData = {
      to: adminEmail,
      subject: `Batch Payment Processing Summary`,
      template: 'batch-payment-summary',
      data: {
        totalProcessed: results.successful.length + results.failed.length,
        successfulCount: results.successful.length,
        failedCount: results.failed.length,
        successfulPayments: results.successful.map(p => ({
          tenantId: p.tenantId,
          amount: (p.amountCents / 100).toFixed(2),
          currency: p.currency,
          method: p.paymentMethod,
          reference: p.reference || p.id.slice(0, 8)
        })),
        failedPayments: results.failed.map(f => ({
          error: f.error,
          amount: f.payment.amountCents ? (f.payment.amountCents / 100).toFixed(2) : 'N/A',
          method: f.payment.paymentMethod || 'N/A'
        })),
        processedAt: new Date().toLocaleString()
      }
    }

    await sendEmail(emailData)
    console.log(`Batch payment summary sent to ${adminEmail}`)
    return true

  } catch (error) {
    console.error('Error sending batch payment summary:', error)
    return false
  }
}

/**
 * Resend payment confirmation
 */
export async function resendPaymentConfirmation(paymentId: string): Promise<boolean> {
  try {
    const { getPaymentById } = await import('@/lib/db/operations/payment')
    const payment = await getPaymentById(paymentId)

    if (!payment) {
      throw new Error('Payment not found')
    }

    if (payment.status !== 'Paid') {
      throw new Error('Can only resend confirmations for paid payments')
    }

    return await sendPaymentConfirmation(payment)

  } catch (error) {
    console.error('Error resending payment confirmation:', error)
    return false
  }
}

/**
 * Get tenant and property data for payment
 */
async function getPaymentRelatedData(payment: Payment): Promise<{
  tenant: { name: string; email: string }
  property: { name: string; address: string }
}> {
  try {
    // In a real implementation, these would be database calls
    // For now, we'll use placeholder data
    
    // TODO: Replace with actual database calls
    const tenant = {
      name: 'John Doe', // await getTenantById(payment.tenantId)
      email: 'john.doe@example.com'
    }

    const property = {
      name: 'Sunset Apartments', // await getPropertyById(payment.propertyId)
      address: '123 Main St, Da Nang, Vietnam'
    }

    return { tenant, property }

  } catch (error) {
    console.error('Error getting payment related data:', error)
    // Return fallback data
    return {
      tenant: { name: 'Tenant', email: 'tenant@example.com' },
      property: { name: 'Property', address: 'Property Address' }
    }
  }
}

/**
 * Extract refund reason from notes
 */
function extractRefundReason(notes?: string): string {
  if (!notes) return 'Refund requested'

  // Look for "Reason:" in the notes
  const reasonMatch = notes.match(/Reason:\s*([^.]+)/i)
  if (reasonMatch) {
    return reasonMatch[1].trim()
  }

  // Fallback to first sentence of notes
  const firstSentence = notes.split('.')[0]
  return firstSentence.length > 100 ? 'Refund processed' : firstSentence
}

/**
 * Generate payment receipt HTML
 */
export function generatePaymentReceiptHTML(payment: Payment, tenant: any, property: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payment Receipt</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .receipt { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
        .details { margin: 20px 0; }
        .row { display: flex; justify-content: space-between; margin: 10px 0; }
        .label { font-weight: bold; }
        .amount { font-size: 24px; font-weight: bold; color: #2563eb; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <h1>Payment Receipt</h1>
          <p>Receipt #: RCP-${payment.id.slice(0, 8).toUpperCase()}</p>
        </div>
        
        <div class="details">
          <div class="row">
            <span class="label">Tenant:</span>
            <span>${tenant.name}</span>
          </div>
          <div class="row">
            <span class="label">Property:</span>
            <span>${property.name}</span>
          </div>
          <div class="row">
            <span class="label">Address:</span>
            <span>${property.address}</span>
          </div>
          <div class="row">
            <span class="label">Description:</span>
            <span>${payment.description}</span>
          </div>
          <div class="row">
            <span class="label">Payment Method:</span>
            <span>${payment.paymentMethod}</span>
          </div>
          <div class="row">
            <span class="label">Payment Date:</span>
            <span>${payment.paidDate?.toLocaleDateString() || 'N/A'}</span>
          </div>
          <div class="row">
            <span class="label">Due Date:</span>
            <span>${payment.dueDate.toLocaleDateString()}</span>
          </div>
          ${payment.reference ? `
          <div class="row">
            <span class="label">Reference:</span>
            <span>${payment.reference}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="row" style="border-top: 2px solid #333; padding-top: 20px; margin-top: 20px;">
          <span class="label">Total Amount:</span>
          <span class="amount">${payment.currency} ${(payment.amountCents / 100).toFixed(2)}</span>
        </div>
        
        <div class="footer">
          <p>Thank you for your payment!</p>
          <p>If you have any questions, please contact us at ${process.env.SUPPORT_EMAIL || 'support@example.com'}</p>
        </div>
      </div>
    </body>
    </html>
  `
}
