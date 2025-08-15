import { NextRequest, NextResponse } from 'next/server'
import { handleResendWebhook } from '@/lib/db/operations/reminders'
import { headers } from 'next/headers'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = headers().get('resend-signature')
    
    // Verify webhook signature if webhook secret is configured
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex')
      
      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }

    const event = JSON.parse(body)
    
    console.log('Received Resend webhook:', event.type, event.data?.email_id)
    
    // Handle the webhook event
    await handleResendWebhook(event)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to process Resend webhook:', error)
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
