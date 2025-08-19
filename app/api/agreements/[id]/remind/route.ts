import { NextRequest, NextResponse } from 'next/server'
import { getAgreement, updateAgreement } from '@/lib/db/operations/agreements'
import { AgreementNotificationService } from '@/lib/agreements/notifications'
import { requireAuth } from '@/lib/auth-config'

// POST /api/agreements/[id]/remind - Send reminder for agreement
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

    // Check if agreement is in a state where reminders make sense
    if (!['Sent', 'Viewed'].includes(agreement.status)) {
      return NextResponse.json({ 
        error: 'Cannot send reminder for agreement in current status' 
      }, { status: 400 })
    }

    // Check if agreement has expired
    if (new Date() > agreement.expirationDate) {
      return NextResponse.json({ 
        error: 'Cannot send reminder for expired agreement' 
      }, { status: 400 })
    }

    // Calculate days until expiry for urgency level
    const now = new Date()
    const daysUntilExpiry = Math.ceil(
      (agreement.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Determine urgency level based on days until expiry
    let urgencyLevel: 'low' | 'medium' | 'high' = 'low'
    if (daysUntilExpiry <= 1) {
      urgencyLevel = 'high'
    } else if (daysUntilExpiry <= 3) {
      urgencyLevel = 'medium'
    }

    // Construct reminder data
    const reminderData = {
      ...agreement,
      prospectName: agreement.prospectName || '',
      prospectEmail: agreement.prospectEmail || '',
      propertyName: agreement.property?.name || '',
      propertyAddress: agreement.property?.address ? 
        `${agreement.property.address.street}, ${agreement.property.address.city}, ${agreement.property.address.state} ${agreement.property.address.postalCode}` : 
        '',
      agreementUrl: `${process.env.NEXT_PUBLIC_APP_URL}/agreements/sign/${agreement.id}`,
      reminderNumber: (agreement.remindersSent || 0) + 1,
      daysUntilExpiration: daysUntilExpiry,
      ownerId: agreement.property?.ownerId,
    }

    // Send reminder email
    await AgreementNotificationService.sendReminderEmail(reminderData)

    // Update agreement with last reminder date and increment count
    await updateAgreement({
      id: agreementId,
      lastReminderDate: now,
      remindersSent: (agreement.remindersSent || 0) + 1,
    })

    return NextResponse.json({
      success: true,
      message: 'Reminder sent successfully',
      urgencyLevel,
      daysUntilExpiry
    })
  } catch (error) {
    console.error('Error sending reminder:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send reminder' },
      { status: 500 }
    )
  }
}
