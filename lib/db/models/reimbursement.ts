import { z } from 'zod'

// Reimbursement status enum
export const ReimbursementStatus = {
  REQUESTED: 'Requested',
  APPROVED: 'Approved', 
  PAID: 'Paid',
  DENIED: 'Denied'
} as const

export type ReimbursementStatusType = typeof ReimbursementStatus[keyof typeof ReimbursementStatus]

// Status change history for audit trail
export const StatusChangeSchema = z.object({
  id: z.string().uuid(),
  fromStatus: z.enum(['Requested', 'Approved', 'Paid', 'Denied']).optional(),
  toStatus: z.enum(['Requested', 'Approved', 'Paid', 'Denied']),
  changedBy: z.string().uuid('Invalid user ID format'),
  changedAt: z.date(),
  comment: z.string().optional(),
  reason: z.string().optional()
})

export type StatusChange = z.infer<typeof StatusChangeSchema>

// Reimbursement request validation schema
export const ReimbursementRequestSchema = z.object({
  id: z.string().uuid('Invalid reimbursement ID format'),
  expenseId: z.string().uuid('Invalid expense ID format'),
  requestorId: z.string().uuid('Invalid requestor ID format'),
  propertyId: z.string().uuid('Invalid property ID format'),
  amountCents: z.number().int().positive('Amount must be positive (in cents)'),
  currency: z.string().length(3, 'Currency must be 3-letter code').default('USD'),
  status: z.enum(['Requested', 'Approved', 'Paid', 'Denied']).default('Requested'),
  requestDate: z.date(),
  approvedBy: z.string().uuid('Invalid approver ID format').optional(),
  approvedDate: z.date().optional(),
  paidDate: z.date().optional(),
  paymentMethod: z.enum(['Stripe', 'PayPal', 'Venmo', 'Wise', 'Revolut', 'Wire', 'Cash']).optional(),
  paymentReference: z.string().optional(),
  deniedReason: z.string().optional(),
  comments: z.array(z.string()).default([]),
  statusHistory: z.array(StatusChangeSchema).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional() // For soft deletes
})

export type ReimbursementRequest = z.infer<typeof ReimbursementRequestSchema>

// Create reimbursement request input schema
export const CreateReimbursementRequestSchema = ReimbursementRequestSchema.omit({
  id: true,
  status: true,
  requestDate: true,
  approvedBy: true,
  approvedDate: true,
  paidDate: true,
  paymentMethod: true,
  paymentReference: true,
  deniedReason: true,
  comments: true,
  statusHistory: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
})

export type CreateReimbursementRequestInput = z.infer<typeof CreateReimbursementRequestSchema>

// Update reimbursement request schema
export const UpdateReimbursementRequestSchema = ReimbursementRequestSchema.partial().required({ id: true })

export type UpdateReimbursementRequestInput = z.infer<typeof UpdateReimbursementRequestSchema>

// Approval/denial input schema
export const ApprovalActionSchema = z.object({
  reimbursementId: z.string().uuid('Invalid reimbursement ID format'),
  action: z.enum(['approve', 'deny']),
  comment: z.string().min(1, 'Comment is required for approval/denial'),
  approvedBy: z.string().uuid('Invalid approver ID format')
})

export type ApprovalActionInput = z.infer<typeof ApprovalActionSchema>

// Payment recording schema
export const PaymentRecordingSchema = z.object({
  reimbursementId: z.string().uuid('Invalid reimbursement ID format'),
  paymentMethod: z.enum(['Stripe', 'PayPal', 'Venmo', 'Wise', 'Revolut', 'Wire', 'Cash']),
  paymentReference: z.string().optional(),
  paidDate: z.date().optional(),
  paidBy: z.string().uuid('Invalid payer ID format'),
  notes: z.string().optional()
})

export type PaymentRecordingInput = z.infer<typeof PaymentRecordingSchema>

// Reimbursement query filters
export const ReimbursementFiltersSchema = z.object({
  propertyId: z.string().uuid().optional(),
  requestorId: z.string().uuid().optional(),
  status: z.enum(['Requested', 'Approved', 'Paid', 'Denied']).optional(),
  approvedBy: z.string().uuid().optional(),
  requestDateFrom: z.date().optional(),
  requestDateTo: z.date().optional(),
  amountMin: z.number().int().nonnegative().optional(),
  amountMax: z.number().int().positive().optional(),
  paymentMethod: z.enum(['Stripe', 'PayPal', 'Venmo', 'Wise', 'Revolut', 'Wire', 'Cash']).optional()
})

export type ReimbursementFilters = z.infer<typeof ReimbursementFiltersSchema>

// Batch approval schema
export const BatchApprovalSchema = z.object({
  reimbursementIds: z.array(z.string().uuid()).min(1, 'At least one reimbursement ID required'),
  action: z.enum(['approve', 'deny']),
  comment: z.string().min(1, 'Comment is required for batch approval/denial'),
  approvedBy: z.string().uuid('Invalid approver ID format')
})

export type BatchApprovalInput = z.infer<typeof BatchApprovalSchema>
