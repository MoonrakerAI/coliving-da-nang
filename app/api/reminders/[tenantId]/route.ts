import { NextRequest, NextResponse } from 'next/server'
import { getReminderLogs } from '@/lib/db/operations/reminders'
import { getSession } from '@/lib/auth-config'
import { z } from 'zod'

const QuerySchema = z.object({
  propertyId: z.string().uuid().optional(),
  reminderType: z.enum(['upcoming', 'due', 'overdue']).optional(),
  status: z.enum(['sent', 'delivered', 'opened', 'bounced', 'failed']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
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

    const tenantId = params.tenantId
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryData = {
      propertyId: searchParams.get('propertyId') || undefined,
      reminderType: searchParams.get('reminderType') || undefined,
      status: searchParams.get('status') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined
    }

    const validatedQuery = QuerySchema.parse(queryData)

    // Get reminder history for tenant
    const reminders = await getReminderLogs({
      tenantId,
      ...validatedQuery
    })

    return NextResponse.json({
      success: true,
      data: reminders,
      count: reminders.length
    })
  } catch (error) {
    console.error('Failed to get reminder history:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
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
