import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createRoom,
  getRoom,
  updateRoom,
  getPropertyRooms,
  getAvailableRooms,
  deleteRoom,
  createOccupancyRecord,
  getRoomOccupancyHistory,
  createMaintenanceRecord,
  getPropertyMaintenanceRecords,
  calculatePropertyAnalytics
} from '../../lib/db/operations/rooms'
import type {
  CreateRoomInput,
  UpdateRoomInput,
  CreateOccupancyRecordInput,
  CreateMaintenanceRecordInput
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

import { kv as db } from '@vercel/kv'

describe('Room Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createRoom', () => {
    const validCreateInput: CreateRoomInput = {
      propertyId: '123e4567-e89b-12d3-a456-426614174001',
      number: 'A101',
      type: 'Single',
      size: 250,
      features: ['Air Conditioning', 'Private Bathroom'],
      monthlyRent: 800,
      deposit: 1600,
      isAvailable: true,
      condition: 'Good',
      photos: ['photo1.jpg']
    }

    it('should create a room successfully', async () => {
      const mockPipeline = {
        hset: vi.fn(),
        sadd: vi.fn(),
        exec: vi.fn().mockResolvedValue([])
      }
      vi.mocked(db.pipeline).mockReturnValue(mockPipeline as any)

      const result = await createRoom(validCreateInput)

      expect(result).toMatchObject({
        ...validCreateInput,
        id: '123e4567-e89b-12d3-a456-426614174000'
      })
      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.updatedAt).toBeInstanceOf(Date)
      expect(mockPipeline.exec).toHaveBeenCalled()
    })

    it('should throw error for invalid input', async () => {
      const invalidInput = {
        ...validCreateInput,
        propertyId: 'invalid-uuid'
      }

      await expect(createRoom(invalidInput as any)).rejects.toThrow()
    })

    it('should add room to available rooms index when isAvailable is true', async () => {
      const mockPipeline = {
        hset: vi.fn(),
        sadd: vi.fn(),
        exec: vi.fn().mockResolvedValue([])
      }
      vi.mocked(db.pipeline).mockReturnValue(mockPipeline as any)

      await createRoom(validCreateInput)

      expect(mockPipeline.sadd).toHaveBeenCalledWith('rooms:available', '123e4567-e89b-12d3-a456-426614174000')
    })

    it('should not add room to available rooms index when isAvailable is false', async () => {
      const mockPipeline = {
        hset: vi.fn(),
        sadd: vi.fn(),
        exec: vi.fn().mockResolvedValue([])
      }
      vi.mocked(db.pipeline).mockReturnValue(mockPipeline as any)

      const unavailableRoomInput = { ...validCreateInput, isAvailable: false }
      await createRoom(unavailableRoomInput)

      expect(mockPipeline.sadd).not.toHaveBeenCalledWith('rooms:available', expect.any(String))
    })
  })

  describe('getRoom', () => {
    it('should return room when found', async () => {
      const mockRoomData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        propertyId: '123e4567-e89b-12d3-a456-426614174001',
        number: 'A101',
        type: 'Single',
        size: '250',
        monthlyRent: '800',
        deposit: '1600',
        isAvailable: 'true',
        condition: 'Good',
        features: '["Air Conditioning"]',
        photos: '["photo1.jpg"]',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastInspection: ''
      }

      vi.mocked(db.hgetall).mockResolvedValue(mockRoomData)

      const result = await getRoom('123e4567-e89b-12d3-a456-426614174000')

      expect(result).toMatchObject({
        id: '123e4567-e89b-12d3-a456-426614174000',
        propertyId: '123e4567-e89b-12d3-a456-426614174001',
        number: 'A101',
        type: 'Single',
        size: 250,
        monthlyRent: 800,
        deposit: 1600,
        isAvailable: true,
        condition: 'Good',
        features: ['Air Conditioning'],
        photos: ['photo1.jpg']
      })
      expect(result?.createdAt).toBeInstanceOf(Date)
      expect(result?.updatedAt).toBeInstanceOf(Date)
    })

    it('should return null when room not found', async () => {
      vi.mocked(db.hgetall).mockResolvedValue({})

      const result = await getRoom('nonexistent-id')

      expect(result).toBeNull()
    })

    it('should return null when room is soft deleted', async () => {
      const mockRoomData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        deletedAt: '2024-01-01T00:00:00.000Z'
      }

      vi.mocked(db.hgetall).mockResolvedValue(mockRoomData)

      const result = await getRoom('123e4567-e89b-12d3-a456-426614174000')

      expect(result).toBeNull()
    })
  })

  describe('updateRoom', () => {
    const mockExistingRoom = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      propertyId: '123e4567-e89b-12d3-a456-426614174001',
      number: 'A101',
      type: 'Single' as const,
      size: 250,
      features: ['Air Conditioning'],
      monthlyRent: 800,
      deposit: 1600,
      isAvailable: true,
      condition: 'Good' as const,
      photos: ['photo1.jpg'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }

    it('should update room successfully', async () => {
      // Mock getRoom to return existing room
      vi.mocked(db.hgetall).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        propertyId: '123e4567-e89b-12d3-a456-426614174001',
        number: 'A101',
        type: 'Single',
        size: '250',
        monthlyRent: '800',
        deposit: '1600',
        isAvailable: 'true',
        condition: 'Good',
        features: '["Air Conditioning"]',
        photos: '["photo1.jpg"]',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastInspection: ''
      })

      const updateInput: UpdateRoomInput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        monthlyRent: 850,
        condition: 'Excellent'
      }

      const result = await updateRoom(updateInput)

      expect(result).toMatchObject({
        ...mockExistingRoom,
        monthlyRent: 850,
        condition: 'Excellent'
      })
      expect(result?.updatedAt).toBeInstanceOf(Date)
      expect(vi.mocked(db.hset)).toHaveBeenCalled()
    })

    it('should throw error when room not found', async () => {
      vi.mocked(db.hgetall).mockResolvedValue({})

      const updateInput: UpdateRoomInput = {
        id: '123e4567-e89b-12d3-a456-426614174999',
        monthlyRent: 850
      }

      await expect(updateRoom(updateInput)).rejects.toThrow('Room not found')
    })

    it('should handle availability status changes', async () => {
      // Mock getRoom to return existing room
      vi.mocked(db.hgetall).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        propertyId: '123e4567-e89b-12d3-a456-426614174001',
        number: 'A101',
        type: 'Single',
        size: '250',
        monthlyRent: '800',
        deposit: '1600',
        isAvailable: 'true',
        condition: 'Good',
        features: '["Air Conditioning"]',
        photos: '["photo1.jpg"]',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastInspection: ''
      })

      const updateInput: UpdateRoomInput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        isAvailable: false
      }

      await updateRoom(updateInput)

      expect(vi.mocked(db.srem)).toHaveBeenCalledWith('rooms:available', '123e4567-e89b-12d3-a456-426614174000')
    })
  })

  describe('getPropertyRooms', () => {
    it('should return rooms for a property', async () => {
      const roomIds = ['room1', 'room2']
      vi.mocked(db.smembers).mockResolvedValue(roomIds)

      // Mock getRoom calls
      vi.mocked(db.hgetall)
        .mockResolvedValueOnce({
          id: 'room1',
          propertyId: 'property1',
          number: 'A101',
          type: 'Single',
          size: '250',
          monthlyRent: '800',
          deposit: '1600',
          isAvailable: 'true',
          condition: 'Good',
          features: '[]',
          photos: '[]',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          lastInspection: ''
        })
        .mockResolvedValueOnce({
          id: 'room2',
          propertyId: 'property1',
          number: 'A102',
          type: 'Double',
          size: '300',
          monthlyRent: '1000',
          deposit: '2000',
          isAvailable: 'false',
          condition: 'Good',
          features: '[]',
          photos: '[]',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          lastInspection: ''
        })

      const result = await getPropertyRooms('123e4567-e89b-12d3-a456-426614174001')

      expect(result).toHaveLength(2)
      expect(result[0].number).toBe('A101')
      expect(result[1].number).toBe('A102')
    })

    it('should return empty array when no rooms found', async () => {
      vi.mocked(db.smembers).mockResolvedValue([])

      const result = await getPropertyRooms('123e4567-e89b-12d3-a456-426614174001')

      expect(result).toEqual([])
    })
  })

  describe('deleteRoom', () => {
    it('should soft delete room successfully', async () => {
      // Mock getRoom to return existing room
      vi.mocked(db.hgetall).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        propertyId: '123e4567-e89b-12d3-a456-426614174001',
        number: 'A101',
        type: 'Single',
        size: '250',
        monthlyRent: '800',
        deposit: '1600',
        isAvailable: 'true',
        condition: 'Good',
        features: '[]',
        photos: '[]',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastInspection: ''
      })

      const result = await deleteRoom('123e4567-e89b-12d3-a456-426614174000')

      expect(result).toBe(true)
      expect(vi.mocked(db.hset)).toHaveBeenCalledWith(
        'room:123e4567-e89b-12d3-a456-426614174000',
        expect.objectContaining({
          deletedAt: expect.any(String),
          updatedAt: expect.any(String)
        })
      )
    })

    it('should return false when room not found', async () => {
      vi.mocked(db.hgetall).mockResolvedValue({})

      const result = await deleteRoom('nonexistent-id')

      expect(result).toBe(false)
    })
  })

  describe('createOccupancyRecord', () => {
    const validOccupancyInput: CreateOccupancyRecordInput = {
      roomId: '123e4567-e89b-12d3-a456-426614174001',
      tenantId: '123e4567-e89b-12d3-a456-426614174002',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      monthlyRent: 800,
      status: 'Current'
    }

    it('should create occupancy record successfully', async () => {
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
      expect(mockPipeline.exec).toHaveBeenCalled()
    })

    it('should throw error for invalid input', async () => {
      const invalidInput = {
        ...validOccupancyInput,
        monthlyRent: -100
      }

      await expect(createOccupancyRecord(invalidInput as any)).rejects.toThrow()
    })
  })

  describe('createMaintenanceRecord', () => {
    const validMaintenanceInput: CreateMaintenanceRecordInput = {
      roomId: '123e4567-e89b-12d3-a456-426614174001',
      propertyId: '123e4567-e89b-12d3-a456-426614174002',
      title: 'Fix leaky faucet',
      description: 'Bathroom faucet is dripping',
      priority: 'Medium',
      status: 'Pending',
      reportedDate: new Date('2024-01-15'),
      cost: 150
    }

    it('should create maintenance record successfully', async () => {
      const mockPipeline = {
        hset: vi.fn(),
        sadd: vi.fn(),
        exec: vi.fn().mockResolvedValue([])
      }
      vi.mocked(db.pipeline).mockReturnValue(mockPipeline as any)

      const result = await createMaintenanceRecord(validMaintenanceInput)

      expect(result).toMatchObject({
        ...validMaintenanceInput,
        id: '123e4567-e89b-12d3-a456-426614174000'
      })
      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.updatedAt).toBeInstanceOf(Date)
      expect(mockPipeline.exec).toHaveBeenCalled()
    })

    it('should throw error for invalid input', async () => {
      const invalidInput = {
        ...validMaintenanceInput,
        title: ''
      }

      await expect(createMaintenanceRecord(invalidInput as any)).rejects.toThrow()
    })
  })

  describe('calculatePropertyAnalytics', () => {
    it('should calculate analytics correctly', async () => {
      // Mock room IDs
      vi.mocked(db.smembers)
        .mockResolvedValueOnce(['room1', 'room2', 'room3']) // for rooms
        .mockResolvedValueOnce(['maintenance1', 'maintenance2']) // for maintenance
        .mockResolvedValue([]) // for occupancy history

      // Mock room details
      vi.mocked(db.hgetall)
        .mockResolvedValueOnce({
          id: 'room1',
          propertyId: '123e4567-e89b-12d3-a456-426614174001',
          monthlyRent: '800',
          isAvailable: 'false', // occupied
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
          id: 'room2',
          propertyId: '123e4567-e89b-12d3-a456-426614174001',
          monthlyRent: '1000',
          isAvailable: 'true', // available
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
          id: 'room3',
          propertyId: '123e4567-e89b-12d3-a456-426614174001',
          monthlyRent: '900',
          isAvailable: 'false', // occupied
          features: '[]',
          photos: '[]',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          lastInspection: '',
          size: '275',
          deposit: '1800',
          condition: 'Good',
          type: 'Single',
          number: 'A103'
        })
        .mockResolvedValueOnce({
          id: 'maintenance1',
          title: 'Fix faucet',
          reportedDate: '2024-01-01T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        })
        .mockResolvedValueOnce({
          id: 'maintenance2',
          title: 'Replace light',
          reportedDate: '2024-01-02T00:00:00.000Z',
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z'
        })

      const result = await calculatePropertyAnalytics('123e4567-e89b-12d3-a456-426614174001')

      expect(result).toMatchObject({
        propertyId: '123e4567-e89b-12d3-a456-426614174001',
        totalRooms: 3,
        occupiedRooms: 2,
        availableRooms: 1,
        occupancyRate: 2/3,
        averageMonthlyRent: (800 + 1000 + 900) / 3,
        totalMonthlyRevenue: 800 + 900, // only occupied rooms
        maintenanceRequestsCount: 2
      })
      expect(result.calculatedAt).toBeInstanceOf(Date)
    })
  })
})
