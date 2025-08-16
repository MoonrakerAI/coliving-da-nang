import {
  createReimbursementRequest,
  getReimbursementRequestById,
  getReimbursementRequests,
  getPendingReimbursementRequests,
  processApprovalAction,
  processBatchApproval,
  recordReimbursementPayment,
  getReimbursementStatistics,
  getOutstandingReimbursements,
  resetReimbursementStorage
} from '../operations/reimbursements'
import {
  CreateReimbursementRequestInput,
  ApprovalActionInput,
  PaymentRecordingInput,
  BatchApprovalInput
} from '../models/reimbursement'

describe('Reimbursement Operations', () => {
  const mockExpenseId = '123e4567-e89b-12d3-a456-426614174000'
  const mockRequestorId = '123e4567-e89b-12d3-a456-426614174001'
  const mockPropertyId = '123e4567-e89b-12d3-a456-426614174002'
  const mockApproverId = '123e4567-e89b-12d3-a456-426614174003'

  beforeEach(() => {
    // Reset in-memory storage before each test
    resetReimbursementStorage()
  })

  describe('createReimbursementRequest', () => {
    it('should create a new reimbursement request with correct defaults', async () => {
      const input: CreateReimbursementRequestInput = {
        expenseId: mockExpenseId,
        requestorId: mockRequestorId,
        propertyId: mockPropertyId,
        amountCents: 5000,
        currency: 'USD'
      }

      const result = await createReimbursementRequest(input)

      expect(result).toMatchObject({
        expenseId: mockExpenseId,
        requestorId: mockRequestorId,
        propertyId: mockPropertyId,
        amountCents: 5000,
        currency: 'USD',
        status: 'Requested'
      })
      expect(result.id).toBeDefined()
      expect(result.requestDate).toBeInstanceOf(Date)
      expect(result.statusHistory).toHaveLength(1)
      expect(result.statusHistory[0].toStatus).toBe('Requested')
    })
  })

  describe('getReimbursementRequestById', () => {
    it('should return reimbursement request by ID', async () => {
      const input: CreateReimbursementRequestInput = {
        expenseId: mockExpenseId,
        requestorId: mockRequestorId,
        propertyId: mockPropertyId,
        amountCents: 5000
      }

      const created = await createReimbursementRequest(input)
      const found = await getReimbursementRequestById(created.id)

      expect(found).toEqual(created)
    })

    it('should return null for non-existent ID', async () => {
      const found = await getReimbursementRequestById('non-existent-id')
      expect(found).toBeNull()
    })
  })

  describe('getReimbursementRequests', () => {
    it('should return all reimbursement requests when no filters provided', async () => {
      const input1: CreateReimbursementRequestInput = {
        expenseId: mockExpenseId,
        requestorId: mockRequestorId,
        propertyId: mockPropertyId,
        amountCents: 5000
      }
      const input2: CreateReimbursementRequestInput = {
        expenseId: mockExpenseId,
        requestorId: mockRequestorId,
        propertyId: mockPropertyId,
        amountCents: 3000
      }

      await createReimbursementRequest(input1)
      await createReimbursementRequest(input2)

      const results = await getReimbursementRequests()
      expect(results).toHaveLength(2)
    })

    it('should filter by property ID', async () => {
      const property1 = '123e4567-e89b-12d3-a456-426614174010'
      const property2 = '123e4567-e89b-12d3-a456-426614174011'

      await createReimbursementRequest({
        expenseId: mockExpenseId,
        requestorId: mockRequestorId,
        propertyId: property1,
        amountCents: 5000
      })
      await createReimbursementRequest({
        expenseId: mockExpenseId,
        requestorId: mockRequestorId,
        propertyId: property2,
        amountCents: 3000
      })

      const results = await getReimbursementRequests({ propertyId: property1 })
      expect(results).toHaveLength(1)
      expect(results[0].propertyId).toBe(property1)
    })

    it('should filter by status', async () => {
      const request = await createReimbursementRequest({
        expenseId: mockExpenseId,
        requestorId: mockRequestorId,
        propertyId: mockPropertyId,
        amountCents: 5000
      })

      // Approve the request
      await processApprovalAction({
        reimbursementId: request.id,
        action: 'approve',
        comment: 'Approved for testing',
        approvedBy: mockApproverId
      })

      const approvedResults = await getReimbursementRequests({ status: 'Approved' })
      expect(approvedResults).toHaveLength(1)
      expect(approvedResults[0].status).toBe('Approved')

      const requestedResults = await getReimbursementRequests({ status: 'Requested' })
      expect(requestedResults).toHaveLength(0)
    })
  })

  describe('processApprovalAction', () => {
    it('should approve a reimbursement request', async () => {
      const request = await createReimbursementRequest({
        expenseId: mockExpenseId,
        requestorId: mockRequestorId,
        propertyId: mockPropertyId,
        amountCents: 5000
      })

      const approvalInput: ApprovalActionInput = {
        reimbursementId: request.id,
        action: 'approve',
        comment: 'Approved for legitimate expense',
        approvedBy: mockApproverId
      }

      const result = await processApprovalAction(approvalInput)

      expect(result).not.toBeNull()
      expect(result!.status).toBe('Approved')
      expect(result!.approvedBy).toBe(mockApproverId)
      expect(result!.approvedDate).toBeInstanceOf(Date)
      expect(result!.comments).toContain('Approved for legitimate expense')
      expect(result!.statusHistory).toHaveLength(2)
    })

    it('should deny a reimbursement request', async () => {
      const request = await createReimbursementRequest({
        expenseId: mockExpenseId,
        requestorId: mockRequestorId,
        propertyId: mockPropertyId,
        amountCents: 5000
      })

      const denialInput: ApprovalActionInput = {
        reimbursementId: request.id,
        action: 'deny',
        comment: 'Insufficient documentation',
        approvedBy: mockApproverId
      }

      const result = await processApprovalAction(denialInput)

      expect(result).not.toBeNull()
      expect(result!.status).toBe('Denied')
      expect(result!.deniedReason).toBe('Insufficient documentation')
      expect(result!.statusHistory).toHaveLength(2)
    })

    it('should throw error for invalid status transition', async () => {
      const request = await createReimbursementRequest({
        expenseId: mockExpenseId,
        requestorId: mockRequestorId,
        propertyId: mockPropertyId,
        amountCents: 5000
      })

      // First approve the request
      await processApprovalAction({
        reimbursementId: request.id,
        action: 'approve',
        comment: 'Initial approval',
        approvedBy: mockApproverId
      })

      // Try to approve again
      await expect(processApprovalAction({
        reimbursementId: request.id,
        action: 'approve',
        comment: 'Second approval attempt',
        approvedBy: mockApproverId
      })).rejects.toThrow('Cannot approve reimbursement request with status: Approved')
    })
  })

  describe('recordReimbursementPayment', () => {
    it('should record payment for approved reimbursement', async () => {
      const request = await createReimbursementRequest({
        expenseId: mockExpenseId,
        requestorId: mockRequestorId,
        propertyId: mockPropertyId,
        amountCents: 5000
      })

      // First approve the request
      await processApprovalAction({
        reimbursementId: request.id,
        action: 'approve',
        comment: 'Approved',
        approvedBy: mockApproverId
      })

      const paymentInput: PaymentRecordingInput = {
        reimbursementId: request.id,
        paymentMethod: 'Stripe',
        paymentReference: 'pi_1234567890',
        paidBy: mockApproverId,
        notes: 'Payment processed via Stripe'
      }

      const result = await recordReimbursementPayment(paymentInput)

      expect(result).not.toBeNull()
      expect(result!.status).toBe('Paid')
      expect(result!.paymentMethod).toBe('Stripe')
      expect(result!.paymentReference).toBe('pi_1234567890')
      expect(result!.paidDate).toBeInstanceOf(Date)
      expect(result!.statusHistory).toHaveLength(3)
    })

    it('should throw error for non-approved request', async () => {
      const request = await createReimbursementRequest({
        expenseId: mockExpenseId,
        requestorId: mockRequestorId,
        propertyId: mockPropertyId,
        amountCents: 5000
      })

      const paymentInput: PaymentRecordingInput = {
        reimbursementId: request.id,
        paymentMethod: 'Stripe',
        paidBy: mockApproverId
      }

      await expect(recordReimbursementPayment(paymentInput))
        .rejects.toThrow('Cannot record payment for reimbursement request with status: Requested')
    })
  })

  describe('processBatchApproval', () => {
    it('should approve multiple reimbursement requests', async () => {
      const request1 = await createReimbursementRequest({
        expenseId: mockExpenseId,
        requestorId: mockRequestorId,
        propertyId: mockPropertyId,
        amountCents: 5000
      })

      const request2 = await createReimbursementRequest({
        expenseId: mockExpenseId,
        requestorId: mockRequestorId,
        propertyId: mockPropertyId,
        amountCents: 3000
      })

      const batchInput: BatchApprovalInput = {
        reimbursementIds: [request1.id, request2.id],
        action: 'approve',
        comment: 'Batch approval for legitimate expenses',
        approvedBy: mockApproverId
      }

      const results = await processBatchApproval(batchInput)

      expect(results).toHaveLength(2)
      expect(results[0].status).toBe('Approved')
      expect(results[1].status).toBe('Approved')
    })
  })

  describe('getReimbursementStatistics', () => {
    it('should return correct statistics', async () => {
      // Create test data
      const request1 = await createReimbursementRequest({
        expenseId: mockExpenseId,
        requestorId: mockRequestorId,
        propertyId: mockPropertyId,
        amountCents: 5000
      })

      const request2 = await createReimbursementRequest({
        expenseId: mockExpenseId,
        requestorId: mockRequestorId,
        propertyId: mockPropertyId,
        amountCents: 3000
      })

      // Approve one request
      await processApprovalAction({
        reimbursementId: request1.id,
        action: 'approve',
        comment: 'Approved',
        approvedBy: mockApproverId
      })

      const stats = await getReimbursementStatistics()

      expect(stats.totalRequests).toBe(2)
      expect(stats.totalAmountCents).toBe(8000)
      expect(stats.byStatus['Requested'].count).toBe(1)
      expect(stats.byStatus['Approved'].count).toBe(1)
      expect(stats.byStatus['Requested'].amountCents).toBe(3000)
      expect(stats.byStatus['Approved'].amountCents).toBe(5000)
    })
  })

  describe('getOutstandingReimbursements', () => {
    it('should return only requested and approved reimbursements', async () => {
      const request1 = await createReimbursementRequest({
        expenseId: mockExpenseId,
        requestorId: mockRequestorId,
        propertyId: mockPropertyId,
        amountCents: 5000
      })

      const request2 = await createReimbursementRequest({
        expenseId: mockExpenseId,
        requestorId: mockRequestorId,
        propertyId: mockPropertyId,
        amountCents: 3000
      })

      const request3 = await createReimbursementRequest({
        expenseId: mockExpenseId,
        requestorId: mockRequestorId,
        propertyId: mockPropertyId,
        amountCents: 2000
      })

      // Approve one, deny one, leave one requested
      await processApprovalAction({
        reimbursementId: request1.id,
        action: 'approve',
        comment: 'Approved',
        approvedBy: mockApproverId
      })

      await processApprovalAction({
        reimbursementId: request2.id,
        action: 'deny',
        comment: 'Denied',
        approvedBy: mockApproverId
      })

      const outstanding = await getOutstandingReimbursements()

      expect(outstanding).toHaveLength(2) // Requested + Approved
      expect(outstanding.some(r => r.status === 'Requested')).toBe(true)
      expect(outstanding.some(r => r.status === 'Approved')).toBe(true)
      expect(outstanding.some(r => r.status === 'Denied')).toBe(false)
    })
  })
})
