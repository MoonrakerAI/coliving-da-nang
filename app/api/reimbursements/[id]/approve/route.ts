import { NextRequest, NextResponse } from 'next/server'
import { processApprovalAction } from '@/lib/db/operations/reimbursements'
import { ApprovalActionSchema } from '@/lib/db/models/reimbursement'

/**
 * PATCH /api/reimbursements/[id]/approve
 * Approve or deny a reimbursement request
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const reimbursementId = params.id
    
    // Validate input
    const validatedInput = ApprovalActionSchema.parse({
      ...body,
      reimbursementId
    })
    
    const updatedReimbursement = await processApprovalAction(validatedInput)
    
    if (!updatedReimbursement) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Reimbursement request not found' 
        },
        { status: 404 }
      )
    }
    
    const actionMessage = validatedInput.action === 'approve' 
      ? 'Reimbursement request approved successfully'
      : 'Reimbursement request denied'
    
    return NextResponse.json({
      success: true,
      data: updatedReimbursement,
      message: actionMessage
    })
  } catch (error) {
    console.error('Error processing approval action:', error)
    
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
    
    if (error instanceof Error && error.message.includes('Cannot')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid status transition',
          details: error.message
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process approval action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
