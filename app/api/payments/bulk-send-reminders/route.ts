import { NextResponse } from 'next/server';
import { getPaymentById, updatePayment } from '@/lib/db/operations/payments';
import { getTenantById } from '@/lib/db/operations/tenants';
import { sendEmail } from '@/lib/email';
import { CommunicationOperations } from '@/lib/db/operations/communications';
import { CommunicationType, CommunicationDirection, CommunicationSource, CommunicationStatus, CommunicationPriority } from '@/lib/db/models/communication';

export async function POST(request: Request) {
  try {
    const { paymentIds } = await request.json()

    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      return NextResponse.json({ error: 'Payment IDs are required' }, { status: 400 })
    }

    const results = await Promise.allSettled(
      paymentIds.map(async (id) => {
        const payment = await getPaymentById(id)
        if (!payment) {
          throw new Error(`Payment with ID ${id} not found`)
        }
        // Assuming sendPaymentReminder is adapted to take payment object
        const tenant = await getTenantById(payment.tenantId);
        if (!tenant) {
          throw new Error(`Tenant with ID ${payment.tenantId} not found`);
        }

        // Send payment reminder email
        const reminderSubject = `Payment Reminder - ${payment.description}`
        const reminderBody = `
          Dear ${tenant.firstName} ${tenant.lastName},
          
          This is a reminder that your payment of $${payment.amountCents / 100} for ${payment.description} is due on ${payment.dueDate.toLocaleDateString()}.
          
          Please make your payment as soon as possible to avoid any late fees.
          
          If you have any questions, please contact us.
          
          Thank you!
        `
        
        await sendEmail({
          to: tenant.email,
          subject: reminderSubject,
          text: reminderBody
        });
        // Payment reminder sent - no need to update payment record

        await CommunicationOperations.create({
          tenantId: payment.tenantId,
          propertyId: payment.propertyId,
          paymentId: payment.id,
          type: CommunicationType.EMAIL,
          direction: CommunicationDirection.OUTGOING,
          source: CommunicationSource.PAYMENT_REMINDER,
          subject: 'Payment Reminder',
          content: `Payment reminder sent for amount ${payment.amountCents / 100} due on ${payment.dueDate.toLocaleDateString()}`,
          status: CommunicationStatus.OPEN,
          priority: CommunicationPriority.MEDIUM,
          attachments: [],
          tags: ['payment-reminder'],
          createdBy: 'system',
          timestamp: new Date(),
        });
        return { success: true, paymentId: id }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled').map((r: any) => r.value.paymentId)
    const failed = results.filter(r => r.status === 'rejected').map((r: any) => r.reason.message)

    return NextResponse.json({ successful, failed })
  } catch (error) {
    console.error('Failed to send bulk reminders:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
