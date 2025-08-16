import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/tenants/route'
import { GET as getTenant, PATCH as updateTenant, DELETE as deleteTenant } from '@/app/api/tenants/[id]/route'
import { POST as addEmergencyContact } from '@/app/api/tenants/[id]/emergency-contacts/route'
import { POST as addDocument } from '@/app/api/tenants/[id]/documents/route'
import { POST as addCommunication } from '@/app/api/tenants/[id]/communications/route'
import { createTenant, getTenant as getTenantFromDb, deleteTenant as deleteTenantFromDb } from '@/lib/db/operations/tenants'
import { CreateTenantInput } from '@/lib/db/models/tenant'

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => Promise.resolve({
    user: { id: 'test-user', email: 'test@example.com' }
  }))
}))

// Mock database
jest.mock('@/lib/db/operations/tenants')

describe('Tenant Management API', () => {
  const mockTenant = {
    id: 'test-tenant-id',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    status: 'Active' as const,
    propertyId: 'test-property-id',
    roomNumber: '101',
    leaseStart: new Date('2024-01-01'),
    leaseEnd: new Date('2024-12-31'),
    monthlyRentCents: 150000, // $1500
    depositCents: 300000, // $3000
    emergencyContacts: [{
      id: 'contact-1',
      name: 'Jane Doe',
      phone: '+1987654321',
      email: 'jane.doe@example.com',
      relationship: 'Spouse',
      isPrimary: true,
      verified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }],
    documents: [],
    communicationHistory: [],
    leaseHistory: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/tenants', () => {
    it('should return list of tenants', async () => {
      const mockSearchTenants = require('@/lib/db/operations/tenants').searchTenants
      mockSearchTenants.mockResolvedValue([mockTenant])

      const request = new NextRequest('http://localhost/api/tenants')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.tenants).toHaveLength(1)
      expect(data.tenants[0]).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      })
    })

    it('should filter tenants by query parameter', async () => {
      const mockSearchTenants = require('@/lib/db/operations/tenants').searchTenants
      mockSearchTenants.mockResolvedValue([mockTenant])

      const request = new NextRequest('http://localhost/api/tenants?query=John')
      const response = await GET(request)

      expect(mockSearchTenants).toHaveBeenCalledWith({
        query: 'John',
        status: undefined,
        propertyId: undefined,
        roomNumber: undefined,
        leaseStatus: undefined
      })
    })

    it('should return 401 for unauthenticated requests', async () => {
      const mockAuth = require('@/lib/auth').auth
      mockAuth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/tenants')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/tenants', () => {
    it('should create a new tenant', async () => {
      const mockCreateTenant = require('@/lib/db/operations/tenants').createTenant
      mockCreateTenant.mockResolvedValue(mockTenant)

      const tenantData: CreateTenantInput = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        status: 'Active',
        propertyId: 'test-property-id',
        roomNumber: '101',
        leaseStart: new Date('2024-01-01'),
        leaseEnd: new Date('2024-12-31'),
        monthlyRentCents: 150000,
        depositCents: 300000,
        emergencyContacts: []
      }

      const request = new NextRequest('http://localhost/api/tenants', {
        method: 'POST',
        body: JSON.stringify(tenantData)
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.tenant).toMatchObject({
        firstName: 'John',
        lastName: 'Doe'
      })
      expect(mockCreateTenant).toHaveBeenCalledWith(tenantData)
    })

    it('should return 400 for invalid tenant data', async () => {
      const request = new NextRequest('http://localhost/api/tenants', {
        method: 'POST',
        body: JSON.stringify({ firstName: 'John' }) // Missing required fields
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/tenants/[id]', () => {
    it('should return tenant by ID', async () => {
      const mockGetTenant = require('@/lib/db/operations/tenants').getTenant
      mockGetTenant.mockResolvedValue(mockTenant)

      const request = new NextRequest('http://localhost/api/tenants/test-tenant-id')
      const response = await getTenant(request, { params: { id: 'test-tenant-id' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.tenant).toMatchObject({
        id: 'test-tenant-id',
        firstName: 'John'
      })
    })

    it('should return 404 for non-existent tenant', async () => {
      const mockGetTenant = require('@/lib/db/operations/tenants').getTenant
      mockGetTenant.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/tenants/non-existent')
      const response = await getTenant(request, { params: { id: 'non-existent' } })

      expect(response.status).toBe(404)
    })
  })

  describe('PATCH /api/tenants/[id]', () => {
    it('should update tenant', async () => {
      const mockUpdateTenant = require('@/lib/db/operations/tenants').updateTenant
      const updatedTenant = { ...mockTenant, firstName: 'Jane' }
      mockUpdateTenant.mockResolvedValue(updatedTenant)

      const request = new NextRequest('http://localhost/api/tenants/test-tenant-id', {
        method: 'PATCH',
        body: JSON.stringify({ firstName: 'Jane' })
      })
      const response = await updateTenant(request, { params: { id: 'test-tenant-id' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.tenant.firstName).toBe('Jane')
    })
  })

  describe('DELETE /api/tenants/[id]', () => {
    it('should soft delete tenant', async () => {
      const mockDeleteTenant = require('@/lib/db/operations/tenants').deleteTenant
      mockDeleteTenant.mockResolvedValue(true)

      const request = new NextRequest('http://localhost/api/tenants/test-tenant-id', {
        method: 'DELETE'
      })
      const response = await deleteTenant(request, { params: { id: 'test-tenant-id' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Emergency Contacts API', () => {
    it('should add emergency contact', async () => {
      const mockAddEmergencyContact = require('@/lib/db/operations/tenants').addEmergencyContact
      const updatedTenant = {
        ...mockTenant,
        emergencyContacts: [
          ...mockTenant.emergencyContacts,
          {
            id: 'contact-2',
            name: 'Bob Smith',
            phone: '+1555666777',
            email: 'bob@example.com',
            relationship: 'Friend',
            isPrimary: false,
            verified: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      }
      mockAddEmergencyContact.mockResolvedValue(updatedTenant)

      const contactData = {
        name: 'Bob Smith',
        phone: '+1555666777',
        email: 'bob@example.com',
        relationship: 'Friend',
        isPrimary: false,
        verified: false
      }

      const request = new NextRequest('http://localhost/api/tenants/test-tenant-id/emergency-contacts', {
        method: 'POST',
        body: JSON.stringify(contactData)
      })
      const response = await addEmergencyContact(request, { params: { id: 'test-tenant-id' } })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.tenant.emergencyContacts).toHaveLength(2)
    })
  })

  describe('Documents API', () => {
    it('should add tenant document', async () => {
      const mockAddTenantDocument = require('@/lib/db/operations/tenants').addTenantDocument
      const updatedTenant = {
        ...mockTenant,
        documents: [{
          id: 'doc-1',
          type: 'ID' as const,
          filename: 'passport.pdf',
          url: 'https://example.com/passport.pdf',
          uploadDate: new Date(),
          fileSize: 1024,
          mimeType: 'application/pdf'
        }]
      }
      mockAddTenantDocument.mockResolvedValue(updatedTenant)

      const documentData = {
        type: 'ID',
        filename: 'passport.pdf',
        url: 'https://example.com/passport.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf'
      }

      const request = new NextRequest('http://localhost/api/tenants/test-tenant-id/documents', {
        method: 'POST',
        body: JSON.stringify(documentData)
      })
      const response = await addDocument(request, { params: { id: 'test-tenant-id' } })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.tenant.documents).toHaveLength(1)
    })
  })

  describe('Communications API', () => {
    it('should add communication record', async () => {
      const mockAddCommunicationRecord = require('@/lib/db/operations/tenants').addCommunicationRecord
      const updatedTenant = {
        ...mockTenant,
        communicationHistory: [{
          id: 'comm-1',
          type: 'Email' as const,
          subject: 'Lease Renewal',
          content: 'Discussion about lease renewal options',
          timestamp: new Date(),
          issueTags: ['lease'],
          resolved: false,
          createdBy: 'test@example.com'
        }]
      }
      mockAddCommunicationRecord.mockResolvedValue(updatedTenant)

      const communicationData = {
        type: 'Email',
        subject: 'Lease Renewal',
        content: 'Discussion about lease renewal options',
        issueTags: ['lease'],
        resolved: false,
        createdBy: 'test@example.com'
      }

      const request = new NextRequest('http://localhost/api/tenants/test-tenant-id/communications', {
        method: 'POST',
        body: JSON.stringify(communicationData)
      })
      const response = await addCommunication(request, { params: { id: 'test-tenant-id' } })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.tenant.communicationHistory).toHaveLength(1)
    })
  })
})
