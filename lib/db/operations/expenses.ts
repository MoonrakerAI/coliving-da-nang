import { db } from '../index'
import { 
  Expense, 
  CreateExpenseInput, 
  UpdateExpenseInput,
  ExpenseFilters,
  ExpenseSchema,
  CreateExpenseSchema,
  UpdateExpenseSchema,
  ExpenseFiltersSchema
} from '../models/expense'
import { trackCategoryUsage, getCategorySuggestions } from './expense-categories'
import { getTaxCategory } from '../models/expense-category'
import { getMLCategorySuggestions, learnFromUserFeedback, CategorySuggestion } from '../categorization/ml-engine'
import { analyzeReceiptText, processReceiptImage, OCRAnalysisResult } from '../categorization/ocr-analyzer'
import { v4 as uuidv4 } from 'uuid'

// Generate Redis keys for expense data
const getExpenseKey = (id: string) => `expense:${id}`
const getPropertyExpensesKey = (propertyId: string) => `property:${propertyId}:expenses`
const getUserExpensesKey = (userId: string) => `user:${userId}:expenses`
const getAllExpensesKey = () => 'expenses:all'
const getExpensesByCategoryKey = (category: string) => `expenses:category:${category}`
const getReimbursementExpensesKey = () => 'expenses:reimbursement:pending'

// Create a new expense
export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  try {
    // Validate input
    const validatedInput = CreateExpenseSchema.parse(input)
    
    // Generate ID and timestamps
    const id = uuidv4()
    const now = new Date()
    
    // Set tax category based on category selection
    const taxCategory = getTaxCategory(validatedInput.categorySelection.categoryId)
    
    const expense: Expense = {
      ...validatedInput,
      id,
      createdAt: now,
      updatedAt: now,
      // Set legacy category for backward compatibility
      category: validatedInput.category || 'Other',
      // Set tax information
      taxCategory,
      isTaxDeductible: true // Default to true for business expenses
    }

    // Validate complete expense object
    const validatedExpense = ExpenseSchema.parse(expense)

    // Store in Redis
    const expenseKey = getExpenseKey(id)
    const propertyExpensesKey = getPropertyExpensesKey(expense.propertyId)
    const userExpensesKey = getUserExpensesKey(expense.userId)
    const allExpensesKey = getAllExpensesKey()
    const categoryKey = getExpensesByCategoryKey(expense.category)

    // Use pipeline for atomic operations
    const pipeline = db.pipeline()
    
    // Store expense data as hash
    pipeline.hset(expenseKey, {
      ...validatedExpense,
      createdAt: validatedExpense.createdAt.toISOString(),
      updatedAt: validatedExpense.updatedAt.toISOString(),
      expenseDate: validatedExpense.expenseDate.toISOString(),
      reimbursedDate: validatedExpense.reimbursedDate?.toISOString() || '',
      receiptPhotos: JSON.stringify(validatedExpense.receiptPhotos),
      location: validatedExpense.location ? JSON.stringify(validatedExpense.location) : '',
      categorySelection: JSON.stringify(validatedExpense.categorySelection),
      propertyAllocation: validatedExpense.propertyAllocation ? JSON.stringify(validatedExpense.propertyAllocation) : ''
    })
    
    // Add to various indexes
    pipeline.sadd(propertyExpensesKey, id)
    pipeline.sadd(userExpensesKey, id)
    pipeline.sadd(allExpensesKey, id)
    pipeline.sadd(categoryKey, id)
    
    // Add to reimbursement queue if needed
    if (expense.needsReimbursement && !expense.isReimbursed) {
      pipeline.sadd(getReimbursementExpensesKey(), id)
    }
    
    await pipeline.exec()

    // Track category usage for analytics
    try {
      await trackCategoryUsage(
        validatedExpense.categorySelection.categoryId,
        validatedExpense.categorySelection.subcategoryId,
        validatedExpense.propertyId,
        validatedExpense.userId,
        validatedExpense.amountCents
      )
    } catch (error) {
      console.error('Error tracking category usage:', error)
      // Don't fail the expense creation if usage tracking fails
    }

    return validatedExpense
  } catch (error) {
    console.error('Error creating expense:', error)
    throw error
  }
}

// Get expense by ID
export async function getExpense(id: string): Promise<Expense | null> {
  try {
    const expenseKey = getExpenseKey(id)
    const data = await db.hgetall(expenseKey)
    
    if (!data || Object.keys(data).length === 0) {
      return null
    }

    // Check for soft delete
    if (data.deletedAt) {
      return null
    }

    // Parse stored data back to proper types
    const expense = {
      ...data,
      amountCents: parseInt(data.amountCents),
      needsReimbursement: data.needsReimbursement === 'true',
      isReimbursed: data.isReimbursed === 'true',
      isTaxDeductible: data.isTaxDeductible === 'true',
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      expenseDate: new Date(data.expenseDate),
      reimbursedDate: data.reimbursedDate ? new Date(data.reimbursedDate) : undefined,
      receiptPhotos: data.receiptPhotos ? JSON.parse(data.receiptPhotos) : [],
      location: data.location ? JSON.parse(data.location) : undefined,
      categorySelection: data.categorySelection ? JSON.parse(data.categorySelection) : { categoryId: data.category || 'other' },
      propertyAllocation: data.propertyAllocation ? JSON.parse(data.propertyAllocation) : undefined
    }

    return ExpenseSchema.parse(expense)
  } catch (error) {
    console.error('Error fetching expense:', error)
    return null
  }
}

// Update expense
export async function updateExpense(input: UpdateExpenseInput): Promise<Expense | null> {
  try {
    const validatedInput = UpdateExpenseSchema.parse(input)
    const { id, ...updates } = validatedInput

    // Get existing expense
    const existingExpense = await getExpense(id)
    if (!existingExpense) {
      throw new Error('Expense not found')
    }

    // Merge updates with existing data
    const updatedExpense: Expense = {
      ...existingExpense,
      ...updates,
      updatedAt: new Date()
    }

    // Validate updated expense
    const validatedExpense = ExpenseSchema.parse(updatedExpense)

    // Update in Redis
    const expenseKey = getExpenseKey(id)
    
    // Handle category changes
    if (updates.category && updates.category !== existingExpense.category) {
      const oldCategoryKey = getExpensesByCategoryKey(existingExpense.category)
      const newCategoryKey = getExpensesByCategoryKey(updates.category)
      
      const pipeline = db.pipeline()
      pipeline.srem(oldCategoryKey, id)
      pipeline.sadd(newCategoryKey, id)
      await pipeline.exec()
    }

    // Handle reimbursement status changes
    const reimbursementKey = getReimbursementExpensesKey()
    if (updates.needsReimbursement !== undefined || updates.isReimbursed !== undefined) {
      const shouldBeInReimbursementQueue = validatedExpense.needsReimbursement && !validatedExpense.isReimbursed
      const wasInReimbursementQueue = existingExpense.needsReimbursement && !existingExpense.isReimbursed
      
      if (shouldBeInReimbursementQueue && !wasInReimbursementQueue) {
        await db.sadd(reimbursementKey, id)
      } else if (!shouldBeInReimbursementQueue && wasInReimbursementQueue) {
        await db.srem(reimbursementKey, id)
      }
    }

    await db.hset(expenseKey, {
      ...validatedExpense,
      createdAt: validatedExpense.createdAt.toISOString(),
      updatedAt: validatedExpense.updatedAt.toISOString(),
      expenseDate: validatedExpense.expenseDate.toISOString(),
      reimbursedDate: validatedExpense.reimbursedDate?.toISOString() || '',
      receiptPhotos: JSON.stringify(validatedExpense.receiptPhotos),
      location: validatedExpense.location ? JSON.stringify(validatedExpense.location) : ''
    })

    return validatedExpense
  } catch (error) {
    console.error('Error updating expense:', error)
    throw error
  }
}

// Soft delete expense
export async function deleteExpense(id: string): Promise<boolean> {
  try {
    const existingExpense = await getExpense(id)
    if (!existingExpense) {
      return false
    }

    // Soft delete by setting deletedAt
    const expenseKey = getExpenseKey(id)
    await db.hset(expenseKey, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    return true
  } catch (error) {
    console.error('Error deleting expense:', error)
    return false
  }
}

// Get expenses with filters
export async function getExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
  try {
    let expenseIds: string[] = []

    if (filters) {
      const validatedFilters = ExpenseFiltersSchema.parse(filters)
      
      // Start with the most specific filter
      if (validatedFilters.propertyId) {
        const propertyExpensesKey = getPropertyExpensesKey(validatedFilters.propertyId)
        expenseIds = await db.smembers(propertyExpensesKey)
      } else if (validatedFilters.userId) {
        const userExpensesKey = getUserExpensesKey(validatedFilters.userId)
        expenseIds = await db.smembers(userExpensesKey)
      } else if (validatedFilters.category) {
        const categoryKey = getExpensesByCategoryKey(validatedFilters.category)
        expenseIds = await db.smembers(categoryKey)
      } else {
        const allExpensesKey = getAllExpensesKey()
        expenseIds = await db.smembers(allExpensesKey)
      }
    } else {
      const allExpensesKey = getAllExpensesKey()
      expenseIds = await db.smembers(allExpensesKey)
    }
    
    if (!expenseIds || expenseIds.length === 0) {
      return []
    }

    // Get all expenses in parallel
    const expenses = await Promise.all(
      expenseIds.map(id => getExpense(id))
    )

    // Filter out null values and apply additional filters
    let filteredExpenses = expenses.filter((expense): expense is Expense => expense !== null)

    if (filters) {
      const validatedFilters = ExpenseFiltersSchema.parse(filters)
      
      // Apply additional filters that couldn't be done at the Redis level
      if (validatedFilters.needsReimbursement !== undefined) {
        filteredExpenses = filteredExpenses.filter(e => e.needsReimbursement === validatedFilters.needsReimbursement)
      }
      
      if (validatedFilters.isReimbursed !== undefined) {
        filteredExpenses = filteredExpenses.filter(e => e.isReimbursed === validatedFilters.isReimbursed)
      }
      
      if (validatedFilters.expenseDateFrom) {
        filteredExpenses = filteredExpenses.filter(e => e.expenseDate >= validatedFilters.expenseDateFrom!)
      }
      
      if (validatedFilters.expenseDateTo) {
        filteredExpenses = filteredExpenses.filter(e => e.expenseDate <= validatedFilters.expenseDateTo!)
      }
      
      if (validatedFilters.amountMin !== undefined) {
        filteredExpenses = filteredExpenses.filter(e => e.amountCents >= validatedFilters.amountMin!)
      }
      
      if (validatedFilters.amountMax !== undefined) {
        filteredExpenses = filteredExpenses.filter(e => e.amountCents <= validatedFilters.amountMax!)
      }
    }

    // Sort by expense date (most recent first)
    return filteredExpenses.sort((a, b) => b.expenseDate.getTime() - a.expenseDate.getTime())
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return []
  }
}

// Get expenses needing reimbursement
export async function getReimbursementExpenses(propertyId?: string): Promise<Expense[]> {
  try {
    const reimbursementKey = getReimbursementExpensesKey()
    const expenseIds = await db.smembers(reimbursementKey)
    
    if (!expenseIds || expenseIds.length === 0) {
      return []
    }

    // Get all expenses in parallel
    const expenses = await Promise.all(
      expenseIds.map(id => getExpense(id))
    )

    // Filter out null values
    let filteredExpenses = expenses.filter((expense): expense is Expense => expense !== null)

    // Filter by property if specified
    if (propertyId) {
      filteredExpenses = filteredExpenses.filter(e => e.propertyId === propertyId)
    }

    return filteredExpenses.sort((a, b) => b.expenseDate.getTime() - a.expenseDate.getTime())
  } catch (error) {
    console.error('Error fetching reimbursement expenses:', error)
    return []
  }
}

// Mark expense as reimbursed
export async function markExpenseReimbursed(id: string, reimbursedDate?: Date): Promise<Expense | null> {
  try {
    return await updateExpense({
      id,
      isReimbursed: true,
      reimbursedDate: reimbursedDate || new Date()
    })
  } catch (error) {
    console.error('Error marking expense as reimbursed:', error)
    throw error
  }
}

// Get expense totals by category for a property
export async function getExpenseTotalsByCategory(propertyId: string, dateFrom?: Date, dateTo?: Date): Promise<Record<string, number>> {
  try {
    const filters: ExpenseFilters = { propertyId }
    
    if (dateFrom) filters.expenseDateFrom = dateFrom
    if (dateTo) filters.expenseDateTo = dateTo
    
    const expenses = await getExpenses(filters)
    
    const totals: Record<string, number> = {}
    
    expenses.forEach(expense => {
      const categoryId = expense.categorySelection?.categoryId || expense.category || 'other'
      if (!totals[categoryId]) {
        totals[categoryId] = 0
      }
      totals[categoryId] += expense.amountCents
    })
    
    return totals
  } catch (error) {
    console.error('Error calculating expense totals by category:', error)
    return {}
  }
}

// Get category suggestions for an expense
export async function getExpenseCategorySuggestions(
  merchantName: string,
  description: string,
  propertyId: string
): Promise<{ categoryId: string; subcategoryId?: string; confidence: number; reason: string }[]> {
  try {
    return await getCategorySuggestions(merchantName, description, propertyId)
  } catch (error) {
    console.error('Error getting expense category suggestions:', error)
    return []
  }
}

// Enhanced category suggestions with ML and OCR
export async function getEnhancedCategorySuggestions(
  merchantName: string,
  description: string,
  receiptPhotos: string[],
  propertyId: string
): Promise<CategorySuggestion[]> {
  try {
    let receiptText = ''
    let ocrResults: OCRAnalysisResult[] = []
    
    // Process receipt images if available
    if (receiptPhotos.length > 0) {
      for (const receiptUrl of receiptPhotos.slice(0, 3)) { // Process up to 3 receipts
        try {
          const ocrResult = await processReceiptImage(receiptUrl)
          ocrResults.push(ocrResult)
          receiptText += ` ${ocrResult.extractedText}`
        } catch (error) {
          console.error('Error processing receipt image:', error)
        }
      }
    }
    
    // Get ML-based suggestions
    const mlSuggestions = await getMLCategorySuggestions(
      merchantName,
      description,
      receiptText.trim(),
      propertyId
    )
    
    // Get basic pattern suggestions as fallback
    const basicSuggestions = await getCategorySuggestions(merchantName, description, propertyId)
    
    // Convert basic suggestions to CategorySuggestion format
    const convertedBasicSuggestions: CategorySuggestion[] = basicSuggestions.map(s => ({
      categoryId: s.categoryId,
      subcategoryId: s.subcategoryId,
      confidence: s.confidence,
      reason: s.reason as 'merchant' | 'ocr' | 'pattern' | 'manual' | 'ml',
      suggestions: [s.reason]
    }))
    
    // Combine and deduplicate suggestions
    const allSuggestions = [...mlSuggestions, ...convertedBasicSuggestions]
    const uniqueSuggestions = allSuggestions.reduce((acc, current) => {
      const existing = acc.find(s => 
        s.categoryId === current.categoryId && 
        s.subcategoryId === current.subcategoryId
      )
      
      if (!existing || current.confidence > existing.confidence) {
        return [
          ...acc.filter(s => !(s.categoryId === current.categoryId && s.subcategoryId === current.subcategoryId)),
          current
        ]
      }
      return acc
    }, [] as CategorySuggestion[])
    
    return uniqueSuggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5) // Return top 5 suggestions
  } catch (error) {
    console.error('Error getting enhanced category suggestions:', error)
    return []
  }
}

// Process receipt text for categorization
export async function processReceiptForCategorization(
  receiptText: string
): Promise<{ categoryHints: string[]; confidence: number; extractedData: any }> {
  try {
    const analysis = analyzeReceiptText(receiptText)
    
    return {
      categoryHints: analysis.categoryHints,
      confidence: analysis.confidence,
      extractedData: {
        merchantName: analysis.merchantName,
        amount: analysis.amount,
        date: analysis.date
      }
    }
  } catch (error) {
    console.error('Error processing receipt text:', error)
    return {
      categoryHints: [],
      confidence: 0,
      extractedData: {}
    }
  }
}

// Learn from user categorization feedback
export async function recordCategorizationFeedback(
  originalSuggestions: CategorySuggestion[],
  userSelection: { categoryId: string; subcategoryId?: string },
  merchantName: string,
  description: string,
  receiptText: string,
  propertyId: string
): Promise<void> {
  try {
    const combinedText = `${merchantName} ${description} ${receiptText}`.trim()
    await learnFromUserFeedback(originalSuggestions, userSelection, combinedText, propertyId)
  } catch (error) {
    console.error('Error recording categorization feedback:', error)
  }
}
