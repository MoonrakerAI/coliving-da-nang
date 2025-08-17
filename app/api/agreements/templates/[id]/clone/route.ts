import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { AgreementTemplateService } from '@/lib/agreements/templates'
import { z } from 'zod'

const CloneTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  propertyId: z.string().uuid('Invalid property ID').optional()
})

// POST /api/agreements/templates/[id]/clone - Clone template
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, propertyId } = CloneTemplateSchema.parse(body)

    const clonedTemplate = await AgreementTemplateService.cloneTemplate(
      params.id,
      name,
      propertyId
    )

    return NextResponse.json(clonedTemplate, { status: 201 })
  } catch (error) {
    console.error('Error cloning agreement template:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clone template' },
      { status: 500 }
    )
  }
}
