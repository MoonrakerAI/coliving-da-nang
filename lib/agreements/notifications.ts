import nodemailer from 'nodemailer'
import { Agreement, AgreementTemplate } from '@/lib/db/models/agreement'
import { Property } from '@/lib/db/models/property'

// Email configuration (reuse existing transporter setup)
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const isDevelopment = process.env.NODE_ENV === 'development'
const isSmtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASS

export interface AgreementEmailData {
  prospectName: string
  prospectEmail: string
  propertyName: string
  propertyAddress: string
  agreementUrl: string
  expirationDate: Date
  ownerName?: string
  ownerEmail?: string
  customMessage?: string
}

export interface ReminderEmailData extends AgreementEmailData {
  reminderNumber: number
  daysUntilExpiration: number
}

// Send initial agreement email to prospect
export async function sendAgreementEmail(data: AgreementEmailData): Promise<void> {
  const subject = `Digital Lease Agreement - ${data.propertyName}`
  
  const html = generateAgreementEmailHTML(data)
  const text = generateAgreementEmailText(data)

  if (isDevelopment && !isSmtpConfigured) {
    console.log('=== AGREEMENT EMAIL ===')
    console.log(`To: ${data.prospectEmail}`)
    console.log(`Subject: ${subject}`)
    console.log(`Agreement URL: ${data.agreementUrl}`)
    console.log(`Property: ${data.propertyName}`)
    console.log('=======================')
    return
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@coliving-danang.com',
      to: data.prospectEmail,
      subject,
      text,
      html,
      replyTo: data.ownerEmail || process.env.SMTP_FROM
    })
    
    console.log(`Agreement email sent to: ${data.prospectEmail}`)
  } catch (error) {
    console.error('Failed to send agreement email:', error)
    throw new Error('Failed to send agreement email')
  }
}

// Send reminder email for unsigned agreement
export async function sendAgreementReminderEmail(data: ReminderEmailData): Promise<void> {
  const urgencyLevel = data.reminderNumber >= 3 ? 'urgent' : data.reminderNumber >= 2 ? 'important' : 'normal'
  const subject = generateReminderSubject(data, urgencyLevel)
  
  const html = generateReminderEmailHTML(data, urgencyLevel)
  const text = generateReminderEmailText(data, urgencyLevel)

  if (isDevelopment && !isSmtpConfigured) {
    console.log('=== AGREEMENT REMINDER EMAIL ===')
    console.log(`To: ${data.prospectEmail}`)
    console.log(`Subject: ${subject}`)
    console.log(`Reminder #: ${data.reminderNumber}`)
    console.log(`Days until expiration: ${data.daysUntilExpiration}`)
    console.log('================================')
    return
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@coliving-danang.com',
      to: data.prospectEmail,
      subject,
      text,
      html,
      replyTo: data.ownerEmail || process.env.SMTP_FROM,
      priority: urgencyLevel === 'urgent' ? 'high' : 'normal'
    })
    
    console.log(`Agreement reminder email sent to: ${data.prospectEmail} (reminder #${data.reminderNumber})`)
  } catch (error) {
    console.error('Failed to send agreement reminder email:', error)
    throw new Error('Failed to send agreement reminder email')
  }
}

// Send agreement completion notification
export async function sendAgreementCompletedEmail(data: AgreementEmailData): Promise<void> {
  const subject = `Agreement Signed - ${data.propertyName}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Agreement Completed</title>
      <style>
        ${getEmailStyles()}
        .success { background-color: #10b981; }
        .success-content { background-color: #f0fdf4; border-left: 4px solid #10b981; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header success">
          <h1>🎉 Agreement Completed!</h1>
        </div>
        <div class="content success-content">
          <p>Hello ${data.prospectName},</p>
          <p><strong>Congratulations!</strong> Your lease agreement for <strong>${data.propertyName}</strong> has been successfully signed and completed.</p>
          <p><strong>What's next?</strong></p>
          <ul>
            <li>You will receive your tenant profile access within 24 hours</li>
            <li>Move-in instructions will be sent separately</li>
            <li>Your signed agreement is available for download</li>
          </ul>
          <p style="text-align: center;">
            <a href="${data.agreementUrl}" class="button">Download Signed Agreement</a>
          </p>
          <p>Welcome to the ${data.propertyName} community!</p>
          <p>Best regards,<br>${data.ownerName || 'Property Management Team'}</p>
        </div>
        <div class="footer">
          <p>Questions? Reply to this email or contact us directly.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
    Agreement Completed!
    
    Hello ${data.prospectName},
    
    Congratulations! Your lease agreement for ${data.propertyName} has been successfully signed and completed.
    
    What's next?
    - You will receive your tenant profile access within 24 hours
    - Move-in instructions will be sent separately
    - Your signed agreement is available for download: ${data.agreementUrl}
    
    Welcome to the ${data.propertyName} community!
    
    Best regards,
    ${data.ownerName || 'Property Management Team'}
  `

  if (isDevelopment && !isSmtpConfigured) {
    console.log('=== AGREEMENT COMPLETED EMAIL ===')
    console.log(`To: ${data.prospectEmail}`)
    console.log(`Subject: ${subject}`)
    console.log('==================================')
    return
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@coliving-danang.com',
      to: data.prospectEmail,
      subject,
      text,
      html,
      replyTo: data.ownerEmail || process.env.SMTP_FROM
    })
    
    console.log(`Agreement completed email sent to: ${data.prospectEmail}`)
  } catch (error) {
    console.error('Failed to send agreement completed email:', error)
    throw new Error('Failed to send agreement completed email')
  }
}

// Generate initial agreement email HTML
function generateAgreementEmailHTML(data: AgreementEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Digital Lease Agreement</title>
      <style>
        ${getEmailStyles()}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Digital Lease Agreement</h1>
        </div>
        <div class="content">
          <p>Hello ${data.prospectName},</p>
          <p>Thank you for your interest in <strong>${data.propertyName}</strong>!</p>
          <p>We're excited to move forward with your lease application. Please review and sign your digital lease agreement using the secure link below.</p>
          
          <div class="property-info">
            <h3>Property Details:</h3>
            <p><strong>Property:</strong> ${data.propertyName}<br>
            <strong>Address:</strong> ${data.propertyAddress}</p>
          </div>
          
          ${data.customMessage ? `<div class="custom-message"><p><em>${data.customMessage}</em></p></div>` : ''}
          
          <p style="text-align: center;">
            <a href="${data.agreementUrl}" class="button">Review & Sign Agreement</a>
          </p>
          
          <div class="important-info">
            <h4>⏰ Important Information:</h4>
            <ul>
              <li><strong>Secure signing:</strong> Your agreement is protected with industry-standard security</li>
              <li><strong>Mobile friendly:</strong> You can sign on any device</li>
              <li><strong>Expires:</strong> ${data.expirationDate.toLocaleDateString()} at ${data.expirationDate.toLocaleTimeString()}</li>
              <li><strong>Questions?</strong> Simply reply to this email</li>
            </ul>
          </div>
          
          <p>If the button doesn't work, copy and paste this link:</p>
          <p class="url-fallback">${data.agreementUrl}</p>
          
          <p>We look forward to welcoming you to our community!</p>
          <p>Best regards,<br>${data.ownerName || 'Property Management Team'}</p>
        </div>
        <div class="footer">
          <p>This is a secure document delivery. Do not share this link with others.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Generate initial agreement email text
function generateAgreementEmailText(data: AgreementEmailData): string {
  return `
    Digital Lease Agreement
    
    Hello ${data.prospectName},
    
    Thank you for your interest in ${data.propertyName}!
    
    We're excited to move forward with your lease application. Please review and sign your digital lease agreement using this secure link:
    
    ${data.agreementUrl}
    
    Property Details:
    - Property: ${data.propertyName}
    - Address: ${data.propertyAddress}
    
    ${data.customMessage ? `Message: ${data.customMessage}\n` : ''}
    
    Important Information:
    - Secure signing with industry-standard security
    - Mobile friendly - sign on any device
    - Expires: ${data.expirationDate.toLocaleDateString()} at ${data.expirationDate.toLocaleTimeString()}
    - Questions? Simply reply to this email
    
    We look forward to welcoming you to our community!
    
    Best regards,
    ${data.ownerName || 'Property Management Team'}
  `
}

// Generate reminder email HTML
function generateReminderEmailHTML(data: ReminderEmailData, urgencyLevel: string): string {
  const urgencyColors = {
    normal: '#4f46e5',
    important: '#f59e0b',
    urgent: '#ef4444'
  }
  
  const urgencyEmojis = {
    normal: '📋',
    important: '⚠️',
    urgent: '🚨'
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Agreement Reminder</title>
      <style>
        ${getEmailStyles()}
        .header-${urgencyLevel} { background-color: ${urgencyColors[urgencyLevel as keyof typeof urgencyColors]}; }
        .urgency-banner { 
          background-color: ${urgencyLevel === 'urgent' ? '#fef2f2' : urgencyLevel === 'important' ? '#fffbeb' : '#f8fafc'}; 
          border-left: 4px solid ${urgencyColors[urgencyLevel as keyof typeof urgencyColors]};
          padding: 15px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header header-${urgencyLevel}">
          <h1>${urgencyEmojis[urgencyLevel as keyof typeof urgencyEmojis]} Agreement Reminder</h1>
        </div>
        <div class="content">
          <p>Hello ${data.prospectName},</p>
          
          <div class="urgency-banner">
            <p><strong>${getUrgencyMessage(data.daysUntilExpiration, urgencyLevel)}</strong></p>
          </div>
          
          <p>This is a ${urgencyLevel === 'urgent' ? 'final' : ''} reminder that your lease agreement for <strong>${data.propertyName}</strong> is still pending your signature.</p>
          
          <div class="property-info">
            <h3>Agreement Details:</h3>
            <p><strong>Property:</strong> ${data.propertyName}<br>
            <strong>Address:</strong> ${data.propertyAddress}<br>
            <strong>Expires:</strong> ${data.expirationDate.toLocaleDateString()} at ${data.expirationDate.toLocaleTimeString()}</p>
          </div>
          
          <p style="text-align: center;">
            <a href="${data.agreementUrl}" class="button">Sign Agreement Now</a>
          </p>
          
          ${urgencyLevel === 'urgent' ? `
            <div class="important-info">
              <h4>⚠️ Action Required:</h4>
              <p>Your agreement will expire in ${data.daysUntilExpiration} day${data.daysUntilExpiration !== 1 ? 's' : ''}. After expiration, you will need to request a new agreement.</p>
            </div>
          ` : ''}
          
          <p>If you have any questions or need assistance, please reply to this email.</p>
          <p>Best regards,<br>${data.ownerName || 'Property Management Team'}</p>
        </div>
        <div class="footer">
          <p>This is reminder #${data.reminderNumber}. You can unsubscribe by replying to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Generate reminder email text
function generateReminderEmailText(data: ReminderEmailData, urgencyLevel: string): string {
  return `
    Agreement Reminder
    
    Hello ${data.prospectName},
    
    ${getUrgencyMessage(data.daysUntilExpiration, urgencyLevel)}
    
    This is a ${urgencyLevel === 'urgent' ? 'final' : ''} reminder that your lease agreement for ${data.propertyName} is still pending your signature.
    
    Agreement Details:
    - Property: ${data.propertyName}
    - Address: ${data.propertyAddress}
    - Expires: ${data.expirationDate.toLocaleDateString()} at ${data.expirationDate.toLocaleTimeString()}
    
    Sign your agreement here: ${data.agreementUrl}
    
    ${urgencyLevel === 'urgent' ? `
    ⚠️ ACTION REQUIRED:
    Your agreement will expire in ${data.daysUntilExpiration} day${data.daysUntilExpiration !== 1 ? 's' : ''}. After expiration, you will need to request a new agreement.
    ` : ''}
    
    If you have any questions or need assistance, please reply to this email.
    
    Best regards,
    ${data.ownerName || 'Property Management Team'}
    
    ---
    This is reminder #${data.reminderNumber}. You can unsubscribe by replying to this email.
  `
}

// Helper functions
function generateReminderSubject(data: ReminderEmailData, urgencyLevel: string): string {
  const prefixes = {
    normal: 'Reminder',
    important: 'Important Reminder',
    urgent: 'URGENT: Final Reminder'
  }
  
  return `${prefixes[urgencyLevel as keyof typeof prefixes]}: Sign Your Agreement - ${data.propertyName}`
}

function getUrgencyMessage(daysUntilExpiration: number, urgencyLevel: string): string {
  if (urgencyLevel === 'urgent') {
    return daysUntilExpiration <= 1 
      ? 'Your agreement expires today! Please sign immediately.'
      : `Your agreement expires in ${daysUntilExpiration} days. Please sign as soon as possible.`
  } else if (urgencyLevel === 'important') {
    return `Your agreement expires in ${daysUntilExpiration} days. Please review and sign at your earliest convenience.`
  } else {
    return `Your agreement is ready for signature and expires in ${daysUntilExpiration} days.`
  }
}

function getEmailStyles(): string {
  return `
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0; 
      padding: 0; 
      background-color: #f5f5f5; 
    }
    .container { 
      max-width: 600px; 
      margin: 20px auto; 
      background-color: white; 
      border-radius: 8px; 
      box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
      overflow: hidden; 
    }
    .header { 
      background-color: #4f46e5; 
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
      padding: 30px; 
    }
    .button { 
      display: inline-block; 
      background-color: #4f46e5; 
      color: white; 
      padding: 14px 28px; 
      text-decoration: none; 
      border-radius: 6px; 
      margin: 20px 0; 
      font-weight: 600;
      font-size: 16px;
    }
    .button:hover { 
      background-color: #3730a3; 
    }
    .property-info { 
      background-color: #f8fafc; 
      padding: 20px; 
      border-radius: 6px; 
      margin: 20px 0; 
      border-left: 4px solid #4f46e5; 
    }
    .property-info h3 { 
      margin-top: 0; 
      color: #4f46e5; 
    }
    .important-info { 
      background-color: #fef3c7; 
      padding: 20px; 
      border-radius: 6px; 
      margin: 20px 0; 
      border-left: 4px solid #f59e0b; 
    }
    .important-info h4 { 
      margin-top: 0; 
      color: #92400e; 
    }
    .custom-message { 
      background-color: #f0f9ff; 
      padding: 15px; 
      border-radius: 6px; 
      margin: 20px 0; 
      border-left: 4px solid #0ea5e9; 
    }
    .url-fallback { 
      word-break: break-all; 
      background-color: #f1f5f9; 
      padding: 12px; 
      border-radius: 4px; 
      font-family: monospace; 
      font-size: 14px; 
    }
    .footer { 
      text-align: center; 
      padding: 20px; 
      background-color: #f8fafc; 
      color: #64748b; 
      font-size: 14px; 
    }
    ul { 
      padding-left: 20px; 
    }
    li { 
      margin-bottom: 8px; 
    }
  `
}

// Email delivery tracking and validation
export async function validateEmailDelivery(email: string): Promise<boolean> {
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export async function trackEmailDelivery(agreementId: string, emailType: 'initial' | 'reminder' | 'completed'): Promise<void> {
  // This would integrate with email tracking service (SendGrid, Mailgun, etc.)
  // For now, just log the delivery
  console.log(`Email delivery tracked: ${emailType} for agreement ${agreementId}`)
}

// Test agreement email configuration
export async function testAgreementEmailConfiguration(): Promise<boolean> {
  if (isDevelopment && !isSmtpConfigured) {
    console.log('Agreement email service running in development mode (console logging)')
    return true
  }

  try {
    await transporter.verify()
    console.log('Agreement email service is ready')
    return true
  } catch (error) {
    console.error('Agreement email service configuration error:', error)
    return false
  }
}
