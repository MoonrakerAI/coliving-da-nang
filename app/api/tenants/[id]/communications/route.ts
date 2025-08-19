import { NextRequest, NextResponse } from 'next/server'
import { addCommunicationRecord } from '@/lib/db/operations/tenants'
import { CommunicationDirection, CommunicationPriority, CommunicationStatus, CommunicationType } from '@/lib/db/models/communication'
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
      type: body.type as CommunicationType,
      subject: body.subject as string,
      content: body.content as string,
      createdBy: (session.user.email || session.user.id || 'Unknown') as string,
      direction: (body.direction as CommunicationDirection) || CommunicationDirection.OUTGOING,
      tags: (body.issueTags as string[]) || body.tags || [],
      attachments: (body.attachments as string[]) || [],
      priority: (body.priority as CommunicationPriority) || CommunicationPriority.MEDIUM,
      status: (body.resolved as boolean) ? CommunicationStatus.RESOLVED : (body.status as CommunicationStatus) || CommunicationStatus.OPEN,
      source: body.source,
      paymentId: body.paymentId,
      duration: body.duration,
      assignedTo: body.assignedTo,
      propertyId: body.propertyId
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
