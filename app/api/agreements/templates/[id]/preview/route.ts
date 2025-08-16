import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AgreementTemplateService } from '@/lib/agreements/templates'
import { TemplateVariableValueSchema } from '@/lib/db/models/agreement'
import { z } from 'zod'

const PreviewRequestSchema = z.object({
  variableValues: z.array(TemplateVariableValueSchema).optional().default([])
})

// POST /api/agreements/templates/[id]/preview - Preview template with sample data
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
    const { variableValues } = PreviewRequestSchema.parse(body)

    const previewContent = await AgreementTemplateService.previewTemplate(
      params.id,
      variableValues
    )

    return NextResponse.json({ content: previewContent })
  } catch (error) {
    console.error('Error previewing agreement template:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to preview template' },
      { status: 500 }
    )
  }
}
