import { NextRequest, NextResponse } from 'next/server'
import { 
  processDocuSignWebhook,
  DocuSignWebhookEvent 
} from '@/lib/agreements/docusign'
import { 
  updateAgreement,
  getAgreement 
} from '@/lib/db/operations/agreements'
import { AgreementSendingService } from '@/lib/agreements/sending'
import { TenantProfileIntegrationService } from '@/lib/agreements/tenant-integration'
import { AutomatedReminderService } from '@/lib/agreements/reminders'
import crypto from 'crypto'

// Verify DocuSign webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64')
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    return false
  }
}

// POST /api/docusign/webhook - Handle DocuSign webhook events
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const signature = request.headers.get('x-docusign-signature-1')
    const webhookSecret = process.env.DOCUSIGN_WEBHOOK_SECRET

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
        console.error('Invalid DocuSign webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const event: DocuSignWebhookEvent = JSON.parse(payload)
    
    console.log('DocuSign webhook received:', {
      event: event.event,
      envelopeId: event.data.envelopeId,
      status: event.data.envelopeSummary.status
    })

    // Process the webhook event
    await processDocuSignWebhook(event)
    
    // Handle specific envelope status changes
    await handleEnvelopeStatusChange(event)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing DocuSign webhook:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

// Handle envelope status changes and update agreement accordingly
async function handleEnvelopeStatusChange(event: DocuSignWebhookEvent): Promise<void> {
  try {
    const { envelopeId } = event.data
    const status = event.data.envelopeSummary.status.toLowerCase()
    
    // Find agreement by DocuSign envelope ID
    const agreement = await findAgreementByEnvelopeId(envelopeId)
    if (!agreement) {
      console.warn(`No agreement found for envelope ID: ${envelopeId}`)
      return
    }

    switch (status) {
      case 'sent':
        // Envelope was sent to recipient
        await updateAgreement({
          id: agreement.id,
          status: 'Sent',
          sentDate: new Date(event.data.envelopeSummary.sentDateTime || Date.now())
        })
        break

      case 'delivered':
        // Envelope was delivered to recipient's email
        await AgreementSendingService.markAsViewed(agreement.id)
        break

      case 'completed':
        // All recipients have signed
        await AgreementSendingService.markAsSigned(
          agreement.id,
          envelopeId,
          `${process.env.NEXT_PUBLIC_APP_URL}/api/agreements/${agreement.id}/document`
        )
        
        // Complete the agreement workflow
        await AgreementSendingService.completeAgreement(agreement.id)
        
        // Cancel any pending reminders
        await AutomatedReminderService.cancelReminders(
          agreement.id, 
          'Agreement completed and signed'
        )
        
        // Create tenant profile from signed agreement
        try {
          const result = await TenantProfileIntegrationService.processAgreementCompletion(agreement)
          console.log(`Tenant profile created successfully: ${result.tenant.id}`)
          
          if (result.errors.length > 0) {
            console.warn('Some tenant integration steps failed:', result.errors)
          }
        } catch (error) {
          console.error('Failed to create tenant profile:', error)
          // Don't fail the webhook if tenant creation fails
        }
        break

      case 'declined':
        // Recipient declined to sign
        await updateAgreement({
          id: agreement.id,
          status: 'Cancelled'
        })
        
        // Cancel any pending reminders
        await AutomatedReminderService.cancelReminders(
          agreement.id, 
          'Agreement declined by prospect'
        )
        
        // Notify property owner about declined agreement
        await notifyPropertyOwnerOfDecline(agreement, event)
        break

      case 'voided':
        // Envelope was voided
        await updateAgreement({
          id: agreement.id,
          status: 'Cancelled'
        })
        
        // Cancel any pending reminders
        await AutomatedReminderService.cancelReminders(
          agreement.id, 
          'Agreement voided'
        )
        break

      default:
        console.log(`Unhandled envelope status: ${status}`)
    }
  } catch (error) {
    console.error('Error handling envelope status change:', error)
    throw error
  }
}

// Find agreement by DocuSign envelope ID
async function findAgreementByEnvelopeId(envelopeId: string): Promise<any> {
  // This would typically be a database query
  // For now, we'll implement a placeholder that would need to be replaced
  // with actual database operations to find agreement by docusignEnvelopeId
  
  try {
    // In a real implementation, this would query the database:
    // SELECT * FROM agreements WHERE docusign_envelope_id = envelopeId
    
    // For now, return null as we don't have a direct query method
    // This would need to be implemented in the database operations
    console.log(`Looking for agreement with envelope ID: ${envelopeId}`)
    return null
  } catch (error) {
    console.error('Error finding agreement by envelope ID:', error)
    return null
  }
}

// Notify property owner when agreement is declined
async function notifyPropertyOwnerOfDecline(
  agreement: any, 
  event: DocuSignWebhookEvent
): Promise<void> {
  try {
    // This would send an email notification to the property owner
    // about the declined agreement
    console.log(`Agreement ${agreement.id} was declined - notifying property owner`)
    
    // Implementation would include:
    // 1. Get property owner email
    // 2. Send decline notification email
    // 3. Log the notification
  } catch (error) {
    console.error('Error notifying property owner of decline:', error)
  }
}

// GET /api/docusign/webhook - Webhook verification endpoint
export async function GET(request: NextRequest) {
  // DocuSign may send GET requests to verify the webhook endpoint
  return NextResponse.json({ 
    message: 'DocuSign webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}
