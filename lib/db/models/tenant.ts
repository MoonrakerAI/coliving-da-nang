import { z } from 'zod'

// Tenant status enum
export const TenantStatus = {
  ACTIVE: 'Active',
  MOVING_OUT: 'Moving Out',
  MOVED_OUT: 'Moved Out'
} as const

export type TenantStatusType = typeof TenantStatus[keyof typeof TenantStatus]

// Emergency contact schema
export const EmergencyContactSchema = z.object({
  name: z.string().min(1, 'Emergency contact name is required'),
  phone: z.string().min(1, 'Emergency contact phone is required'),
  relationship: z.string().min(1, 'Emergency contact relationship is required')
})

export type EmergencyContact = z.infer<typeof EmergencyContactSchema>

// Tenant validation schema
export const TenantSchema = z.object({
  id: z.string().uuid('Invalid tenant ID format'),
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  emergencyContact: EmergencyContactSchema,
  profilePhoto: z.string().url('Invalid profile photo URL').optional(),
  status: z.enum(['Active', 'Moving Out', 'Moved Out']),
  propertyId: z.string().uuid('Invalid property ID format'),
  roomNumber: z.string().min(1, 'Room number is required'),
  leaseStart: z.date(),
  leaseEnd: z.date(),
  monthlyRentCents: z.number().int().positive('Monthly rent must be positive'),
  depositCents: z.number().int().nonnegative('Deposit must be non-negative'),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional() // For soft deletes
})

export type Tenant = z.infer<typeof TenantSchema>

// Create tenant input schema (excludes auto-generated fields)
export const CreateTenantSchema = TenantSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
})

export type CreateTenantInput = z.infer<typeof CreateTenantSchema>

// Update tenant input schema (all fields optional except id)
export const UpdateTenantSchema = TenantSchema.partial().required({ id: true })

export type UpdateTenantInput = z.infer<typeof UpdateTenantSchema>
