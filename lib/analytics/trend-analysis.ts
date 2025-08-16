import { getExpenses } from '../db/operations/expenses'
import { getCategoryAnalytics } from '../db/operations/expense-categories'
import { ExpenseFilters, Expense } from '../db/models/expense'
import { generateReportPeriods, ReportPeriod } from '../reporting/expense-reports'

// Trend analysis interfaces
export interface SpendingPattern {
  categoryId: string
  categoryName: string
  pattern: 'increasing' | 'decreasing' | 'stable' | 'seasonal' | 'irregular'
  confidence: number
  trend: {
    direction: 'up' | 'down' | 'flat'
    slope: number // Rate of change
    correlation: number // How well data fits the trend
  }
  seasonality?: {
    detected: boolean
    period: 'monthly' | 'quarterly' | 'yearly'
    peaks: string[] // Peak periods
    valleys: string[] // Low periods
  }
  recommendations: string[]
}

export interface SeasonalTrend {
  period: 'monthly' | 'quarterly' | 'yearly'
  categoryId: string
  categoryName: string
  peaks: { period: string; amount: number; variance: number }[]
  valleys: { period: string; amount: number; variance: number }[]
  seasonalityStrength: number // 0-1, how seasonal the data is
  predictedNext: { period: string; estimatedAmount: number; confidence: number }
}

export interface BudgetVariance {
  categoryId: string
  categoryName: string
  budgetAmount: number
  actualAmount: number
  variance: number
  variancePercentage: number
  status: 'over' | 'under' | 'on-track'
  trend: 'improving' | 'worsening' | 'stable'
  recommendations: string[]
}

export interface ExpenseAnomaly {
  expenseId: string
  expense: Expense
  anomalyType: 'amount' | 'frequency' | 'timing' | 'category'
  severity: 'low' | 'medium' | 'high'
  description: string
  expectedValue: number
  actualValue: number
  deviation: number
  confidence: number
}

export interface TrendSummary {
  propertyId: string
  period: ReportPeriod
  totalSpending: {
    current: number
    trend: 'up' | 'down' | 'stable'
    changeRate: number
  }
  categoryTrends: SpendingPattern[]
  seasonalTrends: SeasonalTrend[]
  budgetVariances: BudgetVariance[]
  anomalies: ExpenseAnomaly[]
  insights: string[]
  recommendations: string[]
}

// Analyze spending patterns over time
export async function analyzeSpendingPatterns(
  propertyId: string,
  categoryId?: string,
  months: number = 12
): Promise<SpendingPattern[]> {
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(endDate.getMonth() - months)
    
    // Get monthly data points
    const monthlyData: { month: string; amount: number; count: number }[] = []
    
    for (let i = 0; i < months; i++) {
      const monthStart = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1)
      const monthEnd = new Date(endDate.getFullYear(), endDate.getMonth() - i + 1, 0)
      
      const filters: ExpenseFilters = {
        propertyId,
        expenseDateFrom: monthStart,
        expenseDateTo: monthEnd
      }
      
      const expenses = await getExpenses(filters)
      
      // Group by category if not specified
      const categoryGroups = new Map<string, { amount: number; count: number }>()
      
      for (const expense of expenses) {
        const catId = expense.categorySelection?.categoryId || expense.category || 'other'
        
        if (categoryId && catId !== categoryId) continue
        
        if (!categoryGroups.has(catId)) {
          categoryGroups.set(catId, { amount: 0, count: 0 })
        }
        
        const group = categoryGroups.get(catId)!
        group.amount += expense.amountCents
        group.count += 1
      }
      
      const monthLabel = monthStart.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
      
      if (categoryId) {
        const data = categoryGroups.get(categoryId) || { amount: 0, count: 0 }
        monthlyData.push({
          month: monthLabel,
          amount: data.amount,
          count: data.count
        })
      } else {
        // Add data for each category
        for (const [catId, data] of categoryGroups) {
          monthlyData.push({
            month: `${monthLabel}-${catId}`,
            amount: data.amount,
            count: data.count
          })
        }
      }
    }
    
    // Analyze patterns for each category
    const patterns: SpendingPattern[] = []
    const categoryData = new Map<string, { month: string; amount: number; count: number }[]>()
    
    // Group data by category
    for (const data of monthlyData) {
      const [month, catId] = data.month.includes('-') ? data.month.split('-') : [data.month, categoryId || 'all']
      
      if (!categoryData.has(catId)) {
        categoryData.set(catId, [])
      }
      
      categoryData.get(catId)!.push({
        month,
        amount: data.amount,
        count: data.count
      })
    }
    
    // Analyze each category
    for (const [catId, data] of categoryData) {
      const pattern = await analyzeCategoryPattern(catId, data)
      patterns.push(pattern)
    }
    
    return patterns.sort((a, b) => b.confidence - a.confidence)
  } catch (error) {
    console.error('Error analyzing spending patterns:', error)
    return []
  }
}

// Analyze pattern for a specific category
async function analyzeCategoryPattern(
  categoryId: string,
  data: { month: string; amount: number; count: number }[]
): Promise<SpendingPattern> {
  const amounts = data.map(d => d.amount)
  const trend = calculateTrend(amounts)
  const seasonality = detectSeasonality(data)
  
  // Determine pattern type
  let pattern: SpendingPattern['pattern'] = 'stable'
  let confidence = 0.5
  
  if (Math.abs(trend.slope) > 1000) { // Significant change
    pattern = trend.direction === 'up' ? 'increasing' : 'decreasing'
    confidence = Math.min(0.9, trend.correlation)
  } else if (seasonality.detected) {
    pattern = 'seasonal'
    confidence = seasonality.seasonalityStrength
  } else if (trend.correlation < 0.3) {
    pattern = 'irregular'
    confidence = 1 - trend.correlation
  }
  
  // Generate recommendations
  const recommendations = generatePatternRecommendations(pattern, trend, seasonality)
  
  return {
    categoryId,
    categoryName: categoryId, // Would be replaced with actual category name
    pattern,
    confidence,
    trend,
    seasonality: seasonality.detected ? seasonality : undefined,
    recommendations
  }
}

// Calculate linear trend
function calculateTrend(values: number[]): SpendingPattern['trend'] {
  if (values.length < 2) {
    return { direction: 'flat', slope: 0, correlation: 0 }
  }
  
  const n = values.length
  const x = Array.from({ length: n }, (_, i) => i)
  const y = values
  
  // Calculate linear regression
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
  // Calculate correlation coefficient
  const meanX = sumX / n
  const meanY = sumY / n
  
  let numerator = 0
  let denomX = 0
  let denomY = 0
  
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX
    const dy = y[i] - meanY
    numerator += dx * dy
    denomX += dx * dx
    denomY += dy * dy
  }
  
  const correlation = Math.abs(numerator / Math.sqrt(denomX * denomY)) || 0
  
  return {
    direction: slope > 100 ? 'up' : slope < -100 ? 'down' : 'flat',
    slope,
    correlation
  }
}

// Detect seasonal patterns
function detectSeasonality(data: { month: string; amount: number }[]): SeasonalTrend['seasonality'] & { seasonalityStrength: number } {
  if (data.length < 12) {
    return { detected: false, period: 'monthly', peaks: [], valleys: [], seasonalityStrength: 0 }
  }
  
  // Simple seasonality detection based on variance
  const amounts = data.map(d => d.amount)
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length
  const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) / amounts.length
  
  // Find peaks and valleys
  const peaks: string[] = []
  const valleys: string[] = []
  
  for (let i = 1; i < data.length - 1; i++) {
    const prev = amounts[i - 1]
    const curr = amounts[i]
    const next = amounts[i + 1]
    
    if (curr > prev && curr > next && curr > mean * 1.2) {
      peaks.push(data[i].month)
    } else if (curr < prev && curr < next && curr < mean * 0.8) {
      valleys.push(data[i].month)
    }
  }
  
  const seasonalityStrength = Math.min(1, (peaks.length + valleys.length) / (data.length * 0.3))
  const detected = seasonalityStrength > 0.3
  
  return {
    detected,
    period: 'monthly',
    peaks,
    valleys,
    seasonalityStrength
  }
}

// Generate recommendations based on pattern
function generatePatternRecommendations(
  pattern: SpendingPattern['pattern'],
  trend: SpendingPattern['trend'],
  seasonality: any
): string[] {
  const recommendations: string[] = []
  
  switch (pattern) {
    case 'increasing':
      recommendations.push('Expenses are trending upward. Consider reviewing budget allocations.')
      if (trend.slope > 5000) {
        recommendations.push('Rapid increase detected. Investigate for unusual expenses or cost drivers.')
      }
      break
      
    case 'decreasing':
      recommendations.push('Expenses are trending downward. Good cost management!')
      recommendations.push('Monitor to ensure quality of services is maintained.')
      break
      
    case 'seasonal':
      recommendations.push('Seasonal pattern detected. Plan budget accordingly for peak periods.')
      if (seasonality.peaks.length > 0) {
        recommendations.push(`Peak spending typically occurs in: ${seasonality.peaks.join(', ')}`)
      }
      break
      
    case 'irregular':
      recommendations.push('Irregular spending pattern. Consider implementing more consistent budgeting.')
      recommendations.push('Review large or unusual expenses for better predictability.')
      break
      
    case 'stable':
      recommendations.push('Stable spending pattern. Good budget consistency.')
      break
  }
  
  return recommendations
}

// Detect expense anomalies
export async function detectExpenseAnomalies(
  propertyId: string,
  months: number = 6
): Promise<ExpenseAnomaly[]> {
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(endDate.getMonth() - months)
    
    const expenses = await getExpenses({
      propertyId,
      expenseDateFrom: startDate,
      expenseDateTo: endDate
    })
    
    const anomalies: ExpenseAnomaly[] = []
    
    // Group expenses by category for baseline calculation
    const categoryStats = new Map<string, { amounts: number[]; frequencies: number[] }>()
    
    // Calculate monthly stats per category
    for (let i = 0; i < months; i++) {
      const monthStart = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1)
      const monthEnd = new Date(endDate.getFullYear(), endDate.getMonth() - i + 1, 0)
      
      const monthExpenses = expenses.filter(e => 
        e.expenseDate >= monthStart && e.expenseDate <= monthEnd
      )
      
      const categoryTotals = new Map<string, { total: number; count: number }>()
      
      for (const expense of monthExpenses) {
        const categoryId = expense.categorySelection?.categoryId || expense.category || 'other'
        
        if (!categoryTotals.has(categoryId)) {
          categoryTotals.set(categoryId, { total: 0, count: 0 })
        }
        
        const stats = categoryTotals.get(categoryId)!
        stats.total += expense.amountCents
        stats.count += 1
      }
      
      // Store stats
      for (const [categoryId, stats] of categoryTotals) {
        if (!categoryStats.has(categoryId)) {
          categoryStats.set(categoryId, { amounts: [], frequencies: [] })
        }
        
        const catStats = categoryStats.get(categoryId)!
        catStats.amounts.push(stats.total)
        catStats.frequencies.push(stats.count)
      }
    }
    
    // Detect anomalies in recent expenses (last month)
    const recentStart = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
    const recentExpenses = expenses.filter(e => e.expenseDate >= recentStart)
    
    for (const expense of recentExpenses) {
      const categoryId = expense.categorySelection?.categoryId || expense.category || 'other'
      const stats = categoryStats.get(categoryId)
      
      if (!stats || stats.amounts.length < 3) continue // Need baseline data
      
      // Calculate baseline statistics
      const amounts = stats.amounts
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length
      const stdDev = Math.sqrt(amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) / amounts.length)
      
      // Check for amount anomalies (more than 2 standard deviations from mean)
      const zScore = Math.abs((expense.amountCents - mean) / stdDev)
      
      if (zScore > 2) {
        anomalies.push({
          expenseId: expense.id,
          expense,
          anomalyType: 'amount',
          severity: zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low',
          description: `Expense amount (${expense.amountCents / 100}) is ${zScore.toFixed(1)} standard deviations from category average`,
          expectedValue: mean,
          actualValue: expense.amountCents,
          deviation: zScore,
          confidence: Math.min(0.95, zScore / 4)
        })
      }
    }
    
    return anomalies.sort((a, b) => b.confidence - a.confidence)
  } catch (error) {
    console.error('Error detecting expense anomalies:', error)
    return []
  }
}

// Generate comprehensive trend summary
export async function generateTrendSummary(
  propertyId: string,
  period: ReportPeriod
): Promise<TrendSummary> {
  try {
    const [
      spendingPatterns,
      anomalies
    ] = await Promise.all([
      analyzeSpendingPatterns(propertyId, undefined, 12),
      detectExpenseAnomalies(propertyId, 6)
    ])
    
    // Calculate total spending trend
    const expenses = await getExpenses({
      propertyId,
      expenseDateFrom: period.start,
      expenseDateTo: period.end
    })
    
    const currentTotal = expenses.reduce((sum, e) => sum + e.amountCents, 0)
    
    // Get previous period for comparison
    const prevStart = new Date(period.start)
    prevStart.setMonth(prevStart.getMonth() - 1)
    const prevEnd = new Date(period.start)
    
    const prevExpenses = await getExpenses({
      propertyId,
      expenseDateFrom: prevStart,
      expenseDateTo: prevEnd
    })
    
    const prevTotal = prevExpenses.reduce((sum, e) => sum + e.amountCents, 0)
    const changeRate = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0
    
    // Generate insights and recommendations
    const insights = generateInsights(spendingPatterns, anomalies, changeRate)
    const recommendations = generateRecommendations(spendingPatterns, anomalies)
    
    return {
      propertyId,
      period,
      totalSpending: {
        current: currentTotal,
        trend: changeRate > 5 ? 'up' : changeRate < -5 ? 'down' : 'stable',
        changeRate
      },
      categoryTrends: spendingPatterns,
      seasonalTrends: [], // Would be populated with seasonal analysis
      budgetVariances: [], // Would be populated with budget comparison
      anomalies,
      insights,
      recommendations
    }
  } catch (error) {
    console.error('Error generating trend summary:', error)
    throw error
  }
}

// Generate insights from trend analysis
function generateInsights(
  patterns: SpendingPattern[],
  anomalies: ExpenseAnomaly[],
  changeRate: number
): string[] {
  const insights: string[] = []
  
  // Overall spending insights
  if (Math.abs(changeRate) > 10) {
    insights.push(`Total spending has ${changeRate > 0 ? 'increased' : 'decreased'} by ${Math.abs(changeRate).toFixed(1)}% compared to last period`)
  }
  
  // Category pattern insights
  const increasingCategories = patterns.filter(p => p.pattern === 'increasing')
  const decreasingCategories = patterns.filter(p => p.pattern === 'decreasing')
  const seasonalCategories = patterns.filter(p => p.pattern === 'seasonal')
  
  if (increasingCategories.length > 0) {
    insights.push(`${increasingCategories.length} categories show increasing spending trends`)
  }
  
  if (decreasingCategories.length > 0) {
    insights.push(`${decreasingCategories.length} categories show decreasing spending trends`)
  }
  
  if (seasonalCategories.length > 0) {
    insights.push(`${seasonalCategories.length} categories show seasonal spending patterns`)
  }
  
  // Anomaly insights
  const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high')
  if (highSeverityAnomalies.length > 0) {
    insights.push(`${highSeverityAnomalies.length} high-severity expense anomalies detected`)
  }
  
  return insights
}

// Generate recommendations from analysis
function generateRecommendations(
  patterns: SpendingPattern[],
  anomalies: ExpenseAnomaly[]
): string[] {
  const recommendations: string[] = []
  
  // Pattern-based recommendations
  const highConfidencePatterns = patterns.filter(p => p.confidence > 0.7)
  
  for (const pattern of highConfidencePatterns) {
    recommendations.push(...pattern.recommendations)
  }
  
  // Anomaly-based recommendations
  if (anomalies.length > 0) {
    recommendations.push('Review flagged expense anomalies for potential cost savings or errors')
  }
  
  const highValueAnomalies = anomalies.filter(a => a.actualValue > 50000) // $500+
  if (highValueAnomalies.length > 0) {
    recommendations.push('High-value expense anomalies require immediate attention')
  }
  
  // Remove duplicates
  return Array.from(new Set(recommendations))
}
