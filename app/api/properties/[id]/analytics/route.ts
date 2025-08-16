import { NextRequest, NextResponse } from 'next/server'
import { calculatePropertyAnalytics } from '@/lib/db/operations/rooms'
import { getProperty } from '@/lib/db/operations/properties'

// GET /api/properties/[id]/analytics - Get property analytics
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

    // Calculate analytics for the property
    const analytics = await calculatePropertyAnalytics(propertyId)

    return NextResponse.json({ analytics })
  } catch (error) {
    console.error('Error calculating property analytics:', error)
    return NextResponse.json(
      { error: 'Failed to calculate analytics' },
      { status: 500 }
    )
  }
}
