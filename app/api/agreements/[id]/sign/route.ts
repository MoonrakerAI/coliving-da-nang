import { NextRequest, NextResponse } from 'next/server'
import { getAgreement } from '@/lib/db/operations/agreements'
import { getAgreementTemplate } from '@/lib/db/operations/agreements'
import { getProperty } from '@/lib/db/operations/properties'
import { populateTemplateContent } from '@/lib/db/operations/agreements'

// GET /api/agreements/[id]/sign - Get agreement data for signing
export async function GET(
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

    // Check if agreement is still valid for signing
    const now = new Date()
    if (now > agreement.expirationDate) {
      return NextResponse.json({ error: 'Agreement has expired' }, { status: 410 })
    }

    if (!['Sent', 'Viewed'].includes(agreement.status)) {
      return NextResponse.json({ 
        error: 'Agreement is not available for signing' 
      }, { status: 410 })
    }

    // Get template and property
    const template = await getAgreementTemplate(agreement.templateId)
    const property = await getProperty(agreement.propertyId)

    if (!template || !property) {
      return NextResponse.json({ 
        error: 'Agreement data incomplete' 
      }, { status: 500 })
    }

    // Convert agreement data to variable values for population
    const variableValues = Object.entries(agreement.agreementData || {}).map(([name, value]) => ({
      variableId: template.variables.find(v => v.name === name)?.id || '',
      name,
      value
    }))

    // Populate template content
    const populatedContent = await populateTemplateContent(agreement.templateId, variableValues)

    return NextResponse.json({
      agreement,
      template,
      property,
      populatedContent
    })
  } catch (error) {
    console.error('Error getting agreement for signing:', error)
    return NextResponse.json(
      { error: 'Failed to load agreement' },
      { status: 500 }
    )
  }
}
