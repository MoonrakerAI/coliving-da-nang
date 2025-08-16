import { NextRequest, NextResponse } from 'next/server'
import { processBatchApproval } from '@/lib/db/operations/reimbursements'
import { BatchApprovalSchema } from '@/lib/db/models/reimbursement'

/**
 * POST /api/reimbursements/batch-approve
 * Approve or deny multiple reimbursement requests
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedInput = BatchApprovalSchema.parse(body)
    
    const updatedReimbursements = await processBatchApproval(validatedInput)
    
    const actionMessage = validatedInput.action === 'approve' 
      ? `${updatedReimbursements.length} reimbursement requests approved successfully`
      : `${updatedReimbursements.length} reimbursement requests denied`
    
    return NextResponse.json({
      success: true,
      data: updatedReimbursements,
      message: actionMessage,
      count: updatedReimbursements.length
    })
  } catch (error) {
    console.error('Error processing batch approval:', error)
    
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
        error: 'Failed to process batch approval',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
