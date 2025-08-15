import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  createPaymentIntent, 
  confirmPaymentIntent, 
  processRefund, 
  createCustomer,
  verifyWebhookSignature 
} from '@/lib/payments/stripe'

// Mock Stripe
const mockStripe = {
  paymentIntents: {
    create: vi.fn(),
    confirm: vi.fn(),
    retrieve: vi.fn()
  },
  customers: {
    create: vi.fn()
  },
  refunds: {
    create: vi.fn()
  },
  webhooks: {
    constructEvent: vi.fn()
  }
}

vi.mock('stripe', () => {
  return {
    default: vi.fn(() => mockStripe)
  }
})

describe('Stripe Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createPaymentIntent', () => {
    it('should create a payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        amount: 150000,
        currency: 'usd',
        status: 'requires_payment_method'
      }

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent)

      const result = await createPaymentIntent({
        amount: 150000,
        currency: 'USD',
        description: 'Monthly Rent'
      })

      expect(result).toEqual(mockPaymentIntent)
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 150000,
        currency: 'USD',
        description: 'Monthly Rent',
        metadata: {},
        automatic_payment_methods: {
          enabled: true
        }
      })
    })

    it('should handle Stripe errors gracefully', async () => {
      mockStripe.paymentIntents.create.mockRejectedValue(new Error('Stripe error'))

      await expect(createPaymentIntent({
        amount: 150000,
        currency: 'USD'
      })).rejects.toThrow('Failed to create payment intent: Stripe error')
    })
  })

  describe('confirmPaymentIntent', () => {
    it('should confirm a payment intent successfully', async () => {
      const mockConfirmedIntent = {
        id: 'pi_test_123',
        status: 'succeeded'
      }

      mockStripe.paymentIntents.confirm.mockResolvedValue(mockConfirmedIntent)

      const result = await confirmPaymentIntent('pi_test_123', 'pm_test_456')

      expect(result).toEqual(mockConfirmedIntent)
      expect(mockStripe.paymentIntents.confirm).toHaveBeenCalledWith('pi_test_123', {
        payment_method: 'pm_test_456'
      })
    })
  })

  describe('processRefund', () => {
    it('should process a refund successfully', async () => {
      const mockRefund = {
        id: 're_test_123',
        amount: 150000,
        status: 'succeeded'
      }

      mockStripe.refunds.create.mockResolvedValue(mockRefund)

      const result = await processRefund({
        paymentIntentId: 'pi_test_123',
        amount: 150000,
        reason: 'requested_by_customer'
      })

      expect(result).toEqual(mockRefund)
      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        amount: 150000,
        reason: 'requested_by_customer',
        metadata: {}
      })
    })
  })

  describe('createCustomer', () => {
    it('should create a customer successfully', async () => {
      const mockCustomer = {
        id: 'cus_test_123',
        email: 'test@example.com',
        name: 'Test User'
      }

      mockStripe.customers.create.mockResolvedValue(mockCustomer)

      const result = await createCustomer({
        email: 'test@example.com',
        name: 'Test User'
      })

      expect(result).toEqual(mockCustomer)
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: {}
      })
    })
  })

  describe('verifyWebhookSignature', () => {
    it('should verify webhook signature successfully', () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: { object: {} }
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

      const result = verifyWebhookSignature('payload', 'signature', 'secret')

      expect(result).toEqual(mockEvent)
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith('payload', 'signature', 'secret')
    })

    it('should throw error for invalid signature', () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      expect(() => {
        verifyWebhookSignature('payload', 'invalid_signature', 'secret')
      }).toThrow('Invalid webhook signature: Invalid signature')
    })
  })
})
