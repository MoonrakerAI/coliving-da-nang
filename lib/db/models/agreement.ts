import { z } from 'zod'

// Agreement status enum
export const AgreementStatus = {
  SENT: 'Sent',
  VIEWED: 'Viewed', 
  SIGNED: 'Signed',
  COMPLETED: 'Completed',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled'
} as const

export type AgreementStatusType = typeof AgreementStatus[keyof typeof AgreementStatus]

// Template variable schema for dynamic content replacement
export const TemplateVariableSchema = z.object({
  id: z.string().uuid('Invalid template variable ID format'),
  name: z.string().min(1, 'Variable name is required'),
  label: z.string().min(1, 'Variable label is required'),
  type: z.enum(['text', 'number', 'date', 'boolean', 'select']),
  required: z.boolean().default(true),
  defaultValue: z.string().optional(),
  selectOptions: z.array(z.string()).default([]), // For select type variables
  placeholder: z.string().optional(),
  validation: z.string().optional(), // Regex pattern for validation
  description: z.string().optional()
})

export type TemplateVariable = z.infer<typeof TemplateVariableSchema>

// Agreement template schema
export const AgreementTemplateSchema = z.object({
  id: z.string().uuid('Invalid agreement template ID format'),
  name: z.string().min(1, 'Template name is required'),
  propertyId: z.string().uuid('Invalid property ID format'),
  content: z.string().min(1, 'Template content is required'),
  variables: z.array(TemplateVariableSchema).default([]),
  version: z.number().int().positive('Version must be positive').default(1),
  isActive: z.boolean().default(true),
  legalReviewDate: z.date().optional(),
  legalReviewedBy: z.string().optional(),
  description: z.string().optional(),
  category: z.string().default('Standard Lease'), // e.g., 'Standard Lease', 'Short Term', 'Student Housing'
  
  // Metadata
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid('Invalid user ID format'),
  deletedAt: z.date().optional() // For soft deletes
})

export type AgreementTemplate = z.infer<typeof AgreementTemplateSchema>

// Agreement schema for tracking sent agreements
export const AgreementSchema = z.object({
  id: z.string().uuid('Invalid agreement ID format'),
  templateId: z.string().uuid('Invalid template ID format'),
  propertyId: z.string().uuid('Invalid property ID format'),
  prospectEmail: z.string().email('Invalid prospect email format'),
  prospectName: z.string().min(1, 'Prospect name is required'),
  prospectPhone: z.string().optional(),
  
  // Status tracking
  status: z.enum(['Sent', 'Viewed', 'Signed', 'Completed', 'Expired', 'Cancelled']),
  sentDate: z.date(),
  viewedDate: z.date().optional(),
  signedDate: z.date().optional(),
  completedDate: z.date().optional(),
  expirationDate: z.date(),
  
  // DocuSign integration
  docusignEnvelopeId: z.string().optional(),
  documentUrl: z.string().url('Invalid document URL').optional(),
  signedDocumentUrl: z.string().url('Invalid signed document URL').optional(),
  
  // Reminder tracking
  remindersSent: z.number().int().nonnegative('Reminders sent must be non-negative').default(0),
  lastReminderDate: z.date().optional(),
  nextReminderDate: z.date().optional(),
  
  // Agreement data populated from template variables
  agreementData: z.record(z.string(), z.any()).default({}), // Key-value pairs from template variables
  
  // Room assignment details (extracted from agreement)
  roomNumber: z.string().optional(),
  leaseStartDate: z.date().optional(),
  leaseEndDate: z.date().optional(),
  monthlyRentCents: z.number().int().positive('Monthly rent must be positive').optional(),
  depositCents: z.number().int().nonnegative('Deposit must be non-negative').optional(),
  
  // Tenant creation tracking
  tenantCreated: z.boolean().default(false),
  tenantId: z.string().uuid('Invalid tenant ID format').optional(),
  
  // Metadata
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid('Invalid user ID format'),
  deletedAt: z.date().optional() // For soft deletes
})

export type Agreement = z.infer<typeof AgreementSchema>

// Status history for audit trail
export const AgreementStatusHistorySchema = z.object({
  id: z.string().uuid('Invalid status history ID format'),
  agreementId: z.string().uuid('Invalid agreement ID format'),
  previousStatus: z.enum(['Sent', 'Viewed', 'Signed', 'Completed', 'Expired', 'Cancelled']).optional(),
  newStatus: z.enum(['Sent', 'Viewed', 'Signed', 'Completed', 'Expired', 'Cancelled']),
  timestamp: z.date(),
  notes: z.string().optional(),
  triggeredBy: z.string().optional(), // 'system', 'webhook', 'manual', etc.
  metadata: z.record(z.string(), z.any()).default({}) // Additional context data
})

export type AgreementStatusHistory = z.infer<typeof AgreementStatusHistorySchema>

// Create schemas (exclude auto-generated fields)
export const CreateAgreementTemplateSchema = AgreementTemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
})

export type CreateAgreementTemplateInput = z.infer<typeof CreateAgreementTemplateSchema>

export const CreateAgreementSchema = AgreementSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
})

export type CreateAgreementInput = z.infer<typeof CreateAgreementSchema>

// Update schemas (all fields optional except id)
export const UpdateAgreementTemplateSchema = AgreementTemplateSchema.partial().required({ id: true })
export type UpdateAgreementTemplateInput = z.infer<typeof UpdateAgreementTemplateSchema>

export const UpdateAgreementSchema = AgreementSchema.partial().required({ id: true })
export type UpdateAgreementInput = z.infer<typeof UpdateAgreementSchema>

// Template variable value schema for populating agreements
export const TemplateVariableValueSchema = z.object({
  variableId: z.string().uuid('Invalid variable ID format'),
  name: z.string().min(1, 'Variable name is required'),
  value: z.any() // Can be string, number, boolean, date depending on variable type
})

export type TemplateVariableValue = z.infer<typeof TemplateVariableValueSchema>
