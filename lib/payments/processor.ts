import { CreatePaymentInput, PaymentMethod, PaymentStatus } from '@/lib/db/models/payment'
import { createPayment, updatePayment } from '@/lib/db/operations/payment'
import { createPaymentIntent, processRefund } from './stripe'
import { sendPaymentConfirmation, sendPaymentFailureNotification } from './confirmations'

export interface ProcessPaymentRequest extends CreatePaymentInput {
  sendConfirmation?: boolean
  stripePaymentMethodId?: string
}

export interface ProcessPaymentResult {
  success: boolean
  payment?: any
  stripePaymentIntent?: any
  error?: string
}

/**
 * Process a payment through the appropriate payment method
 */
export async function processPayment(request: ProcessPaymentRequest): Promise<ProcessPaymentResult> {
  try {
    // Create initial payment record
    const payment = await createPayment({
      ...request,
      status: PaymentStatus.PENDING // Start as pending until confirmed
    })

    // Process based on payment method
    switch (request.paymentMethod) {
      case PaymentMethod.STRIPE:
        return await processStripePayment(payment, request)
      
      case PaymentMethod.PAYPAL:
      case PaymentMethod.VENMO:
      case PaymentMethod.WISE:
      case PaymentMethod.REVOLUT:
      case PaymentMethod.WIRE:
        return await processExternalPayment(payment, request)
      
      case PaymentMethod.CASH:
        return await processCashPayment(payment, request)
      
      default:
        throw new Error(`Unsupported payment method: ${request.paymentMethod}`)
    }
  } catch (error) {
    console.error('Error processing payment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment processing failed'
    }
  }
}

/**
 * Process Stripe payment
 */
async function processStripePayment(payment: any, request: ProcessPaymentRequest): Promise<ProcessPaymentResult> {
  try {
    // Create Stripe payment intent
    const paymentIntent = await createPaymentIntent({
      amount: request.amountCents,
      currency: request.currency,
      description: request.description,
      metadata: {
        paymentId: payment.id,
        tenantId: request.tenantId,
        propertyId: request.propertyId
      }
    })

    // Update payment with Stripe payment intent ID
    const updatedPayment = await updatePayment(payment.id, {
      stripePaymentIntentId: paymentIntent.id,
      reference: paymentIntent.id
    })

    // If payment method is provided, confirm immediately
    if (request.stripePaymentMethodId) {
      // This would typically be handled by the frontend or webhook
      // For now, we'll mark as processing
      await updatePayment(payment.id, {
        status: PaymentStatus.PENDING,
        notes: 'Payment intent created and processing via Stripe'
      })
    }

    return {
      success: true,
      payment: updatedPayment,
      stripePaymentIntent: paymentIntent
    }
  } catch (error) {
    console.error('Error processing Stripe payment:', error)
    
    // Update payment status to failed
    await updatePayment(payment.id, {
      status: PaymentStatus.PENDING,
      notes: `Stripe payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    })

    return {
      success: false,
      payment,
      error: error instanceof Error ? error.message : 'Stripe payment failed'
    }
  }
}

/**
 * Process external payment methods (PayPal, Venmo, etc.)
 */
async function processExternalPayment(payment: any, request: ProcessPaymentRequest): Promise<ProcessPaymentResult> {
  try {
    // For external payment methods, we typically just record the payment
    // and mark it as paid if a reference is provided, or pending if not
    const status = request.reference ? PaymentStatus.PAID : PaymentStatus.PENDING
    const paidDate = status === PaymentStatus.PAID ? new Date() : undefined

    const updatedPayment = await updatePayment(payment.id, {
      status,
      paidDate,
      notes: `Payment recorded via ${request.paymentMethod}${request.reference ? `. Reference: ${request.reference}` : ''}`
    })

    // Send confirmation if payment is marked as paid
    if (status === PaymentStatus.PAID && request.sendConfirmation && updatedPayment) {
      await sendPaymentConfirmation(updatedPayment)
    }

    return {
      success: true,
      payment: updatedPayment
    }
  } catch (error) {
    console.error('Error processing external payment:', error)
    return {
      success: false,
      payment,
      error: error instanceof Error ? error.message : 'External payment processing failed'
    }
  }
}

/**
 * Process cash payment
 */
async function processCashPayment(payment: any, request: ProcessPaymentRequest): Promise<ProcessPaymentResult> {
  try {
    // Cash payments are typically recorded as paid immediately
    const updatedPayment = await updatePayment(payment.id, {
      status: PaymentStatus.PAID,
      paidDate: new Date(),
      notes: 'Cash payment received and recorded'
    })

    // Send confirmation
    if (request.sendConfirmation && updatedPayment) {
      await sendPaymentConfirmation(updatedPayment)
    }

    return {
      success: true,
      payment: updatedPayment
    }
  } catch (error) {
    console.error('Error processing cash payment:', error)
    return {
      success: false,
      payment,
      error: error instanceof Error ? error.message : 'Cash payment processing failed'
    }
  }
}

/**
 * Process refund through appropriate payment method
 */
export async function processPaymentRefund(
  paymentId: string,
  amount?: number,
  reason?: string
): Promise<ProcessPaymentResult> {
  try {
    const { getPaymentById } = await import('@/lib/db/operations/payment')
    const payment = await getPaymentById(paymentId)
    
    if (!payment) {
      return {
        success: false,
        error: 'Payment not found'
      }
    }

    if (payment.status !== PaymentStatus.PAID) {
      return {
        success: false,
        error: 'Only paid payments can be refunded'
      }
    }

    // Process refund based on payment method
    switch (payment.paymentMethod) {
      case PaymentMethod.STRIPE:
        return await processStripeRefund(payment, amount, reason)
      
      default:
        return await processManualRefund(payment, amount, reason)
    }
  } catch (error) {
    console.error('Error processing refund:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Refund processing failed'
    }
  }
}

/**
 * Process Stripe refund
 */
async function processStripeRefund(payment: any, amount?: number, reason?: string): Promise<ProcessPaymentResult> {
  try {
    if (!payment.stripePaymentIntentId) {
      return {
        success: false,
        error: 'No Stripe payment intent found for this payment'
      }
    }

    // Process refund through Stripe
    const refund = await processRefund({
      paymentIntentId: payment.stripePaymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason: reason as any,
      metadata: {
        originalPaymentId: payment.id,
        refundReason: reason || 'Requested by customer'
      }
    })

    // Create refund record
    const refundPayment = await createPayment({
      tenantId: payment.tenantId,
      propertyId: payment.propertyId,
      amountCents: -refund.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      status: PaymentStatus.REFUNDED,
      dueDate: new Date(),
      paidDate: new Date(),
      reference: refund.id,
      description: `Refund for: ${payment.description}`,
      notes: `Stripe refund processed. Original payment: ${payment.id}. Reason: ${reason || 'Not specified'}`
    })

    return {
      success: true,
      payment: refundPayment
    }
  } catch (error) {
    console.error('Error processing Stripe refund:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Stripe refund failed'
    }
  }
}

/**
 * Process manual refund for non-Stripe payments
 */
async function processManualRefund(payment: any, amount?: number, reason?: string): Promise<ProcessPaymentResult> {
  try {
    const refundAmount = amount ? Math.round(amount * 100) : payment.amountCents

    // Create refund record
    const refundPayment = await createPayment({
      tenantId: payment.tenantId,
      propertyId: payment.propertyId,
      amountCents: -refundAmount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      status: PaymentStatus.REFUNDED,
      dueDate: new Date(),
      paidDate: new Date(),
      reference: `MANUAL-REFUND-${Date.now()}`,
      description: `Manual refund for: ${payment.description}`,
      notes: `Manual refund processed. Original payment: ${payment.id}. Reason: ${reason || 'Not specified'}. Note: Manual processing required through ${payment.paymentMethod}.`
    })

    return {
      success: true,
      payment: refundPayment
    }
  } catch (error) {
    console.error('Error processing manual refund:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Manual refund failed'
    }
  }
}

/**
 * Batch process multiple payments
 */
export async function batchProcessPayments(payments: ProcessPaymentRequest[]): Promise<{
  successful: any[]
  failed: Array<{ payment: ProcessPaymentRequest; error: string }>
}> {
  const successful: any[] = []
  const failed: Array<{ payment: ProcessPaymentRequest; error: string }> = []

  for (const paymentRequest of payments) {
    try {
      const result = await processPayment(paymentRequest)
      
      if (result.success && result.payment) {
        successful.push(result.payment)
      } else {
        failed.push({
          payment: paymentRequest,
          error: result.error || 'Unknown error'
        })
      }
    } catch (error) {
      failed.push({
        payment: paymentRequest,
        error: error instanceof Error ? error.message : 'Processing failed'
      })
    }
  }

  return { successful, failed }
}
