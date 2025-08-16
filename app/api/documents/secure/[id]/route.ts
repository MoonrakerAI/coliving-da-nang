import { NextRequest, NextResponse } from 'next/server'
import { DocumentStorageService } from '@/lib/agreements/storage'
import { getAgreement } from '@/lib/db/operations/agreements'
import { requireAuth } from '@/lib/auth'

// GET /api/documents/secure/[id] - Secure document access with token authentication
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    // Verify access token if provided
    if (token) {
      try {
        const payload = DocumentStorageService.verifyAccessToken(token)
        
        if (payload.documentId !== documentId) {
          return NextResponse.json({ error: 'Invalid token for document' }, { status: 403 })
        }
      } catch (error) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 })
      }
    } else {
      // Require authentication if no token provided
      const user = await requireAuth(request)
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Retrieve document
    const { document, buffer } = await DocumentStorageService.retrieveDocument(documentId)
    
    // Additional authorization check - ensure user has access to this agreement
    if (!token) {
      const agreement = await getAgreement(document.agreementId)
      if (!agreement) {
        return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
      }
      
      // TODO: Add proper authorization logic based on user role and property ownership
      // For now, we'll allow access if user is authenticated
    }

    // Return document with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `attachment; filename="${document.fileName}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Document-ID': document.id,
        'X-Document-Version': document.version.toString(),
        'X-Document-Checksum': document.checksum
      }
    })
  } catch (error) {
    console.error('Error accessing secure document:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: 'Failed to access document' },
      { status: 500 }
    )
  }
}
