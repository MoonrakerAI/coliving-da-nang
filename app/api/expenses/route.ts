import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Expense creation schema
const createExpenseSchema = z.object({
  amount: z.number().min(0.01),
  currency: z.string().default('VND'),
  category: z.enum(['Utilities', 'Repairs', 'Supplies', 'Cleaning', 'Maintenance', 'Other']),
  description: z.string().min(1),
  receiptPhotos: z.array(z.string()).optional(), // URLs after upload
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string(),
  }).optional(),
  date: z.string().transform(str => new Date(str)),
  isReimbursement: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the request data
    const validatedData = createExpenseSchema.parse(body)
    
    // TODO: Get user from session
    // const session = await getServerSession(authOptions)
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
    
    // TODO: Save to database
    // For now, simulate expense creation
    const expense = {
      id: `exp_${Date.now()}`,
      ...validatedData,
      userId: 'temp_user', // TODO: Get from session
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    console.log('Created expense:', expense)
    
    return NextResponse.json({
      success: true,
      expense,
      message: 'Expense created successfully'
    })
    
  } catch (error) {
    console.error('Error creating expense:', error)
    
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
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // TODO: Get user from session and fetch expenses from database
    // For now, return mock data
    const mockExpenses = [
      {
        id: 'exp_1',
        amount: 50000,
        currency: 'VND',
        category: 'Utilities',
        description: 'Electricity bill',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'exp_2',
        amount: 25000,
        currency: 'VND',
        category: 'Cleaning',
        description: 'Cleaning supplies',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }
    ]
    
    return NextResponse.json({
      expenses: mockExpenses.slice(offset, offset + limit),
      total: mockExpenses.length,
      limit,
      offset
    })
    
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
