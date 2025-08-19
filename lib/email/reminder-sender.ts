import { Resend } from 'resend';
import { format, isToday, isFuture, isPast } from 'date-fns';
import { Payment } from '../db/models/payment';
import { Tenant } from '../db/models/tenant';
import { getPropertyById } from '../db/operations/properties';

// Lazy instantiate Resend within functions to avoid build-time API key checks

export interface ReminderEmailProps {
  tenantName: string
  tenantEmail: string
  paymentAmount: number
  dueDate: string
  propertyName: string
  paymentMethods: string[]
  contactEmail: string
  paymentReference: string
  propertyLogo?: string
  reminderType: 'upcoming' | 'due' | 'overdue'
}

export interface EmailDeliveryResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendPaymentReminder(
  payment: Payment,
  tenant: Tenant
): Promise<EmailDeliveryResult> {
  const property = await getPropertyById(payment.propertyId);
  if (!property) {
    throw new Error(`Property with ID ${payment.propertyId} not found`);
  }

  const reminderType = getReminderType(payment.dueDate, payment.status);

  const props: ReminderEmailProps = {
    tenantName: `${tenant.firstName} ${tenant.lastName}`,
    tenantEmail: tenant.email,
    paymentAmount: payment.amountCents / 100,
    dueDate: payment.dueDate.toISOString(),
    propertyName: property.name,
    paymentMethods: [],
    contactEmail: process.env.SUPPORT_EMAIL || 'support@coliving-danang.com',
    paymentReference: payment.reference || payment.id,
    propertyLogo: undefined,
    reminderType: reminderType,
  };
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      // Don't throw at build-time; fail gracefully at runtime
      return { success: false, error: 'Email service not configured (missing RESEND_API_KEY)' }
    }
    const resend = new Resend(apiKey)
    const subject = getSubjectLine(props.reminderType, props.propertyName)
    const { html, text } = generateEmailContent(props)

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@coliving-danang.com',
      to: props.tenantEmail,
      subject,
      html,
      text,
      tags: [
        { name: 'type', value: 'payment-reminder' },
        { name: 'reminder-type', value: props.reminderType },
        { name: 'property', value: props.propertyName },
      ],
    })

    if (error) {
      throw new Error(error.message || 'Resend send error')
    }

    console.log(`Payment reminder sent to ${props.tenantEmail}: ${data?.id}`)
    
    return {
      success: true,
      messageId: data?.id,
    }
  } catch (error) {
    console.error('Failed to send payment reminder:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function getReminderType(dueDate: Date, status: string): 'upcoming' | 'due' | 'overdue' {
  if (status === 'Overdue') {
    return 'overdue';
  }
  if (isToday(dueDate)) {
    return 'due';
  }
  if (isFuture(dueDate)) {
    return 'upcoming';
  }
  if (isPast(dueDate)) {
    return 'overdue';
  }
  return 'upcoming';
}

function getSubjectLine(reminderType: string, propertyName: string): string {
  switch (reminderType) {
    case 'upcoming':
      return `Payment Reminder: ${propertyName} - Due Soon`
    case 'due':
      return `Payment Due Today: ${propertyName}`
    case 'overdue':
      return `Urgent: Overdue Payment - ${propertyName}`
    default:
      return `Payment Reminder: ${propertyName}`
  }
}

function generateEmailContent(props: ReminderEmailProps): { html: string; text: string } {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(props.paymentAmount)

  const formattedDate = format(new Date(props.dueDate), 'MMMM d, yyyy')
  
  const urgencyClass = props.reminderType === 'overdue' ? 'urgent' : 'normal'
  const urgencyColor = props.reminderType === 'overdue' ? '#dc2626' : '#4f46e5'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Reminder - ${props.propertyName}</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 0; 
          background-color: #f8fafc;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
          background-color: ${urgencyColor}; 
          color: white; 
          padding: 30px 20px; 
          text-align: center; 
        }
        .header h1 { 
          margin: 0; 
          font-size: 24px; 
          font-weight: 600; 
        }
        .content { 
          padding: 40px 30px; 
        }
        .payment-details {
          background-color: #f8fafc;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid ${urgencyColor};
        }
        .payment-row {
          display: flex;
          justify-content: space-between;
          margin: 8px 0;
          padding: 4px 0;
        }
        .payment-row strong {
          font-weight: 600;
        }
        .amount {
          font-size: 24px;
          font-weight: 700;
          color: ${urgencyColor};
        }
        .methods {
          background-color: #f0f9ff;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
        }
        .methods h3 {
          margin: 0 0 10px 0;
          color: #1e40af;
          font-size: 16px;
        }
        .methods ul {
          margin: 0;
          padding-left: 20px;
        }
        .footer { 
          background-color: #f8fafc;
          text-align: center; 
          padding: 20px; 
          color: #6b7280; 
          font-size: 14px; 
          border-top: 1px solid #e5e7eb;
        }
        .urgent-notice {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
          color: #dc2626;
        }
        @media (max-width: 600px) {
          .container { margin: 10px; }
          .content { padding: 30px 20px; }
          .payment-row { flex-direction: column; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${props.propertyLogo ? `<img src="${props.propertyLogo}" alt="${props.propertyName}" style="max-height: 40px; margin-bottom: 10px;">` : ''}
          <h1>${getEmailTitle(props.reminderType)}</h1>
        </div>
        <div class="content">
          <p>Dear ${props.tenantName},</p>
          
          ${props.reminderType === 'overdue' ? `
            <div class="urgent-notice">
              <strong>⚠️ Urgent Notice:</strong> Your payment is now overdue. Please make payment immediately to avoid any late fees or service interruption.
            </div>
          ` : ''}
          
          <p>${getEmailMessage(props.reminderType, formattedDate)}</p>
          
          <div class="payment-details">
            <div class="payment-row">
              <span>Property:</span>
              <strong>${props.propertyName}</strong>
            </div>
            <div class="payment-row">
              <span>Amount Due:</span>
              <span class="amount">${formattedAmount}</span>
            </div>
            <div class="payment-row">
              <span>Due Date:</span>
              <strong>${formattedDate}</strong>
            </div>
            <div class="payment-row">
              <span>Reference:</span>
              <strong>${props.paymentReference}</strong>
            </div>
          </div>

          <div class="methods">
            <h3>💳 Payment Methods</h3>
            <ul>
              ${props.paymentMethods.map(method => `<li>${method}</li>`).join('')}
            </ul>
          </div>

          <p>If you have any questions or need assistance with your payment, please don't hesitate to contact us at <a href="mailto:${props.contactEmail}">${props.contactEmail}</a>.</p>
          
          <p>Thank you for your prompt attention to this matter.</p>
          
          <p>Best regards,<br>
          <strong>${props.propertyName} Management Team</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated payment reminder. Please do not reply to this email.</p>
          <p>If you believe you received this email in error, please contact us at ${props.contactEmail}</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
    ${getEmailTitle(props.reminderType)} - ${props.propertyName}
    
    Dear ${props.tenantName},
    
    ${props.reminderType === 'overdue' ? 'URGENT NOTICE: Your payment is now overdue. Please make payment immediately to avoid any late fees or service interruption.\n\n' : ''}
    
    ${getEmailMessage(props.reminderType, formattedDate)}
    
    Payment Details:
    - Property: ${props.propertyName}
    - Amount Due: ${formattedAmount}
    - Due Date: ${formattedDate}
    - Reference: ${props.paymentReference}
    
    Payment Methods:
    ${props.paymentMethods.map(method => `- ${method}`).join('\n')}
    
    If you have any questions or need assistance with your payment, please contact us at ${props.contactEmail}.
    
    Thank you for your prompt attention to this matter.
    
    Best regards,
    ${props.propertyName} Management Team
    
    ---
    This is an automated payment reminder. Please do not reply to this email.
    If you believe you received this email in error, please contact us at ${props.contactEmail}
  `

  return { html, text }
}

function getEmailTitle(reminderType: string): string {
  switch (reminderType) {
    case 'upcoming':
      return 'Payment Reminder'
    case 'due':
      return 'Payment Due Today'
    case 'overdue':
      return 'Overdue Payment Notice'
    default:
      return 'Payment Reminder'
  }
}

function getEmailMessage(reminderType: string, formattedDate: string): string {
  switch (reminderType) {
    case 'upcoming':
      return `This is a friendly reminder that your rent payment is due on ${formattedDate}. Please ensure payment is made by the due date to avoid any late fees.`
    case 'due':
      return `Your rent payment is due today (${formattedDate}). Please make your payment as soon as possible to avoid late fees.`
    case 'overdue':
      return `Your rent payment was due on ${formattedDate} and is now overdue. Please make payment immediately to avoid additional late fees and potential service interruption.`
    default:
      return `Please ensure your rent payment is made by ${formattedDate}.`
  }
}

// Rate limiting helper
const emailRateLimit = new Map<string, number>()
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const MAX_EMAILS_PER_HOUR = 10

export function checkRateLimit(tenantEmail: string): boolean {
  const now = Date.now()
  const key = `${tenantEmail}:${Math.floor(now / RATE_LIMIT_WINDOW)}`
  const count = emailRateLimit.get(key) || 0
  
  if (count >= MAX_EMAILS_PER_HOUR) {
    return false
  }
  
  emailRateLimit.set(key, count + 1)
  return true
}
