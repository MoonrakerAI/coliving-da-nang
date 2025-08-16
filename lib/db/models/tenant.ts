import { z } from 'zod'

// Tenant status enum
export const TenantStatus = {
  ACTIVE: 'Active',
  MOVING_OUT: 'Moving Out',
  MOVED_OUT: 'Moved Out'
} as const

export type TenantStatusType = typeof TenantStatus[keyof typeof TenantStatus]

// Document type enum
export const DocumentType = {
  ID: 'ID',
  PASSPORT: 'Passport',
  LEASE: 'Lease',
  REFERENCE: 'Reference',
  OTHER: 'Other'
} as const

export type DocumentTypeType = typeof DocumentType[keyof typeof DocumentType]

// Communication type enum
export const CommunicationType = {
  EMAIL: 'Email',
  PHONE: 'Phone',
  IN_PERSON: 'In Person',
  SMS: 'SMS',
  NOTE: 'Note'
} as const

export type CommunicationTypeType = typeof CommunicationType[keyof typeof CommunicationType]

// Enhanced emergency contact schema with multiple contacts support
export const EmergencyContactSchema = z.object({
  id: z.string().uuid('Invalid emergency contact ID format'),
  name: z.string().min(1, 'Emergency contact name is required'),
  phone: z.string().min(1, 'Emergency contact phone is required'),
  email: z.string().email('Invalid email format').optional(),
  relationship: z.string().min(1, 'Emergency contact relationship is required'),
  isPrimary: z.boolean().default(false),
  verified: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type EmergencyContact = z.infer<typeof EmergencyContactSchema>

// Room assignment schema
export const RoomAssignmentSchema = z.object({
  roomId: z.string().uuid('Invalid room ID format'),
  roomNumber: z.string().min(1, 'Room number is required'),
  moveInDate: z.date(),
  moveOutDate: z.date().optional(),
  leaseEndDate: z.date(),
  isActive: z.boolean().default(true)
})

export type RoomAssignment = z.infer<typeof RoomAssignmentSchema>

// Tenant document schema
export const TenantDocumentSchema = z.object({
  id: z.string().uuid('Invalid document ID format'),
  type: z.enum(['ID', 'Passport', 'Lease', 'Reference', 'Other']),
  filename: z.string().min(1, 'Filename is required'),
  url: z.string().url('Invalid document URL'),
  uploadDate: z.date(),
  expirationDate: z.date().optional(),
  fileSize: z.number().int().positive('File size must be positive').optional(),
  mimeType: z.string().optional()
})

export type TenantDocument = z.infer<typeof TenantDocumentSchema>

// Communication history schema
export const CommunicationSchema = z.object({
  id: z.string().uuid('Invalid communication ID format'),
  type: z.enum(['Email', 'Phone', 'In Person', 'SMS', 'Note']),
  subject: z.string().optional(),
  content: z.string().min(1, 'Communication content is required'),
  timestamp: z.date(),
  issueTags: z.array(z.string()).default([]),
  resolved: z.boolean().default(false),
  createdBy: z.string().min(1, 'Created by is required')
})

export type Communication = z.infer<typeof CommunicationSchema>

// Lease record schema
export const LeaseRecordSchema = z.object({
  id: z.string().uuid('Invalid lease record ID format'),
  startDate: z.date(),
  endDate: z.date(),
  monthlyRentCents: z.number().int().positive('Monthly rent must be positive'),
  depositCents: z.number().int().nonnegative('Deposit must be non-negative'),
  documentUrl: z.string().url('Invalid document URL').optional(),
  isActive: z.boolean().default(false),
  renewalNotificationSent: z.boolean().default(false),
  expirationAlertSent: z.boolean().default(false)
})

export type LeaseRecord = z.infer<typeof LeaseRecordSchema>

// Enhanced tenant validation schema with all Story 3.1 features
export const TenantSchema = z.object({
  id: z.string().uuid('Invalid tenant ID format'),
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  profilePhoto: z.string().url('Invalid profile photo URL').optional(),
  status: z.enum(['Active', 'Moving Out', 'Moved Out']),
  propertyId: z.string().uuid('Invalid property ID format'),
  
  // Enhanced room assignment tracking
  roomAssignment: RoomAssignmentSchema.optional(),
  
  // Multiple emergency contacts support
  emergencyContacts: z.array(EmergencyContactSchema).default([]),
  
  // Document storage
  documents: z.array(TenantDocumentSchema).default([]),
  
  // Communication history
  communicationHistory: z.array(CommunicationSchema).default([]),
  
  // Lease history and management
  leaseHistory: z.array(LeaseRecordSchema).default([]),
  currentLeaseId: z.string().uuid('Invalid lease ID format').optional(),
  
  // Legacy fields for backward compatibility
  roomNumber: z.string().min(1, 'Room number is required').optional(),
  leaseStart: z.date().optional(),
  leaseEnd: z.date().optional(),
  monthlyRentCents: z.number().int().positive('Monthly rent must be positive').optional(),
  depositCents: z.number().int().nonnegative('Deposit must be non-negative').optional(),
  emergencyContact: EmergencyContactSchema.optional(), // Legacy single contact
  
  // Metadata
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
