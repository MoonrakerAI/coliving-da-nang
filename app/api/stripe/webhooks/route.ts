import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { verifyWebhookSignature, handleWebhookEvent } from '@/lib/payments/stripe'
import { updatePayment, getPaymentById } from '@/lib/db/operations/payment'
import { PaymentStatus } from '@/lib/db/models/payment'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('Missing Stripe signature')
      return NextResponse.json(
        { message: 'Missing Stripe signature' },
        { status: 400 }
      )
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('Missing Stripe webhook secret')
      return NextResponse.json(
        { message: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(body, signature, webhookSecret)

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as any)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as any)
        break

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object as any)
        break

      case 'charge.dispute.created':
        await handleChargeDisputeCreated(event.data.object as any)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as any)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as any)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { message: 'Webhook handler failed' },
      { status: 400 }
    )
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  try {
    console.log(`Payment intent succeeded: ${paymentIntent.id}`)
    
    // Find payment by Stripe payment intent ID
    const payments = await import('@/lib/db/operations/payment').then(m => m.getAllPayments())
    const payment = payments.find(p => p.stripePaymentIntentId === paymentIntent.id)
    
    if (payment) {
      await updatePayment(payment.id, {
        status: PaymentStatus.PAID,
        paidDate: new Date(),
        reference: paymentIntent.charges?.data[0]?.id || paymentIntent.id,
        notes: `Payment processed via Stripe. Amount: ${paymentIntent.amount_received / 100} ${paymentIntent.currency.toUpperCase()}`
      })
      
      console.log(`Updated payment ${payment.id} to PAID status`)
      
      // TODO: Send payment confirmation email
    } else {
      console.warn(`No payment found for Stripe payment intent: ${paymentIntent.id}`)
    }
  } catch (error) {
    console.error('Error handling payment_intent.succeeded:', error)
  }
}

async function handlePaymentIntentFailed(paymentIntent: any) {
  try {
    console.log(`Payment intent failed: ${paymentIntent.id}`)
    
    // Find payment by Stripe payment intent ID
    const payments = await import('@/lib/db/operations/payment').then(m => m.getAllPayments())
    const payment = payments.find(p => p.stripePaymentIntentId === paymentIntent.id)
    
    if (payment) {
      await updatePayment(payment.id, {
        status: PaymentStatus.PENDING,
        notes: `Payment failed via Stripe. Reason: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`
      })
      
      console.log(`Updated payment ${payment.id} due to failure`)
      
      // TODO: Send payment failure notification
    } else {
      console.warn(`No payment found for failed Stripe payment intent: ${paymentIntent.id}`)
    }
  } catch (error) {
    console.error('Error handling payment_intent.payment_failed:', error)
  }
}

async function handlePaymentIntentCanceled(paymentIntent: any) {
  try {
    console.log(`Payment intent canceled: ${paymentIntent.id}`)
    
    // Find payment by Stripe payment intent ID
    const payments = await import('@/lib/db/operations/payment').then(m => m.getAllPayments())
    const payment = payments.find(p => p.stripePaymentIntentId === paymentIntent.id)
    
    if (payment) {
      await updatePayment(payment.id, {
        status: PaymentStatus.PENDING,
        notes: `Payment canceled via Stripe. Cancellation reason: ${paymentIntent.cancellation_reason || 'Not specified'}`
      })
      
      console.log(`Updated payment ${payment.id} due to cancellation`)
    }
  } catch (error) {
    console.error('Error handling payment_intent.canceled:', error)
  }
}

async function handleChargeDisputeCreated(dispute: any) {
  try {
    console.log(`Charge dispute created: ${dispute.id}`)
    
    // Find payment by charge ID
    const payments = await import('@/lib/db/operations/payment').then(m => m.getAllPayments())
    const payment = payments.find(p => p.reference === dispute.charge)
    
    if (payment) {
      await updatePayment(payment.id, {
        notes: `${payment.notes || ''}\n\nDISPUTE ALERT: Dispute created on ${new Date().toISOString()}. Dispute ID: ${dispute.id}. Reason: ${dispute.reason}. Amount: ${dispute.amount / 100} ${dispute.currency.toUpperCase()}`
      })
      
      console.log(`Added dispute information to payment ${payment.id}`)
      
      // TODO: Send dispute notification to admin
    }
  } catch (error) {
    console.error('Error handling charge.dispute.created:', error)
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  try {
    console.log(`Invoice payment succeeded: ${invoice.id}`)
    
    // Handle subscription or recurring payment success
    // This would be used for recurring rent payments
    
    // TODO: Create payment record for successful invoice payment
    console.log(`Invoice payment processed: ${invoice.amount_paid / 100} ${invoice.currency.toUpperCase()}`)
  } catch (error) {
    console.error('Error handling invoice.payment_succeeded:', error)
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  try {
    console.log(`Invoice payment failed: ${invoice.id}`)
    
    // Handle subscription or recurring payment failure
    // This would be used for failed recurring rent payments
    
    // TODO: Create notification for failed recurring payment
    console.log(`Invoice payment failed: ${invoice.amount_due / 100} ${invoice.currency.toUpperCase()}`)
  } catch (error) {
    console.error('Error handling invoice.payment_failed:', error)
  }
}
