import { NextRequest, NextResponse } from 'next/server'
import { getPropertyRooms, createRoom } from '@/lib/db/operations/rooms'
import { getProperty } from '@/lib/db/operations/properties'
import { CreateRoomSchema } from '@/lib/db/models/room'

// GET /api/properties/[id]/rooms - Get all rooms for a property
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id

    // Verify property exists
    const property = await getProperty(propertyId)
    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Get all rooms for the property
    const rooms = await getPropertyRooms(propertyId)

    return NextResponse.json({ rooms })
  } catch (error) {
    console.error('Error fetching property rooms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    )
  }
}

// POST /api/properties/[id]/rooms - Create a new room for a property
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id
    const body = await request.json()

    // Verify property exists
    const property = await getProperty(propertyId)
    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Validate input and ensure propertyId matches
    const roomInput = CreateRoomSchema.parse({
      ...body,
      propertyId
    })

    // Create the room
    const room = await createRoom(roomInput)

    return NextResponse.json({ room }, { status: 201 })
  } catch (error) {
    console.error('Error creating room:', error)
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid room data', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    )
  }
}
