import { z } from 'zod'

// Room type enumeration
export const RoomTypeSchema = z.enum(['Single', 'Double', 'Suite', 'Studio'])
export type RoomType = z.infer<typeof RoomTypeSchema>

// Room condition enumeration
export const RoomConditionSchema = z.enum(['Excellent', 'Good', 'Fair', 'Needs Repair'])
export type RoomCondition = z.infer<typeof RoomConditionSchema>

// Room validation schema
export const RoomSchema = z.object({
  id: z.string().uuid('Invalid room ID format'),
  propertyId: z.string().uuid('Invalid property ID format'),
  number: z.string().min(1, 'Room number is required'),
  type: RoomTypeSchema,
  size: z.number().positive('Room size must be positive'),
  features: z.array(z.string()).default([]),
  monthlyRent: z.number().nonnegative('Monthly rent must be non-negative'),
  deposit: z.number().nonnegative('Deposit must be non-negative'),
  isAvailable: z.boolean().default(true),
  condition: RoomConditionSchema.default('Good'),
  lastInspection: z.date().optional(),
  photos: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional() // For soft deletes
})

export type Room = z.infer<typeof RoomSchema>

// Create room input schema (excludes auto-generated fields)
export const CreateRoomSchema = RoomSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
}).strict() // Reject unknown fields including auto-generated ones

export type CreateRoomInput = z.infer<typeof CreateRoomSchema>

// Update room input schema (all fields optional except id)
export const UpdateRoomSchema = RoomSchema.partial().required({ id: true })

export type UpdateRoomInput = z.infer<typeof UpdateRoomSchema>

// Occupancy status enumeration
export const OccupancyStatusSchema = z.enum(['Current', 'Past', 'Future'])
export type OccupancyStatus = z.infer<typeof OccupancyStatusSchema>

// Occupancy record schema
export const OccupancyRecordSchema = z.object({
  id: z.string().uuid('Invalid occupancy record ID format'),
  roomId: z.string().uuid('Invalid room ID format'),
  tenantId: z.string().uuid('Invalid tenant ID format'),
  startDate: z.date(),
  endDate: z.date().optional(),
  monthlyRent: z.number().positive('Monthly rent must be positive'),
  status: OccupancyStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional() // For soft deletes
})

export type OccupancyRecord = z.infer<typeof OccupancyRecordSchema>

// Create occupancy record input schema
export const CreateOccupancyRecordSchema = OccupancyRecordSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
})

export type CreateOccupancyRecordInput = z.infer<typeof CreateOccupancyRecordSchema>

// Update occupancy record input schema
export const UpdateOccupancyRecordSchema = OccupancyRecordSchema.partial().required({ id: true })

export type UpdateOccupancyRecordInput = z.infer<typeof UpdateOccupancyRecordSchema>

// Maintenance record schema
export const MaintenanceRecordSchema = z.object({
  id: z.string().uuid('Invalid maintenance record ID format'),
  roomId: z.string().uuid('Invalid room ID format'),
  propertyId: z.string().uuid('Invalid property ID format'),
  title: z.string().min(1, 'Maintenance title is required'),
  description: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
  status: z.enum(['Pending', 'In Progress', 'Completed', 'Cancelled']).default('Pending'),
  reportedDate: z.date(),
  scheduledDate: z.date().optional(),
  completedDate: z.date().optional(),
  cost: z.number().nonnegative('Cost must be non-negative').optional(),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional() // For soft deletes
})

export type MaintenanceRecord = z.infer<typeof MaintenanceRecordSchema>

// Create maintenance record input schema
export const CreateMaintenanceRecordSchema = MaintenanceRecordSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
})

export type CreateMaintenanceRecordInput = z.infer<typeof CreateMaintenanceRecordSchema>

// Update maintenance record input schema
export const UpdateMaintenanceRecordSchema = MaintenanceRecordSchema.partial().required({ id: true })

export type UpdateMaintenanceRecordInput = z.infer<typeof UpdateMaintenanceRecordSchema>

// Property analytics schema
export const PropertyAnalyticsSchema = z.object({
  propertyId: z.string().uuid('Invalid property ID format'),
  totalRooms: z.number().int().nonnegative(),
  occupiedRooms: z.number().int().nonnegative(),
  availableRooms: z.number().int().nonnegative(),
  occupancyRate: z.number().min(0).max(1), // 0-1 percentage
  averageMonthlyRent: z.number().nonnegative(),
  totalMonthlyRevenue: z.number().nonnegative(),
  averageOccupancyDuration: z.number().nonnegative(), // in days
  maintenanceRequestsCount: z.number().int().nonnegative(),
  calculatedAt: z.date()
})

export type PropertyAnalytics = z.infer<typeof PropertyAnalyticsSchema>

// Enhanced property details schema (extends base Property)
export const PropertyDetailsSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string()
  }),
  roomCount: z.number().int().positive(),
  settings: z.object({
    allowPets: z.boolean(),
    smokingAllowed: z.boolean(),
    maxOccupancy: z.number().int().positive(),
    checkInTime: z.string(),
    checkOutTime: z.string(),
    wifiPassword: z.string().optional(),
    parkingAvailable: z.boolean()
  }),
  houseRules: z.array(z.string()),
  ownerId: z.string().uuid(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
  // Extended fields for property details
  rooms: z.array(RoomSchema).default([]),
  occupancyHistory: z.array(OccupancyRecordSchema).default([]),
  maintenanceRecords: z.array(MaintenanceRecordSchema).default([]),
  analytics: PropertyAnalyticsSchema.optional()
})

export type PropertyDetails = z.infer<typeof PropertyDetailsSchema>
