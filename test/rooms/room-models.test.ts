import { describe, it, expect } from 'vitest'
import {
  Room,
  RoomCondition,
  OccupancyRecord,
  MaintenanceRecord,
  PropertyDetails,
  RoomSchema,
  CreateRoomSchema,
  UpdateRoomSchema,
  RoomTypeSchema,
  RoomConditionSchema,
  OccupancyRecordSchema,
  CreateOccupancyRecordSchema,
  UpdateOccupancyRecordSchema,
  OccupancyStatusSchema,
  MaintenanceRecordSchema,
  CreateMaintenanceRecordSchema,
  UpdateMaintenanceRecordSchema,
  PropertyAnalyticsSchema,
  PropertyDetailsSchema
} from '../../lib/db/models/room'

describe('Room Models and Schemas', () => {
  describe('RoomTypeSchema', () => {
    it('should accept valid room types', () => {
      const validTypes = ['Single', 'Double', 'Suite', 'Studio']
      validTypes.forEach(type => {
        expect(() => RoomTypeSchema.parse(type)).not.toThrow()
      })
    })

    it('should reject invalid room types', () => {
      const invalidTypes = ['Triple', 'Penthouse', '', null, undefined]
      invalidTypes.forEach(type => {
        expect(() => RoomTypeSchema.parse(type)).toThrow()
      })
    })
  })

  describe('RoomConditionSchema', () => {
    it('should accept valid room conditions', () => {
      const validConditions = ['Excellent', 'Good', 'Fair', 'Needs Repair']
      validConditions.forEach(condition => {
        expect(() => RoomConditionSchema.parse(condition)).not.toThrow()
      })
    })

    it('should reject invalid room conditions', () => {
      const invalidConditions = ['Perfect', 'Bad', '', null, undefined]
      invalidConditions.forEach(condition => {
        expect(() => RoomConditionSchema.parse(condition)).toThrow()
      })
    })
  })

  describe('RoomSchema', () => {
    const validRoom: Omit<Room, 'deletedAt' | 'lastInspection'> & { lastInspection?: Date; features?: string[]; photos?: string[]; isAvailable?: boolean; condition?: RoomCondition; } = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      propertyId: '123e4567-e89b-12d3-a456-426614174001',
      number: 'A101',
      type: 'Single' as const,
      size: 250,
      features: ['Air Conditioning', 'Private Bathroom'],
      monthlyRent: 800,
      deposit: 1600,
      isAvailable: true,
      condition: 'Good' as const,
      lastInspection: new Date('2024-01-15'),
      photos: ['photo1.jpg', 'photo2.jpg'],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    it('should validate a complete valid room', () => {
      expect(() => RoomSchema.parse(validRoom)).not.toThrow()
    })

    it('should require valid UUID for id', () => {
      const invalidRoom = { ...validRoom, id: 'invalid-uuid' }
      expect(() => RoomSchema.parse(invalidRoom)).toThrow()
    })

    it('should require valid UUID for propertyId', () => {
      const invalidRoom = { ...validRoom, propertyId: 'invalid-uuid' }
      expect(() => RoomSchema.parse(invalidRoom)).toThrow()
    })

    it('should require non-empty room number', () => {
      const invalidRoom = { ...validRoom, number: '' }
      expect(() => RoomSchema.parse(invalidRoom)).toThrow()
    })

    it('should require positive size', () => {
      const invalidRoom = { ...validRoom, size: -10 }
      expect(() => RoomSchema.parse(invalidRoom)).toThrow()
    })

    it('should require non-negative monthly rent', () => {
      const invalidRoom = { ...validRoom, monthlyRent: -100 }
      expect(() => RoomSchema.parse(invalidRoom)).toThrow()
    })

    it('should require non-negative deposit', () => {
      const invalidRoom = { ...validRoom, deposit: -50 }
      expect(() => RoomSchema.parse(invalidRoom)).toThrow()
    })

    it('should default features to empty array', () => {
      const roomWithoutFeatures = { ...validRoom }
      delete roomWithoutFeatures.features
      const parsed = RoomSchema.parse(roomWithoutFeatures)
      expect(parsed.features).toEqual([])
    })

    it('should default photos to empty array', () => {
      const roomWithoutPhotos = { ...validRoom }
      delete roomWithoutPhotos.photos
      const parsed = RoomSchema.parse(roomWithoutPhotos)
      expect(parsed.photos).toEqual([])
    })

    it('should default isAvailable to true', () => {
      const roomWithoutAvailability = { ...validRoom }
      delete roomWithoutAvailability.isAvailable
      const parsed = RoomSchema.parse(roomWithoutAvailability)
      expect(parsed.isAvailable).toBe(true)
    })

    it('should default condition to Good', () => {
      const roomWithoutCondition = { ...validRoom }
      delete roomWithoutCondition.condition
      const parsed = RoomSchema.parse(roomWithoutCondition)
      expect(parsed.condition).toBe('Good')
    })
  })

  describe('CreateRoomSchema', () => {
    it('should exclude auto-generated fields', () => {
      const createInput = {
        propertyId: '123e4567-e89b-12d3-a456-426614174001',
        number: 'A101',
        type: 'Single' as const,
        size: 250,
        monthlyRent: 800,
        deposit: 1600
      }
      
      expect(() => CreateRoomSchema.parse(createInput)).not.toThrow()
    })

    it('should reject input with id field', () => {
      const invalidInput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        propertyId: '123e4567-e89b-12d3-a456-426614174001',
        number: 'A101',
        type: 'Single' as const,
        size: 250,
        monthlyRent: 800,
        deposit: 1600
      }
      
      expect(() => CreateRoomSchema.parse(invalidInput)).toThrow()
    })
  })

  describe('UpdateRoomSchema', () => {
    it('should require id field', () => {
      const updateInput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        monthlyRent: 850
      }
      
      expect(() => UpdateRoomSchema.parse(updateInput)).not.toThrow()
    })

    it('should reject input without id field', () => {
      const invalidInput = {
        monthlyRent: 850
      }
      
      expect(() => UpdateRoomSchema.parse(invalidInput)).toThrow()
    })

    it('should allow partial updates', () => {
      const updateInput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        condition: 'Excellent' as const
      }
      
      expect(() => UpdateRoomSchema.parse(updateInput)).not.toThrow()
    })
  })

  describe('OccupancyRecordSchema', () => {
    const validOccupancyRecord: Omit<OccupancyRecord, 'deletedAt'> & { endDate?: Date | null } = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      roomId: '123e4567-e89b-12d3-a456-426614174001',
      tenantId: '123e4567-e89b-12d3-a456-426614174002',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      monthlyRent: 800,
      status: 'Current' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    it('should validate a complete valid occupancy record', () => {
      expect(() => OccupancyRecordSchema.parse(validOccupancyRecord)).not.toThrow()
    })

    it('should require positive monthly rent', () => {
      const invalidRecord = { ...validOccupancyRecord, monthlyRent: 0 }
      expect(() => OccupancyRecordSchema.parse(invalidRecord)).toThrow()
    })

    it('should allow optional endDate', () => {
      const recordWithoutEndDate = { ...validOccupancyRecord }
      delete recordWithoutEndDate.endDate
      expect(() => OccupancyRecordSchema.parse(recordWithoutEndDate)).not.toThrow()
    })
  })

  describe('MaintenanceRecordSchema', () => {
    const validMaintenanceRecord: Omit<MaintenanceRecord, 'deletedAt' | 'scheduledDate' | 'completedDate' | 'notes'> & { priority?: any; status?: any; cost?: number } = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      roomId: '123e4567-e89b-12d3-a456-426614174001',
      propertyId: '123e4567-e89b-12d3-a456-426614174002',
      title: 'Fix leaky faucet',
      description: 'Bathroom faucet is dripping',
      priority: 'Medium' as const,
      status: 'Pending' as const,
      reportedDate: new Date('2024-01-15'),
      cost: 150,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    it('should validate a complete valid maintenance record', () => {
      expect(() => MaintenanceRecordSchema.parse(validMaintenanceRecord)).not.toThrow()
    })

    it('should require non-empty title', () => {
      const invalidRecord = { ...validMaintenanceRecord, title: '' }
      expect(() => MaintenanceRecordSchema.parse(invalidRecord)).toThrow()
    })

    it('should require non-negative cost when provided', () => {
      const invalidRecord = { ...validMaintenanceRecord, cost: -50 }
      expect(() => MaintenanceRecordSchema.parse(invalidRecord)).toThrow()
    })

    it('should default priority to Medium', () => {
      const recordWithoutPriority = { ...validMaintenanceRecord }
      delete recordWithoutPriority.priority
      const parsed = MaintenanceRecordSchema.parse(recordWithoutPriority)
      expect(parsed.priority).toBe('Medium')
    })

    it('should default status to Pending', () => {
      const recordWithoutStatus = { ...validMaintenanceRecord }
      delete recordWithoutStatus.status
      const parsed = MaintenanceRecordSchema.parse(recordWithoutStatus)
      expect(parsed.status).toBe('Pending')
    })
  })

  describe('PropertyAnalyticsSchema', () => {
    const validAnalytics = {
      propertyId: '123e4567-e89b-12d3-a456-426614174000',
      totalRooms: 10,
      occupiedRooms: 8,
      availableRooms: 2,
      occupancyRate: 0.8,
      averageMonthlyRent: 750,
      totalMonthlyRevenue: 6000,
      averageOccupancyDuration: 180,
      maintenanceRequestsCount: 5,
      calculatedAt: new Date()
    }

    it('should validate complete valid analytics', () => {
      expect(() => PropertyAnalyticsSchema.parse(validAnalytics)).not.toThrow()
    })

    it('should require occupancy rate between 0 and 1', () => {
      const invalidAnalytics1 = { ...validAnalytics, occupancyRate: -0.1 }
      const invalidAnalytics2 = { ...validAnalytics, occupancyRate: 1.1 }
      
      expect(() => PropertyAnalyticsSchema.parse(invalidAnalytics1)).toThrow()
      expect(() => PropertyAnalyticsSchema.parse(invalidAnalytics2)).toThrow()
    })

    it('should require non-negative values for counts and amounts', () => {
      const fields = ['totalRooms', 'occupiedRooms', 'availableRooms', 'averageMonthlyRent', 'totalMonthlyRevenue', 'averageOccupancyDuration', 'maintenanceRequestsCount']
      
      fields.forEach(field => {
        const invalidAnalytics = { ...validAnalytics, [field]: -1 }
        expect(() => PropertyAnalyticsSchema.parse(invalidAnalytics)).toThrow()
      })
    })
  })

  describe('PropertyDetailsSchema', () => {
    const validPropertyDetails: Omit<PropertyDetails, 'deletedAt' | 'analytics'> & { rooms?: any[]; occupancyHistory?: any[]; maintenanceRecords?: any[]; } = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Sunset Villa',
      address: {
        street: '123 Main St',
        city: 'Da Nang',
        state: 'Central Vietnam',
        postalCode: '550000',
        country: 'Vietnam'
      },
      roomCount: 5,
      settings: {
        allowPets: true,
        smokingAllowed: false,
        maxOccupancy: 10,
        checkInTime: '15:00',
        checkOutTime: '11:00',
        wifiPassword: 'password123',
        parkingAvailable: true
      },
      houseRules: ['No smoking', 'Quiet hours 10pm-7am'],
      ownerId: '123e4567-e89b-12d3-a456-426614174001',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      rooms: [],
      occupancyHistory: [],
      maintenanceRecords: []
    }

    it('should validate complete valid property details', () => {
      expect(() => PropertyDetailsSchema.parse(validPropertyDetails)).not.toThrow()
    })

    it('should require positive room count', () => {
      const invalidProperty = { ...validPropertyDetails, roomCount: 0 }
      expect(() => PropertyDetailsSchema.parse(invalidProperty)).toThrow()
    })

    it('should require positive max occupancy', () => {
      const invalidProperty = { 
        ...validPropertyDetails, 
        settings: { ...validPropertyDetails.settings, maxOccupancy: 0 }
      }
      expect(() => PropertyDetailsSchema.parse(invalidProperty)).toThrow()
    })

    it('should default arrays to empty when not provided', () => {
      const propertyWithoutArrays = { ...validPropertyDetails }
      delete propertyWithoutArrays.rooms
      delete propertyWithoutArrays.occupancyHistory
      delete propertyWithoutArrays.maintenanceRecords
      
      const parsed = PropertyDetailsSchema.parse(propertyWithoutArrays)
      expect(parsed.rooms).toEqual([])
      expect(parsed.occupancyHistory).toEqual([])
      expect(parsed.maintenanceRecords).toEqual([])
    })
  })
})
