import { ReimbursementPaymentIntegrationService } from '../reimbursement-payment-integration'
import { PaymentRecordingInput } from '@/lib/db/models/reimbursement'
import { resetReimbursementStorage, createReimbursementRequest, processApprovalAction } from '@/lib/db/operations/reimbursements'

describe('ReimbursementPaymentIntegrationService', () => {
  beforeEach(() => {
    resetReimbursementStorage()
  })

  describe('validatePaymentData', () => {
    it('should validate payment method is required', () => {
      const paymentData = {
        reimbursementId: 'test-id',
        paidBy: 'user-id'
      } as PaymentRecordingInput

      const errors = ReimbursementPaymentIntegrationService.validatePaymentData(paymentData)
      expect(errors).toContain('Payment method is required')
    })

    it('should require payment reference for Stripe payments', () => {
      const paymentData = {
        reimbursementId: 'test-id',
        paymentMethod: 'Stripe',
        paidBy: 'user-id'
      } as PaymentRecordingInput

      const errors = ReimbursementPaymentIntegrationService.validatePaymentData(paymentData)
      expect(errors).toContain('Payment reference is required for Stripe payments')
    })

    it('should validate Stripe payment intent format', () => {
      const paymentData = {
        reimbursementId: 'test-id',
        paymentMethod: 'Stripe',
        paymentReference: 'invalid-format',
        paidBy: 'user-id'
      } as PaymentRecordingInput

      const errors = ReimbursementPaymentIntegrationService.validatePaymentData(paymentData)
      expect(errors).toContain('Stripe payment reference must be a payment intent ID (starting with "pi_")')
    })

    it('should validate payment date is not in future', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)

      const paymentData = {
        reimbursementId: 'test-id',
        paymentMethod: 'Cash',
        paidDate: futureDate,
        paidBy: 'user-id'
      } as PaymentRecordingInput

      const errors = ReimbursementPaymentIntegrationService.validatePaymentData(paymentData)
      expect(errors).toContain('Payment date cannot be in the future')
    })

    it('should pass validation for valid payment data', () => {
      const paymentData = {
        reimbursementId: 'test-id',
        paymentMethod: 'Cash',
        paidBy: 'user-id'
      } as PaymentRecordingInput

      const errors = ReimbursementPaymentIntegrationService.validatePaymentData(paymentData)
      expect(errors).toHaveLength(0)
    })

    it('should pass validation for valid Stripe payment', () => {
      const paymentData = {
        reimbursementId: 'test-id',
        paymentMethod: 'Stripe',
        paymentReference: 'pi_1234567890abcdef',
        paidBy: 'user-id'
      } as PaymentRecordingInput

      const errors = ReimbursementPaymentIntegrationService.validatePaymentData(paymentData)
      expect(errors).toHaveLength(0)
    })
  })

  describe('recordPayment', () => {
    it('should record payment for approved reimbursement', async () => {
      // Create and approve a reimbursement request
      const reimbursement = await createReimbursementRequest({
        expenseId: '123e4567-e89b-12d3-a456-426614174000',
        requestorId: '123e4567-e89b-12d3-a456-426614174001',
        propertyId: '123e4567-e89b-12d3-a456-426614174002',
        amountCents: 5000,
        currency: 'USD'
      })

      await processApprovalAction({
        reimbursementId: reimbursement.id,
        action: 'approve',
        comment: 'Approved for testing',
        approvedBy: '123e4567-e89b-12d3-a456-426614174003'
      })

      const paymentData = {
        reimbursementId: reimbursement.id,
        paymentMethod: 'Stripe',
        paymentReference: 'pi_1234567890abcdef',
        paidBy: '123e4567-e89b-12d3-a456-426614174003'
      } as PaymentRecordingInput

      const result = await ReimbursementPaymentIntegrationService.recordPayment(
        reimbursement.id,
        paymentData
      )

      expect(result.status).toBe('Paid')
      expect(result.paymentMethod).toBe('Stripe')
      expect(result.paymentReference).toBe('pi_1234567890abcdef')
      expect(result.paidDate).toBeInstanceOf(Date)
    })

    it('should throw error for non-existent reimbursement', async () => {
      const paymentData = {
        reimbursementId: 'non-existent-id',
        paymentMethod: 'Cash',
        paidBy: 'user-id'
      } as PaymentRecordingInput

      await expect(
        ReimbursementPaymentIntegrationService.recordPayment('non-existent-id', paymentData)
      ).rejects.toThrow('Reimbursement request not found')
    })

    it('should throw error for non-approved reimbursement', async () => {
      // Create a reimbursement request but don't approve it
      const reimbursement = await createReimbursementRequest({
        expenseId: '123e4567-e89b-12d3-a456-426614174000',
        requestorId: '123e4567-e89b-12d3-a456-426614174001',
        propertyId: '123e4567-e89b-12d3-a456-426614174002',
        amountCents: 5000,
        currency: 'USD'
      })

      const paymentData = {
        reimbursementId: reimbursement.id,
        paymentMethod: 'Cash',
        paidBy: 'user-id'
      } as PaymentRecordingInput

      await expect(
        ReimbursementPaymentIntegrationService.recordPayment(reimbursement.id, paymentData)
      ).rejects.toThrow('Cannot record payment for reimbursement with status: Requested')
    })
  })

  describe('generatePaymentReceipt', () => {
    it('should generate receipt for paid reimbursement', async () => {
      // Create, approve, and pay a reimbursement request
      const reimbursement = await createReimbursementRequest({
        expenseId: '123e4567-e89b-12d3-a456-426614174000',
        requestorId: '123e4567-e89b-12d3-a456-426614174001',
        propertyId: '123e4567-e89b-12d3-a456-426614174002',
        amountCents: 5000,
        currency: 'USD'
      })

      await processApprovalAction({
        reimbursementId: reimbursement.id,
        action: 'approve',
        comment: 'Approved for testing',
        approvedBy: '123e4567-e89b-12d3-a456-426614174003'
      })

      const paymentData = {
        reimbursementId: reimbursement.id,
        paymentMethod: 'Stripe',
        paymentReference: 'pi_1234567890abcdef',
        paidBy: '123e4567-e89b-12d3-a456-426614174003'
      } as PaymentRecordingInput

      await ReimbursementPaymentIntegrationService.recordPayment(reimbursement.id, paymentData)

      const receipt = await ReimbursementPaymentIntegrationService.generatePaymentReceipt(
        reimbursement.id
      )

      expect(receipt.receiptData).toMatchObject({
        reimbursementId: reimbursement.id,
        expenseId: reimbursement.expenseId,
        amount: 5000,
        currency: 'USD',
        paymentMethod: 'Stripe',
        paymentReference: 'pi_1234567890abcdef'
      })
      expect(receipt.receiptData.generatedAt).toBeInstanceOf(Date)
    })

    it('should throw error for unpaid reimbursement', async () => {
      const reimbursement = await createReimbursementRequest({
        expenseId: '123e4567-e89b-12d3-a456-426614174000',
        requestorId: '123e4567-e89b-12d3-a456-426614174001',
        propertyId: '123e4567-e89b-12d3-a456-426614174002',
        amountCents: 5000,
        currency: 'USD'
      })

      await expect(
        ReimbursementPaymentIntegrationService.generatePaymentReceipt(reimbursement.id)
      ).rejects.toThrow('Cannot generate receipt for unpaid reimbursement')
    })
  })
})
