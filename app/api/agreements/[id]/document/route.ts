import { NextRequest, NextResponse } from 'next/server'
import { getAgreement } from '@/lib/db/operations/agreements'
import { DocuSignService } from '@/lib/agreements/docusign'
import { requireAuth } from '@/lib/auth-config'

// GET /api/agreements/[id]/document - Download signed agreement document
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

    // Get agreement
    const agreement = await getAgreement(agreementId)
    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    }

    // Check if agreement has been signed
    if (!['Signed', 'Completed'].includes(agreement.status)) {
      return NextResponse.json({ 
        error: 'Document not available - agreement not yet signed' 
      }, { status: 400 })
    }

    // Check if we have a DocuSign envelope ID
    if (!agreement.docusignEnvelopeId) {
      return NextResponse.json({ 
        error: 'Document not available - no DocuSign envelope found' 
      }, { status: 400 })
    }

    try {
      // Download the signed document from DocuSign
      const documentBuffer = await DocuSignService.getSignedDocument(
        agreement.docusignEnvelopeId,
        '1' // Document ID (assuming single document)
      )

      // Return the document as a PDF
      return new NextResponse(documentBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="lease-agreement-${agreement.id}.pdf"`,
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    } catch (docusignError) {
      console.error('Error downloading document from DocuSign:', docusignError)
      
      // If DocuSign download fails, we could potentially:
      // 1. Return a cached version if we store documents locally
      // 2. Generate a new PDF from the agreement data
      // 3. Return an error message
      
      return NextResponse.json({ 
        error: 'Failed to retrieve signed document from DocuSign' 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error downloading agreement document:', error)
    return NextResponse.json(
      { error: 'Failed to download document' },
      { status: 500 }
    )
  }
}
