import { describe, it, expect, beforeEach } from 'vitest'
import {
  TenantSchema,
  CreateTenantSchema
} from '../models/tenant'
import {
  PropertySchema,
  CreatePropertySchema
} from '../models/property'
import {
  PaymentSchema,
  CreatePaymentSchema
} from '../models/payment'
import {
  ExpenseSchema,
  CreateExpenseSchema
} from '../models/expense'

describe('Database Models Validation', () => {
  describe('Tenant Model', () => {
    const validTenantData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      emergencyContact: {
        name: 'Jane Doe',
        phone: '+1234567891',
        relationship: 'Sister'
      },
      status: 'Active' as const,
      propertyId: '123e4567-e89b-12d3-a456-426614174001',
      roomNumber: '101',
      leaseStart: new Date('2024-01-01'),
      leaseEnd: new Date('2024-12-31'),
      monthlyRentCents: 50000,
      depositCents: 100000,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    it('should validate a complete tenant object', () => {
      const result = TenantSchema.safeParse(validTenantData)
      expect(result.success).toBe(true)
    })

    it('should reject tenant with invalid email', () => {
      const invalidData = { ...validTenantData, email: 'invalid-email' }
      const result = TenantSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject tenant with negative rent', () => {
      const invalidData = { ...validTenantData, monthlyRentCents: -1000 }
      const result = TenantSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate create tenant input', () => {
      const createData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        emergencyContact: {
          name: 'Jane Doe',
          phone: '+1234567891',
          relationship: 'Sister'
        },
        status: 'Active' as const,
        propertyId: '123e4567-e89b-12d3-a456-426614174001',
        roomNumber: '101',
        leaseStart: new Date('2024-01-01'),
        leaseEnd: new Date('2024-12-31'),
        monthlyRentCents: 50000,
        depositCents: 100000
      }

      const result = CreateTenantSchema.safeParse(createData)
      expect(result.success).toBe(true)
    })
  })

  describe('Property Model', () => {
    const validPropertyData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Property',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'Test Country'
      },
      roomCount: 5,
      settings: {
        allowPets: true,
        smokingAllowed: false,
        maxOccupancy: 10,
        checkInTime: '15:00',
        checkOutTime: '11:00',
        parkingAvailable: true
      },
      houseRules: ['No smoking', 'Quiet hours 10PM-8AM'],
      ownerId: '123e4567-e89b-12d3-a456-426614174001',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    it('should validate a complete property object', () => {
      const result = PropertySchema.safeParse(validPropertyData)
      expect(result.success).toBe(true)
    })

    it('should reject property with invalid room count', () => {
      const invalidData = { ...validPropertyData, roomCount: 0 }
      const result = PropertySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject property with invalid check-in time format', () => {
      const invalidData = {
        ...validPropertyData,
        settings: {
          ...validPropertyData.settings,
          checkInTime: '25:00' // Invalid hour
        }
      }
      const result = PropertySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('Payment Model', () => {
    const validPaymentData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
      propertyId: '123e4567-e89b-12d3-a456-426614174002',
      amountCents: 50000,
      currency: 'USD',
      paymentMethod: 'Stripe' as const,
      status: 'Pending' as const,
      dueDate: new Date('2024-09-01'),
      description: 'Monthly rent',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    it('should validate a complete payment object', () => {
      const result = PaymentSchema.safeParse(validPaymentData)
      expect(result.success).toBe(true)
    })

    it('should reject payment with invalid amount', () => {
      const invalidData = { ...validPaymentData, amountCents: -1000 }
      const result = PaymentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject payment with invalid payment method', () => {
      const invalidData = { ...validPaymentData, paymentMethod: 'InvalidMethod' }
      const result = PaymentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject payment with invalid currency code', () => {
      const invalidData = { ...validPaymentData, currency: 'INVALID' }
      const result = PaymentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('Expense Model', () => {
    const validExpenseData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      propertyId: '123e4567-e89b-12d3-a456-426614174001',
      userId: '123e4567-e89b-12d3-a456-426614174002',
      amountCents: 15000,
      currency: 'USD',
      category: 'Utilities' as const,
      description: 'Electricity bill',
      receiptPhotos: ['https://example.com/receipt.jpg'],
      needsReimbursement: false,
      isReimbursed: false,
      expenseDate: new Date('2024-08-01'),
      createdBy: '123e4567-e89b-12d3-a456-426614174002',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    it('should validate a complete expense object', () => {
      const result = ExpenseSchema.safeParse(validExpenseData)
      expect(result.success).toBe(true)
    })

    it('should validate expense with location data', () => {
      const expenseWithLocation = {
        ...validExpenseData,
        location: {
          latitude: 16.0544,
          longitude: 108.2022,
          address: '123 Test St',
          placeName: 'Test Location'
        }
      }
      const result = ExpenseSchema.safeParse(expenseWithLocation)
      expect(result.success).toBe(true)
    })

    it('should reject expense with invalid category', () => {
      const invalidData = { ...validExpenseData, category: 'InvalidCategory' }
      const result = ExpenseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject expense with invalid latitude', () => {
      const invalidData = {
        ...validExpenseData,
        location: {
          latitude: 91, // Invalid latitude > 90
          longitude: 108.2022
        }
      }
      const result = ExpenseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
