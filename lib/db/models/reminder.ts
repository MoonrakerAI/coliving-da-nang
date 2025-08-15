import { z } from 'zod'

// Reminder type enum
export const ReminderType = {
  UPCOMING: 'upcoming',
  DUE: 'due',
  OVERDUE: 'overdue'
} as const

export type ReminderTypeType = typeof ReminderType[keyof typeof ReminderType]

// Reminder status enum
export const ReminderStatus = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  OPENED: 'opened',
  BOUNCED: 'bounced',
  FAILED: 'failed'
} as const

export type ReminderStatusType = typeof ReminderStatus[keyof typeof ReminderStatus]

// Reminder log validation schema
export const ReminderLogSchema = z.object({
  id: z.string().uuid('Invalid reminder log ID format'),
  paymentId: z.string().uuid('Invalid payment ID format'),
  tenantId: z.string().uuid('Invalid tenant ID format'),
  propertyId: z.string().uuid('Invalid property ID format'),
  reminderType: z.enum(['upcoming', 'due', 'overdue']),
  emailAddress: z.string().email('Invalid email address'),
  messageId: z.string().optional(), // Resend message ID
  status: z.enum(['sent', 'delivered', 'opened', 'bounced', 'failed']),
  error: z.string().optional(),
  sentAt: z.string().datetime('Invalid datetime format'),
  deliveredAt: z.string().datetime('Invalid datetime format').optional(),
  openedAt: z.string().datetime('Invalid datetime format').optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type ReminderLog = z.infer<typeof ReminderLogSchema>

// Create reminder log input schema
export const CreateReminderLogSchema = ReminderLogSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deliveredAt: true,
  openedAt: true
})

export type CreateReminderLogInput = z.infer<typeof CreateReminderLogSchema>

// Update reminder log schema (for delivery status updates)
export const UpdateReminderLogSchema = z.object({
  status: z.enum(['sent', 'delivered', 'opened', 'bounced', 'failed']).optional(),
  deliveredAt: z.string().datetime().optional(),
  openedAt: z.string().datetime().optional(),
  error: z.string().optional()
})

export type UpdateReminderLogInput = z.infer<typeof UpdateReminderLogSchema>

// Reminder settings validation schema
export const ReminderSettingsSchema = z.object({
  id: z.string().uuid('Invalid settings ID format'),
  propertyId: z.string().uuid('Invalid property ID format').optional(), // null for global settings
  enabled: z.boolean().default(true),
  daysBeforeDue: z.array(z.number().int().min(0)).default([7]),
  daysAfterDue: z.array(z.number().int().min(0)).default([0, 3]),
  sendOnWeekends: z.boolean().default(false),
  sendOnHolidays: z.boolean().default(false),
  maxRemindersPerPayment: z.number().int().min(1).max(10).default(5),
  customMessage: z.string().optional(),
  contactEmail: z.string().email().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type ReminderSettings = z.infer<typeof ReminderSettingsSchema>

// Create reminder settings input schema
export const CreateReminderSettingsSchema = ReminderSettingsSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
})

export type CreateReminderSettingsInput = z.infer<typeof CreateReminderSettingsSchema>

// Update reminder settings schema
export const UpdateReminderSettingsSchema = ReminderSettingsSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).partial()

export type UpdateReminderSettingsInput = z.infer<typeof UpdateReminderSettingsSchema>

// Tenant reminder preferences validation schema
export const TenantReminderPreferencesSchema = z.object({
  id: z.string().uuid('Invalid preferences ID format'),
  tenantId: z.string().uuid('Invalid tenant ID format'),
  emailEnabled: z.boolean().default(true),
  customSchedule: z.array(z.number().int()).optional(),
  optOut: z.boolean().default(false),
  preferredTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(), // HH:MM format
  timezone: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type TenantReminderPreferences = z.infer<typeof TenantReminderPreferencesSchema>

// Create tenant preferences input schema
export const CreateTenantReminderPreferencesSchema = TenantReminderPreferencesSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
})

export type CreateTenantReminderPreferencesInput = z.infer<typeof CreateTenantReminderPreferencesSchema>

// Update tenant preferences schema
export const UpdateTenantReminderPreferencesSchema = TenantReminderPreferencesSchema.omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true
}).partial()

export type UpdateTenantReminderPreferencesInput = z.infer<typeof UpdateTenantReminderPreferencesSchema>

// Reminder analytics schema
export const ReminderAnalyticsSchema = z.object({
  totalSent: z.number().int().min(0),
  totalDelivered: z.number().int().min(0),
  totalOpened: z.number().int().min(0),
  totalBounced: z.number().int().min(0),
  totalFailed: z.number().int().min(0),
  deliveryRate: z.number().min(0).max(1),
  openRate: z.number().min(0).max(1),
  bounceRate: z.number().min(0).max(1),
  effectivenessRate: z.number().min(0).max(1), // payments made after reminder
  period: z.object({
    from: z.string().datetime(),
    to: z.string().datetime()
  })
})

export type ReminderAnalytics = z.infer<typeof ReminderAnalyticsSchema>

// Query filters for reminder logs
export const ReminderLogFiltersSchema = z.object({
  paymentId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  reminderType: z.enum(['upcoming', 'due', 'overdue']).optional(),
  status: z.enum(['sent', 'delivered', 'opened', 'bounced', 'failed']).optional(),
  sentFrom: z.string().datetime().optional(),
  sentTo: z.string().datetime().optional()
})

export type ReminderLogFilters = z.infer<typeof ReminderLogFiltersSchema>
