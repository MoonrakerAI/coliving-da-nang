import { describe, it, expect } from 'vitest'
import {
  TenantSchema,
  CreateTenantSchema,
  UpdateTenantSchema,
  EmergencyContactSchema,
  TenantDocumentSchema,
  CommunicationSchema,
  RoomAssignmentSchema,
  LeaseRecordSchema
} from '@/lib/db/models/tenant'

describe('Tenant Data Models', () => {
  describe('EmergencyContactSchema', () => {
    it('should validate a complete emergency contact', () => {
      const validContact = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        relationship: 'Father',
        isPrimary: true,
        verified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = EmergencyContactSchema.safeParse(validContact)
      expect(result.success).toBe(true)
    })

    it('should require name, phone, and relationship', () => {
      const invalidContact = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'john@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = EmergencyContactSchema.safeParse(invalidContact)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toHaveLength(3) // name, phone, relationship missing
      }
    })

    it('should validate email format when provided', () => {
      const invalidEmailContact = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        phone: '+1234567890',
        email: 'invalid-email',
        relationship: 'Father',
        isPrimary: false,
        verified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = EmergencyContactSchema.safeParse(invalidEmailContact)
      expect(result.success).toBe(false)
    })
  })

  describe('RoomAssignmentSchema', () => {
    it('should validate a complete room assignment', () => {
      const validAssignment = {
        roomId: '123e4567-e89b-12d3-a456-426614174000',
        roomNumber: '101',
        moveInDate: new Date('2024-01-01'),
        moveOutDate: new Date('2024-12-31'),
        leaseEndDate: new Date('2024-12-31'),
        isActive: true
      }

      const result = RoomAssignmentSchema.safeParse(validAssignment)
      expect(result.success).toBe(true)
    })

    it('should allow optional moveOutDate', () => {
      const assignmentWithoutMoveOut = {
        roomId: '123e4567-e89b-12d3-a456-426614174000',
        roomNumber: '101',
        moveInDate: new Date('2024-01-01'),
        leaseEndDate: new Date('2024-12-31'),
        isActive: true
      }

      const result = RoomAssignmentSchema.safeParse(assignmentWithoutMoveOut)
      expect(result.success).toBe(true)
    })
  })

  describe('TenantDocumentSchema', () => {
    it('should validate a complete document', () => {
      const validDocument = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'ID' as const,
        filename: 'passport.pdf',
        url: 'https://example.com/passport.pdf',
        uploadDate: new Date(),
        expirationDate: new Date('2030-01-01'),
        fileSize: 1024,
        mimeType: 'application/pdf'
      }

      const result = TenantDocumentSchema.safeParse(validDocument)
      expect(result.success).toBe(true)
    })

    it('should validate document types', () => {
      const validTypes = ['ID', 'Passport', 'Lease', 'Reference', 'Other']
      
      validTypes.forEach(type => {
        const document = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          type,
          filename: 'test.pdf',
          url: 'https://example.com/test.pdf',
          uploadDate: new Date()
        }

        const result = TenantDocumentSchema.safeParse(document)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid document types', () => {
      const invalidDocument = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'InvalidType',
        filename: 'test.pdf',
        url: 'https://example.com/test.pdf',
        uploadDate: new Date()
      }

      const result = TenantDocumentSchema.safeParse(invalidDocument)
      expect(result.success).toBe(false)
    })
  })

  describe('CommunicationSchema', () => {
    it('should validate a complete communication record', () => {
      const validCommunication = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'Email' as const,
        subject: 'Lease Renewal',
        content: 'Discussion about lease renewal options',
        timestamp: new Date(),
        issueTags: ['lease', 'renewal'],
        resolved: false,
        createdBy: 'admin@example.com'
      }

      const result = CommunicationSchema.safeParse(validCommunication)
      expect(result.success).toBe(true)
    })

    it('should validate communication types', () => {
      const validTypes = ['Email', 'Phone', 'In Person', 'SMS', 'Note']
      
      validTypes.forEach(type => {
        const communication = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          type,
          content: 'Test communication',
          timestamp: new Date(),
          issueTags: [],
          resolved: false,
          createdBy: 'test@example.com'
        }

        const result = CommunicationSchema.safeParse(communication)
        expect(result.success).toBe(true)
      })
    })

    it('should require content and createdBy', () => {
      const invalidCommunication = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'Email',
        timestamp: new Date(),
        issueTags: [],
        resolved: false
      }

      const result = CommunicationSchema.safeParse(invalidCommunication)
      expect(result.success).toBe(false)
    })
  })

  describe('TenantSchema', () => {
    it('should validate a complete enhanced tenant', () => {
      const validTenant = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        profilePhoto: 'https://example.com/photo.jpg',
        status: 'Active' as const,
        propertyId: '123e4567-e89b-12d3-a456-426614174001',
        roomAssignment: {
          roomId: '123e4567-e89b-12d3-a456-426614174002',
          roomNumber: '101',
          moveInDate: new Date('2024-01-01'),
          leaseEndDate: new Date('2024-12-31'),
          isActive: true
        },
        emergencyContacts: [{
          id: '123e4567-e89b-12d3-a456-426614174003',
          name: 'Jane Doe',
          phone: '+1987654321',
          email: 'jane@example.com',
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

      const result = TenantSchema.safeParse(validTenant)
      expect(result.success).toBe(true)
    })

    it('should validate with legacy fields for backward compatibility', () => {
      const legacyTenant = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        status: 'Active' as const,
        propertyId: '123e4567-e89b-12d3-a456-426614174001',
        roomNumber: '101',
        leaseStart: new Date('2024-01-01'),
        leaseEnd: new Date('2024-12-31'),
        monthlyRentCents: 150000,
        depositCents: 300000,
        emergencyContact: {
          id: '123e4567-e89b-12d3-a456-426614174003',
          name: 'Jane Doe',
          phone: '+1987654321',
          relationship: 'Spouse',
          isPrimary: true,
          verified: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        emergencyContacts: [],
        documents: [],
        communicationHistory: [],
        leaseHistory: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = TenantSchema.safeParse(legacyTenant)
      expect(result.success).toBe(true)
    })

    it('should require basic tenant information', () => {
      const incompleteTenant = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'invalid-email',
        // Missing firstName, lastName, phone, status, propertyId
        emergencyContacts: [],
        documents: [],
        communicationHistory: [],
        leaseHistory: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = TenantSchema.safeParse(incompleteTenant)
      expect(result.success).toBe(false)
    })
  })

  describe('CreateTenantSchema', () => {
    it('should exclude auto-generated fields', () => {
      const createInput = {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        status: 'Active' as const,
        propertyId: '123e4567-e89b-12d3-a456-426614174001',
        emergencyContacts: []
      }

      const result = CreateTenantSchema.safeParse(createInput)
      expect(result.success).toBe(true)
    })

    it('should reject auto-generated fields', () => {
      const invalidInput = {
        id: '123e4567-e89b-12d3-a456-426614174000', // Should be excluded
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        status: 'Active' as const,
        propertyId: '123e4567-e89b-12d3-a456-426614174001',
        emergencyContacts: [],
        createdAt: new Date(), // Should be excluded
        updatedAt: new Date() // Should be excluded
      }

      const result = CreateTenantSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })

  describe('UpdateTenantSchema', () => {
    it('should allow partial updates with required ID', () => {
      const updateInput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        firstName: 'Jane', // Only updating first name
        status: 'Moving Out' as const
      }

      const result = UpdateTenantSchema.safeParse(updateInput)
      expect(result.success).toBe(true)
    })

    it('should require ID field', () => {
      const invalidInput = {
        firstName: 'Jane'
        // Missing required ID
      }

      const result = UpdateTenantSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })
})
