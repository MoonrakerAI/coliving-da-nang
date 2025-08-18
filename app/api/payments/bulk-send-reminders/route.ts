import { NextResponse } from 'next/server'
import { sendPaymentReminder } from '@/lib/email/reminder-sender';
import { CommunicationOperations } from '@/lib/db/operations/communications';
import { CommunicationType, CommunicationDirection, CommunicationSource } from '@/lib/db/models/communication';
import { getTenantById } from '@/lib/db/operations/tenants';
import { getPaymentById, updatePayment } from '@/lib/db/operations/payments'

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

        await sendPaymentReminder(payment, tenant);
        await updatePayment({ id, lastReminderDate: new Date() });

        await CommunicationOperations.create({
          tenantId: payment.tenantId,
          propertyId: payment.propertyId,
          paymentId: payment.id,
          type: CommunicationType.EMAIL,
          direction: CommunicationDirection.OUTGOING,
          source: CommunicationSource.PAYMENT_REMINDER,
          subject: 'Payment Reminder',
          content: `Payment reminder sent for amount ${payment.amountCents / 100} due on ${payment.dueDate.toLocaleDateString()}`,
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
