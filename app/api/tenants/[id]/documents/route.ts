import { NextRequest, NextResponse } from 'next/server'
import { 
  addTenantDocument, 
  removeTenantDocument 
} from '@/lib/db/operations/tenants'
import { auth } from '@/lib/auth'

// POST /api/tenants/[id]/documents - Upload tenant document
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
    
    const documentData = {
      type: body.type,
      filename: body.filename,
      url: body.url,
      expirationDate: body.expirationDate ? new Date(body.expirationDate) : undefined,
      fileSize: body.fileSize,
      mimeType: body.mimeType
    }
    
    const tenant = await addTenantDocument(params.id, documentData)
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }
    
    return NextResponse.json({ tenant }, { status: 201 })
  } catch (error) {
    console.error('Error adding tenant document:', error)
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid document data', details: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to add tenant document' },
      { status: 500 }
    )
  }
}

// DELETE /api/tenants/[id]/documents - Remove tenant document
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
    const documentId = searchParams.get('documentId')
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }
    
    const tenant = await removeTenantDocument(params.id, documentId)
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }
    
    return NextResponse.json({ tenant })
  } catch (error) {
    console.error('Error removing tenant document:', error)
    return NextResponse.json(
      { error: 'Failed to remove tenant document' },
      { status: 500 }
    )
  }
}
