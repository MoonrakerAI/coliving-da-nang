import { NextRequest, NextResponse } from 'next/server'
import { 
  createReimbursementRequest, 
  getReimbursementRequests 
} from '@/lib/db/operations/reimbursements'
import { 
  CreateReimbursementRequestInput,
  ReimbursementFilters,
  CreateReimbursementRequestSchema,
  ReimbursementFiltersSchema
} from '@/lib/db/models/reimbursement'

/**
 * GET /api/reimbursements
 * Get reimbursement requests with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters into filters
    const filters: Partial<ReimbursementFilters> = {}
    
    if (searchParams.get('propertyId')) {
      filters.propertyId = searchParams.get('propertyId')!
    }
    if (searchParams.get('requestorId')) {
      filters.requestorId = searchParams.get('requestorId')!
    }
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status') as any
    }
    if (searchParams.get('approvedBy')) {
      filters.approvedBy = searchParams.get('approvedBy')!
    }
    if (searchParams.get('requestDateFrom')) {
      filters.requestDateFrom = new Date(searchParams.get('requestDateFrom')!)
    }
    if (searchParams.get('requestDateTo')) {
      filters.requestDateTo = new Date(searchParams.get('requestDateTo')!)
    }
    if (searchParams.get('amountMin')) {
      filters.amountMin = parseInt(searchParams.get('amountMin')!)
    }
    if (searchParams.get('amountMax')) {
      filters.amountMax = parseInt(searchParams.get('amountMax')!)
    }
    if (searchParams.get('paymentMethod')) {
      filters.paymentMethod = searchParams.get('paymentMethod') as any
    }

    // Validate filters
    const validatedFilters = Object.keys(filters).length > 0 
      ? ReimbursementFiltersSchema.parse(filters)
      : undefined

    const reimbursements = await getReimbursementRequests(validatedFilters)
    
    return NextResponse.json({
      success: true,
      data: reimbursements,
      count: reimbursements.length
    })
  } catch (error) {
    console.error('Error fetching reimbursements:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch reimbursements',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/reimbursements
 * Create a new reimbursement request
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedInput = CreateReimbursementRequestSchema.parse(body)
    
    const reimbursement = await createReimbursementRequest(validatedInput)
    
    return NextResponse.json({
      success: true,
      data: reimbursement,
      message: 'Reimbursement request created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating reimbursement request:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input data',
          details: error.message
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create reimbursement request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
