import { NextRequest, NextResponse } from 'next/server'
import { 
  getAgreement,
  updateAgreement,
  getAgreementTemplate,
  populateTemplateContent 
} from '@/lib/db/operations/agreements'
import { getProperty } from '@/lib/db/operations/properties'
import { createDocuSignEnvelope } from '@/lib/agreements/docusign'

// POST /api/agreements/[id]/docusign - Initiate DocuSign signing process
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agreementId = params.id

    // Get agreement
    const agreement = await getAgreement(agreementId)
    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    }

    // Validate agreement status
    if (!['Sent', 'Viewed'].includes(agreement.status)) {
      return NextResponse.json({ 
        error: 'Agreement is not available for signing' 
      }, { status: 400 })
    }

    // Check expiration
    if (new Date() > agreement.expirationDate) {
      return NextResponse.json({ 
        error: 'Agreement has expired' 
      }, { status: 400 })
    }

    // Get template and property
    const template = await getAgreementTemplate(agreement.templateId)
    const property = await getProperty(agreement.propertyId)

    if (!template || !property) {
      return NextResponse.json({ 
        error: 'Agreement data incomplete' 
      }, { status: 500 })
    }

    // Convert agreement data to variable values
    const variableValues = Object.entries(agreement.agreementData || {}).map(([name, value]) => ({
      variableId: template.variables.find(v => v.name === name)?.id || '',
      name,
      value
    }))

    // Populate template content
    const populatedContent = await populateTemplateContent(agreement.templateId, variableValues)

    // Create DocuSign envelope
    const envelopeResponse = await createDocuSignEnvelope(
      agreement,
      template,
      property,
      populatedContent
    )

    // Update agreement with DocuSign envelope ID
    await updateAgreement({
      id: agreementId,
      docusignEnvelopeId: envelopeResponse.envelopeId
    })

    // Generate signing URL (this would be provided by DocuSign)
    const signingUrl = `https://demo.docusign.net/Signing/StartInSession.aspx?t=${envelopeResponse.envelopeId}`

    return NextResponse.json({
      envelopeId: envelopeResponse.envelopeId,
      signingUrl,
      status: envelopeResponse.status
    })
  } catch (error) {
    console.error('Error initiating DocuSign signing:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate signing' },
      { status: 500 }
    )
  }
}
