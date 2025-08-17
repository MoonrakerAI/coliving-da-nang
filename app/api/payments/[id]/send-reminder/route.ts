import { NextRequest, NextResponse } from 'next/server'
import { sendManualReminder } from '@/lib/email/reminder-scheduler'
import { getSession } from '@/lib/auth-config'
import { z } from 'zod'

const SendReminderSchema = z.object({
  reminderType: z.enum(['upcoming', 'due', 'overdue']),
  customMessage: z.string().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify user authentication
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const paymentId = params.id
    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const validatedData = SendReminderSchema.parse(body)

    console.log(`Manual reminder requested for payment ${paymentId} by user ${session.user.email}`)

    // Send manual reminder
    const result = await sendManualReminder(
      paymentId,
      validatedData.reminderType,
      validatedData.customMessage
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Reminder sent successfully',
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send reminder'
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Failed to send manual reminder:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
