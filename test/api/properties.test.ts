import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getPropertyRooms, POST as createPropertyRoom } from '../../app/api/properties/[id]/rooms/route'
import { GET as getProperty } from '../../app/api/properties/[id]/route'
import { GET as getPropertyAnalytics } from '../../app/api/properties/[id]/analytics/route'
import { GET as getRoomDetails, PATCH as updateRoom } from '../../app/api/rooms/[id]/route'
import { GET as getRoomOccupancy } from '../../app/api/rooms/[id]/occupancy/route'

// Mock the database operations
vi.mock('../../lib/db/operations/rooms', () => ({
  getPropertyRooms: vi.fn(),
  createRoom: vi.fn(),
  getRoom: vi.fn(),
  updateRoom: vi.fn(),
  getRoomOccupancyHistory: vi.fn(),
  calculatePropertyAnalytics: vi.fn()
}))

vi.mock('../../lib/db/operations/properties', () => ({
  getProperty: vi.fn()
}))

import { 
  getPropertyRooms as mockGetPropertyRooms,
  createRoom as mockCreateRoom,
  getRoom as mockGetRoom,
  updateRoom as mockUpdateRoom,
  getRoomOccupancyHistory as mockGetRoomOccupancyHistory,
  calculatePropertyAnalytics as mockCalculatePropertyAnalytics
} from '../../lib/db/operations/rooms'

import { getProperty as mockGetProperty } from '../../lib/db/operations/properties'

describe('Property Management API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/properties/[id]/rooms', () => {
    it('should return rooms for valid property', async () => {
      const mockProperty = {
        id: 'property-1',
        name: 'Test Property',
        ownerId: 'owner-1',
        isActive: true
      }

      const mockRooms = [
        {
          id: 'room-1',
          propertyId: 'property-1',
          number: 'A101',
          type: 'Single',
          size: 250,
          monthlyRent: 800,
          deposit: 1600,
          isAvailable: true,
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
          isAvailable: false,
          condition: 'Good',
          features: [],
          photos: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      vi.mocked(mockGetProperty).mockResolvedValue(mockProperty as any)
      vi.mocked(mockGetPropertyRooms).mockResolvedValue(mockRooms as any)

      const request = new NextRequest('http://localhost/api/properties/property-1/rooms')
      const response = await getPropertyRooms(request, { params: { id: 'property-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.rooms).toHaveLength(2)
      expect(data.rooms[0].number).toBe('A101')
      expect(data.rooms[1].number).toBe('A102')
    })

    it('should return 404 for non-existent property', async () => {
      vi.mocked(mockGetProperty).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/properties/nonexistent/rooms')
      const response = await getPropertyRooms(request, { params: { id: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Property not found')
    })

    it('should handle database errors', async () => {
      vi.mocked(mockGetProperty).mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/properties/property-1/rooms')
      const response = await getPropertyRooms(request, { params: { id: 'property-1' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch rooms')
    })
  })

  describe('POST /api/properties/[id]/rooms', () => {
    it('should create room for valid property', async () => {
      const mockProperty = {
        id: 'property-1',
        name: 'Test Property',
        ownerId: 'owner-1',
        isActive: true
      }

      const roomInput = {
        number: 'A103',
        type: 'Single',
        size: 250,
        monthlyRent: 800,
        deposit: 1600,
        isAvailable: true,
        condition: 'Good',
        features: ['Air Conditioning'],
        photos: []
      }

      const mockCreatedRoom = {
        id: 'room-3',
        propertyId: 'property-1',
        ...roomInput,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(mockGetProperty).mockResolvedValue(mockProperty as any)
      vi.mocked(mockCreateRoom).mockResolvedValue(mockCreatedRoom as any)

      const request = new NextRequest('http://localhost/api/properties/property-1/rooms', {
        method: 'POST',
        body: JSON.stringify(roomInput)
      })
      
      const response = await createPropertyRoom(request, { params: { id: 'property-1' } })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.room.id).toBe('room-3')
      expect(data.room.number).toBe('A103')
      expect(data.room.propertyId).toBe('property-1')
    })

    it('should return 404 for non-existent property', async () => {
      vi.mocked(mockGetProperty).mockResolvedValue(null)

      const roomInput = {
        number: 'A103',
        type: 'Single',
        size: 250,
        monthlyRent: 800,
        deposit: 1600
      }

      const request = new NextRequest('http://localhost/api/properties/nonexistent/rooms', {
        method: 'POST',
        body: JSON.stringify(roomInput)
      })
      
      const response = await createPropertyRoom(request, { params: { id: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Property not found')
    })

    it('should return 400 for invalid room data', async () => {
      const mockProperty = {
        id: 'property-1',
        name: 'Test Property',
        ownerId: 'owner-1',
        isActive: true
      }

      vi.mocked(mockGetProperty).mockResolvedValue(mockProperty as any)

      const invalidRoomInput = {
        number: '', // Invalid: empty number
        type: 'Single',
        size: -10, // Invalid: negative size
        monthlyRent: 800,
        deposit: 1600
      }

      const request = new NextRequest('http://localhost/api/properties/property-1/rooms', {
        method: 'POST',
        body: JSON.stringify(invalidRoomInput)
      })
      
      const response = await createPropertyRoom(request, { params: { id: 'property-1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid room data')
    })
  })

  describe('GET /api/rooms/[id]', () => {
    it('should return room details for valid room', async () => {
      const mockRoom = {
        id: 'room-1',
        propertyId: 'property-1',
        number: 'A101',
        type: 'Single',
        size: 250,
        monthlyRent: 800,
        deposit: 1600,
        isAvailable: true,
        condition: 'Good',
        features: ['Air Conditioning'],
        photos: ['photo1.jpg'],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(mockGetRoom).mockResolvedValue(mockRoom as any)

      const request = new NextRequest('http://localhost/api/rooms/room-1')
      const response = await getRoomDetails(request, { params: { id: 'room-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.room.id).toBe('room-1')
      expect(data.room.number).toBe('A101')
    })

    it('should return 404 for non-existent room', async () => {
      vi.mocked(mockGetRoom).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/rooms/nonexistent')
      const response = await getRoomDetails(request, { params: { id: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Room not found')
    })
  })

  describe('PATCH /api/rooms/[id]', () => {
    it('should update room successfully', async () => {
      const mockUpdatedRoom = {
        id: 'room-1',
        propertyId: 'property-1',
        number: 'A101',
        type: 'Single',
        size: 250,
        monthlyRent: 850, // Updated
        deposit: 1600,
        isAvailable: false, // Updated
        condition: 'Excellent', // Updated
        features: ['Air Conditioning'],
        photos: ['photo1.jpg'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date()
      }

      vi.mocked(mockUpdateRoom).mockResolvedValue(mockUpdatedRoom as any)

      const updateData = {
        monthlyRent: 850,
        isAvailable: false,
        condition: 'Excellent'
      }

      const request = new NextRequest('http://localhost/api/rooms/room-1', {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      })
      
      const response = await updateRoom(request, { params: { id: 'room-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.room.monthlyRent).toBe(850)
      expect(data.room.isAvailable).toBe(false)
      expect(data.room.condition).toBe('Excellent')
    })

    it('should return 400 for invalid update data', async () => {
      const invalidUpdateData = {
        monthlyRent: -100 // Invalid: negative rent
      }

      const request = new NextRequest('http://localhost/api/rooms/room-1', {
        method: 'PATCH',
        body: JSON.stringify(invalidUpdateData)
      })
      
      const response = await updateRoom(request, { params: { id: 'room-1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid room data')
    })
  })

  describe('GET /api/rooms/[id]/occupancy', () => {
    it('should return room occupancy history', async () => {
      const mockOccupancyHistory = [
        {
          id: 'occupancy-1',
          roomId: 'room-1',
          tenantId: 'tenant-1',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-30'),
          monthlyRent: 800,
          status: 'Past',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'occupancy-2',
          roomId: 'room-1',
          tenantId: 'tenant-2',
          startDate: new Date('2024-07-01'),
          endDate: undefined,
          monthlyRent: 850,
          status: 'Current',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      vi.mocked(mockGetRoomOccupancyHistory).mockResolvedValue(mockOccupancyHistory as any)

      const request = new NextRequest('http://localhost/api/rooms/room-1/occupancy')
      const response = await getRoomOccupancy(request, { params: { id: 'room-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.occupancyHistory).toHaveLength(2)
      expect(data.occupancyHistory[0].status).toBe('Past')
      expect(data.occupancyHistory[1].status).toBe('Current')
    })

    it('should return empty array for room with no occupancy history', async () => {
      vi.mocked(mockGetRoomOccupancyHistory).mockResolvedValue([])

      const request = new NextRequest('http://localhost/api/rooms/room-1/occupancy')
      const response = await getRoomOccupancy(request, { params: { id: 'room-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.occupancyHistory).toEqual([])
    })
  })

  describe('GET /api/properties/[id]/analytics', () => {
    it('should return property analytics', async () => {
      const mockAnalytics = {
        propertyId: 'property-1',
        totalRooms: 5,
        occupiedRooms: 4,
        availableRooms: 1,
        occupancyRate: 0.8,
        averageMonthlyRent: 850,
        totalMonthlyRevenue: 3400,
        averageOccupancyDuration: 180,
        maintenanceRequestsCount: 3,
        calculatedAt: new Date()
      }

      vi.mocked(mockCalculatePropertyAnalytics).mockResolvedValue(mockAnalytics as any)

      const request = new NextRequest('http://localhost/api/properties/property-1/analytics')
      const response = await getPropertyAnalytics(request, { params: { id: 'property-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.analytics.propertyId).toBe('property-1')
      expect(data.analytics.totalRooms).toBe(5)
      expect(data.analytics.occupancyRate).toBe(0.8)
      expect(data.analytics.totalMonthlyRevenue).toBe(3400)
    })

    it('should handle analytics calculation errors', async () => {
      vi.mocked(mockCalculatePropertyAnalytics).mockRejectedValue(new Error('Calculation error'))

      const request = new NextRequest('http://localhost/api/properties/property-1/analytics')
      const response = await getPropertyAnalytics(request, { params: { id: 'property-1' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to calculate analytics')
    })
  })
})
