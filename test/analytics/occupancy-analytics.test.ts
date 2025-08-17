import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculatePropertyAnalytics,
  getRoomOccupancyHistory,
  createOccupancyRecord,
  updateOccupancyRecord
} from '../../lib/db/operations/rooms'
import type {
  PropertyAnalytics,
  OccupancyRecord,
  CreateOccupancyRecordInput,
  UpdateOccupancyRecordInput,
  Room
} from '../../lib/db/models/room'

// Mock Redis database
vi.mock('../../lib/db/index', () => ({
  db: {
    pipeline: vi.fn(() => ({
      hset: vi.fn(),
      sadd: vi.fn(),
      srem: vi.fn(),
      exec: vi.fn()
    })),
    hgetall: vi.fn(),
    hset: vi.fn(),
    smembers: vi.fn(),
    sadd: vi.fn(),
    srem: vi.fn()
  }
}))

// Mock UUID generation
vi.mock('uuid', () => ({
  v4: vi.fn(() => '123e4567-e89b-12d3-a456-426614174000')
}))

import { db } from '../../lib/db/index'

describe('Occupancy Tracking and Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Occupancy Record Management', () => {
    const validOccupancyInput: CreateOccupancyRecordInput = {
      roomId: '123e4567-e89b-12d3-a456-426614174001',
      tenantId: '123e4567-e89b-12d3-a456-426614174002',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      monthlyRent: 800,
      status: 'Current'
    }

    it('should create occupancy record with correct data', async () => {
      const mockPipeline = {
        hset: vi.fn(),
        sadd: vi.fn(),
        exec: vi.fn().mockResolvedValue([])
      }
      vi.mocked(db.pipeline).mockReturnValue(mockPipeline as any)

      const result = await createOccupancyRecord(validOccupancyInput)

      expect(result).toMatchObject({
        ...validOccupancyInput,
        id: '123e4567-e89b-12d3-a456-426614174000'
      })
      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.updatedAt).toBeInstanceOf(Date)
    })

    it('should handle occupancy records without end date (current tenants)', async () => {
      const currentOccupancyInput = {
        ...validOccupancyInput,
        endDate: undefined,
        status: 'Current' as const
      }

      const mockPipeline = {
        hset: vi.fn(),
        sadd: vi.fn(),
        exec: vi.fn().mockResolvedValue([])
      }
      vi.mocked(db.pipeline).mockReturnValue(mockPipeline as any)

      const result = await createOccupancyRecord(currentOccupancyInput)

      expect(result.endDate).toBeUndefined()
      expect(result.status).toBe('Current')
    })

    it('should retrieve room occupancy history sorted by date', async () => {
      const mockOccupancyIds = ['occ-1', 'occ-2', 'occ-3']
      vi.mocked(db.smembers).mockResolvedValue(mockOccupancyIds)

      // Mock occupancy records with different dates
      vi.mocked(db.hgetall)
        .mockResolvedValueOnce({
          id: 'occ-1',
          roomId: 'room-1',
          tenantId: 'tenant-1',
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-06-30T00:00:00.000Z',
          monthlyRent: '800',
          status: 'Past',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-06-30T00:00:00.000Z'
        })
        .mockResolvedValueOnce({
          id: 'occ-2',
          roomId: 'room-1',
          tenantId: 'tenant-2',
          startDate: '2024-07-01T00:00:00.000Z',
          endDate: '',
          monthlyRent: '850',
          status: 'Current',
          createdAt: '2024-07-01T00:00:00.000Z',
          updatedAt: '2024-07-01T00:00:00.000Z'
        })
        .mockResolvedValueOnce({
          id: 'occ-3',
          roomId: 'room-1',
          tenantId: 'tenant-3',
          startDate: '2023-06-01T00:00:00.000Z',
          endDate: '2023-12-31T00:00:00.000Z',
          monthlyRent: '750',
          status: 'Past',
          createdAt: '2023-06-01T00:00:00.000Z',
          updatedAt: '2023-12-31T00:00:00.000Z'
        })

      const result = await getRoomOccupancyHistory('room-1')

      expect(result).toHaveLength(3)
      // Should be sorted by start date, newest first
      expect(result[0].startDate.getFullYear()).toBe(2024)
      expect(result[0].startDate.getMonth()).toBe(6) // July (0-indexed)
      expect(result[1].startDate.getFullYear()).toBe(2024)
      expect(result[1].startDate.getMonth()).toBe(0) // January
      expect(result[2].startDate.getFullYear()).toBe(2023)
    })

    it('should filter out soft-deleted occupancy records', async () => {
      const mockOccupancyIds = ['occ-1', 'occ-2']
      vi.mocked(db.smembers).mockResolvedValue(mockOccupancyIds)

      vi.mocked(db.hgetall)
        .mockResolvedValueOnce({
          id: 'occ-1',
          roomId: 'room-1',
          tenantId: 'tenant-1',
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-06-30T00:00:00.000Z',
          monthlyRent: '800',
          status: 'Past',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-06-30T00:00:00.000Z'
        })
        .mockResolvedValueOnce({
          id: 'occ-2',
          deletedAt: '2024-07-01T00:00:00.000Z' // Soft deleted
        })

      const result = await getRoomOccupancyHistory('room-1')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('occ-1')
    })
  })

  describe('Property Analytics Calculations', () => {
    it('should calculate comprehensive property analytics', async () => {
      // Mock property rooms
      const mockRooms: Room[] = [
        {
          id: 'room-1',
          propertyId: 'property-1',
          number: 'A101',
          type: 'Single',
          size: 250,
          monthlyRent: 800,
          deposit: 1600,
          isAvailable: false, // Occupied
          condition: 'Good',
          features: [],
          photos: [],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'room-2',
          propertyId: 'property-1',
          number: 'A102',
          type: 'Double',
          size: 300,
          monthlyRent: 1000,
          deposit: 2000,
          isAvailable: true, // Available
          condition: 'Good',
          features: [],
          photos: [],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'room-3',
          propertyId: 'property-1',
          number: 'A103',
          type: 'Single',
          size: 275,
          monthlyRent: 900,
          deposit: 1800,
          isAvailable: false, // Occupied
          condition: 'Excellent',
          features: [],
          photos: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      // Mock getPropertyRooms
      vi.mocked(db.smembers).mockResolvedValueOnce(['room-1', 'room-2', 'room-3'])
      vi.mocked(db.hgetall)
        .mockResolvedValueOnce({
          id: 'room-1',
          propertyId: 'property-1',
          monthlyRent: '800',
          isAvailable: 'false',
          features: '[]',
          photos: '[]',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          lastInspection: '',
          size: '250',
          deposit: '1600',
          condition: 'Good',
          type: 'Single',
          number: 'A101'
        })
        .mockResolvedValueOnce({
          id: 'room-2',
          propertyId: 'property-1',
          monthlyRent: '1000',
          isAvailable: 'true',
          features: '[]',
          photos: '[]',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          lastInspection: '',
          size: '300',
          deposit: '2000',
          condition: 'Good',
          type: 'Double',
          number: 'A102'
        })
        .mockResolvedValueOnce({
          id: 'room-3',
          propertyId: 'property-1',
          monthlyRent: '900',
          isAvailable: 'false',
          features: '[]',
          photos: '[]',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          lastInspection: '',
          size: '275',
          deposit: '1800',
          condition: 'Excellent',
          type: 'Single',
          number: 'A103'
        })

      // Mock maintenance records
      vi.mocked(db.smembers).mockResolvedValueOnce(['maint-1', 'maint-2'])
      vi.mocked(db.hgetall)
        .mockResolvedValueOnce({
          id: 'maint-1',
          title: 'Fix faucet',
          reportedDate: '2024-01-01T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        })
        .mockResolvedValueOnce({
          id: 'maint-2',
          title: 'Replace light',
          reportedDate: '2024-01-02T00:00:00.000Z',
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z'
        })

      // Mock occupancy history for average duration calculation
      vi.mocked(db.smembers)
        .mockResolvedValueOnce(['occ-1']) // room-1 occupancy
        .mockResolvedValueOnce([]) // room-2 occupancy (empty)
        .mockResolvedValueOnce(['occ-2']) // room-3 occupancy

      vi.mocked(db.hgetall)
        .mockResolvedValueOnce({
          id: 'occ-1',
          roomId: 'room-1',
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-06-30T00:00:00.000Z', // 6 months = ~181 days
          status: 'Past',
          monthlyRent: '800',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-06-30T00:00:00.000Z'
        })
        .mockResolvedValueOnce({
          id: 'occ-2',
          roomId: 'room-3',
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-03-31T00:00:00.000Z', // 3 months = ~90 days
          status: 'Past',
          monthlyRent: '900',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-03-31T00:00:00.000Z'
        })

      const result = await calculatePropertyAnalytics('property-1')

      expect(result).toMatchObject({
        propertyId: 'property-1',
        totalRooms: 3,
        occupiedRooms: 2,
        availableRooms: 1,
        occupancyRate: 2/3,
        averageMonthlyRent: (800 + 1000 + 900) / 3, // 900
        totalMonthlyRevenue: 800 + 900, // Only occupied rooms: 1700
        maintenanceRequestsCount: 2
      })

      expect(result.averageOccupancyDuration).toBeGreaterThan(0)
      expect(result.calculatedAt).toBeInstanceOf(Date)
    })

    it('should handle properties with no rooms', async () => {
      vi.mocked(db.smembers).mockResolvedValueOnce([]) // No rooms
      vi.mocked(db.smembers).mockResolvedValueOnce([]) // No maintenance

      const result = await calculatePropertyAnalytics('empty-property')

      expect(result).toMatchObject({
        propertyId: 'empty-property',
        totalRooms: 0,
        occupiedRooms: 0,
        availableRooms: 0,
        occupancyRate: 0,
        averageMonthlyRent: 0,
        totalMonthlyRevenue: 0,
        averageOccupancyDuration: 0,
        maintenanceRequestsCount: 0
      })
    })

    it('should calculate occupancy rate correctly for fully occupied property', async () => {
      // Mock 2 rooms, both occupied
      vi.mocked(db.smembers).mockResolvedValueOnce(['room-1', 'room-2'])
      vi.mocked(db.hgetall)
        .mockResolvedValueOnce({
          id: 'room-1',
          propertyId: 'property-1',
          monthlyRent: '800',
          isAvailable: 'false', // Occupied
          features: '[]',
          photos: '[]',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          lastInspection: '',
          size: '250',
          deposit: '1600',
          condition: 'Good',
          type: 'Single',
          number: 'A101'
        })
        .mockResolvedValueOnce({
          id: 'room-2',
          propertyId: 'property-1',
          monthlyRent: '1000',
          isAvailable: 'false', // Occupied
          features: '[]',
          photos: '[]',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          lastInspection: '',
          size: '300',
          deposit: '2000',
          condition: 'Good',
          type: 'Double',
          number: 'A102'
        })

      // Mock empty maintenance and occupancy
      vi.mocked(db.smembers).mockResolvedValue([])

      const result = await calculatePropertyAnalytics('property-1')

      expect(result.occupancyRate).toBe(1.0) // 100% occupied
      expect(result.totalRooms).toBe(2)
      expect(result.occupiedRooms).toBe(2)
      expect(result.availableRooms).toBe(0)
    })

    it('should calculate average occupancy duration from historical data', async () => {
      // Mock single room
      vi.mocked(db.smembers).mockResolvedValueOnce(['room-1'])
      vi.mocked(db.hgetall).mockResolvedValueOnce({
        id: 'room-1',
        propertyId: 'property-1',
        monthlyRent: '800',
        isAvailable: 'true',
        features: '[]',
        photos: '[]',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastInspection: '',
        size: '250',
        deposit: '1600',
        condition: 'Good',
        type: 'Single',
        number: 'A101'
      })

      // Mock maintenance (empty)
      vi.mocked(db.smembers).mockResolvedValueOnce([])

      // Mock occupancy history with multiple completed stays
      vi.mocked(db.smembers).mockResolvedValueOnce(['occ-1', 'occ-2', 'occ-3'])
      vi.mocked(db.hgetall)
        .mockResolvedValueOnce({
          id: 'occ-1',
          roomId: 'room-1',
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-04-01T00:00:00.000Z', // 3 months = ~90 days
          status: 'Past',
          monthlyRent: '800',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-04-01T00:00:00.000Z'
        })
        .mockResolvedValueOnce({
          id: 'occ-2',
          roomId: 'room-1',
          startDate: '2024-05-01T00:00:00.000Z',
          endDate: '2024-11-01T00:00:00.000Z', // 6 months = ~184 days
          status: 'Past',
          monthlyRent: '800',
          createdAt: '2024-05-01T00:00:00.000Z',
          updatedAt: '2024-11-01T00:00:00.000Z'
        })
        .mockResolvedValueOnce({
          id: 'occ-3',
          roomId: 'room-1',
          startDate: '2024-12-01T00:00:00.000Z',
          endDate: '', // Current occupancy, should be ignored
          status: 'Current',
          monthlyRent: '800',
          createdAt: '2024-12-01T00:00:00.000Z',
          updatedAt: '2024-12-01T00:00:00.000Z'
        })

      const result = await calculatePropertyAnalytics('property-1')

      // Should average the two completed occupancies: (90 + 184) / 2 = 137 days
      expect(result.averageOccupancyDuration).toBeCloseTo(137, 0)
    })
  })

  describe('Occupancy Forecasting', () => {
    it('should identify upcoming vacancies based on lease end dates', async () => {
      const mockOccupancyRecords: OccupancyRecord[] = [
        {
          id: 'occ-1',
          roomId: 'room-1',
          tenantId: 'tenant-1',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-30'), // Ending soon
          monthlyRent: 800,
          status: 'Current',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'occ-2',
          roomId: 'room-2',
          tenantId: 'tenant-2',
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-12-31'), // Ending later
          monthlyRent: 1000,
          status: 'Current',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      // Function to identify upcoming vacancies (within next 60 days)
      const getUpcomingVacancies = (occupancyRecords: OccupancyRecord[], daysAhead: number = 60) => {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() + daysAhead)

        return occupancyRecords.filter(record => 
          record.status === 'Current' && 
          record.endDate && 
          record.endDate <= cutoffDate
        )
      }

      const upcomingVacancies = getUpcomingVacancies(mockOccupancyRecords, 365) // Check within 1 year

      expect(upcomingVacancies).toHaveLength(2)
      expect(upcomingVacancies[0].roomId).toBe('room-1')
      expect(upcomingVacancies[1].roomId).toBe('room-2')
    })

    it('should calculate revenue impact of upcoming vacancies', () => {
      const mockOccupancyRecords: OccupancyRecord[] = [
        {
          id: 'occ-1',
          roomId: 'room-1',
          tenantId: 'tenant-1',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-30'),
          monthlyRent: 800,
          status: 'Current',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'occ-2',
          roomId: 'room-2',
          tenantId: 'tenant-2',
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-12-31'),
          monthlyRent: 1000,
          status: 'Current',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      const calculateRevenueImpact = (occupancyRecords: OccupancyRecord[]) => {
        return occupancyRecords.reduce((total, record) => {
          if (record.status === 'Current' && record.endDate) {
            return total + record.monthlyRent
          }
          return total
        }, 0)
      }

      const revenueAtRisk = calculateRevenueImpact(mockOccupancyRecords)

      expect(revenueAtRisk).toBe(1800) // 800 + 1000
    })
  })

  describe('Seasonal Occupancy Analysis', () => {
    it('should analyze occupancy patterns by month', () => {
      const mockOccupancyRecords: OccupancyRecord[] = [
        {
          id: 'occ-1',
          roomId: 'room-1',
          tenantId: 'tenant-1',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-03-31'),
          monthlyRent: 800,
          status: 'Past',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'occ-2',
          roomId: 'room-1',
          tenantId: 'tenant-2',
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-08-31'),
          monthlyRent: 850,
          status: 'Past',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      const analyzeSeasonalPatterns = (occupancyRecords: OccupancyRecord[]) => {
        const monthlyOccupancy: { [key: number]: number } = {}

        occupancyRecords.forEach(record => {
          const startMonth = record.startDate.getMonth()
          const endMonth = record.endDate ? record.endDate.getMonth() : 11

          for (let month = startMonth; month <= endMonth; month++) {
            monthlyOccupancy[month] = (monthlyOccupancy[month] || 0) + 1
          }
        })

        return monthlyOccupancy
      }

      const seasonalData = analyzeSeasonalPatterns(mockOccupancyRecords)

      expect(seasonalData[0]).toBe(1) // January
      expect(seasonalData[1]).toBe(1) // February
      expect(seasonalData[2]).toBe(1) // March
      expect(seasonalData[5]).toBe(1) // June
      expect(seasonalData[6]).toBe(1) // July
      expect(seasonalData[7]).toBe(1) // August
    })
  })
})
