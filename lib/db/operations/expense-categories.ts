import { db } from '../../db'
import { 
  Category, 
  Subcategory,
  CreateCustomCategoryInput,
  CategoryUsage,
  CategoryAnalytics,
  CategorySchema,
  CreateCustomCategorySchema,
  CategoryUsageSchema,
  getAllPredefinedCategories,
  getCategoryById,
  getSubcategoryById
} from '../models/expense-category'
import { v4 as uuidv4 } from 'uuid'

// Redis keys for category data
const getCategoryKey = (categoryId: string) => `category:${categoryId}`
const getPropertyCategoriesKey = (propertyId: string) => `property:${propertyId}:categories`
const getCategoryUsageKey = (categoryId: string) => `category:${categoryId}:usage`
const getPropertyCategoryUsageKey = (propertyId: string) => `property:${propertyId}:category-usage`
const getAllCustomCategoriesKey = () => 'categories:custom:all'

// Create custom category
export async function createCustomCategory(input: CreateCustomCategoryInput): Promise<Category> {
  try {
    const validatedInput = CreateCustomCategorySchema.parse(input)
    
    const categoryId = `custom-${uuidv4()}`
    const now = new Date()
    
    const category: Category = {
      id: categoryId,
      name: validatedInput.name,
      icon: validatedInput.icon,
      color: validatedInput.color,
      subcategories: validatedInput.subcategories.map(sub => ({
        id: `${categoryId}-${sub.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: sub.name,
        icon: sub.icon,
        isCustom: true,
        createdBy: validatedInput.createdBy,
        createdAt: now
      })),
      isCustom: true,
      propertyId: validatedInput.propertyId,
      createdBy: validatedInput.createdBy,
      createdAt: now,
      usageCount: 0
    }

    const validatedCategory = CategorySchema.parse(category)

    // Store in Redis
    const categoryKey = getCategoryKey(categoryId)
    const propertyKey = getPropertyCategoriesKey(validatedInput.propertyId)
    const allCustomKey = getAllCustomCategoriesKey()

    const pipeline = db.pipeline()
    
    // Store category data
    pipeline.hset(categoryKey, {
      ...validatedCategory,
      createdAt: validatedCategory.createdAt?.toISOString() || '',
      lastUsed: validatedCategory.lastUsed?.toISOString() || '',
      subcategories: JSON.stringify(validatedCategory.subcategories)
    })
    
    // Add to indexes
    pipeline.sadd(propertyKey, categoryId)
    pipeline.sadd(allCustomKey, categoryId)
    
    await pipeline.exec()

    return validatedCategory
  } catch (error) {
    console.error('Error creating custom category:', error)
    throw error
  }
}

// Get category by ID (includes both predefined and custom)
export async function getCategory(categoryId: string): Promise<Category | null> {
  try {
    // First check if it's a predefined category
    const predefinedCategory = getCategoryById(categoryId)
    if (predefinedCategory) {
      // Get usage data for predefined category
      const usageData = await getCategoryUsageData(categoryId)
      return {
        ...predefinedCategory,
        usageCount: usageData.totalUsage,
        lastUsed: usageData.lastUsed
      }
    }

    // Check if it's a custom category
    const categoryKey = getCategoryKey(categoryId)
    const data = await db.hgetall(categoryKey)
    
    if (!data || Object.keys(data).length === 0) {
      return null
    }

    const category = {
      ...data,
      isCustom: data.isCustom === 'true',
      usageCount: parseInt(data.usageCount) || 0,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      lastUsed: data.lastUsed ? new Date(data.lastUsed) : undefined,
      subcategories: data.subcategories ? JSON.parse(data.subcategories) : []
    }

    return CategorySchema.parse(category)
  } catch (error) {
    console.error('Error fetching category:', error)
    return null
  }
}

// Get all categories for a property (predefined + custom)
export async function getCategoriesForProperty(propertyId: string): Promise<Category[]> {
  try {
    // Get predefined categories
    const predefinedCategories = getAllPredefinedCategories()
    
    // Get custom categories for this property
    const propertyKey = getPropertyCategoriesKey(propertyId)
    const customCategoryIds = await db.smembers(propertyKey)
    
    const customCategories = await Promise.all(
      customCategoryIds.map(id => getCategory(id))
    )
    
    const validCustomCategories = customCategories.filter((cat): cat is Category => cat !== null)
    
    // Combine and sort by usage
    const allCategories = [...predefinedCategories, ...validCustomCategories]
    
    // Get usage data for all categories
    const categoriesWithUsage = await Promise.all(
      allCategories.map(async (category) => {
        const usageData = await getCategoryUsageData(category.id, propertyId)
        return {
          ...category,
          usageCount: usageData.totalUsage,
          lastUsed: usageData.lastUsed
        }
      })
    )
    
    // Sort by usage count (most used first), then by name
    return categoriesWithUsage.sort((a, b) => {
      if (a.usageCount !== b.usageCount) {
        return b.usageCount - a.usageCount
      }
      return a.name.localeCompare(b.name)
    })
  } catch (error) {
    console.error('Error fetching categories for property:', error)
    return getAllPredefinedCategories()
  }
}

// Track category usage
export async function trackCategoryUsage(
  categoryId: string, 
  subcategoryId: string | undefined,
  propertyId: string,
  userId: string,
  expenseAmount: number
): Promise<void> {
  try {
    const usage: CategoryUsage = {
      categoryId,
      subcategoryId,
      propertyId,
      userId,
      usedAt: new Date(),
      expenseAmount
    }

    const validatedUsage = CategoryUsageSchema.parse(usage)
    
    const usageKey = getCategoryUsageKey(categoryId)
    const propertyUsageKey = getPropertyCategoryUsageKey(propertyId)
    const usageId = uuidv4()

    const pipeline = db.pipeline()
    
    // Store usage record
    pipeline.hset(`${usageKey}:${usageId}`, {
      ...validatedUsage,
      usedAt: validatedUsage.usedAt.toISOString()
    })
    
    // Add to usage indexes
    pipeline.sadd(usageKey, usageId)
    pipeline.sadd(propertyUsageKey, `${categoryId}:${usageId}`)
    
    // Update category usage count and last used
    if (categoryId.startsWith('custom-')) {
      const categoryKey = getCategoryKey(categoryId)
      pipeline.hincrby(categoryKey, 'usageCount', 1)
      pipeline.hset(categoryKey, 'lastUsed', validatedUsage.usedAt.toISOString())
    }
    
    await pipeline.exec()
  } catch (error) {
    console.error('Error tracking category usage:', error)
    throw error
  }
}

// Get category usage data
async function getCategoryUsageData(categoryId: string, propertyId?: string): Promise<{
  totalUsage: number
  lastUsed?: Date
  totalAmount: number
}> {
  try {
    const usageKey = getCategoryUsageKey(categoryId)
    const usageIds = await db.smembers(usageKey)
    
    if (!usageIds || usageIds.length === 0) {
      return { totalUsage: 0, totalAmount: 0 }
    }

    // Get all usage records
    const usageRecords = await Promise.all(
      usageIds.map(async (usageId) => {
        const data = await db.hgetall(`${usageKey}:${usageId}`)
        if (!data || Object.keys(data).length === 0) return null
        
        return {
          ...data,
          expenseAmount: parseInt(data.expenseAmount),
          usedAt: new Date(data.usedAt)
        }
      })
    )

    const validRecords = usageRecords.filter(record => record !== null)
    
    // Filter by property if specified
    const filteredRecords = propertyId 
      ? validRecords.filter(record => record.propertyId === propertyId)
      : validRecords

    const totalUsage = filteredRecords.length
    const totalAmount = filteredRecords.reduce((sum, record) => sum + record.expenseAmount, 0)
    const lastUsed = filteredRecords.length > 0 
      ? new Date(Math.max(...filteredRecords.map(r => r.usedAt.getTime())))
      : undefined

    return { totalUsage, lastUsed, totalAmount }
  } catch (error) {
    console.error('Error getting category usage data:', error)
    return { totalUsage: 0, totalAmount: 0 }
  }
}

// Get category analytics for a property
export async function getCategoryAnalytics(propertyId: string, dateFrom?: Date, dateTo?: Date): Promise<CategoryAnalytics[]> {
  try {
    const categories = await getCategoriesForProperty(propertyId)
    const analytics: CategoryAnalytics[] = []
    
    let totalExpenseAmount = 0
    
    // First pass: calculate total amount for percentage calculation
    for (const category of categories) {
      const usageData = await getCategoryUsageData(category.id, propertyId)
      totalExpenseAmount += usageData.totalAmount
    }
    
    // Second pass: create analytics with percentages
    for (const category of categories) {
      const usageData = await getCategoryUsageData(category.id, propertyId)
      
      const categoryAnalytics: CategoryAnalytics = {
        categoryId: category.id,
        categoryName: category.name,
        totalUsage: usageData.totalUsage,
        totalAmount: usageData.totalAmount,
        averageAmount: usageData.totalUsage > 0 ? usageData.totalAmount / usageData.totalUsage : 0,
        lastUsed: usageData.lastUsed,
        usagePercentage: totalExpenseAmount > 0 ? (usageData.totalAmount / totalExpenseAmount) * 100 : 0,
        subcategoryBreakdown: [] // TODO: Implement subcategory breakdown
      }
      
      analytics.push(categoryAnalytics)
    }
    
    // Sort by total amount (highest first)
    return analytics.sort((a, b) => b.totalAmount - a.totalAmount)
  } catch (error) {
    console.error('Error generating category analytics:', error)
    return []
  }
}

// Delete custom category
export async function deleteCustomCategory(categoryId: string, propertyId: string): Promise<boolean> {
  try {
    if (!categoryId.startsWith('custom-')) {
      throw new Error('Cannot delete predefined categories')
    }

    const categoryKey = getCategoryKey(categoryId)
    const propertyKey = getPropertyCategoriesKey(propertyId)
    const allCustomKey = getAllCustomCategoriesKey()
    const usageKey = getCategoryUsageKey(categoryId)

    const pipeline = db.pipeline()
    
    // Remove category data
    pipeline.del(categoryKey)
    
    // Remove from indexes
    pipeline.srem(propertyKey, categoryId)
    pipeline.srem(allCustomKey, categoryId)
    
    // Clean up usage data
    const usageIds = await db.smembers(usageKey)
    if (usageIds && usageIds.length > 0) {
      usageIds.forEach(usageId => {
        pipeline.del(`${usageKey}:${usageId}`)
      })
      pipeline.del(usageKey)
    }
    
    await pipeline.exec()
    return true
  } catch (error) {
    console.error('Error deleting custom category:', error)
    return false
  }
}

// Get category suggestions based on merchant name or description
export async function getCategorySuggestions(
  merchantName: string, 
  description: string,
  propertyId: string
): Promise<{ categoryId: string; subcategoryId?: string; confidence: number; reason: string }[]> {
  try {
    const suggestions: { categoryId: string; subcategoryId?: string; confidence: number; reason: string }[] = []
    
    const searchText = `${merchantName} ${description}`.toLowerCase()
    
    // Simple keyword-based suggestions (can be enhanced with ML later)
    const keywordMappings = [
      { keywords: ['electric', 'power', 'energy', 'utility'], categoryId: 'utilities', subcategoryId: 'electricity', confidence: 0.9 },
      { keywords: ['water', 'sewer', 'waste'], categoryId: 'utilities', subcategoryId: 'water', confidence: 0.9 },
      { keywords: ['internet', 'wifi', 'broadband'], categoryId: 'utilities', subcategoryId: 'internet', confidence: 0.9 },
      { keywords: ['plumber', 'plumbing', 'pipe', 'leak'], categoryId: 'repairs', subcategoryId: 'plumbing', confidence: 0.8 },
      { keywords: ['electrician', 'electrical', 'wiring'], categoryId: 'repairs', subcategoryId: 'electrical', confidence: 0.8 },
      { keywords: ['clean', 'cleaning', 'maid', 'housekeeping'], categoryId: 'cleaning', subcategoryId: 'regular-cleaning', confidence: 0.8 },
      { keywords: ['paint', 'painting'], categoryId: 'maintenance', subcategoryId: 'painting', confidence: 0.7 },
      { keywords: ['hardware', 'home depot', 'lowes'], categoryId: 'supplies', subcategoryId: 'hardware', confidence: 0.7 },
      { keywords: ['office', 'staples', 'supplies'], categoryId: 'supplies', subcategoryId: 'office', confidence: 0.7 }
    ]
    
    for (const mapping of keywordMappings) {
      for (const keyword of mapping.keywords) {
        if (searchText.includes(keyword)) {
          suggestions.push({
            categoryId: mapping.categoryId,
            subcategoryId: mapping.subcategoryId,
            confidence: mapping.confidence,
            reason: `Keyword match: "${keyword}"`
          })
          break // Only add one suggestion per mapping
        }
      }
    }
    
    // Sort by confidence (highest first) and remove duplicates
    const uniqueSuggestions = suggestions.reduce((acc, current) => {
      const existing = acc.find(s => s.categoryId === current.categoryId && s.subcategoryId === current.subcategoryId)
      if (!existing || current.confidence > existing.confidence) {
        return [...acc.filter(s => !(s.categoryId === current.categoryId && s.subcategoryId === current.subcategoryId)), current]
      }
      return acc
    }, [] as typeof suggestions)
    
    return uniqueSuggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 3) // Top 3 suggestions
  } catch (error) {
    console.error('Error getting category suggestions:', error)
    return []
  }
}
