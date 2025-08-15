import { z } from 'zod'

// Payment method enum
export const PaymentMethod = {
  STRIPE: 'Stripe',
  PAYPAL: 'PayPal',
  VENMO: 'Venmo',
  WISE: 'Wise',
  REVOLUT: 'Revolut',
  WIRE: 'Wire',
  CASH: 'Cash'
} as const

export type PaymentMethodType = typeof PaymentMethod[keyof typeof PaymentMethod]

// Payment status enum
export const PaymentStatus = {
  PENDING: 'Pending',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  REFUNDED: 'Refunded'
} as const

export type PaymentStatusType = typeof PaymentStatus[keyof typeof PaymentStatus]

// Payment validation schema
export const PaymentSchema = z.object({
  id: z.string().uuid('Invalid payment ID format'),
  tenantId: z.string().uuid('Invalid tenant ID format'),
  propertyId: z.string().uuid('Invalid property ID format'),
  amountCents: z.number().int().positive('Amount must be positive (in cents)'),
  currency: z.string().length(3, 'Currency must be 3-letter code').default('USD'),
  paymentMethod: z.enum(['Stripe', 'PayPal', 'Venmo', 'Wise', 'Revolut', 'Wire', 'Cash']),
  status: z.enum(['Pending', 'Paid', 'Overdue', 'Refunded']),
  dueDate: z.date(),
  paidDate: z.date().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  description: z.string().min(1, 'Payment description is required'),
  stripePaymentIntentId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional() // For soft deletes
})

export type Payment = z.infer<typeof PaymentSchema>

// Create payment input schema (excludes auto-generated fields)
export const CreatePaymentSchema = PaymentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
})

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>

// Update payment input schema (all fields optional except id)
export const UpdatePaymentSchema = PaymentSchema.partial().required({ id: true })

export type UpdatePaymentInput = z.infer<typeof UpdatePaymentSchema>

// Payment query filters
export const PaymentFiltersSchema = z.object({
  propertyId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  status: z.enum(['Pending', 'Paid', 'Overdue', 'Refunded']).optional(),
  paymentMethod: z.enum(['Stripe', 'PayPal', 'Venmo', 'Wise', 'Revolut', 'Wire', 'Cash']).optional(),
  dueDateFrom: z.date().optional(),
  dueDateTo: z.date().optional(),
  paidDateFrom: z.date().optional(),
  paidDateTo: z.date().optional()
})

export type PaymentFilters = z.infer<typeof PaymentFiltersSchema>
