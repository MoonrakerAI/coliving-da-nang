import { NextRequest, NextResponse } from 'next/server'
import { 
  createTenant, 
  searchTenants, 
  getPropertyTenants 
} from '@/lib/db/operations/tenants'
import { CreateTenantSchema } from '@/lib/db/models/tenant'
import { getSession } from '@/lib/auth-config'

// GET /api/tenants - List tenants with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || undefined
    const status = searchParams.get('status') as any || undefined
    const propertyId = searchParams.get('propertyId') || undefined
    const roomNumber = searchParams.get('roomNumber') || undefined
    const leaseStatus = searchParams.get('leaseStatus') as any || undefined

    // If propertyId is provided, get property tenants, otherwise search all
    let tenants
    if (propertyId && !query && !status && !roomNumber && !leaseStatus) {
      tenants = await getPropertyTenants(propertyId)
    } else {
      tenants = await searchTenants({
        query,
        status,
        propertyId,
        roomNumber,
        leaseStatus
      })
    }

    return NextResponse.json({ tenants })
  } catch (error) {
    console.error('Error fetching tenants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    )
  }
}

// POST /api/tenants - Create new tenant
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate input
    const validatedInput = CreateTenantSchema.parse(body)
    
    // Create tenant
    const tenant = await createTenant(validatedInput)
    
    return NextResponse.json({ tenant }, { status: 201 })
  } catch (error) {
    console.error('Error creating tenant:', error)
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid tenant data', details: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    )
  }
}
