import { NextRequest, NextResponse } from 'next/server'
import { addCommunicationRecord } from '@/lib/db/operations/tenants'
import { requireAuth } from '@/lib/auth-config';

// POST /api/tenants/[id]/communications - Add communication record
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const communicationData = {
      type: body.type,
      subject: body.subject,
      content: body.content,
      issueTags: body.issueTags || [],
      resolved: body.resolved || false,
      createdBy: session.user.email || session.user.id || 'Unknown'
    }
    
    const tenant = await addCommunicationRecord(params.id, communicationData)
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }
    
    return NextResponse.json({ tenant }, { status: 201 })
  } catch (error) {
    console.error('Error adding communication record:', error)
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid communication data', details: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to add communication record' },
      { status: 500 }
    )
  }
}
