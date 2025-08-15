import { z } from 'zod'

// Address schema for complete address structure
export const AddressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required')
})

export type Address = z.infer<typeof AddressSchema>

// Property settings configuration schema
export const PropertySettingsSchema = z.object({
  allowPets: z.boolean().default(false),
  smokingAllowed: z.boolean().default(false),
  maxOccupancy: z.number().int().positive('Max occupancy must be positive'),
  checkInTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid check-in time format'),
  checkOutTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid check-out time format'),
  wifiPassword: z.string().optional(),
  parkingAvailable: z.boolean().default(false)
})

export type PropertySettings = z.infer<typeof PropertySettingsSchema>

// Property validation schema
export const PropertySchema = z.object({
  id: z.string().uuid('Invalid property ID format'),
  name: z.string().min(1, 'Property name is required'),
  address: AddressSchema,
  roomCount: z.number().int().positive('Room count must be positive'),
  settings: PropertySettingsSchema,
  houseRules: z.array(z.string()).default([]),
  ownerId: z.string().uuid('Invalid owner ID format'),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional() // For soft deletes
})

export type Property = z.infer<typeof PropertySchema>

// Create property input schema (excludes auto-generated fields)
export const CreatePropertySchema = PropertySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
})

export type CreatePropertyInput = z.infer<typeof CreatePropertySchema>

// Update property input schema (all fields optional except id)
export const UpdatePropertySchema = PropertySchema.partial().required({ id: true })

export type UpdatePropertyInput = z.infer<typeof UpdatePropertySchema>
