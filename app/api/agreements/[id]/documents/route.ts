import { NextRequest, NextResponse } from 'next/server'
import { DocumentStorageService } from '@/lib/agreements/storage'
import { getAgreement } from '@/lib/db/operations/agreements'
import { requireAuth } from '@/lib/auth-config'

// GET /api/agreements/[id]/documents - List all documents for an agreement
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const session = await requireAuth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const agreementId = params.id

    // Verify agreement exists
    const agreement = await getAgreement(agreementId)
    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    }

    // Get all documents for the agreement
    const documents = await DocumentStorageService.listAgreementDocuments(agreementId)

    // Generate secure access URLs for each document
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        try {
          const secureUrl = await DocumentStorageService.getSecureDocumentUrl(doc.id, 60)
          return {
            ...doc,
            secureUrl,
            downloadUrl: `/api/documents/secure/${doc.id}`
          }
        } catch (error) {
          console.error(`Error generating URL for document ${doc.id}:`, error)
          return {
            ...doc,
            secureUrl: null,
            downloadUrl: `/api/documents/secure/${doc.id}`
          }
        }
      })
    )

    return NextResponse.json({
      agreementId,
      documents: documentsWithUrls,
      totalDocuments: documents.length,
      totalSize: documents.reduce((sum, doc) => sum + doc.fileSize, 0)
    })
  } catch (error) {
    console.error('Error listing agreement documents:', error)
    return NextResponse.json(
      { error: 'Failed to list documents' },
      { status: 500 }
    )
  }
}

// POST /api/agreements/[id]/documents - Upload a new document for an agreement
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const session = await requireAuth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const agreementId = params.id

    // Verify agreement exists
    const agreement = await getAgreement(agreementId)
    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const description = formData.get('description') as string
    const documentType = formData.get('documentType') as string || 'amendment'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type and size
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only PDF, images, and Word documents are allowed.' 
      }, { status: 400 })
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 10MB.' 
      }, { status: 400 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Store document
    const storedDocument = await DocumentStorageService.storeDocument(
      agreementId,
      file.name,
      buffer,
      file.type,
      {
        description,
        documentType,
        uploadedBy: session.user.id,
        uploadedAt: new Date().toISOString(),
        originalFileName: file.name
      },
      'upload'
    )

    // Generate secure access URL
    const secureUrl = await DocumentStorageService.getSecureDocumentUrl(storedDocument.id, 60)

    return NextResponse.json({
      document: {
        ...storedDocument,
        secureUrl,
        downloadUrl: `/api/documents/secure/${storedDocument.id}`
      },
      message: 'Document uploaded successfully'
    })
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload document' },
      { status: 500 }
    )
  }
}
