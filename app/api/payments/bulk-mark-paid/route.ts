import { NextResponse } from 'next/server'
import { updatePayment } from '@/lib/db/operations/payments'
import { PaymentStatus } from '@/lib/db/models/payment'

export async function POST(request: Request) {
  try {
    const { paymentIds } = await request.json()

    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      return NextResponse.json({ error: 'Payment IDs are required' }, { status: 400 })
    }

    const results = await Promise.allSettled(
      paymentIds.map(id => 
        updatePayment(id, { 
          status: PaymentStatus.PAID, 
          paidDate: new Date() 
        })
      )
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return NextResponse.json({ successful, failed })
  } catch (error) {
    console.error('Failed to bulk mark as paid:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
