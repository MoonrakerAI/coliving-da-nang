import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { sendNewAgreement, SendAgreementRequest } from '@/lib/agreements/sending'
import { z } from 'zod'

const SendAgreementSchema = z.object({
  templateId: z.string().uuid('Invalid template ID'),
  prospectName: z.string().min(1, 'Prospect name is required'),
  prospectEmail: z.string().email('Invalid email address'),
  prospectPhone: z.string().optional(),
  customMessage: z.string().optional(),
  expirationDays: z.number().int().min(1).max(30).default(7),
  ownerName: z.string().optional(),
  ownerEmail: z.string().email('Invalid owner email').optional(),
  variableValues: z.array(z.object({
    variableId: z.string(),
    name: z.string(),
    value: z.any()
  }))
})

// POST /api/agreements/send - Send new agreement to prospect
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate input
    const validatedInput = SendAgreementSchema.parse(body)

    // Send agreement
    const result = await sendNewAgreement(validatedInput, session.user.id)
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error sending agreement:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send agreement' },
      { status: 500 }
    )
  }
}
