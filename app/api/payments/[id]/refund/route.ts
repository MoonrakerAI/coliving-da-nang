import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { getPaymentById, createPayment } from '@/lib/db/operations/payment'
import { PaymentStatus } from '@/lib/db/models/payment'
import { z } from 'zod'

const RefundRequestSchema = z.object({
  amount: z.number().positive('Refund amount must be positive').optional(),
  reason: z.string().min(1, 'Refund reason is required'),
  notes: z.string().optional()
})

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

    // Get original payment
    const originalPayment = await getPaymentById(params.id)
    if (!originalPayment) {
      return NextResponse.json(
        { message: 'Payment not found' },
        { status: 404 }
      )
    }

    // Check if payment can be refunded
    if (originalPayment.status !== PaymentStatus.PAID) {
      return NextResponse.json(
        { message: 'Only paid payments can be refunded' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { amount, reason, notes } = RefundRequestSchema.parse(body)

    // Calculate refund amount (default to full amount)
    const refundAmountCents = amount ? Math.round(amount * 100) : originalPayment.amountCents

    // Validate refund amount doesn't exceed original payment
    if (refundAmountCents > originalPayment.amountCents) {
      return NextResponse.json(
        { message: 'Refund amount cannot exceed original payment amount' },
        { status: 400 }
      )
    }

    // Create refund record as negative payment
    const refundPayment = await createPayment({
      tenantId: originalPayment.tenantId,
      propertyId: originalPayment.propertyId,
      amountCents: -refundAmountCents, // Negative amount for refund
      currency: originalPayment.currency,
      paymentMethod: originalPayment.paymentMethod,
      status: PaymentStatus.REFUNDED,
      dueDate: new Date(), // Refund processed today
      paidDate: new Date(),
      reference: `REFUND-${originalPayment.reference || originalPayment.id.slice(0, 8)}`,
      description: `Refund for: ${originalPayment.description}`,
      notes: `Original payment ID: ${originalPayment.id}. Reason: ${reason}${notes ? `. Notes: ${notes}` : ''}`
    })

    // TODO: Process actual refund through payment processor (Stripe, etc.)
    // This would involve calling the appropriate payment processor API

    return NextResponse.json({
      message: 'Refund processed successfully',
      refund: refundPayment,
      originalPayment: originalPayment
    }, { status: 201 })

  } catch (error) {
    console.error('Error processing refund:', error)
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Invalid refund data', errors: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
