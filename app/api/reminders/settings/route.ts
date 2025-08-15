import { NextRequest, NextResponse } from 'next/server'
import {
  getReminderSettings,
  createReminderSettings,
  updateReminderSettings
} from '@/lib/db/operations/reminders'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const ReminderSettingsSchema = z.object({
  propertyId: z.string().uuid().optional(),
  enabled: z.boolean().default(true),
  daysBeforeDue: z.array(z.number().int().min(0)).default([7]),
  daysAfterDue: z.array(z.number().int().min(0)).default([0, 3]),
  sendOnWeekends: z.boolean().default(false),
  sendOnHolidays: z.boolean().default(false),
  maxRemindersPerPayment: z.number().int().min(1).max(10).default(5),
  customMessage: z.string().optional(),
  contactEmail: z.string().email().optional()
})

// GET reminder settings
export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId') || undefined

    const settings = await getReminderSettings(propertyId)

    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        success: true,
        data: {
          enabled: true,
          daysBeforeDue: [7],
          daysAfterDue: [0, 3],
          sendOnWeekends: false,
          sendOnHolidays: false,
          maxRemindersPerPayment: 5,
          propertyId: propertyId || null
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: settings
    })
  } catch (error) {
    console.error('Failed to get reminder settings:', error)
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST create new reminder settings
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = ReminderSettingsSchema.parse(body)

    const settings = await createReminderSettings(validatedData)

    return NextResponse.json({
      success: true,
      data: settings,
      message: 'Reminder settings created successfully'
    })
  } catch (error) {
    console.error('Failed to create reminder settings:', error)
    
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

// PATCH update reminder settings
export async function PATCH(request: NextRequest) {
  try {
    // Verify user authentication
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { propertyId, ...updateData } = body
    
    const validatedData = ReminderSettingsSchema.partial().parse(updateData)

    const settings = await updateReminderSettings(propertyId || null, validatedData)

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: settings,
      message: 'Reminder settings updated successfully'
    })
  } catch (error) {
    console.error('Failed to update reminder settings:', error)
    
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
