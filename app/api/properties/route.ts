import { NextRequest, NextResponse } from 'next/server'
import { getOwnerProperties, createProperty } from '@/lib/db/operations/properties'
import { CreatePropertySchema } from '@/lib/db/models/property'

// GET /api/properties - Get properties by owner
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ownerId = searchParams.get('ownerId')

    if (!ownerId) {
      return NextResponse.json(
        { error: 'Owner ID is required' },
        { status: 400 }
      )
    }

    // Get all properties for the owner
    const properties = await getOwnerProperties(ownerId)

    return NextResponse.json({ properties })
  } catch (error) {
    console.error('Error fetching properties:', error)
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
      { status: 500 }
    )
  }
}

// POST /api/properties - Create a new property
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const propertyInput = CreatePropertySchema.parse(body)

    // Create the property
    const property = await createProperty(propertyInput)

    return NextResponse.json({ property }, { status: 201 })
  } catch (error) {
    console.error('Error creating property:', error)
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid property data', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create property' },
      { status: 500 }
    )
  }
}
