import { db } from '../db'
import { getExpenses } from '../db/operations/expenses'
import { getCategoriesForProperty, getCategoryAnalytics } from '../db/operations/expense-categories'
import { getCategory } from '../db/operations/expense-categories'
import { Expense, ExpenseFilters } from '../db/models/expense'
import { Category, CategoryAnalytics } from '../db/models/expense-category'

// Report types and interfaces
export interface ReportPeriod {
  start: Date
  end: Date
  type: 'monthly' | 'quarterly' | 'yearly' | 'custom'
  label: string
}

export interface CategoryTotal {
  categoryId: string
  categoryName: string
  subcategoryId?: string
  subcategoryName?: string
  totalAmount: number
  expenseCount: number
  averageAmount: number
  percentage: number
  icon?: string
  color?: string
}

export interface ExpenseReport {
  period: ReportPeriod
  propertyId: string
  totalAmount: number
  totalExpenses: number
  averageExpense: number
  categoryBreakdown: CategoryTotal[]
  trends: TrendData[]
  comparisons: ComparisonData[]
  taxSummary: TaxSummary
  topExpenses: Expense[]
  generatedAt: Date
}

export interface TrendData {
  period: string
  totalAmount: number
  expenseCount: number
  categoryBreakdown: { [categoryId: string]: number }
  growthRate?: number
}

export interface ComparisonData {
  currentPeriod: {
    amount: number
    count: number
  }
  previousPeriod: {
    amount: number
    count: number
  }
  change: {
    amount: number
    percentage: number
    direction: 'up' | 'down' | 'same'
  }
}

export interface TaxSummary {
  totalDeductible: number
  totalNonDeductible: number
  categoryBreakdown: { [taxCategory: string]: number }
  deductiblePercentage: number
}

// Generate report periods
export function generateReportPeriods(type: 'monthly' | 'quarterly' | 'yearly', count: number = 12): ReportPeriod[] {
  const periods: ReportPeriod[] = []
  const now = new Date()
  
  for (let i = 0; i < count; i++) {
    let start: Date
    let end: Date
    let label: string
    
    switch (type) {
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth() - i, 1)
        end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        label = start.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
        break
        
      case 'quarterly':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3
        start = new Date(now.getFullYear(), quarterStart - (i * 3), 1)
        end = new Date(now.getFullYear(), quarterStart - (i * 3) + 3, 0)
        const quarter = Math.floor(start.getMonth() / 3) + 1
        label = `Q${quarter} ${start.getFullYear()}`
        break
        
      case 'yearly':
        start = new Date(now.getFullYear() - i, 0, 1)
        end = new Date(now.getFullYear() - i, 11, 31)
        label = start.getFullYear().toString()
        break
    }
    
    periods.push({
      start,
      end,
      type,
      label
    })
  }
  
  return periods.reverse() // Return in chronological order
}

// Generate expense report for a specific period
export async function generateExpenseReport(
  propertyId: string,
  period: ReportPeriod
): Promise<ExpenseReport> {
  try {
    // Get expenses for the period
    const filters: ExpenseFilters = {
      propertyId,
      expenseDateFrom: period.start,
      expenseDateTo: period.end
    }
    
    const expenses = await getExpenses(filters)
    
    // Calculate basic metrics
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amountCents, 0)
    const totalExpenses = expenses.length
    const averageExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0
    
    // Generate category breakdown
    const categoryBreakdown = await generateCategoryBreakdown(expenses, propertyId)
    
    // Generate trend data
    const trends = await generateTrendData(propertyId, period)
    
    // Generate comparison data
    const comparisons = [await generateComparisonData(propertyId, period)]
    
    // Generate tax summary
    const taxSummary = generateTaxSummary(expenses)
    
    // Get top expenses (by amount)
    const topExpenses = expenses
      .sort((a, b) => b.amountCents - a.amountCents)
      .slice(0, 10)
    
    return {
      period,
      propertyId,
      totalAmount,
      totalExpenses,
      averageExpense,
      categoryBreakdown,
      trends,
      comparisons,
      taxSummary,
      topExpenses,
      generatedAt: new Date()
    }
  } catch (error) {
    console.error('Error generating expense report:', error)
    throw error
  }
}

// Generate category breakdown with percentages
async function generateCategoryBreakdown(expenses: Expense[], propertyId: string): Promise<CategoryTotal[]> {
  const categoryTotals = new Map<string, {
    amount: number
    count: number
    subcategories: Map<string, { amount: number; count: number }>
  }>()
  
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amountCents, 0)
  
  // Group expenses by category and subcategory
  for (const expense of expenses) {
    const categoryId = expense.categorySelection?.categoryId || expense.category || 'other'
    const subcategoryId = expense.categorySelection?.subcategoryId
    
    if (!categoryTotals.has(categoryId)) {
      categoryTotals.set(categoryId, {
        amount: 0,
        count: 0,
        subcategories: new Map()
      })
    }
    
    const categoryData = categoryTotals.get(categoryId)!
    categoryData.amount += expense.amountCents
    categoryData.count += 1
    
    if (subcategoryId) {
      if (!categoryData.subcategories.has(subcategoryId)) {
        categoryData.subcategories.set(subcategoryId, { amount: 0, count: 0 })
      }
      const subcategoryData = categoryData.subcategories.get(subcategoryId)!
      subcategoryData.amount += expense.amountCents
      subcategoryData.count += 1
    }
  }
  
  // Convert to CategoryTotal format
  const breakdown: CategoryTotal[] = []
  
  for (const [categoryId, data] of Array.from(categoryTotals.entries())) {
    const category = await getCategory(categoryId)
    const percentage = totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
    
    breakdown.push({
      categoryId,
      categoryName: category?.name || categoryId,
      totalAmount: data.amount,
      expenseCount: data.count,
      averageAmount: data.count > 0 ? data.amount / data.count : 0,
      percentage,
      icon: category?.icon,
      color: category?.color
    })
    
    // Add subcategory breakdowns
    for (const [subcategoryId, subData] of Array.from(data.subcategories.entries())) {
      const subcategory = category?.subcategories.find(sub => sub.id === subcategoryId)
      const subPercentage = totalAmount > 0 ? (subData.amount / totalAmount) * 100 : 0
      
      breakdown.push({
        categoryId,
        categoryName: category?.name || categoryId,
        subcategoryId,
        subcategoryName: subcategory?.name || subcategoryId,
        totalAmount: subData.amount,
        expenseCount: subData.count,
        averageAmount: subData.count > 0 ? subData.amount / subData.count : 0,
        percentage: subPercentage,
        icon: subcategory?.icon || category?.icon,
        color: category?.color
      })
    }
  }
  
  return breakdown.sort((a, b) => b.totalAmount - a.totalAmount)
}

// Generate trend data for multiple periods
async function generateTrendData(propertyId: string, currentPeriod: ReportPeriod): Promise<TrendData[]> {
  const trends: TrendData[] = []
  
  // Generate periods for trend analysis (last 12 months/quarters/years)
  const trendType = currentPeriod.type === 'custom' ? 'monthly' : currentPeriod.type
  const periods = generateReportPeriods(trendType, 12)
  
  for (const period of periods) {
    const filters: ExpenseFilters = {
      propertyId,
      expenseDateFrom: period.start,
      expenseDateTo: period.end
    }
    
    const expenses = await getExpenses(filters)
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amountCents, 0)
    
    // Category breakdown for this period
    const categoryBreakdown: { [categoryId: string]: number } = {}
    for (const expense of expenses) {
      const categoryId = expense.categorySelection?.categoryId || expense.category || 'other'
      categoryBreakdown[categoryId] = (categoryBreakdown[categoryId] || 0) + expense.amountCents
    }
    
    trends.push({
      period: period.label,
      totalAmount,
      expenseCount: expenses.length,
      categoryBreakdown
    })
  }
  
  // Calculate growth rates
  for (let i = 1; i < trends.length; i++) {
    const current = trends[i]
    const previous = trends[i - 1]
    
    if (previous.totalAmount > 0) {
      current.growthRate = ((current.totalAmount - previous.totalAmount) / previous.totalAmount) * 100
    }
  }
  
  return trends
}

// Generate comparison data with previous period
async function generateComparisonData(propertyId: string, currentPeriod: ReportPeriod): Promise<ComparisonData> {
  // Calculate previous period
  let previousStart: Date
  let previousEnd: Date
  
  switch (currentPeriod.type) {
    case 'monthly':
      previousStart = new Date(currentPeriod.start.getFullYear(), currentPeriod.start.getMonth() - 1, 1)
      previousEnd = new Date(currentPeriod.start.getFullYear(), currentPeriod.start.getMonth(), 0)
      break
      
    case 'quarterly':
      previousStart = new Date(currentPeriod.start.getFullYear(), currentPeriod.start.getMonth() - 3, 1)
      previousEnd = new Date(currentPeriod.start.getFullYear(), currentPeriod.start.getMonth(), 0)
      break
      
    case 'yearly':
      previousStart = new Date(currentPeriod.start.getFullYear() - 1, 0, 1)
      previousEnd = new Date(currentPeriod.start.getFullYear() - 1, 11, 31)
      break
      
    default:
      // For custom periods, use same duration
      const duration = currentPeriod.end.getTime() - currentPeriod.start.getTime()
      previousEnd = new Date(currentPeriod.start.getTime() - 1)
      previousStart = new Date(previousEnd.getTime() - duration)
  }
  
  // Get expenses for both periods
  const currentExpenses = await getExpenses({
    propertyId,
    expenseDateFrom: currentPeriod.start,
    expenseDateTo: currentPeriod.end
  })
  
  const previousExpenses = await getExpenses({
    propertyId,
    expenseDateFrom: previousStart,
    expenseDateTo: previousEnd
  })
  
  const currentAmount = currentExpenses.reduce((sum, expense) => sum + expense.amountCents, 0)
  const previousAmount = previousExpenses.reduce((sum, expense) => sum + expense.amountCents, 0)
  
  const amountChange = currentAmount - previousAmount
  const percentageChange = previousAmount > 0 ? (amountChange / previousAmount) * 100 : 0
  
  return {
    currentPeriod: {
      amount: currentAmount,
      count: currentExpenses.length
    },
    previousPeriod: {
      amount: previousAmount,
      count: previousExpenses.length
    },
    change: {
      amount: amountChange,
      percentage: percentageChange,
      direction: amountChange > 0 ? 'up' : amountChange < 0 ? 'down' : 'same'
    }
  }
}

// Generate tax summary
function generateTaxSummary(expenses: Expense[]): TaxSummary {
  let totalDeductible = 0
  let totalNonDeductible = 0
  const categoryBreakdown: { [taxCategory: string]: number } = {}
  
  for (const expense of expenses) {
    if (expense.isTaxDeductible) {
      totalDeductible += expense.amountCents
      
      const taxCategory = expense.taxCategory || 'Other Business Expenses'
      categoryBreakdown[taxCategory] = (categoryBreakdown[taxCategory] || 0) + expense.amountCents
    } else {
      totalNonDeductible += expense.amountCents
    }
  }
  
  const totalAmount = totalDeductible + totalNonDeductible
  const deductiblePercentage = totalAmount > 0 ? (totalDeductible / totalAmount) * 100 : 0
  
  return {
    totalDeductible,
    totalNonDeductible,
    categoryBreakdown,
    deductiblePercentage
  }
}

// Generate monthly reports for a year
export async function generateMonthlyReports(propertyId: string, year: number): Promise<ExpenseReport[]> {
  const reports: ExpenseReport[] = []
  
  for (let month = 0; month < 12; month++) {
    const period: ReportPeriod = {
      start: new Date(year, month, 1),
      end: new Date(year, month + 1, 0),
      type: 'monthly',
      label: new Date(year, month, 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    }
    
    const report = await generateExpenseReport(propertyId, period)
    reports.push(report)
  }
  
  return reports
}

// Generate yearly summary report
export async function generateYearlyReport(propertyId: string, year: number): Promise<ExpenseReport> {
  const period: ReportPeriod = {
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31),
    type: 'yearly',
    label: year.toString()
  }
  
  return await generateExpenseReport(propertyId, period)
}

// Generate custom date range report
export async function generateCustomReport(
  propertyId: string,
  startDate: Date,
  endDate: Date
): Promise<ExpenseReport> {
  const period: ReportPeriod = {
    start: startDate,
    end: endDate,
    type: 'custom',
    label: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
  }
  
  return await generateExpenseReport(propertyId, period)
}

// Cache report data for performance
const REPORT_CACHE_TTL = 60 * 60 * 1000 // 1 hour in milliseconds

export async function getCachedReport(
  propertyId: string,
  period: ReportPeriod
): Promise<ExpenseReport | null> {
  try {
    const cacheKey = `report:${propertyId}:${period.type}:${period.start.getTime()}-${period.end.getTime()}`
    const cachedData = await db.get<string>(cacheKey)
    
    if (cachedData) {
      const report = JSON.parse(cachedData) as ExpenseReport
      // Check if cache is still valid
      const cacheAge = Date.now() - new Date(report.generatedAt).getTime()
      if (cacheAge < REPORT_CACHE_TTL) {
        return report
      }
    }
    
    return null
  } catch (error) {
    console.error('Error getting cached report:', error)
    return null
  }
}

export async function cacheReport(report: ExpenseReport): Promise<void> {
  try {
    const cacheKey = `report:${report.propertyId}:${report.period.type}:${report.period.start.getTime()}-${report.period.end.getTime()}`
    await db.set(cacheKey, JSON.stringify(report), { ex: REPORT_CACHE_TTL / 1000 })
  } catch (error) {
    console.error('Error caching report:', error)
  }
}
