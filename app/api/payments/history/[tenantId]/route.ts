import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { getPaymentsByTenant, sortPayments } from '@/lib/db/operations/payment'
import { PaymentFiltersSchema } from '@/lib/db/models/payment'

export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
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

    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const filters = {
      status: searchParams.get('status') || undefined,
      paymentMethod: searchParams.get('paymentMethod') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      sortBy: searchParams.get('sortBy') || 'dueDate',
      sortOrder: searchParams.get('sortOrder') || 'desc',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    }

    // Get tenant payments
    let payments = await getPaymentsByTenant(params.tenantId)

    // Apply filters
    if (filters.status) {
      payments = payments.filter(p => p.status === filters.status)
    }

    if (filters.paymentMethod) {
      payments = payments.filter(p => p.paymentMethod === filters.paymentMethod)
    }

    if (filters.startDate) {
      payments = payments.filter(p => new Date(p.dueDate) >= filters.startDate!)
    }

    if (filters.endDate) {
      payments = payments.filter(p => new Date(p.dueDate) <= filters.endDate!)
    }

    // Sort payments
    const sortBy = filters.sortBy as 'dueDate' | 'amount' | 'status' | 'createdAt'
    const sortOrder = filters.sortOrder as 'asc' | 'desc'
    payments = await sortPayments(payments, sortBy, sortOrder)

    // Apply pagination
    const total = payments.length
    if (filters.limit) {
      payments = payments.slice(filters.offset, filters.offset + filters.limit)
    }

    // Calculate summary statistics
    const summary = {
      totalPayments: total,
      totalAmount: payments.reduce((sum, p) => sum + Math.abs(p.amountCents), 0),
      paidAmount: payments
        .filter(p => p.status === 'Paid' && p.amountCents > 0)
        .reduce((sum, p) => sum + p.amountCents, 0),
      pendingAmount: payments
        .filter(p => p.status === 'Pending')
        .reduce((sum, p) => sum + p.amountCents, 0),
      overdueAmount: payments
        .filter(p => p.status === 'Overdue')
        .reduce((sum, p) => sum + p.amountCents, 0),
      refundedAmount: payments
        .filter(p => p.status === 'Refunded' || p.amountCents < 0)
        .reduce((sum, p) => sum + Math.abs(p.amountCents), 0)
    }

    return NextResponse.json({
      payments,
      summary,
      pagination: {
        total,
        offset: filters.offset,
        limit: filters.limit,
        hasMore: filters.limit ? (filters.offset + filters.limit) < total : false
      }
    })

  } catch (error) {
    console.error('Error fetching payment history:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
