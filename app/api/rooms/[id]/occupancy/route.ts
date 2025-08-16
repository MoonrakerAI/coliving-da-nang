import { NextRequest, NextResponse } from 'next/server'
import { getRoomOccupancyHistory } from '@/lib/db/operations/rooms'
import { getRoom } from '@/lib/db/operations/rooms'

// GET /api/rooms/[id]/occupancy - Get room occupancy history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = params.id

    // Verify room exists
    const room = await getRoom(roomId)
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    // Get occupancy history for the room
    const occupancyHistory = await getRoomOccupancyHistory(roomId)

    return NextResponse.json({ occupancyHistory })
  } catch (error) {
    console.error('Error fetching room occupancy history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch occupancy history' },
      { status: 500 }
    )
  }
}
