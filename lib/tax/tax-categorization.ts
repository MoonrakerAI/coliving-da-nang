import { Expense } from '../db/models/expense'
import { getExpenses } from '../db/operations/expenses'
import { ExpenseFilters } from '../db/models/expense'

// Tax-related interfaces and types
export interface TaxRule {
  id: string
  name: string
  description: string
  categoryIds: string[]
  subcategoryIds?: string[]
  keywords: string[]
  isDeductible: boolean
  deductionPercentage: number // 0-100, for partial deductions
  taxCategory: string
  irsCode?: string
  requirements: string[]
  limitations: string[]
  documentation: string[]
}

export interface TaxClassification {
  expenseId: string
  isDeductible: boolean
  deductionPercentage: number
  taxCategory: string
  irsCategory: string
  confidence: number
  appliedRules: string[]
  warnings: string[]
  requiredDocumentation: string[]
}

export interface TaxYearSummary {
  taxYear: number
  propertyId: string
  totalExpenses: number
  totalDeductible: number
  totalNonDeductible: number
  deductiblePercentage: number
  categoryBreakdown: { [irsCategory: string]: TaxCategoryTotal }
  depreciation: DepreciationSummary
  warnings: string[]
  recommendations: string[]
}

export interface TaxCategoryTotal {
  irsCategory: string
  description: string
  totalAmount: number
  expenseCount: number
  averageAmount: number
  deductionLimits?: {
    maxAmount?: number
    percentageLimit?: number
    carryoverAllowed: boolean
  }
}

export interface DepreciationSummary {
  totalDepreciableAssets: number
  currentYearDepreciation: number
  accumulatedDepreciation: number
  remainingDepreciableValue: number
  depreciationSchedule: {
    year: number
    amount: number
    method: string
  }[]
}

// IRS Business Expense Categories (2024)
export const IRS_CATEGORIES = {
  ADVERTISING: {
    code: '1',
    name: 'Advertising',
    description: 'Advertising and promotional expenses',
    deductible: true,
    limitations: ['Must be ordinary and necessary for business']
  },
  CAR_TRUCK: {
    code: '2',
    name: 'Car and Truck Expenses',
    description: 'Vehicle expenses for business use',
    deductible: true,
    limitations: ['Business use percentage only', 'Detailed mileage logs required']
  },
  COMMISSIONS_FEES: {
    code: '3',
    name: 'Commissions and Fees',
    description: 'Professional fees and commissions',
    deductible: true,
    limitations: ['Must be business-related']
  },
  CONTRACT_LABOR: {
    code: '4',
    name: 'Contract Labor',
    description: 'Payments to independent contractors',
    deductible: true,
    limitations: ['1099 forms required for payments over $600']
  },
  DEPLETION: {
    code: '5',
    name: 'Depletion',
    description: 'Depletion of natural resources',
    deductible: true,
    limitations: ['Specific calculation methods required']
  },
  DEPRECIATION: {
    code: '6',
    name: 'Depreciation',
    description: 'Depreciation of business assets',
    deductible: true,
    limitations: ['Must follow IRS depreciation schedules']
  },
  EMPLOYEE_BENEFITS: {
    code: '7',
    name: 'Employee Benefit Programs',
    description: 'Employee benefits and programs',
    deductible: true,
    limitations: ['Must be for employees, not owners']
  },
  INSURANCE: {
    code: '8',
    name: 'Insurance',
    description: 'Business insurance premiums',
    deductible: true,
    limitations: ['Business-related insurance only']
  },
  INTEREST: {
    code: '9',
    name: 'Interest',
    description: 'Business loan interest and finance charges',
    deductible: true,
    limitations: ['Personal interest not deductible']
  },
  LEGAL_PROFESSIONAL: {
    code: '10',
    name: 'Legal and Professional Services',
    description: 'Attorney, accountant, and consultant fees',
    deductible: true,
    limitations: ['Must be business-related']
  },
  OFFICE_EXPENSE: {
    code: '11',
    name: 'Office Expense',
    description: 'Office supplies and expenses',
    deductible: true,
    limitations: ['Must be ordinary and necessary']
  },
  PENSION_PROFIT_SHARING: {
    code: '12',
    name: 'Pension and Profit-Sharing Plans',
    description: 'Retirement plan contributions',
    deductible: true,
    limitations: ['Subject to contribution limits']
  },
  RENT_LEASE: {
    code: '13',
    name: 'Rent or Lease',
    description: 'Equipment, vehicle, and property rent',
    deductible: true,
    limitations: ['Business use only']
  },
  REPAIRS_MAINTENANCE: {
    code: '14',
    name: 'Repairs and Maintenance',
    description: 'Repairs and maintenance of business property',
    deductible: true,
    limitations: ['Improvements may need to be capitalized']
  },
  SUPPLIES: {
    code: '15',
    name: 'Supplies',
    description: 'Business supplies and materials',
    deductible: true,
    limitations: ['Must be used in current tax year']
  },
  TAXES_LICENSES: {
    code: '16',
    name: 'Taxes and Licenses',
    description: 'Business taxes and licenses',
    deductible: true,
    limitations: ['Federal income tax not deductible']
  },
  TRAVEL: {
    code: '17',
    name: 'Travel',
    description: 'Business travel expenses',
    deductible: true,
    limitations: ['Must be ordinary, necessary, and away from home']
  },
  MEALS: {
    code: '18',
    name: 'Meals',
    description: 'Business meal expenses',
    deductible: true,
    deductionPercentage: 50,
    limitations: ['Generally 50% deductible', 'Must be business-related']
  },
  UTILITIES: {
    code: '19',
    name: 'Utilities',
    description: 'Business utilities',
    deductible: true,
    limitations: ['Business portion only']
  },
  WAGES: {
    code: '20',
    name: 'Wages',
    description: 'Employee wages and salaries',
    deductible: true,
    limitations: ['Payroll taxes must be paid']
  },
  OTHER: {
    code: '21',
    name: 'Other Expenses',
    description: 'Other ordinary and necessary business expenses',
    deductible: true,
    limitations: ['Must be ordinary and necessary']
  }
} as const

// Tax rules for automatic classification
export const TAX_RULES: TaxRule[] = [
  {
    id: 'utilities-deductible',
    name: 'Utilities - Fully Deductible',
    description: 'Business utilities are fully deductible',
    categoryIds: ['utilities'],
    keywords: ['electric', 'gas', 'water', 'internet', 'phone', 'cable'],
    isDeductible: true,
    deductionPercentage: 100,
    taxCategory: 'Utilities',
    irsCode: '19',
    requirements: ['Must be for business property'],
    limitations: ['Business use portion only'],
    documentation: ['Utility bills', 'Property records']
  },
  {
    id: 'repairs-maintenance-deductible',
    name: 'Repairs and Maintenance',
    description: 'Ordinary repairs and maintenance are deductible',
    categoryIds: ['repairs', 'maintenance'],
    keywords: ['repair', 'fix', 'maintenance', 'service'],
    isDeductible: true,
    deductionPercentage: 100,
    taxCategory: 'Repairs and Maintenance',
    irsCode: '14',
    requirements: ['Must be ordinary repairs, not improvements'],
    limitations: ['Capital improvements must be depreciated'],
    documentation: ['Receipts', 'Work orders', 'Before/after photos']
  },
  {
    id: 'supplies-deductible',
    name: 'Business Supplies',
    description: 'Business supplies are deductible when used',
    categoryIds: ['supplies'],
    keywords: ['supplies', 'materials', 'office', 'cleaning'],
    isDeductible: true,
    deductionPercentage: 100,
    taxCategory: 'Supplies',
    irsCode: '15',
    requirements: ['Must be used in current tax year'],
    limitations: ['Inventory items may need different treatment'],
    documentation: ['Receipts', 'Usage records']
  },
  {
    id: 'cleaning-services-deductible',
    name: 'Cleaning Services',
    description: 'Professional cleaning services are deductible',
    categoryIds: ['cleaning'],
    keywords: ['cleaning', 'maid', 'janitorial', 'housekeeping'],
    isDeductible: true,
    deductionPercentage: 100,
    taxCategory: 'Other Expenses',
    irsCode: '21',
    requirements: ['Must be for business property'],
    limitations: ['Personal cleaning not deductible'],
    documentation: ['Service contracts', 'Invoices']
  },
  {
    id: 'insurance-deductible',
    name: 'Business Insurance',
    description: 'Business insurance premiums are deductible',
    categoryIds: ['other'],
    subcategoryIds: ['insurance'],
    keywords: ['insurance', 'premium', 'liability', 'property'],
    isDeductible: true,
    deductionPercentage: 100,
    taxCategory: 'Insurance',
    irsCode: '8',
    requirements: ['Must be business-related insurance'],
    limitations: ['Personal insurance not deductible'],
    documentation: ['Insurance policies', 'Premium statements']
  },
  {
    id: 'legal-professional-deductible',
    name: 'Legal and Professional Services',
    description: 'Business legal and professional fees are deductible',
    categoryIds: ['other'],
    subcategoryIds: ['legal', 'professional'],
    keywords: ['attorney', 'lawyer', 'accountant', 'consultant', 'professional'],
    isDeductible: true,
    deductionPercentage: 100,
    taxCategory: 'Legal and Professional Services',
    irsCode: '10',
    requirements: ['Must be business-related services'],
    limitations: ['Personal legal fees not deductible'],
    documentation: ['Service agreements', 'Invoices', 'Engagement letters']
  }
]

// Classify expense for tax purposes
export function classifyExpenseForTax(expense: Expense): TaxClassification {
  const appliedRules: string[] = []
  const warnings: string[] = []
  const requiredDocumentation: string[] = []
  
  let isDeductible = false
  let deductionPercentage = 0
  let taxCategory = 'Other Expenses'
  let irsCategory = 'Other Expenses'
  let confidence = 0.5

  // Apply tax rules
  for (const rule of TAX_RULES) {
    let ruleApplies = false

    // Check category match
    const categoryId = expense.categorySelection?.categoryId || expense.category || 'other'
    if (rule.categoryIds.includes(categoryId)) {
      ruleApplies = true
    }

    // Check subcategory match
    if (rule.subcategoryIds && expense.categorySelection?.subcategoryId) {
      if (rule.subcategoryIds.includes(expense.categorySelection.subcategoryId)) {
        ruleApplies = true
      }
    }

    // Check keyword match
    const description = expense.description.toLowerCase()
    for (const keyword of rule.keywords) {
      if (description.includes(keyword.toLowerCase())) {
        ruleApplies = true
        break
      }
    }

    if (ruleApplies) {
      appliedRules.push(rule.id)
      isDeductible = rule.isDeductible
      deductionPercentage = rule.deductionPercentage
      taxCategory = rule.taxCategory
      irsCategory = rule.taxCategory
      confidence = Math.min(0.9, confidence + 0.3)
      
      // Add requirements and documentation
      requiredDocumentation.push(...rule.documentation)
      
      // Add warnings for limitations
      if (rule.limitations.length > 0) {
        warnings.push(`${rule.name}: ${rule.limitations.join(', ')}`)
      }
      
      break // Use first matching rule
    }
  }

  // Default classification if no rules apply
  if (appliedRules.length === 0) {
    // Conservative approach - mark as potentially deductible but require review
    isDeductible = true
    deductionPercentage = 100
    taxCategory = 'Other Expenses'
    irsCategory = 'Other Expenses'
    confidence = 0.3
    warnings.push('No specific tax rule found - requires manual review')
    requiredDocumentation.push('Receipt', 'Business purpose documentation')
  }

  return {
    expenseId: expense.id,
    isDeductible,
    deductionPercentage,
    taxCategory,
    irsCategory,
    confidence,
    appliedRules,
    warnings,
    requiredDocumentation: Array.from(new Set(requiredDocumentation))
  }
}

// Generate tax year summary
export async function generateTaxYearSummary(
  propertyId: string,
  taxYear: number
): Promise<TaxYearSummary> {
  try {
    const startDate = new Date(taxYear, 0, 1)
    const endDate = new Date(taxYear, 11, 31)

    const expenses = await getExpenses({
      propertyId,
      expenseDateFrom: startDate,
      expenseDateTo: endDate
    })

    let totalExpenses = 0
    let totalDeductible = 0
    let totalNonDeductible = 0
    const categoryBreakdown: { [irsCategory: string]: TaxCategoryTotal } = {}
    const warnings: string[] = []
    const recommendations: string[] = []

    // Process each expense
    for (const expense of expenses) {
      totalExpenses += expense.amountCents
      
      const classification = classifyExpenseForTax(expense)
      
      if (classification.isDeductible) {
        const deductibleAmount = Math.round(expense.amountCents * (classification.deductionPercentage / 100))
        totalDeductible += deductibleAmount
        totalNonDeductible += expense.amountCents - deductibleAmount
      } else {
        totalNonDeductible += expense.amountCents
      }

      // Update category breakdown
      const irsCategory = classification.irsCategory
      if (!categoryBreakdown[irsCategory]) {
        categoryBreakdown[irsCategory] = {
          irsCategory,
          description: getIRSCategoryDescription(irsCategory),
          totalAmount: 0,
          expenseCount: 0,
          averageAmount: 0
        }
      }

      const categoryTotal = categoryBreakdown[irsCategory]
      const deductibleAmount = classification.isDeductible 
        ? Math.round(expense.amountCents * (classification.deductionPercentage / 100))
        : 0
      
      categoryTotal.totalAmount += deductibleAmount
      categoryTotal.expenseCount += 1

      // Collect warnings
      if (classification.warnings.length > 0) {
        warnings.push(...classification.warnings)
      }
    }

    // Calculate averages
    for (const category of Object.values(categoryBreakdown)) {
      category.averageAmount = category.expenseCount > 0 
        ? category.totalAmount / category.expenseCount 
        : 0
    }

    const deductiblePercentage = totalExpenses > 0 
      ? (totalDeductible / totalExpenses) * 100 
      : 0

    // Generate recommendations
    recommendations.push(...generateTaxRecommendations(categoryBreakdown, deductiblePercentage))

    return {
      taxYear,
      propertyId,
      totalExpenses,
      totalDeductible,
      totalNonDeductible,
      deductiblePercentage,
      categoryBreakdown,
      depreciation: {
        totalDepreciableAssets: 0, // Would be calculated from asset records
        currentYearDepreciation: 0,
        accumulatedDepreciation: 0,
        remainingDepreciableValue: 0,
        depreciationSchedule: []
      },
      warnings: Array.from(new Set(warnings)),
      recommendations
    }
  } catch (error) {
    console.error('Error generating tax year summary:', error)
    throw error
  }
}

// Helper functions
function getIRSCategoryDescription(categoryName: string): string {
  const category = Object.values(IRS_CATEGORIES).find(cat => cat.name === categoryName)
  return category?.description || categoryName
}

function generateTaxRecommendations(
  categoryBreakdown: { [irsCategory: string]: TaxCategoryTotal },
  deductiblePercentage: number
): string[] {
  const recommendations: string[] = []

  // Overall deduction recommendations
  if (deductiblePercentage < 70) {
    recommendations.push('Consider reviewing expense categorization to maximize deductions')
  }

  // Category-specific recommendations
  const categories = Object.values(categoryBreakdown)
  const topCategories = categories
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 3)

  if (topCategories.length > 0) {
    recommendations.push(`Top expense categories: ${topCategories.map(c => c.irsCategory).join(', ')}`)
  }

  // Documentation recommendations
  recommendations.push('Ensure all receipts and documentation are properly organized')
  recommendations.push('Consider consulting with a tax professional for complex situations')

  return recommendations
}

// Validate tax documentation
export function validateTaxDocumentation(
  expense: Expense,
  classification: TaxClassification
): {
  isComplete: boolean
  missingDocuments: string[]
  recommendations: string[]
} {
  const missingDocuments: string[] = []
  const recommendations: string[] = []

  // Check for receipt
  if (expense.receiptPhotos.length === 0) {
    missingDocuments.push('Receipt or invoice')
    recommendations.push('Upload receipt photo for this expense')
  }

  // Check for business purpose documentation
  if (expense.description.length < 10) {
    missingDocuments.push('Detailed business purpose description')
    recommendations.push('Add more detailed description of business purpose')
  }

  // Check for required documentation based on classification
  for (const doc of classification.requiredDocumentation) {
    if (doc === 'Receipt' && expense.receiptPhotos.length === 0) {
      continue // Already handled above
    }
    
    // Additional checks would be implemented here
    // For now, assume all other documentation is missing
    if (doc !== 'Receipt') {
      missingDocuments.push(doc)
      recommendations.push(`Ensure ${doc.toLowerCase()} is available for tax purposes`)
    }
  }

  return {
    isComplete: missingDocuments.length === 0,
    missingDocuments,
    recommendations
  }
}

// Export tax data for tax preparation software
export function exportTaxData(
  summary: TaxYearSummary,
  format: 'turbotax' | 'hrblock' | 'generic' = 'generic'
): any {
  const taxData: {
    taxYear: number;
    propertyId: string;
    businessExpenses: Record<string, any>;
    totals?: {
      totalDeductible: number;
      totalNonDeductible: number;
      deductiblePercentage: number;
    };
  } = {
    taxYear: summary.taxYear,
    propertyId: summary.propertyId,
    businessExpenses: {},
  }

  // Map to tax software format
  for (const [irsCategory, categoryData] of Object.entries(summary.categoryBreakdown)) {
    const formattedCategory = irsCategory.toLowerCase().replace(/\s+/g, '_')
    taxData.businessExpenses[formattedCategory] = {
      amount: categoryData.totalAmount / 100, // Convert to dollars
      description: categoryData.description,
      count: categoryData.expenseCount
    }
  }

  // Add summary totals
  taxData.totals = {
    totalDeductible: summary.totalDeductible / 100,
    totalNonDeductible: summary.totalNonDeductible / 100,
    deductiblePercentage: summary.deductiblePercentage
  }

  return taxData
}
