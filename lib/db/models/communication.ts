import { z } from 'zod';
import type { Tenant } from './tenant';

// Communication Types Enum
export enum CommunicationType {
  EMAIL = 'Email',
  PHONE = 'Phone',
  IN_PERSON = 'In Person',
  WHATSAPP = 'WhatsApp',
  TEXT = 'Text',
  MAINTENANCE_REQUEST = 'Maintenance Request',
  COMPLAINT = 'Complaint',
  GENERAL = 'General'
}

// Communication Priority and Status Enums
export enum CommunicationPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  URGENT = 'Urgent'
}

export enum CommunicationStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  RESOLVED = 'Resolved',
  CLOSED = 'Closed'
}

export enum CommunicationDirection {
  OUTGOING = 'outgoing',
  INCOMING = 'incoming'
}

export enum CommunicationSource {
  MANUAL = 'manual',
  PAYMENT_REMINDER = 'payment_reminder',
  AGREEMENT_REMINDER = 'agreement_reminder',
  TENANT_REPLY = 'tenant_reply'
}

// Communication Schema
export const CommunicationSchema = z.object({
  id: z.string(),
  tenantId: z.string().uuid(),
  tenant: z.custom<Tenant>().optional(),
  propertyId: z.string(),
  type: z.nativeEnum(CommunicationType),
  subject: z.string().min(1, 'Subject is required'),
  content: z.string().min(1, 'Content is required'),
  timestamp: z.date(),
  duration: z.number().optional(), // minutes for calls/meetings
  priority: z.nativeEnum(CommunicationPriority).default(CommunicationPriority.MEDIUM),
  status: z.nativeEnum(CommunicationStatus).default(CommunicationStatus.OPEN),
  createdBy: z.string(),
  assignedTo: z.string().optional(),
  attachments: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  direction: z.nativeEnum(CommunicationDirection),
  source: z.nativeEnum(CommunicationSource).default(CommunicationSource.MANUAL),
  paymentId: z.string().optional()
});

// Communication Template Schema
export const CommunicationTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Template name is required'),
  category: z.string().min(1, 'Category is required'),
  subject: z.string().min(1, 'Subject template is required'),
  content: z.string().min(1, 'Content template is required'),
  variables: z.array(z.string()).default([]),
  language: z.string().default('en'),
  usageCount: z.number().default(0),
  isActive: z.boolean().default(true),
  createdBy: z.string(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

// Issue Escalation Schema
export const IssueEscalationSchema = z.object({
  id: z.string(),
  communicationId: z.string(),
  escalatedFrom: z.string(),
  escalatedTo: z.string(),
  reason: z.string().min(1, 'Escalation reason is required'),
  timestamp: z.date().default(() => new Date()),
  resolved: z.boolean().default(false),
  resolvedAt: z.date().optional(),
  notes: z.string().optional()
});

// Communication Filter Schema
export const CommunicationFilterSchema = z.object({
  tenantId: z.string().optional(),
  propertyId: z.string().optional(),
  type: z.nativeEnum(CommunicationType).optional(),
  priority: z.nativeEnum(CommunicationPriority).optional(),
  status: z.nativeEnum(CommunicationStatus).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
});

// Type exports
export type Communication = z.infer<typeof CommunicationSchema>;
export type CommunicationTemplate = z.infer<typeof CommunicationTemplateSchema>;
export type IssueEscalation = z.infer<typeof IssueEscalationSchema>;
export type CommunicationFilter = z.infer<typeof CommunicationFilterSchema>;

// Create Communication Input Schema (without generated fields)
export const CreateCommunicationSchema = CommunicationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Update Communication Input Schema
export const UpdateCommunicationSchema = CommunicationSchema.partial().omit({
  id: true,
  createdAt: true
}).extend({
  updatedAt: z.date().default(() => new Date())
});

// Create Template Input Schema
export const CreateTemplateSchema = CommunicationTemplateSchema.omit({
  id: true,
  usageCount: true,
  createdAt: true,
  updatedAt: true
});

// Update Template Input Schema
export const UpdateTemplateSchema = CommunicationTemplateSchema.partial().omit({
  id: true,
  createdAt: true
}).extend({
  updatedAt: z.date().default(() => new Date())
});

export type CreateCommunicationInput = z.infer<typeof CreateCommunicationSchema>;
export type UpdateCommunicationInput = z.infer<typeof UpdateCommunicationSchema>;
export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>;
