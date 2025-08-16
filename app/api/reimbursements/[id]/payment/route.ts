import { NextRequest, NextResponse } from 'next/server'
import { PaymentRecordingSchema } from '@/lib/db/models/reimbursement'
import { ReimbursementPaymentIntegrationService } from '@/lib/services/reimbursement-payment-integration'

/**
 * POST /api/reimbursements/[id]/payment
 * Record payment for an approved reimbursement request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const reimbursementId = params.id
    
    // Validate input
    const validatedInput = PaymentRecordingSchema.parse({
      ...body,
      reimbursementId
    })
    
    // Validate payment data
    const validationErrors = ReimbursementPaymentIntegrationService.validatePaymentData(validatedInput)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid payment data',
          details: validationErrors
        },
        { status: 400 }
      )
    }
    
    const updatedReimbursement = await ReimbursementPaymentIntegrationService.recordPayment(
      reimbursementId, 
      validatedInput
    )
    
    if (!updatedReimbursement) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Reimbursement request not found' 
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: updatedReimbursement,
      message: 'Payment recorded successfully'
    })
  } catch (error) {
    console.error('Error recording payment:', error)
    
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
    
    if (error instanceof Error && error.message.includes('Cannot record payment')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid status for payment recording',
          details: error.message
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to record payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
