import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { resetReimbursementStorage } from '@/lib/db/operations/reimbursements'

// Mock NextRequest
function createMockRequest(url: string, options: RequestInit = {}) {
  return new NextRequest(url, options)
}

describe('/api/reimbursements', () => {
  beforeEach(() => {
    resetReimbursementStorage()
  })

  describe('GET /api/reimbursements', () => {
    it('should return empty array when no reimbursements exist', async () => {
      const request = createMockRequest('http://localhost:3000/api/reimbursements')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
      expect(data.count).toBe(0)
    })

    it('should return reimbursements with filters', async () => {
      // First create a reimbursement
      const createRequest = createMockRequest('http://localhost:3000/api/reimbursements', {
        method: 'POST',
        body: JSON.stringify({
          expenseId: '123e4567-e89b-12d3-a456-426614174000',
          requestorId: '123e4567-e89b-12d3-a456-426614174001',
          propertyId: '123e4567-e89b-12d3-a456-426614174002',
          amountCents: 5000,
          currency: 'USD'
        })
      })
      await POST(createRequest)

      // Then fetch with property filter
      const getRequest = createMockRequest('http://localhost:3000/api/reimbursements?propertyId=123e4567-e89b-12d3-a456-426614174002')
      const response = await GET(getRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].propertyId).toBe('123e4567-e89b-12d3-a456-426614174002')
    })
  })

  describe('POST /api/reimbursements', () => {
    it('should create a new reimbursement request', async () => {
      const requestData = {
        expenseId: '123e4567-e89b-12d3-a456-426614174000',
        requestorId: '123e4567-e89b-12d3-a456-426614174001',
        propertyId: '123e4567-e89b-12d3-a456-426614174002',
        amountCents: 5000,
        currency: 'USD'
      }

      const request = createMockRequest('http://localhost:3000/api/reimbursements', {
        method: 'POST',
        body: JSON.stringify(requestData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toMatchObject({
        expenseId: requestData.expenseId,
        requestorId: requestData.requestorId,
        propertyId: requestData.propertyId,
        amountCents: requestData.amountCents,
        currency: requestData.currency,
        status: 'Requested'
      })
      expect(data.data.id).toBeDefined()
      expect(data.message).toBe('Reimbursement request created successfully')
    })

    it('should return 400 for invalid input', async () => {
      const invalidData = {
        expenseId: 'invalid-uuid',
        requestorId: '123e4567-e89b-12d3-a456-426614174001',
        propertyId: '123e4567-e89b-12d3-a456-426614174002',
        amountCents: -100, // Invalid negative amount
        currency: 'USD'
      }

      const request = createMockRequest('http://localhost:3000/api/reimbursements', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid input data')
    })

    it('should handle missing required fields', async () => {
      const incompleteData = {
        expenseId: '123e4567-e89b-12d3-a456-426614174000',
        // Missing requestorId, propertyId, amountCents
      }

      const request = createMockRequest('http://localhost:3000/api/reimbursements', {
        method: 'POST',
        body: JSON.stringify(incompleteData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid input data')
    })
  })
})
