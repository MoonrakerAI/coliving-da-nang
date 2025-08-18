import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { Payment, PaymentSchema, UpdatePaymentSchema } from '@/lib/db/models/payment'

export async function GET(request: NextRequest, { params }: { params: { paymentId: string } }) {
  try {
    const payment = await kv.get(`payment:${params.paymentId}`)
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }
    return NextResponse.json({ payment })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch payment' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { paymentId: string } }) {
  try {
    const body = await request.json()
    const validation = UpdatePaymentSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(validation.error.format(), { status: 400 })
    }

    const existingPayment = await kv.get<Payment>(`payment:${params.paymentId}`)
    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const updatedPayment: Payment = {
      ...existingPayment,
      ...validation.data,
      updatedAt: new Date(),
    }

    await kv.set(`payment:${params.paymentId}`, updatedPayment)

    return NextResponse.json({ payment: updatedPayment })
  } catch (error) {
    console.error('Error updating payment:', error)
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { paymentId: string } }) {
  try {
    const existingPayment = await kv.get<Payment>(`payment:${params.paymentId}`)
    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Soft delete by setting deletedAt
    const deletedPayment: Payment = {
      ...existingPayment,
      deletedAt: new Date(),
    }

    await kv.set(`payment:${params.paymentId}`, deletedPayment)

    // Or hard delete if preferred
    // await kv.del(`payment:${params.paymentId}`)

    return NextResponse.json({ message: 'Payment deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 })
  }
}
