import { z } from 'zod'

// Predefined category system with hierarchy support
export const PredefinedCategories = {
  UTILITIES: {
    id: 'utilities',
    name: 'Utilities',
    icon: '⚡',
    color: '#3B82F6', // blue-500
    subcategories: [
      { id: 'electricity', name: 'Electricity', icon: '💡' },
      { id: 'water', name: 'Water', icon: '💧' },
      { id: 'gas', name: 'Gas', icon: '🔥' },
      { id: 'internet', name: 'Internet', icon: '🌐' },
      { id: 'cable', name: 'Cable/TV', icon: '📺' }
    ]
  },
  REPAIRS: {
    id: 'repairs',
    name: 'Repairs',
    icon: '🔧',
    color: '#EF4444', // red-500
    subcategories: [
      { id: 'plumbing', name: 'Plumbing', icon: '🚿' },
      { id: 'electrical', name: 'Electrical', icon: '⚡' },
      { id: 'hvac', name: 'HVAC', icon: '❄️' },
      { id: 'appliance', name: 'Appliance', icon: '🔧' },
      { id: 'structural', name: 'Structural', icon: '🏗️' }
    ]
  },
  SUPPLIES: {
    id: 'supplies',
    name: 'Supplies',
    icon: '📦',
    color: '#10B981', // green-500
    subcategories: [
      { id: 'office', name: 'Office Supplies', icon: '📝' },
      { id: 'cleaning-supplies', name: 'Cleaning Supplies', icon: '🧽' },
      { id: 'tools', name: 'Tools', icon: '🔨' },
      { id: 'hardware', name: 'Hardware', icon: '🔩' },
      { id: 'safety', name: 'Safety Equipment', icon: '🦺' }
    ]
  },
  CLEANING: {
    id: 'cleaning',
    name: 'Cleaning',
    icon: '🧹',
    color: '#8B5CF6', // violet-500
    subcategories: [
      { id: 'regular-cleaning', name: 'Regular Cleaning', icon: '🧽' },
      { id: 'deep-cleaning', name: 'Deep Cleaning', icon: '✨' },
      { id: 'carpet-cleaning', name: 'Carpet Cleaning', icon: '🪣' },
      { id: 'window-cleaning', name: 'Window Cleaning', icon: '🪟' },
      { id: 'pest-control', name: 'Pest Control', icon: '🐛' }
    ]
  },
  MAINTENANCE: {
    id: 'maintenance',
    name: 'Maintenance',
    icon: '⚙️',
    color: '#F59E0B', // amber-500
    subcategories: [
      { id: 'preventive', name: 'Preventive Maintenance', icon: '🔍' },
      { id: 'landscaping', name: 'Landscaping', icon: '🌱' },
      { id: 'painting', name: 'Painting', icon: '🎨' },
      { id: 'flooring', name: 'Flooring', icon: '🪵' },
      { id: 'security', name: 'Security Systems', icon: '🔒' }
    ]
  },
  OTHER: {
    id: 'other',
    name: 'Other',
    icon: '📋',
    color: '#6B7280', // gray-500
    subcategories: [
      { id: 'insurance', name: 'Insurance', icon: '🛡️' },
      { id: 'legal', name: 'Legal Fees', icon: '⚖️' },
      { id: 'professional', name: 'Professional Services', icon: '👔' },
      { id: 'miscellaneous', name: 'Miscellaneous', icon: '📎' }
    ]
  }
} as const

// Category schemas
export const SubcategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().min(1),
  isCustom: z.boolean().default(false),
  createdBy: z.string().uuid().optional(),
  createdAt: z.date().optional()
})

export const CategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().min(1),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
  subcategories: z.array(SubcategorySchema).default([]),
  isCustom: z.boolean().default(false),
  propertyId: z.string().uuid().optional(), // For property-specific custom categories
  createdBy: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  usageCount: z.number().int().nonnegative().default(0),
  lastUsed: z.date().optional()
})

export type Subcategory = z.infer<typeof SubcategorySchema>
export type Category = z.infer<typeof CategorySchema>

// Custom category creation schema
export const CreateCustomCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Category name too long'),
  icon: z.string().min(1, 'Category icon is required'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
  propertyId: z.string().uuid('Invalid property ID'),
  subcategories: z.array(z.object({
    name: z.string().min(1).max(50),
    icon: z.string().min(1)
  })).default([]),
  createdBy: z.string().uuid('Invalid user ID')
})

export type CreateCustomCategoryInput = z.infer<typeof CreateCustomCategorySchema>

// Category usage tracking
export const CategoryUsageSchema = z.object({
  categoryId: z.string().min(1),
  subcategoryId: z.string().optional(),
  propertyId: z.string().uuid(),
  userId: z.string().uuid(),
  usedAt: z.date(),
  expenseAmount: z.number().int().positive()
})

export type CategoryUsage = z.infer<typeof CategoryUsageSchema>

// Category analytics
export const CategoryAnalyticsSchema = z.object({
  categoryId: z.string(),
  categoryName: z.string(),
  totalUsage: z.number().int().nonnegative(),
  totalAmount: z.number().int().nonnegative(),
  averageAmount: z.number().nonnegative(),
  lastUsed: z.date().optional(),
  usagePercentage: z.number().min(0).max(100),
  subcategoryBreakdown: z.array(z.object({
    subcategoryId: z.string(),
    subcategoryName: z.string(),
    usage: z.number().int().nonnegative(),
    amount: z.number().int().nonnegative()
  })).default([])
})

export type CategoryAnalytics = z.infer<typeof CategoryAnalyticsSchema>

// Helper functions
export function getAllPredefinedCategories(): Category[] {
  return Object.values(PredefinedCategories).map(cat => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    subcategories: cat.subcategories.map(sub => ({
      ...sub,
      isCustom: false
    })),
    isCustom: false,
    usageCount: 0
  }))
}

export function getCategoryById(categoryId: string): Category | null {
  const predefined = Object.values(PredefinedCategories).find(cat => cat.id === categoryId)
  if (predefined) {
    return {
      id: predefined.id,
      name: predefined.name,
      icon: predefined.icon,
      color: predefined.color,
      subcategories: predefined.subcategories.map(sub => ({
        ...sub,
        isCustom: false
      })),
      isCustom: false,
      usageCount: 0
    }
  }
  return null
}

export function getSubcategoryById(categoryId: string, subcategoryId: string): Subcategory | null {
  const category = getCategoryById(categoryId)
  if (!category) return null
  
  return category.subcategories.find(sub => sub.id === subcategoryId) || null
}

// Tax-relevant category mappings for IRS business expense categories
export const TaxCategoryMappings = {
  'utilities': 'Utilities',
  'repairs': 'Repairs and Maintenance',
  'supplies': 'Office Expenses',
  'cleaning': 'Cleaning and Maintenance',
  'maintenance': 'Repairs and Maintenance',
  'insurance': 'Insurance',
  'legal': 'Legal and Professional Services',
  'professional': 'Legal and Professional Services',
  'other': 'Other Business Expenses'
} as const

export function getTaxCategory(categoryId: string): string {
  return TaxCategoryMappings[categoryId as keyof typeof TaxCategoryMappings] || 'Other Business Expenses'
}
