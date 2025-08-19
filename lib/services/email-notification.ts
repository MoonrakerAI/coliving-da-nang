import { ReimbursementRequest } from '@/lib/db/models/reimbursement'

export interface EmailTemplate {
  subject: string
  htmlBody: string
  textBody: string
}

export interface EmailRecipient {
  email: string
  name?: string
  role: 'requestor' | 'approver' | 'admin'
}

export interface NotificationContext {
  reimbursement: ReimbursementRequest
  actionBy?: string
  comment?: string
  previousStatus?: string
  additionalData?: Record<string, any>
}

export class EmailNotificationService {
  private static readonly FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@coliving-danang.com'
  private static readonly COMPANY_NAME = 'Coliving Da Nang'
  private static readonly BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  /**
   * Generate email template for reimbursement status changes
   */
  static generateReimbursementNotificationTemplate(
    type: 'requested' | 'approved' | 'denied' | 'paid',
    context: NotificationContext,
    recipient: EmailRecipient
  ): EmailTemplate {
    const { reimbursement, actionBy, comment } = context
    const amount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: reimbursement.currency
    }).format(reimbursement.amountCents / 100)

    const reimbursementUrl = `${this.BASE_URL}/reimbursements/requests/${reimbursement.id}`
    const expenseUrl = `${this.BASE_URL}/expenses/${reimbursement.expenseId}`

    switch (type) {
      case 'requested':
        return {
          subject: `New Reimbursement Request - ${amount}`,
          htmlBody: this.generateRequestedEmailHTML(reimbursement, amount, reimbursementUrl, expenseUrl, recipient),
          textBody: this.generateRequestedEmailText(reimbursement, amount, reimbursementUrl, expenseUrl, recipient)
        }

      case 'approved':
        return {
          subject: `Reimbursement Approved - ${amount}`,
          htmlBody: this.generateApprovedEmailHTML(reimbursement, amount, reimbursementUrl, comment, recipient),
          textBody: this.generateApprovedEmailText(reimbursement, amount, reimbursementUrl, comment, recipient)
        }

      case 'denied':
        return {
          subject: `Reimbursement Request Denied - ${amount}`,
          htmlBody: this.generateDeniedEmailHTML(reimbursement, amount, reimbursementUrl, comment, recipient),
          textBody: this.generateDeniedEmailText(reimbursement, amount, reimbursementUrl, comment, recipient)
        }

      case 'paid':
        return {
          subject: `Reimbursement Payment Processed - ${amount}`,
          htmlBody: this.generatePaidEmailHTML(reimbursement, amount, reimbursementUrl, recipient),
          textBody: this.generatePaidEmailText(reimbursement, amount, reimbursementUrl, recipient)
        }

      default:
        throw new Error(`Unknown notification type: ${type}`)
    }
  }

  /**
   * Send email notification (placeholder implementation)
   */
  static async sendNotification(
    recipient: EmailRecipient,
    template: EmailTemplate
  ): Promise<boolean> {
    try {
      // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
      console.log('📧 Email Notification:', {
        to: recipient.email,
        subject: template.subject,
        preview: template.textBody.substring(0, 100) + '...'
      })

      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 100))

      // For development, log the email content
      if (process.env.NODE_ENV === 'development') {
        console.log('Email Content:', {
          recipient,
          subject: template.subject,
          htmlBody: template.htmlBody,
          textBody: template.textBody
        })
      }

      return true
    } catch (error) {
      console.error('Failed to send email notification:', error)
      return false
    }
  }

  /**
   * Send reimbursement status notification to all relevant parties
   */
  static async sendReimbursementStatusNotification(
    type: 'requested' | 'approved' | 'denied' | 'paid',
    context: NotificationContext
  ): Promise<{ sent: number; failed: number }> {
    const recipients = await this.getNotificationRecipients(context.reimbursement, type)
    let sent = 0
    let failed = 0

    for (const recipient of recipients) {
      try {
        const template = this.generateReimbursementNotificationTemplate(type, context, recipient)
        const success = await this.sendNotification(recipient, template)
        
        if (success) {
          sent++
        } else {
          failed++
        }
      } catch (error) {
        console.error(`Failed to send notification to ${recipient.email}:`, error)
        failed++
      }
    }

    return { sent, failed }
  }

  /**
   * Get list of recipients for reimbursement notifications
   */
  private static async getNotificationRecipients(
    reimbursement: ReimbursementRequest,
    type: 'requested' | 'approved' | 'denied' | 'paid'
  ): Promise<EmailRecipient[]> {
    const recipients: EmailRecipient[] = []

    // TODO: Integrate with user service to get actual email addresses
    // For now, using placeholder data

    switch (type) {
      case 'requested':
        // Notify property owners/approvers
        recipients.push({
          email: 'property-owner@coliving-danang.com',
          name: 'Property Owner',
          role: 'approver'
        })
        break

      case 'approved':
      case 'denied':
        // Notify the requestor
        recipients.push({
          email: 'requestor@coliving-danang.com',
          name: 'Requestor',
          role: 'requestor'
        })
        break

      case 'paid':
        // Notify the requestor and keep admin informed
        recipients.push(
          {
            email: 'requestor@coliving-danang.com',
            name: 'Requestor',
            role: 'requestor'
          },
          {
            email: 'admin@coliving-danang.com',
            name: 'Admin',
            role: 'admin'
          }
        )
        break
    }

    return recipients
  }

  // HTML Email Templates
  private static generateRequestedEmailHTML(
    reimbursement: ReimbursementRequest,
    amount: string,
    reimbursementUrl: string,
    expenseUrl: string,
    recipient: EmailRecipient
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Reimbursement Request</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .content { padding: 20px 0; }
    .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
    .details { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Reimbursement Request</h1>
      <p>A new reimbursement request requires your review and approval.</p>
    </div>
    
    <div class="content">
      <p>Hello ${recipient.name || 'Property Owner'},</p>
      
      <p>A new reimbursement request has been submitted and is awaiting your approval:</p>
      
      <div class="details">
        <strong>Request Details:</strong><br>
        Amount: <strong>${amount}</strong><br>
        Reason: ${reimbursement.comments?.[0] ?? 'No reason provided'}<br>
        Requested by: ${reimbursement.requestorId}<br>
        Property: ${reimbursement.propertyId}<br>
        Date: ${reimbursement.createdAt.toLocaleDateString()}
      </div>
      
      <p>Please review the request and take appropriate action:</p>
      
      <a href="${reimbursementUrl}" class="button">Review Request</a>
      <a href="${expenseUrl}" class="button" style="background: #6c757d;">View Related Expense</a>
    </div>
    
    <div class="footer">
      <p>This is an automated notification from ${this.COMPANY_NAME}.</p>
      <p>If you have any questions, please contact our support team.</p>
    </div>
  </div>
</body>
</html>
`
  }

  private static generateApprovedEmailHTML(
    reimbursement: ReimbursementRequest,
    amount: string,
    reimbursementUrl: string,
    comment?: string,
    recipient?: EmailRecipient
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reimbursement Approved</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .content { padding: 20px 0; }
    .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
    .details { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Reimbursement Approved</h1>
      <p>Great news! Your reimbursement request has been approved.</p>
    </div>
    
    <div class="content">
      <p>Hello ${recipient?.name || 'Requestor'},</p>
      
      <p>Your reimbursement request for <strong>${amount}</strong> has been approved and will be processed for payment.</p>
      
      <div class="details">
        <strong>Approved Request:</strong><br>
        Amount: <strong>${amount}</strong><br>
        Reason: ${reimbursement.comments?.[0] ?? 'No reason provided'}<br>
        Request ID: ${reimbursement.id}<br>
        Approved on: ${new Date().toLocaleDateString()}
        ${comment ? `<br>Approval Note: ${comment}` : ''}
      </div>
      
      <p>You will receive another notification once the payment has been processed.</p>
      
      <a href="${reimbursementUrl}" class="button">View Request Details</a>
    </div>
    
    <div class="footer">
      <p>This is an automated notification from ${this.COMPANY_NAME}.</p>
      <p>If you have any questions about your reimbursement, please contact our support team.</p>
    </div>
  </div>
</body>
</html>
`
}

private static generateDeniedEmailHTML(
  reimbursement: ReimbursementRequest,
  amount: string,
  reimbursementUrl: string,
  comment?: string,
  recipient?: EmailRecipient
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reimbursement Request Denied</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .content { padding: 20px 0; }
    .button { display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
    .details { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Reimbursement Request Denied</h1>
      <p>Your reimbursement request has been reviewed and denied.</p>
    </div>
    
    <div class="content">
      <p>Hello ${recipient?.name || 'Requestor'},</p>
      
      <p>Unfortunately, your reimbursement request for <strong>${amount}</strong> has been denied.</p>
      
      <div class="details">
        <strong>Denied Request:</strong><br>
        Amount: <strong>${amount}</strong><br>
        Reason: ${reimbursement.deniedReason || comment || reimbursement.comments?.[0] || 'No reason provided'}<br>
        Request ID: ${reimbursement.id}<br>
        Denied on: ${new Date().toLocaleDateString()}
        ${comment ? `<br><strong>Denial Reason:</strong> ${comment}` : ''}
      </div>
      
      <p>If you believe this decision was made in error or have additional information to provide, please contact the property management team.</p>
      
      <a href="${reimbursementUrl}" class="button">View Request Details</a>
    </div>
    
    <div class="footer">
      <p>This is an automated notification from ${this.COMPANY_NAME}.</p>
      <p>If you have any questions about this decision, please contact our support team.</p>
    </div>
  </div>
</body>
</html>
`
  }

  private static generatePaidEmailHTML(
    reimbursement: ReimbursementRequest,
    amount: string,
    reimbursementUrl: string,
    recipient?: EmailRecipient
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reimbursement Payment Processed</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #d1ecf1; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .content { padding: 20px 0; }
    .button { display: inline-block; background: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
    .details { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Payment Processed</h1>
      <p>Your reimbursement payment has been successfully processed!</p>
    </div>
    
    <div class="content">
      <p>Hello ${recipient?.name || 'Requestor'},</p>
      
      <p>Great news! Your reimbursement payment for <strong>${amount}</strong> has been processed and should appear in your account soon.</p>
      
      <div class="details">
        <strong>Payment Details:</strong><br>
        Amount: <strong>${amount}</strong><br>
        Payment Method: ${reimbursement.paymentMethod || 'Not specified'}<br>
        ${reimbursement.paymentReference ? `Payment Reference: ${reimbursement.paymentReference}<br>` : ''}
        Processed on: ${reimbursement.paidDate?.toLocaleDateString() || new Date().toLocaleDateString()}<br>
        Request ID: ${reimbursement.id}
      </div>
      
      <p>Please allow 1-3 business days for the payment to appear in your account, depending on your payment method.</p>
      
      <a href="${reimbursementUrl}" class="button">View Payment Details</a>
    </div>
    
    <div class="footer">
      <p>This is an automated notification from ${this.COMPANY_NAME}.</p>
      <p>If you don't receive your payment within the expected timeframe, please contact our support team.</p>
    </div>
  </div>
</body>
</html>
`
  }

  // Text Email Templates (simplified versions)
  private static generateRequestedEmailText(
    reimbursement: ReimbursementRequest,
    amount: string,
    reimbursementUrl: string,
    expenseUrl: string,
    recipient: EmailRecipient
  ): string {
    return `
New Reimbursement Request - ${amount}

Hello ${recipient.name || 'Property Owner'},

A new reimbursement request has been submitted and is awaiting your approval:

Request Details:
- Amount: ${amount}
- Reason: ${reimbursement.comments?.[0] ?? 'No reason provided'}
- Requested by: ${reimbursement.requestorId}
- Property: ${reimbursement.propertyId}
- Date: ${reimbursement.createdAt.toLocaleDateString()}

Please review the request at: ${reimbursementUrl}
View related expense at: ${expenseUrl}

This is an automated notification from ${this.COMPANY_NAME}.
`.trim()
  }

  private static generateApprovedEmailText(
    reimbursement: ReimbursementRequest,
    amount: string,
    reimbursementUrl: string,
    comment?: string,
    recipient?: EmailRecipient
  ): string {
    return `
Reimbursement Approved - ${amount}

Hello ${recipient?.name || 'Requestor'},

Great news! Your reimbursement request for ${amount} has been approved and will be processed for payment.

Approved Request:
- Amount: ${amount}
- Reason: ${reimbursement.comments?.[0] ?? 'No reason provided'}
- Request ID: ${reimbursement.id}
- Approved on: ${new Date().toLocaleDateString()}
${comment ? `- Approval Note: ${comment}` : ''}

You will receive another notification once the payment has been processed.

View request details at: ${reimbursementUrl}

This is an automated notification from ${this.COMPANY_NAME}.
`.trim()
  }

  private static generateDeniedEmailText(
    reimbursement: ReimbursementRequest,
    amount: string,
    reimbursementUrl: string,
    comment?: string,
    recipient?: EmailRecipient
  ): string {
    return `
Reimbursement Request Denied - ${amount}

Hello ${recipient?.name || 'Requestor'},

Unfortunately, your reimbursement request for ${amount} has been denied.

Denied Request:
- Amount: ${amount}
- Reason: ${reimbursement.deniedReason || comment || reimbursement.comments?.[0] || 'No reason provided'}
- Request ID: ${reimbursement.id}
- Denied on: ${new Date().toLocaleDateString()}
${comment ? `- Denial Reason: ${comment}` : ''}

If you believe this decision was made in error or have additional information to provide, please contact the property management team.

View request details at: ${reimbursementUrl}

This is an automated notification from ${this.COMPANY_NAME}.
`.trim()
  }

  private static generatePaidEmailText(
    reimbursement: ReimbursementRequest,
    amount: string,
    reimbursementUrl: string,
    recipient?: EmailRecipient
  ): string {
    return `
Reimbursement Payment Processed - ${amount}

Hello ${recipient?.name || 'Requestor'},

Great news! Your reimbursement payment for ${amount} has been processed and should appear in your account soon.

Payment Details:
- Amount: ${amount}
- Payment Method: ${reimbursement.paymentMethod || 'Not specified'}
${reimbursement.paymentReference ? `- Payment Reference: ${reimbursement.paymentReference}` : ''}
- Processed on: ${reimbursement.paidDate?.toLocaleDateString() || new Date().toLocaleDateString()}
- Request ID: ${reimbursement.id}

Please allow 1-3 business days for the payment to appear in your account, depending on your payment method.

View payment details at: ${reimbursementUrl}

This is an automated notification from ${this.COMPANY_NAME}.
`.trim()
  }
}
