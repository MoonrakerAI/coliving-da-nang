import { NextRequest, NextResponse } from 'next/server'
import { getAgreement } from '@/lib/db/operations/agreements'
import { TenantProfileIntegrationService } from '@/lib/agreements/tenant-integration'
import { requireAuth } from '@/lib/auth-config'

// POST /api/agreements/[id]/create-tenant - Manually create tenant profile from agreement
export async function POST(
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

    // Validate agreement is signed
    if (!['Signed', 'Completed'].includes(agreement.status)) {
      return NextResponse.json({ 
        error: 'Agreement must be signed to create tenant profile' 
      }, { status: 400 })
    }

    // Check if tenant already exists
    if (agreement.tenantId) {
      return NextResponse.json({ 
        error: 'Tenant profile already exists for this agreement',
        tenantId: agreement.tenantId
      }, { status: 400 })
    }

    // Process agreement completion and create tenant
    const result = await TenantProfileIntegrationService.processAgreementCompletion(agreement)

    return NextResponse.json({
      success: true,
      message: 'Tenant profile created successfully',
      tenant: {
        id: result.tenant.id,
        email: result.tenant.email,
        firstName: result.tenant.firstName,
        lastName: result.tenant.lastName,
        status: result.tenant.status
      },
      warnings: result.errors.length > 0 ? result.errors : undefined,
      createdAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error creating tenant profile:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create tenant profile' },
      { status: 500 }
    )
  }
}
