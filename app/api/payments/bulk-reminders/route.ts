import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { getPaymentById } from '@/lib/db/operations/payment'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { paymentIds } = body

    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      return NextResponse.json(
        { message: 'Payment IDs are required' },
        { status: 400 }
      )
    }

    const results = []
    const errors = []

    // Send reminders for each payment
    for (const paymentId of paymentIds) {
      try {
        const payment = await getPaymentById(paymentId)
        
        if (!payment) {
          errors.push({ paymentId, error: 'Payment not found' })
          continue
        }

        // Send payment reminder email
        const reminderSubject = `Payment Reminder: ${payment.description}`
        const reminderBody = `
          <h2>Payment Reminder</h2>
          <p>This is a friendly reminder that your payment is overdue.</p>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Payment Details</h3>
            <p><strong>Description:</strong> ${payment.description}</p>
            <p><strong>Amount:</strong> $${(payment.amountCents / 100).toFixed(2)}</p>
            <p><strong>Due Date:</strong> ${new Date(payment.dueDate).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${payment.status}</p>
            ${payment.reference ? `<p><strong>Reference:</strong> ${payment.reference}</p>` : ''}
          </div>
          
          <p><strong>This payment is overdue.</strong> Please make your payment immediately to avoid additional late fees.</p>
          
          <p>If you have any questions or concerns, please contact us immediately.</p>
          
          <p>Thank you!</p>
        `

        // In a real application, you would get the tenant's email from the database
        const tenantEmail = `tenant-${payment.tenantId}@example.com`
        
        await sendEmail(
          tenantEmail,
          reminderSubject,
          reminderBody
        )

        results.push({ paymentId, status: 'sent' })
        
      } catch (error) {
        console.error(`Error sending reminder for payment ${paymentId}:`, error)
        errors.push({ 
          paymentId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    return NextResponse.json({ 
      message: `Bulk reminders processed: ${results.length} sent, ${errors.length} failed`,
      results,
      errors,
      summary: {
        total: paymentIds.length,
        sent: results.length,
        failed: errors.length
      }
    })

  } catch (error) {
    console.error('Error sending bulk payment reminders:', error)
    return NextResponse.json(
      { message: 'Failed to send bulk payment reminders' },
      { status: 500 }
    )
  }
}
