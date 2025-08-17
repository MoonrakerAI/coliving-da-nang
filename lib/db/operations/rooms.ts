import { db } from '../../db'
import { 
  Room, 
  CreateRoomInput, 
  UpdateRoomInput,
  RoomSchema,
  CreateRoomSchema,
  UpdateRoomSchema,
  OccupancyRecord,
  CreateOccupancyRecordInput,
  UpdateOccupancyRecordInput,
  OccupancyRecordSchema,
  CreateOccupancyRecordSchema,
  UpdateOccupancyRecordSchema,
  MaintenanceRecord,
  CreateMaintenanceRecordInput,
  UpdateMaintenanceRecordInput,
  MaintenanceRecordSchema,
  CreateMaintenanceRecordSchema,
  UpdateMaintenanceRecordSchema,
  PropertyAnalytics,
  PropertyAnalyticsSchema
} from '../models/room'
import { v4 as uuidv4 } from 'uuid'

// Generate Redis keys for room data
const getRoomKey = (id: string) => `room:${id}`
const getPropertyRoomsKey = (propertyId: string) => `property:${propertyId}:rooms`
const getAllRoomsKey = () => 'rooms:all'
const getAvailableRoomsKey = () => 'rooms:available'

// Generate Redis keys for occupancy data
const getOccupancyRecordKey = (id: string) => `occupancy:${id}`
const getRoomOccupancyKey = (roomId: string) => `room:${roomId}:occupancy`
const getTenantOccupancyKey = (tenantId: string) => `tenant:${tenantId}:occupancy`
const getAllOccupancyKey = () => 'occupancy:all'

// Generate Redis keys for maintenance data
const getMaintenanceRecordKey = (id: string) => `maintenance:${id}`
const getRoomMaintenanceKey = (roomId: string) => `room:${roomId}:maintenance`
const getPropertyMaintenanceKey = (propertyId: string) => `property:${propertyId}:maintenance`
const getAllMaintenanceKey = () => 'maintenance:all'

// ROOM OPERATIONS

// Create a new room
export async function createRoom(input: CreateRoomInput): Promise<Room> {
  try {
    // Validate input
    const validatedInput = CreateRoomSchema.parse(input)
    
    // Generate ID and timestamps
    const id = uuidv4()
    const now = new Date()
    
    const room: Room = {
      ...validatedInput,
      id,
      createdAt: now,
      updatedAt: now
    }

    // Validate complete room object
    const validatedRoom = RoomSchema.parse(room)

    // Store in Redis
    const roomKey = getRoomKey(id)
    const propertyRoomsKey = getPropertyRoomsKey(room.propertyId)
    const allRoomsKey = getAllRoomsKey()
    const availableRoomsKey = getAvailableRoomsKey()

    // Use pipeline for atomic operations
    const pipeline = db.pipeline()
    
    // Store room data as hash
    pipeline.hset(roomKey, {
      ...validatedRoom,
      createdAt: validatedRoom.createdAt.toISOString(),
      updatedAt: validatedRoom.updatedAt.toISOString(),
      lastInspection: validatedRoom.lastInspection?.toISOString() || '',
      features: JSON.stringify(validatedRoom.features),
      photos: JSON.stringify(validatedRoom.photos),
      isAvailable: validatedRoom.isAvailable.toString()
    })
    
    // Add to various indexes
    pipeline.sadd(propertyRoomsKey, id)
    pipeline.sadd(allRoomsKey, id)
    
    if (room.isAvailable) {
      pipeline.sadd(availableRoomsKey, id)
    }
    
    await pipeline.exec()

    return validatedRoom
  } catch (error) {
    console.error('Error creating room:', error)
    throw error
  }
}

// Get room by ID
export async function getRoom(id: string): Promise<Room | null> {
  try {
    const roomKey = getRoomKey(id)
    const data = await db.hgetall(roomKey)
    
    if (!data || Object.keys(data).length === 0) {
      return null
    }

    // Check for soft delete
    if (data.deletedAt) {
      return null
    }

    // Parse stored data back to proper types
    const room = {
      ...data,
      size: parseFloat(data.size),
      monthlyRent: parseFloat(data.monthlyRent),
      deposit: parseFloat(data.deposit),
      isAvailable: data.isAvailable === 'true',
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      lastInspection: data.lastInspection ? new Date(data.lastInspection) : undefined,
      features: JSON.parse(data.features),
      photos: JSON.parse(data.photos)
    }

    return RoomSchema.parse(room)
  } catch (error) {
    console.error('Error fetching room:', error)
    return null
  }
}

// Update room
export async function updateRoom(input: UpdateRoomInput): Promise<Room | null> {
  try {
    const validatedInput = UpdateRoomSchema.parse(input)
    const { id, ...updates } = validatedInput

    // Get existing room
    const existingRoom = await getRoom(id)
    if (!existingRoom) {
      throw new Error('Room not found')
    }

    // Merge updates with existing data
    const updatedRoom: Room = {
      ...existingRoom,
      ...updates,
      updatedAt: new Date()
    }

    // Validate updated room
    const validatedRoom = RoomSchema.parse(updatedRoom)

    // Update in Redis
    const roomKey = getRoomKey(id)
    
    // Handle availability status changes
    if (updates.isAvailable !== undefined && updates.isAvailable !== existingRoom.isAvailable) {
      const availableRoomsKey = getAvailableRoomsKey()
      
      if (updates.isAvailable) {
        await db.sadd(availableRoomsKey, id)
      } else {
        await db.srem(availableRoomsKey, id)
      }
    }

    // Update room data
    await db.hset(roomKey, {
      ...validatedRoom,
      createdAt: validatedRoom.createdAt.toISOString(),
      updatedAt: validatedRoom.updatedAt.toISOString(),
      lastInspection: validatedRoom.lastInspection?.toISOString() || '',
      features: JSON.stringify(validatedRoom.features),
      photos: JSON.stringify(validatedRoom.photos),
      isAvailable: validatedRoom.isAvailable.toString()
    })

    return validatedRoom
  } catch (error) {
    console.error('Error updating room:', error)
    throw error
  }
}

// Get all rooms for a property
export async function getPropertyRooms(propertyId: string): Promise<Room[]> {
  try {
    const propertyRoomsKey = getPropertyRoomsKey(propertyId)
    const roomIds = await db.smembers(propertyRoomsKey)
    
    if (!roomIds || roomIds.length === 0) {
      return []
    }

    // Get all rooms in parallel
    const rooms = await Promise.all(
      roomIds.map(id => getRoom(id))
    )

    // Filter out null values (deleted or not found rooms)
    return rooms.filter((room): room is Room => room !== null)
  } catch (error) {
    console.error('Error fetching property rooms:', error)
    return []
  }
}

// Get available rooms
export async function getAvailableRooms(): Promise<Room[]> {
  try {
    const availableRoomsKey = getAvailableRoomsKey()
    const roomIds = await db.smembers(availableRoomsKey)
    
    if (!roomIds || roomIds.length === 0) {
      return []
    }

    // Get all rooms in parallel
    const rooms = await Promise.all(
      roomIds.map(id => getRoom(id))
    )

    // Filter out null values and ensure they're still available
    return rooms.filter((room): room is Room => 
      room !== null && room.isAvailable
    )
  } catch (error) {
    console.error('Error fetching available rooms:', error)
    return []
  }
}

// OCCUPANCY OPERATIONS

// Create occupancy record
export async function createOccupancyRecord(input: CreateOccupancyRecordInput): Promise<OccupancyRecord> {
  try {
    const validatedInput = CreateOccupancyRecordSchema.parse(input)
    
    const id = uuidv4()
    const now = new Date()
    
    const occupancyRecord: OccupancyRecord = {
      ...validatedInput,
      id,
      createdAt: now,
      updatedAt: now
    }

    const validatedRecord = OccupancyRecordSchema.parse(occupancyRecord)

    // Store in Redis
    const recordKey = getOccupancyRecordKey(id)
    const roomOccupancyKey = getRoomOccupancyKey(occupancyRecord.roomId)
    const tenantOccupancyKey = getTenantOccupancyKey(occupancyRecord.tenantId)
    const allOccupancyKey = getAllOccupancyKey()

    const pipeline = db.pipeline()
    
    pipeline.hset(recordKey, {
      ...validatedRecord,
      startDate: validatedRecord.startDate.toISOString(),
      endDate: validatedRecord.endDate?.toISOString() || '',
      createdAt: validatedRecord.createdAt.toISOString(),
      updatedAt: validatedRecord.updatedAt.toISOString()
    })
    
    pipeline.sadd(roomOccupancyKey, id)
    pipeline.sadd(tenantOccupancyKey, id)
    pipeline.sadd(allOccupancyKey, id)
    
    await pipeline.exec()

    return validatedRecord
  } catch (error) {
    console.error('Error creating occupancy record:', error)
    throw error
  }
}

// Get room occupancy history
export async function getRoomOccupancyHistory(roomId: string): Promise<OccupancyRecord[]> {
  try {
    const roomOccupancyKey = getRoomOccupancyKey(roomId)
    const recordIds = await db.smembers(roomOccupancyKey)
    
    if (!recordIds || recordIds.length === 0) {
      return []
    }

    const records = await Promise.all(
      recordIds.map(async (id) => {
        const recordKey = getOccupancyRecordKey(id)
        const data = await db.hgetall(recordKey)
        
        if (!data || Object.keys(data).length === 0 || data.deletedAt) {
          return null
        }

        const record = {
          ...data,
          monthlyRent: parseFloat(data.monthlyRent),
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt)
        }

        return OccupancyRecordSchema.parse(record)
      })
    )

    return records.filter((record): record is OccupancyRecord => record !== null)
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime()) // Sort by start date, newest first
  } catch (error) {
    console.error('Error fetching room occupancy history:', error)
    return []
  }
}

// MAINTENANCE OPERATIONS

// Create maintenance record
export async function createMaintenanceRecord(input: CreateMaintenanceRecordInput): Promise<MaintenanceRecord> {
  try {
    const validatedInput = CreateMaintenanceRecordSchema.parse(input)
    
    const id = uuidv4()
    const now = new Date()
    
    const maintenanceRecord: MaintenanceRecord = {
      ...validatedInput,
      id,
      createdAt: now,
      updatedAt: now
    }

    const validatedRecord = MaintenanceRecordSchema.parse(maintenanceRecord)

    // Store in Redis
    const recordKey = getMaintenanceRecordKey(id)
    const roomMaintenanceKey = getRoomMaintenanceKey(maintenanceRecord.roomId)
    const propertyMaintenanceKey = getPropertyMaintenanceKey(maintenanceRecord.propertyId)
    const allMaintenanceKey = getAllMaintenanceKey()

    const pipeline = db.pipeline()
    
    pipeline.hset(recordKey, {
      ...validatedRecord,
      reportedDate: validatedRecord.reportedDate.toISOString(),
      scheduledDate: validatedRecord.scheduledDate?.toISOString() || '',
      completedDate: validatedRecord.completedDate?.toISOString() || '',
      cost: validatedRecord.cost?.toString() || '',
      createdAt: validatedRecord.createdAt.toISOString(),
      updatedAt: validatedRecord.updatedAt.toISOString()
    })
    
    pipeline.sadd(roomMaintenanceKey, id)
    pipeline.sadd(propertyMaintenanceKey, id)
    pipeline.sadd(allMaintenanceKey, id)
    
    await pipeline.exec()

    return validatedRecord
  } catch (error) {
    console.error('Error creating maintenance record:', error)
    throw error
  }
}

// Get property maintenance records
export async function getPropertyMaintenanceRecords(propertyId: string): Promise<MaintenanceRecord[]> {
  try {
    const propertyMaintenanceKey = getPropertyMaintenanceKey(propertyId)
    const recordIds = await db.smembers(propertyMaintenanceKey)
    
    if (!recordIds || recordIds.length === 0) {
      return []
    }

    const records = await Promise.all(
      recordIds.map(async (id) => {
        const recordKey = getMaintenanceRecordKey(id)
        const data = await db.hgetall(recordKey)
        
        if (!data || Object.keys(data).length === 0 || data.deletedAt) {
          return null
        }

        const record = {
          ...data,
          cost: data.cost ? parseFloat(data.cost) : undefined,
          reportedDate: new Date(data.reportedDate),
          scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
          completedDate: data.completedDate ? new Date(data.completedDate) : undefined,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt)
        }

        return MaintenanceRecordSchema.parse(record)
      })
    )

    return records.filter((record): record is MaintenanceRecord => record !== null)
      .sort((a, b) => b.reportedDate.getTime() - a.reportedDate.getTime()) // Sort by reported date, newest first
  } catch (error) {
    console.error('Error fetching property maintenance records:', error)
    return []
  }
}

// ANALYTICS OPERATIONS

// Calculate property analytics
export async function calculatePropertyAnalytics(propertyId: string): Promise<PropertyAnalytics> {
  try {
    const rooms = await getPropertyRooms(propertyId)
    const maintenanceRecords = await getPropertyMaintenanceRecords(propertyId)
    
    const totalRooms = rooms.length
    const occupiedRooms = rooms.filter(room => !room.isAvailable).length
    const availableRooms = rooms.filter(room => room.isAvailable).length
    const occupancyRate = totalRooms > 0 ? occupiedRooms / totalRooms : 0
    
    const totalMonthlyRent = rooms.reduce((sum, room) => sum + room.monthlyRent, 0)
    const averageMonthlyRent = totalRooms > 0 ? totalMonthlyRent / totalRooms : 0
    const totalMonthlyRevenue = rooms.filter(room => !room.isAvailable)
      .reduce((sum, room) => sum + room.monthlyRent, 0)
    
    // Calculate average occupancy duration from occupancy history
    let totalOccupancyDays = 0
    let completedOccupancies = 0
    
    for (const room of rooms) {
      const occupancyHistory = await getRoomOccupancyHistory(room.id)
      const completedOccupancyRecords = occupancyHistory.filter(record => 
        record.status === 'Past' && record.endDate
      )
      
      for (const record of completedOccupancyRecords) {
        if (record.endDate) {
          const durationMs = record.endDate.getTime() - record.startDate.getTime()
          const durationDays = durationMs / (1000 * 60 * 60 * 24)
          totalOccupancyDays += durationDays
          completedOccupancies++
        }
      }
    }
    
    const averageOccupancyDuration = completedOccupancies > 0 ? 
      totalOccupancyDays / completedOccupancies : 0
    
    const maintenanceRequestsCount = maintenanceRecords.length

    const analytics: PropertyAnalytics = {
      propertyId,
      totalRooms,
      occupiedRooms,
      availableRooms,
      occupancyRate,
      averageMonthlyRent,
      totalMonthlyRevenue,
      averageOccupancyDuration,
      maintenanceRequestsCount,
      calculatedAt: new Date()
    }

    return PropertyAnalyticsSchema.parse(analytics)
  } catch (error) {
    console.error('Error calculating property analytics:', error)
    throw error
  }
}

// Soft delete room
export async function deleteRoom(id: string): Promise<boolean> {
  try {
    const existingRoom = await getRoom(id)
    if (!existingRoom) {
      return false
    }

    const roomKey = getRoomKey(id)
    await db.hset(roomKey, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Remove from available rooms if it was available
    if (existingRoom.isAvailable) {
      const availableRoomsKey = getAvailableRoomsKey()
      await db.srem(availableRoomsKey, id)
    }

    return true
  } catch (error) {
    console.error('Error deleting room:', error)
    return false
  }
}
