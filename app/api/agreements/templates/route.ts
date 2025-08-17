import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { AgreementTemplateService } from '@/lib/agreements/templates'
import { CreateAgreementTemplateSchema } from '@/lib/db/models/agreement'
import { z } from 'zod'

// GET /api/agreements/templates - Get all templates or templates for a property
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    const activeOnly = searchParams.get('activeOnly') === 'true'

    if (propertyId) {
      const templates = await AgreementTemplateService.getPropertyTemplates(propertyId, activeOnly)
      return NextResponse.json(templates)
    }

    // For now, return empty array if no propertyId specified
    // In a real implementation, you'd get user's properties and return all templates
    return NextResponse.json([])
  } catch (error) {
    console.error('Error fetching agreement templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

// POST /api/agreements/templates - Create new template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Add user ID to the input
    const templateInput = {
      ...body,
      createdBy: session.user.id
    }

    // Validate input
    const validatedInput = CreateAgreementTemplateSchema.parse(templateInput)

    const template = await AgreementTemplateService.createTemplate(validatedInput)
    
    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Error creating agreement template:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create template' },
      { status: 500 }
    )
  }
}
