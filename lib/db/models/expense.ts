import { z } from 'zod'
import { getAllPredefinedCategories } from './expense-category'

// Expense category enum (keeping for backward compatibility)
export const ExpenseCategory = {
  UTILITIES: 'Utilities',
  REPAIRS: 'Repairs',
  SUPPLIES: 'Supplies',
  CLEANING: 'Cleaning',
  MAINTENANCE: 'Maintenance',
  OTHER: 'Other'
} as const

export type ExpenseCategoryType = typeof ExpenseCategory[keyof typeof ExpenseCategory]

// Enhanced category selection schema
export const ExpenseCategorySelectionSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  subcategoryId: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(), // For auto-categorization confidence
  isAutoSuggested: z.boolean().default(false)
})

export type ExpenseCategorySelection = z.infer<typeof ExpenseCategorySelectionSchema>

// Location data structure for geolocation
export const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  placeName: z.string().optional()
})

export type Location = z.infer<typeof LocationSchema>

// Expense validation schema
export const ExpenseSchema = z.object({
  id: z.string().uuid('Invalid expense ID format'),
  propertyId: z.string().uuid('Invalid property ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  amountCents: z.number().int().positive('Amount must be positive (in cents)'),
  currency: z.string().length(3, 'Currency must be 3-letter code').default('USD'),
  // Enhanced category system
  categorySelection: ExpenseCategorySelectionSchema,
  // Legacy category field (for backward compatibility)
  category: z.enum(['Utilities', 'Repairs', 'Supplies', 'Cleaning', 'Maintenance', 'Other']).optional(),
  description: z.string().min(1, 'Expense description is required'),
  receiptPhotos: z.array(z.string().url('Invalid receipt photo URL')).default([]),
  needsReimbursement: z.boolean().default(false),
  isReimbursed: z.boolean().default(false),
  reimbursedDate: z.date().optional(),
  location: LocationSchema.optional(),
  expenseDate: z.date(),
  createdBy: z.string().uuid('Invalid creator ID format'),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(), // For soft deletes
  // Tax-related fields
  isTaxDeductible: z.boolean().default(false),
  taxCategory: z.string().optional(),
  // Multi-property allocation
  propertyAllocation: z.array(z.object({
    propertyId: z.string().uuid(),
    percentage: z.number().min(0).max(100),
    amount: z.number().int().nonnegative()
  })).optional()
})

export type Expense = z.infer<typeof ExpenseSchema>

// Create expense input schema (excludes auto-generated fields)
export const CreateExpenseSchema = ExpenseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
})

export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>

// Update expense input schema (all fields optional except id)
export const UpdateExpenseSchema = ExpenseSchema.partial().required({ id: true })

export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>

// Expense query filters
export const ExpenseFiltersSchema = z.object({
  propertyId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  category: z.enum(['Utilities', 'Repairs', 'Supplies', 'Cleaning', 'Maintenance', 'Other']).optional(),
  needsReimbursement: z.boolean().optional(),
  isReimbursed: z.boolean().optional(),
  expenseDateFrom: z.date().optional(),
  expenseDateTo: z.date().optional(),
  amountMin: z.number().int().nonnegative().optional(),
  amountMax: z.number().int().positive().optional()
})

export type ExpenseFilters = z.infer<typeof ExpenseFiltersSchema>
