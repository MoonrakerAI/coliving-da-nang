import Stripe from 'stripe'

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export interface CreatePaymentIntentRequest {
  amount: number // in cents
  currency: string
  customerId?: string
  paymentMethodId?: string
  description?: string
  metadata?: Record<string, string>
}

export interface CreateCustomerRequest {
  email: string
  name: string
  metadata?: Record<string, string>
}

export interface ProcessRefundRequest {
  paymentIntentId: string
  amount?: number // in cents, optional for partial refund
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  metadata?: Record<string, string>
}

/**
 * Create a payment intent for processing payments
 */
export async function createPaymentIntent(request: CreatePaymentIntentRequest): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: request.amount,
      currency: request.currency,
      customer: request.customerId,
      payment_method: request.paymentMethodId,
      description: request.description,
      metadata: request.metadata || {},
      automatic_payment_methods: {
        enabled: true
      }
    })

    return paymentIntent
  } catch (error) {
    console.error('Error creating payment intent:', error)
    throw new Error(`Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Confirm a payment intent
 */
export async function confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId
    })

    return paymentIntent
  } catch (error) {
    console.error('Error confirming payment intent:', error)
    throw new Error(`Failed to confirm payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Retrieve a payment intent
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    return paymentIntent
  } catch (error) {
    console.error('Error retrieving payment intent:', error)
    throw new Error(`Failed to retrieve payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Create a customer in Stripe
 */
export async function createCustomer(request: CreateCustomerRequest): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.create({
      email: request.email,
      name: request.name,
      metadata: request.metadata || {}
    })

    return customer
  } catch (error) {
    console.error('Error creating customer:', error)
    throw new Error(`Failed to create customer: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Process a refund
 */
export async function processRefund(request: ProcessRefundRequest): Promise<Stripe.Refund> {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: request.paymentIntentId,
      amount: request.amount, // If not provided, refunds the full amount
      reason: request.reason,
      metadata: request.metadata || {}
    })

    return refund
  } catch (error) {
    console.error('Error processing refund:', error)
    throw new Error(`Failed to process refund: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Create a setup intent for saving payment methods
 */
export async function createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      automatic_payment_methods: {
        enabled: true
      }
    })

    return setupIntent
  } catch (error) {
    console.error('Error creating setup intent:', error)
    throw new Error(`Failed to create setup intent: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * List customer payment methods
 */
export async function getCustomerPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    })

    return paymentMethods.data
  } catch (error) {
    console.error('Error retrieving payment methods:', error)
    throw new Error(`Failed to retrieve payment methods: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string): Stripe.Event {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret)
    return event
  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    throw new Error(`Invalid webhook signature: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Handle webhook events
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  console.log(`Processing webhook event: ${event.type}`)

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log(`Payment succeeded: ${paymentIntent.id}`)
      // TODO: Update payment status in database
      break

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent
      console.log(`Payment failed: ${failedPayment.id}`)
      // TODO: Update payment status in database
      break

    case 'charge.dispute.created':
      const dispute = event.data.object as Stripe.Dispute
      console.log(`Dispute created: ${dispute.id}`)
      // TODO: Handle dispute notification
      break

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }
}

export { stripe }
