import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Draft expense schema (more lenient than full expense)
const draftExpenseSchema = z.object({
  amount: z.number().optional(),
  currency: z.string().default('VND'),
  category: z.enum(['Utilities', 'Repairs', 'Supplies', 'Cleaning', 'Maintenance', 'Other']).optional(),
  description: z.string().optional(),
  receiptPhotos: z.array(z.string()).optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string(),
  }).optional(),
  date: z.string().transform(str => new Date(str)).optional(),
  isReimbursement: z.boolean().default(false),
  draftId: z.string().optional(), // For updating existing drafts
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the draft data
    const validatedData = draftExpenseSchema.parse(body)
    
    // TODO: Get user from session
    // const session = await getServerSession(authOptions)
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
    
    // Generate or use existing draft ID
    const draftId = validatedData.draftId || `draft_${Date.now()}`
    
    // TODO: Save draft to database or localStorage on client
    // For now, simulate draft saving
    const draft = {
      id: draftId,
      ...validatedData,
      userId: 'temp_user', // TODO: Get from session
      savedAt: new Date(),
      type: 'expense_draft'
    }
    
    console.log('Saved expense draft:', draft)
    
    return NextResponse.json({
      success: true,
      draft,
      draftId,
      message: 'Draft saved successfully'
    })
    
  } catch (error) {
    console.error('Error saving expense draft:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // TODO: Get user from session and fetch drafts from database
    // For now, return mock draft data
    const mockDrafts = [
      {
        id: 'draft_1',
        amount: 30000,
        category: 'Repairs',
        description: 'Fix bathroom sink',
        savedAt: new Date().toISOString(),
        type: 'expense_draft'
      }
    ]
    
    return NextResponse.json({
      drafts: mockDrafts
    })
    
  } catch (error) {
    console.error('Error fetching expense drafts:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
