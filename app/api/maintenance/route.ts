import { NextRequest, NextResponse } from 'next/server'
import { createMaintenanceRecord } from '@/lib/db/operations/rooms'
import { CreateMaintenanceRecordSchema } from '@/lib/db/models/room'

// POST /api/maintenance - Create a new maintenance record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const maintenanceInput = CreateMaintenanceRecordSchema.parse(body)

    // Create the maintenance record
    const maintenanceRecord = await createMaintenanceRecord(maintenanceInput)

    return NextResponse.json({ maintenanceRecord }, { status: 201 })
  } catch (error) {
    console.error('Error creating maintenance record:', error)
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid maintenance data', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create maintenance record' },
      { status: 500 }
    )
  }
}
