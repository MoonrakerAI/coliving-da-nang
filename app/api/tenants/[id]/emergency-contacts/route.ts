import { NextRequest, NextResponse } from 'next/server'
import { 
  addEmergencyContact, 
  updateEmergencyContact, 
  removeEmergencyContact 
} from '@/lib/db/operations/tenants'
import { EmergencyContactSchema } from '@/lib/db/models/tenant'
import { auth } from '@/lib/auth'

// POST /api/tenants/[id]/emergency-contacts - Add emergency contact
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate input (exclude auto-generated fields)
    const contactData = {
      name: body.name,
      phone: body.phone,
      email: body.email,
      relationship: body.relationship,
      isPrimary: body.isPrimary || false,
      verified: body.verified || false
    }
    
    const tenant = await addEmergencyContact(params.id, contactData)
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }
    
    return NextResponse.json({ tenant }, { status: 201 })
  } catch (error) {
    console.error('Error adding emergency contact:', error)
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid contact data', details: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to add emergency contact' },
      { status: 500 }
    )
  }
}

// PATCH /api/tenants/[id]/emergency-contacts - Update emergency contact
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contactId, ...updates } = body
    
    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 })
    }
    
    const tenant = await updateEmergencyContact(params.id, contactId, updates)
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }
    
    return NextResponse.json({ tenant })
  } catch (error) {
    console.error('Error updating emergency contact:', error)
    return NextResponse.json(
      { error: 'Failed to update emergency contact' },
      { status: 500 }
    )
  }
}

// DELETE /api/tenants/[id]/emergency-contacts - Remove emergency contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('contactId')
    
    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 })
    }
    
    const tenant = await removeEmergencyContact(params.id, contactId)
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }
    
    return NextResponse.json({ tenant })
  } catch (error) {
    console.error('Error removing emergency contact:', error)
    return NextResponse.json(
      { error: 'Failed to remove emergency contact' },
      { status: 500 }
    )
  }
}
