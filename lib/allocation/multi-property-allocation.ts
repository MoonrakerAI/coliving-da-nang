import { Expense } from '../db/models/expense'
import { getExpenses, updateExpense } from '../db/operations/expenses'
import { v4 as uuidv4 } from 'uuid'

// Multi-property allocation interfaces
export interface PropertyAllocation {
  propertyId: string
  propertyName: string
  percentage: number
  amount: number
  allocationMethod: 'percentage' | 'fixed' | 'usage-based' | 'square-footage'
  justification?: string
}

export interface AllocationRule {
  id: string
  name: string
  description: string
  categoryIds: string[]
  subcategoryIds?: string[]
  keywords: string[]
  allocationMethod: 'equal' | 'percentage' | 'usage-based' | 'square-footage' | 'custom'
  defaultAllocations: PropertyAllocation[]
  isActive: boolean
  createdBy: string
  createdAt: Date
  lastModified: Date
}

export interface SharedExpense {
  id: string
  originalExpenseId: string
  originalAmount: number
  description: string
  categoryId: string
  subcategoryId?: string
  expenseDate: Date
  allocations: PropertyAllocation[]
  allocationMethod: string
  totalAllocated: number
  remainingAmount: number
  status: 'pending' | 'approved' | 'allocated' | 'rejected'
  createdBy: string
  approvedBy?: string
  createdAt: Date
  allocatedAt?: Date
}

export interface PropertyMetrics {
  propertyId: string
  propertyName: string
  squareFootage?: number
  unitCount?: number
  occupancyRate?: number
  monthlyRevenue?: number
  usageMetrics?: {
    [metric: string]: number
  }
}

export interface AllocationSummary {
  period: {
    start: Date
    end: Date
  }
  totalSharedExpenses: number
  totalAllocatedAmount: number
  propertyBreakdown: {
    [propertyId: string]: {
      propertyName: string
      allocatedAmount: number
      expenseCount: number
      allocationPercentage: number
      categoryBreakdown: { [categoryId: string]: number }
    }
  }
  allocationMethods: {
    [method: string]: {
      amount: number
      count: number
      percentage: number
    }
  }
}

// Predefined allocation rules
export const DEFAULT_ALLOCATION_RULES: Omit<AllocationRule, 'id' | 'createdBy' | 'createdAt' | 'lastModified'>[] = [
  {
    name: 'Utilities - Equal Split',
    description: 'Split utilities equally among all properties',
    categoryIds: ['utilities'],
    keywords: ['electric', 'gas', 'water', 'internet', 'cable'],
    allocationMethod: 'equal',
    defaultAllocations: [],
    isActive: true
  },
  {
    name: 'Maintenance - Square Footage Based',
    description: 'Allocate maintenance costs based on property square footage',
    categoryIds: ['maintenance', 'repairs'],
    keywords: ['maintenance', 'repair', 'landscaping', 'painting'],
    allocationMethod: 'square-footage',
    defaultAllocations: [],
    isActive: true
  },
  {
    name: 'Cleaning - Unit Count Based',
    description: 'Allocate cleaning costs based on number of units',
    categoryIds: ['cleaning'],
    keywords: ['cleaning', 'maid', 'janitorial'],
    allocationMethod: 'usage-based',
    defaultAllocations: [],
    isActive: true
  },
  {
    name: 'Insurance - Revenue Based',
    description: 'Allocate insurance costs based on property revenue',
    categoryIds: ['other'],
    subcategoryIds: ['insurance'],
    keywords: ['insurance', 'liability', 'property insurance'],
    allocationMethod: 'percentage',
    defaultAllocations: [],
    isActive: true
  }
]

// Create allocation rule
export async function createAllocationRule(
  rule: Omit<AllocationRule, 'id' | 'createdAt' | 'lastModified'>,
  propertyMetrics: PropertyMetrics[]
): Promise<AllocationRule> {
  const id = uuidv4()
  const now = new Date()
  
  // Generate default allocations based on method
  const defaultAllocations = generateDefaultAllocations(
    rule.allocationMethod,
    propertyMetrics
  )
  
  const allocationRule: AllocationRule = {
    ...rule,
    id,
    defaultAllocations,
    createdAt: now,
    lastModified: now
  }
  
  // In production, this would be stored in database
  console.log('Created allocation rule:', allocationRule)
  
  return allocationRule
}

// Generate default allocations based on method
function generateDefaultAllocations(
  method: AllocationRule['allocationMethod'],
  propertyMetrics: PropertyMetrics[]
): PropertyAllocation[] {
  const allocations: PropertyAllocation[] = []
  
  switch (method) {
    case 'equal':
      const equalPercentage = 100 / propertyMetrics.length
      for (const property of propertyMetrics) {
        allocations.push({
          propertyId: property.propertyId,
          propertyName: property.propertyName,
          percentage: equalPercentage,
          amount: 0, // Will be calculated when applied
          allocationMethod: 'percentage',
          justification: 'Equal split among all properties'
        })
      }
      break
      
    case 'square-footage':
      const totalSquareFootage = propertyMetrics.reduce(
        (sum, p) => sum + (p.squareFootage || 0), 0
      )
      
      if (totalSquareFootage > 0) {
        for (const property of propertyMetrics) {
          const percentage = ((property.squareFootage || 0) / totalSquareFootage) * 100
          allocations.push({
            propertyId: property.propertyId,
            propertyName: property.propertyName,
            percentage,
            amount: 0,
            allocationMethod: 'square-footage',
            justification: `Based on ${property.squareFootage} sq ft of ${totalSquareFootage} total`
          })
        }
      }
      break
      
    case 'usage-based':
      const totalUnits = propertyMetrics.reduce(
        (sum, p) => sum + (p.unitCount || 0), 0
      )
      
      if (totalUnits > 0) {
        for (const property of propertyMetrics) {
          const percentage = ((property.unitCount || 0) / totalUnits) * 100
          allocations.push({
            propertyId: property.propertyId,
            propertyName: property.propertyName,
            percentage,
            amount: 0,
            allocationMethod: 'usage-based',
            justification: `Based on ${property.unitCount} units of ${totalUnits} total`
          })
        }
      }
      break
      
    case 'percentage':
      const totalRevenue = propertyMetrics.reduce(
        (sum, p) => sum + (p.monthlyRevenue || 0), 0
      )
      
      if (totalRevenue > 0) {
        for (const property of propertyMetrics) {
          const percentage = ((property.monthlyRevenue || 0) / totalRevenue) * 100
          allocations.push({
            propertyId: property.propertyId,
            propertyName: property.propertyName,
            percentage,
            amount: 0,
            allocationMethod: 'percentage',
            justification: `Based on $${property.monthlyRevenue} revenue of $${totalRevenue} total`
          })
        }
      }
      break
  }
  
  return allocations
}

// Find applicable allocation rule for an expense
export function findApplicableAllocationRule(
  expense: Expense,
  allocationRules: AllocationRule[]
): AllocationRule | null {
  for (const rule of allocationRules.filter(r => r.isActive)) {
    // Check category match
    const categoryId = expense.categorySelection?.categoryId || expense.category || 'other'
    if (rule.categoryIds.includes(categoryId)) {
      return rule
    }
    
    // Check subcategory match
    if (rule.subcategoryIds && expense.categorySelection?.subcategoryId) {
      if (rule.subcategoryIds.includes(expense.categorySelection.subcategoryId)) {
        return rule
      }
    }
    
    // Check keyword match
    const description = expense.description.toLowerCase()
    for (const keyword of rule.keywords) {
      if (description.includes(keyword.toLowerCase())) {
        return rule
      }
    }
  }
  
  return null
}

// Create shared expense allocation
export async function createSharedExpenseAllocation(
  expense: Expense,
  allocations: PropertyAllocation[],
  allocationMethod: string,
  createdBy: string
): Promise<SharedExpense> {
  // Validate allocations
  const totalPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0)
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error('Allocation percentages must sum to 100%')
  }
  
  // Calculate amounts
  const allocationsWithAmounts = allocations.map(allocation => ({
    ...allocation,
    amount: Math.round(expense.amountCents * (allocation.percentage / 100))
  }))
  
  const totalAllocated = allocationsWithAmounts.reduce((sum, a) => sum + a.amount, 0)
  const remainingAmount = expense.amountCents - totalAllocated
  
  const sharedExpense: SharedExpense = {
    id: uuidv4(),
    originalExpenseId: expense.id,
    originalAmount: expense.amountCents,
    description: expense.description,
    categoryId: expense.categorySelection?.categoryId || expense.category || 'other',
    subcategoryId: expense.categorySelection?.subcategoryId,
    expenseDate: expense.expenseDate,
    allocations: allocationsWithAmounts,
    allocationMethod,
    totalAllocated,
    remainingAmount,
    status: 'pending',
    createdBy,
    createdAt: new Date()
  }
  
  // In production, this would be stored in database
  console.log('Created shared expense allocation:', sharedExpense)
  
  return sharedExpense
}

// Apply allocation to create individual property expenses
export async function applyAllocation(
  sharedExpense: SharedExpense,
  approvedBy: string
): Promise<Expense[]> {
  const createdExpenses: Expense[] = []
  
  for (const allocation of sharedExpense.allocations) {
    if (allocation.amount > 0) {
      // Create new expense for this property
      const newExpense: Expense = {
        id: uuidv4(),
        propertyId: allocation.propertyId,
        userId: sharedExpense.createdBy,
        amountCents: allocation.amount,
        currency: 'USD', // Would be from original expense
        categorySelection: {
          categoryId: sharedExpense.categoryId,
          subcategoryId: sharedExpense.subcategoryId,
          confidence: 1.0,
          isAutoSuggested: false
        },
        description: `${sharedExpense.description} (Allocated: ${allocation.percentage.toFixed(1)}% - ${allocation.justification})`,
        receiptPhotos: [], // Original receipts would be referenced
        needsReimbursement: false,
        isReimbursed: false,
        location: undefined,
        expenseDate: sharedExpense.expenseDate,
        createdBy: sharedExpense.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        isTaxDeductible: true,
        taxCategory: 'Other Business Expenses',
        propertyAllocation: [{
          propertyId: allocation.propertyId,
          percentage: allocation.percentage,
          amount: allocation.amount
        }]
      }
      
      createdExpenses.push(newExpense)
    }
  }
  
  // Update shared expense status
  sharedExpense.status = 'allocated'
  sharedExpense.approvedBy = approvedBy
  sharedExpense.allocatedAt = new Date()
  
  // In production, would save to database
  console.log('Applied allocation, created expenses:', createdExpenses.length)
  
  return createdExpenses
}

// Calculate allocation suggestions based on historical data
export async function calculateAllocationSuggestions(
  expense: Expense,
  propertyMetrics: PropertyMetrics[],
  allocationRules: AllocationRule[]
): Promise<{
  suggestedAllocations: PropertyAllocation[]
  allocationMethod: string
  confidence: number
  reasoning: string
}> {
  // Find applicable rule
  const applicableRule = findApplicableAllocationRule(expense, allocationRules)
  
  if (applicableRule) {
    const allocations = generateDefaultAllocations(
      applicableRule.allocationMethod,
      propertyMetrics
    )
    
    // Calculate amounts
    const allocationsWithAmounts = allocations.map(allocation => ({
      ...allocation,
      amount: Math.round(expense.amountCents * (allocation.percentage / 100))
    }))
    
    return {
      suggestedAllocations: allocationsWithAmounts,
      allocationMethod: applicableRule.allocationMethod,
      confidence: 0.8,
      reasoning: `Applied rule: ${applicableRule.name} - ${applicableRule.description}`
    }
  }
  
  // Default to equal split if no rule found
  const equalAllocations = generateDefaultAllocations('equal', propertyMetrics)
  const allocationsWithAmounts = equalAllocations.map(allocation => ({
    ...allocation,
    amount: Math.round(expense.amountCents * (allocation.percentage / 100))
  }))
  
  return {
    suggestedAllocations: allocationsWithAmounts,
    allocationMethod: 'equal',
    confidence: 0.4,
    reasoning: 'No specific allocation rule found, suggesting equal split'
  }
}

// Generate allocation summary report
export async function generateAllocationSummary(
  propertyIds: string[],
  startDate: Date,
  endDate: Date
): Promise<AllocationSummary> {
  // This would fetch actual data from database
  // For now, returning mock structure
  
  const propertyBreakdown: AllocationSummary['propertyBreakdown'] = {}
  const allocationMethods: AllocationSummary['allocationMethods'] = {}
  
  // Mock data structure
  for (const propertyId of propertyIds) {
    propertyBreakdown[propertyId] = {
      propertyName: `Property ${propertyId}`,
      allocatedAmount: 0,
      expenseCount: 0,
      allocationPercentage: 0,
      categoryBreakdown: {}
    }
  }
  
  return {
    period: { start: startDate, end: endDate },
    totalSharedExpenses: 0,
    totalAllocatedAmount: 0,
    propertyBreakdown,
    allocationMethods
  }
}

// Validate allocation consistency
export function validateAllocation(allocations: PropertyAllocation[]): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check percentage sum
  const totalPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0)
  if (Math.abs(totalPercentage - 100) > 0.01) {
    errors.push(`Total allocation percentage is ${totalPercentage.toFixed(2)}%, must equal 100%`)
  }
  
  // Check for negative values
  for (const allocation of allocations) {
    if (allocation.percentage < 0) {
      errors.push(`Property ${allocation.propertyName} has negative percentage: ${allocation.percentage}%`)
    }
    if (allocation.amount < 0) {
      errors.push(`Property ${allocation.propertyName} has negative amount: $${allocation.amount / 100}`)
    }
  }
  
  // Check for zero allocations
  const zeroAllocations = allocations.filter(a => a.percentage === 0)
  if (zeroAllocations.length > 0) {
    warnings.push(`${zeroAllocations.length} properties have 0% allocation`)
  }
  
  // Check for very small allocations
  const smallAllocations = allocations.filter(a => a.percentage > 0 && a.percentage < 1)
  if (smallAllocations.length > 0) {
    warnings.push(`${smallAllocations.length} properties have very small allocations (<1%)`)
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Bulk allocation processing
export async function processBulkAllocations(
  expenseIds: string[],
  allocationTemplate: PropertyAllocation[],
  allocationMethod: string,
  createdBy: string
): Promise<{
  successful: SharedExpense[]
  failed: { expenseId: string; error: string }[]
}> {
  const successful: SharedExpense[] = []
  const failed: { expenseId: string; error: string }[] = []
  
  for (const expenseId of expenseIds) {
    try {
      // In production, would fetch expense from database
      const expense = {
        id: expenseId,
        amountCents: 10000, // Mock data
        description: 'Mock expense',
        categorySelection: { categoryId: 'utilities' },
        expenseDate: new Date()
      } as Expense
      
      const sharedExpense = await createSharedExpenseAllocation(
        expense,
        allocationTemplate,
        allocationMethod,
        createdBy
      )
      
      successful.push(sharedExpense)
    } catch (error) {
      failed.push({
        expenseId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
  
  return { successful, failed }
}

// Allocation audit trail
export interface AllocationAuditEntry {
  id: string
  sharedExpenseId: string
  action: 'created' | 'modified' | 'approved' | 'rejected' | 'allocated'
  performedBy: string
  performedAt: Date
  changes?: {
    field: string
    oldValue: any
    newValue: any
  }[]
  notes?: string
}

export async function createAuditEntry(
  sharedExpenseId: string,
  action: AllocationAuditEntry['action'],
  performedBy: string,
  changes?: AllocationAuditEntry['changes'],
  notes?: string
): Promise<AllocationAuditEntry> {
  const auditEntry: AllocationAuditEntry = {
    id: uuidv4(),
    sharedExpenseId,
    action,
    performedBy,
    performedAt: new Date(),
    changes,
    notes
  }
  
  // In production, would save to database
  console.log('Created audit entry:', auditEntry)
  
  return auditEntry
}

// Cost center allocation (for advanced accounting)
export interface CostCenter {
  id: string
  name: string
  description: string
  propertyIds: string[]
  allocationRules: {
    categoryId: string
    percentage: number
  }[]
}

export function allocateToCostCenters(
  expense: Expense,
  costCenters: CostCenter[]
): PropertyAllocation[] {
  const allocations: PropertyAllocation[] = []
  
  for (const costCenter of costCenters) {
    // Find applicable rule for this expense category
    const categoryId = expense.categorySelection?.categoryId || expense.category || 'other'
    const rule = costCenter.allocationRules.find(r => r.categoryId === categoryId)
    
    if (rule && rule.percentage > 0) {
      // Allocate to all properties in this cost center
      const propertiesInCenter = costCenter.propertyIds.length
      const percentagePerProperty = rule.percentage / propertiesInCenter
      
      for (const propertyId of costCenter.propertyIds) {
        allocations.push({
          propertyId,
          propertyName: `Property ${propertyId}`,
          percentage: percentagePerProperty,
          amount: Math.round(expense.amountCents * (percentagePerProperty / 100)),
          allocationMethod: 'percentage',
          justification: `Cost center: ${costCenter.name} (${rule.percentage}% split among ${propertiesInCenter} properties)`
        })
      }
    }
  }
  
  return allocations
}
