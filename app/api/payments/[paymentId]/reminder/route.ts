import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { getPaymentById } from '@/lib/db/operations/payment'
import { sendEmail } from '@/lib/email'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payment = await getPaymentById(params.id)
    
    if (!payment) {
      return NextResponse.json(
        { message: 'Payment not found' },
        { status: 404 }
      )
    }

    // Send payment reminder email
    const reminderSubject = `Payment Reminder: ${payment.description}`
    const reminderBody = `
      <h2>Payment Reminder</h2>
      <p>This is a friendly reminder that your payment is due.</p>
      
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Payment Details</h3>
        <p><strong>Description:</strong> ${payment.description}</p>
        <p><strong>Amount:</strong> $${(payment.amountCents / 100).toFixed(2)}</p>
        <p><strong>Due Date:</strong> ${new Date(payment.dueDate).toLocaleDateString()}</p>
        <p><strong>Status:</strong> ${payment.status}</p>
        ${payment.reference ? `<p><strong>Reference:</strong> ${payment.reference}</p>` : ''}
      </div>
      
      <p>Please make your payment as soon as possible to avoid any late fees.</p>
      
      <p>If you have any questions or concerns, please contact us.</p>
      
      <p>Thank you!</p>
    `

    // In a real application, you would get the tenant's email from the database
    const tenantEmail = `tenant-${payment.tenantId}@example.com`
    
    await sendEmail({
      to: tenantEmail,
      subject: reminderSubject,
      text: reminderBody
    })

    return NextResponse.json({ 
      message: 'Payment reminder sent successfully',
      paymentId: payment.id
    })

  } catch (error) {
    console.error('Error sending payment reminder:', error)
    return NextResponse.json(
      { message: 'Failed to send payment reminder' },
      { status: 500 }
    )
  }
}
