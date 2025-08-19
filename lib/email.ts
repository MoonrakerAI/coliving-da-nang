import nodemailer from 'nodemailer'

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

// For development, use console logging if SMTP is not configured
const isDevelopment = process.env.NODE_ENV === 'development'
const isSmtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASS

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  const subject = 'Reset Your Password - Coliving Da Nang'
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Password Reset</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 30px; }
        .button { 
          display: inline-block; 
          background-color: #4f46e5; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 4px; 
          margin: 20px 0; 
        }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>You have requested to reset your password for your Coliving Da Nang Management System account.</p>
          <p>Click the button below to reset your password:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background-color: #e5e7eb; padding: 10px; border-radius: 4px;">
            ${resetUrl}
          </p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request this password reset, you can safely ignore this email.</p>
          <p>Best regards,<br>The Coliving Da Nang Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
    Password Reset Request
    
    Hello,
    
    You have requested to reset your password for your Coliving Da Nang Management System account.
    
    Click this link to reset your password: ${resetUrl}
    
    This link will expire in 1 hour.
    
    If you didn't request this password reset, you can safely ignore this email.
    
    Best regards,
    The Coliving Da Nang Team
  `

  if (isDevelopment && !isSmtpConfigured) {
    // In development without SMTP, log to console
    console.log('=== PASSWORD RESET EMAIL ===')
    console.log(`To: ${email}`)
    console.log(`Subject: ${subject}`)
    console.log(`Reset URL: ${resetUrl}`)
    console.log('============================')
    return
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@coliving-danang.com',
      to: email,
      subject,
      text,
      html,
    })
    
    console.log(`Password reset email sent to: ${email}`)
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    throw new Error('Failed to send password reset email')
  }
}

export async function sendUserInvitationEmail(
  email: string, 
  name: string, 
  inviteUrl: string,
  inviterName: string
): Promise<void> {
  const subject = 'You\'re Invited to Coliving Da Nang Management System'
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>System Invitation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 30px; }
        .button { 
          display: inline-block; 
          background-color: #4f46e5; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 4px; 
          margin: 20px 0; 
        }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Coliving Da Nang</h1>
        </div>
        <div class="content">
          <p>Hello ${name},</p>
          <p>${inviterName} has invited you to join the Coliving Da Nang Management System.</p>
          <p>Click the button below to set up your account:</p>
          <p style="text-align: center;">
            <a href="${inviteUrl}" class="button">Accept Invitation</a>
          </p>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background-color: #e5e7eb; padding: 10px; border-radius: 4px;">
            ${inviteUrl}
          </p>
          <p>This invitation will allow you to create your password and access the system.</p>
          <p>Best regards,<br>The Coliving Da Nang Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
    Welcome to Coliving Da Nang
    
    Hello ${name},
    
    ${inviterName} has invited you to join the Coliving Da Nang Management System.
    
    Click this link to set up your account: ${inviteUrl}
    
    This invitation will allow you to create your password and access the system.
    
    Best regards,
    The Coliving Da Nang Team
  `

  if (isDevelopment && !isSmtpConfigured) {
    // In development without SMTP, log to console
    console.log('=== USER INVITATION EMAIL ===')
    console.log(`To: ${email}`)
    console.log(`Name: ${name}`)
    console.log(`Subject: ${subject}`)
    console.log(`Invite URL: ${inviteUrl}`)
    console.log('==============================')
    return
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@coliving-danang.com',
      to: email,
      subject,
      text,
      html,
    })
    
    console.log(`User invitation email sent to: ${email}`)
  } catch (error) {
    console.error('Failed to send user invitation email:', error)
    throw new Error('Failed to send user invitation email')
  }
}

// Generic email sending function
export async function sendEmail(options: {
  to: string
  subject: string
  text?: string
  html?: string
}): Promise<void> {
  if (isDevelopment && !isSmtpConfigured) {
    console.log('=== EMAIL ===')
    console.log(`To: ${options.to}`)
    console.log(`Subject: ${options.subject}`)
    console.log(`Text: ${options.text}`)
    console.log('=============')
    return
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@coliving-danang.com',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    })
    
    console.log(`Email sent to: ${options.to}`)
  } catch (error) {
    console.error('Failed to send email:', error)
    throw new Error('Failed to send email')
  }
}

// Test email configuration
export async function testEmailConfiguration(): Promise<boolean> {
  if (isDevelopment && !isSmtpConfigured) {
    console.log('Email service running in development mode (console logging)')
    return true
  }

  try {
    await transporter.verify()
    console.log('Email service is ready')
    return true
  } catch (error) {
    console.error('Email service configuration error:', error)
    return false
  }
}
