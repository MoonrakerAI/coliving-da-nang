import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAllPayments, getPaymentsByProperty, updatePayment, createPayment } from '@/lib/db/operations/payment'
import { PaymentStatus, CreatePaymentSchema } from '@/lib/db/models/payment'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Get payments based on filters
    let payments = propertyId 
      ? await getPaymentsByProperty(propertyId)
      : await getAllPayments()

    // Apply status filter
    if (status && status !== 'all') {
      payments = payments.filter(payment => payment.status === status)
    }

    // Apply date range filter
    if (startDate) {
      const start = new Date(startDate)
      payments = payments.filter(payment => new Date(payment.dueDate) >= start)
    }

    if (endDate) {
      const end = new Date(endDate)
      payments = payments.filter(payment => new Date(payment.dueDate) <= end)
    }

    // Update overdue payments
    const now = new Date()
    const updatedPayments = await Promise.all(
      payments.map(async (payment) => {
        if (payment.status === PaymentStatus.PENDING && new Date(payment.dueDate) < now) {
          const updatedPayment = await updatePayment(payment.id, { status: PaymentStatus.OVERDUE })
          return updatedPayment || payment
        }
        return payment
      })
    )

    return NextResponse.json({
      payments: updatedPayments,
      total: updatedPayments.length
    })

  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // Parse request body
    const body = await request.json()
    
    // Validate payment data
    const validatedData = CreatePaymentSchema.parse(body)
    
    // Create payment
    const payment = await createPayment(validatedData)
    
    return NextResponse.json({
      message: 'Payment recorded successfully',
      payment
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating payment:', error)
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Invalid payment data', errors: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
