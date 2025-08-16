import { Expense } from '../db/models/expense'
import { ExpenseReport, CategoryTotal } from '../reporting/expense-reports'
import { TrendSummary } from '../analytics/trend-analysis'

// Export formats and interfaces
export interface ExportOptions {
  format: 'csv' | 'pdf' | 'excel' | 'json'
  includeCharts?: boolean
  includeImages?: boolean
  dateFormat?: 'US' | 'ISO' | 'EU'
  currency?: string
  groupBy?: 'category' | 'month' | 'none'
  filters?: {
    categories?: string[]
    dateRange?: { start: Date; end: Date }
    minAmount?: number
    maxAmount?: number
  }
}

export interface ExportResult {
  success: boolean
  fileName: string
  filePath?: string
  downloadUrl?: string
  fileSize?: number
  error?: string
}

// CSV Export Functions
export function exportExpensesToCSV(
  expenses: Expense[],
  options: ExportOptions = { format: 'csv' }
): string {
  const headers = [
    'Date',
    'Description',
    'Category',
    'Subcategory',
    'Amount',
    'Currency',
    'Merchant',
    'Tax Deductible',
    'Tax Category',
    'Reimbursement Status',
    'Property ID',
    'User ID',
    'Receipt Photos',
    'Location',
    'Created Date'
  ]

  const rows = expenses.map(expense => {
    const categorySelection = expense.categorySelection
    const location = expense.location
    
    return [
      formatDate(expense.expenseDate, options.dateFormat),
      `"${expense.description.replace(/"/g, '""')}"`, // Escape quotes
      categorySelection?.categoryId || expense.category || '',
      categorySelection?.subcategoryId || '',
      formatAmount(expense.amountCents, options.currency),
      expense.currency,
      extractMerchantFromDescription(expense.description),
      expense.isTaxDeductible ? 'Yes' : 'No',
      expense.taxCategory || '',
      expense.isReimbursed ? 'Reimbursed' : expense.needsReimbursement ? 'Pending' : 'Not Required',
      expense.propertyId,
      expense.userId,
      expense.receiptPhotos.join('; '),
      location ? `"${location.address || ''} (${location.latitude}, ${location.longitude})"` : '',
      formatDate(expense.createdAt, options.dateFormat)
    ]
  })

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
}

export function exportReportToCSV(
  report: ExpenseReport,
  options: ExportOptions = { format: 'csv' }
): string {
  const sections: string[] = []

  // Report Summary
  sections.push('EXPENSE REPORT SUMMARY')
  sections.push(`Period,${report.period.label}`)
  sections.push(`Total Amount,${formatAmount(report.totalAmount, options.currency)}`)
  sections.push(`Total Expenses,${report.totalExpenses}`)
  sections.push(`Average Expense,${formatAmount(report.averageExpense, options.currency)}`)
  sections.push('')

  // Category Breakdown
  sections.push('CATEGORY BREAKDOWN')
  sections.push('Category,Subcategory,Amount,Count,Average,Percentage')
  
  for (const category of report.categoryBreakdown) {
    sections.push([
      category.categoryName,
      category.subcategoryName || '',
      formatAmount(category.totalAmount, options.currency),
      category.expenseCount.toString(),
      formatAmount(category.averageAmount, options.currency),
      `${category.percentage.toFixed(2)}%`
    ].join(','))
  }
  
  sections.push('')

  // Tax Summary
  sections.push('TAX SUMMARY')
  sections.push(`Total Deductible,${formatAmount(report.taxSummary.totalDeductible, options.currency)}`)
  sections.push(`Total Non-Deductible,${formatAmount(report.taxSummary.totalNonDeductible, options.currency)}`)
  sections.push(`Deductible Percentage,${report.taxSummary.deductiblePercentage.toFixed(2)}%`)
  sections.push('')

  // Tax Category Breakdown
  sections.push('TAX CATEGORY BREAKDOWN')
  sections.push('Tax Category,Amount')
  
  for (const [taxCategory, amount] of Object.entries(report.taxSummary.categoryBreakdown)) {
    sections.push(`${taxCategory},${formatAmount(amount, options.currency)}`)
  }

  return sections.join('\n')
}

// Excel Export Functions (simplified - would use a library like ExcelJS in production)
export function generateExcelData(
  expenses: Expense[],
  report?: ExpenseReport,
  options: ExportOptions = { format: 'excel' }
): any {
  const workbook = {
    sheets: [] as any[]
  }

  // Expenses Sheet
  const expenseSheet = {
    name: 'Expenses',
    data: [
      ['Date', 'Description', 'Category', 'Subcategory', 'Amount', 'Currency', 'Tax Deductible', 'Tax Category'],
      ...expenses.map(expense => [
        formatDate(expense.expenseDate, options.dateFormat),
        expense.description,
        expense.categorySelection?.categoryId || expense.category || '',
        expense.categorySelection?.subcategoryId || '',
        expense.amountCents / 100,
        expense.currency,
        expense.isTaxDeductible,
        expense.taxCategory || ''
      ])
    ]
  }
  workbook.sheets.push(expenseSheet)

  // Summary Sheet (if report provided)
  if (report) {
    const summarySheet = {
      name: 'Summary',
      data: [
        ['Metric', 'Value'],
        ['Period', report.period.label],
        ['Total Amount', report.totalAmount / 100],
        ['Total Expenses', report.totalExpenses],
        ['Average Expense', report.averageExpense / 100],
        [''],
        ['Category', 'Amount', 'Count', 'Percentage'],
        ...report.categoryBreakdown.map(cat => [
          cat.categoryName,
          cat.totalAmount / 100,
          cat.expenseCount,
          `${cat.percentage.toFixed(2)}%`
        ])
      ]
    }
    workbook.sheets.push(summarySheet)

    // Tax Summary Sheet
    const taxSheet = {
      name: 'Tax Summary',
      data: [
        ['Tax Category', 'Amount'],
        ...Object.entries(report.taxSummary.categoryBreakdown).map(([category, amount]) => [
          category,
          amount / 100
        ])
      ]
    }
    workbook.sheets.push(taxSheet)
  }

  return workbook
}

// PDF Export Functions (simplified - would use a library like PDFKit in production)
export function generatePDFData(
  report: ExpenseReport,
  options: ExportOptions = { format: 'pdf' }
): any {
  const pdfData = {
    title: `Expense Report - ${report.period.label}`,
    sections: [] as any[]
  }

  // Header Section
  pdfData.sections.push({
    type: 'header',
    content: {
      title: 'Expense Report',
      subtitle: report.period.label,
      generatedAt: formatDate(report.generatedAt, options.dateFormat)
    }
  })

  // Summary Section
  pdfData.sections.push({
    type: 'summary',
    content: {
      totalAmount: formatAmount(report.totalAmount, options.currency),
      totalExpenses: report.totalExpenses,
      averageExpense: formatAmount(report.averageExpense, options.currency),
      comparison: report.comparisons
    }
  })

  // Category Chart Section (if charts enabled)
  if (options.includeCharts) {
    pdfData.sections.push({
      type: 'chart',
      chartType: 'pie',
      title: 'Expenses by Category',
      data: report.categoryBreakdown.map(cat => ({
        label: cat.categoryName,
        value: cat.totalAmount,
        percentage: cat.percentage
      }))
    })
  }

  // Category Breakdown Table
  pdfData.sections.push({
    type: 'table',
    title: 'Category Breakdown',
    headers: ['Category', 'Amount', 'Count', 'Average', 'Percentage'],
    rows: report.categoryBreakdown.map(cat => [
      cat.categoryName,
      formatAmount(cat.totalAmount, options.currency),
      cat.expenseCount.toString(),
      formatAmount(cat.averageAmount, options.currency),
      `${cat.percentage.toFixed(2)}%`
    ])
  })

  // Tax Summary Section
  pdfData.sections.push({
    type: 'tax-summary',
    content: {
      totalDeductible: formatAmount(report.taxSummary.totalDeductible, options.currency),
      totalNonDeductible: formatAmount(report.taxSummary.totalNonDeductible, options.currency),
      deductiblePercentage: `${report.taxSummary.deductiblePercentage.toFixed(2)}%`,
      categoryBreakdown: Object.entries(report.taxSummary.categoryBreakdown).map(([category, amount]) => ({
        category,
        amount: formatAmount(amount, options.currency)
      }))
    }
  })

  // Top Expenses Section
  if (report.topExpenses.length > 0) {
    pdfData.sections.push({
      type: 'table',
      title: 'Top Expenses',
      headers: ['Date', 'Description', 'Category', 'Amount'],
      rows: report.topExpenses.slice(0, 10).map(expense => [
        formatDate(expense.expenseDate, options.dateFormat),
        expense.description,
        expense.categorySelection?.categoryId || expense.category || '',
        formatAmount(expense.amountCents, options.currency)
      ])
    })
  }

  return pdfData
}

// QuickBooks Integration Preparation
export function exportForQuickBooks(
  expenses: Expense[],
  options: ExportOptions = { format: 'csv' }
): string {
  // QuickBooks specific format
  const headers = [
    'Date',
    'Account',
    'Vendor',
    'Amount',
    'Description',
    'Class',
    'Customer',
    'Billable'
  ]

  const rows = expenses.map(expense => [
    formatDate(expense.expenseDate, 'US'), // QuickBooks prefers US format
    mapCategoryToQuickBooksAccount(expense.categorySelection?.categoryId || expense.category || ''),
    extractMerchantFromDescription(expense.description),
    (expense.amountCents / 100).toFixed(2),
    `"${expense.description.replace(/"/g, '""')}"`,
    expense.propertyId, // Use property as class
    '', // Customer (empty for property expenses)
    expense.needsReimbursement ? 'Yes' : 'No'
  ])

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
}

// Utility Functions
function formatDate(date: Date, format: string = 'US'): string {
  switch (format) {
    case 'ISO':
      return date.toISOString().split('T')[0]
    case 'EU':
      return date.toLocaleDateString('en-GB')
    case 'US':
    default:
      return date.toLocaleDateString('en-US')
  }
}

function formatAmount(amountCents: number, currency: string = 'USD'): string {
  const amount = amountCents / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

function extractMerchantFromDescription(description: string): string {
  // Simple merchant extraction - could be enhanced with ML
  const words = description.split(' ')
  return words[0] || description.substring(0, 20)
}

function mapCategoryToQuickBooksAccount(categoryId: string): string {
  const mapping: { [key: string]: string } = {
    'utilities': 'Utilities',
    'repairs': 'Repairs and Maintenance',
    'supplies': 'Office Expenses',
    'cleaning': 'Cleaning and Maintenance',
    'maintenance': 'Repairs and Maintenance',
    'other': 'Other Business Expenses'
  }
  
  return mapping[categoryId] || 'Other Business Expenses'
}

// Export orchestration function
export async function exportExpenseData(
  data: {
    expenses?: Expense[]
    report?: ExpenseReport
    trends?: TrendSummary
  },
  options: ExportOptions
): Promise<ExportResult> {
  try {
    let content: string
    let fileName: string
    const timestamp = new Date().toISOString().split('T')[0]

    switch (options.format) {
      case 'csv':
        if (data.expenses) {
          content = exportExpensesToCSV(data.expenses, options)
          fileName = `expenses-${timestamp}.csv`
        } else if (data.report) {
          content = exportReportToCSV(data.report, options)
          fileName = `expense-report-${timestamp}.csv`
        } else {
          throw new Error('No data provided for CSV export')
        }
        break

      case 'excel':
        const excelData = generateExcelData(data.expenses || [], data.report, options)
        content = JSON.stringify(excelData) // Would be actual Excel file in production
        fileName = `expense-report-${timestamp}.xlsx`
        break

      case 'pdf':
        if (!data.report) {
          throw new Error('Report data required for PDF export')
        }
        const pdfData = generatePDFData(data.report, options)
        content = JSON.stringify(pdfData) // Would be actual PDF file in production
        fileName = `expense-report-${timestamp}.pdf`
        break

      case 'json':
        content = JSON.stringify(data, null, 2)
        fileName = `expense-data-${timestamp}.json`
        break

      default:
        throw new Error(`Unsupported export format: ${options.format}`)
    }

    // In a real implementation, this would save to file system or cloud storage
    const fileSize = Buffer.byteLength(content, 'utf8')

    return {
      success: true,
      fileName,
      filePath: `/exports/${fileName}`,
      downloadUrl: `/api/exports/download/${fileName}`,
      fileSize
    }
  } catch (error) {
    console.error('Error exporting expense data:', error)
    return {
      success: false,
      fileName: '',
      error: error instanceof Error ? error.message : 'Unknown export error'
    }
  }
}

// Batch export for multiple properties
export async function batchExportProperties(
  propertyIds: string[],
  options: ExportOptions & { includeAllProperties?: boolean }
): Promise<ExportResult[]> {
  const results: ExportResult[] = []

  for (const propertyId of propertyIds) {
    try {
      // This would fetch data for each property
      const mockData = {
        expenses: [], // Would be fetched from database
        report: undefined // Would be generated
      }

      const result = await exportExpenseData(mockData, {
        ...options,
        filters: {
          ...options.filters,
          // Add property-specific filters
        }
      })

      results.push(result)
    } catch (error) {
      results.push({
        success: false,
        fileName: `property-${propertyId}-export-failed`,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return results
}

// Email export functionality
export interface EmailExportOptions {
  to: string[]
  subject?: string
  message?: string
  attachmentName?: string
}

export async function emailExport(
  data: {
    expenses?: Expense[]
    report?: ExpenseReport
  },
  exportOptions: ExportOptions,
  emailOptions: EmailExportOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Generate export
    const exportResult = await exportExpenseData(data, exportOptions)
    
    if (!exportResult.success) {
      throw new Error(exportResult.error)
    }

    // Email configuration would be implemented here
    // This is a placeholder for actual email service integration
    console.log('Sending email export:', {
      to: emailOptions.to,
      subject: emailOptions.subject || `Expense Report - ${new Date().toLocaleDateString()}`,
      attachment: exportResult.fileName
    })

    return {
      success: true,
      messageId: `email-${Date.now()}`
    }
  } catch (error) {
    console.error('Error sending email export:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown email error'
    }
  }
}

// Scheduled export functionality
export interface ScheduledExportConfig {
  id: string
  propertyId: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  format: ExportOptions['format']
  options: ExportOptions
  emailOptions?: EmailExportOptions
  isActive: boolean
  nextRunDate: Date
  lastRunDate?: Date
}

export async function createScheduledExport(config: Omit<ScheduledExportConfig, 'id' | 'nextRunDate'>): Promise<ScheduledExportConfig> {
  const id = `scheduled-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  // Calculate next run date based on frequency
  const nextRunDate = calculateNextRunDate(config.frequency)
  
  const scheduledExport: ScheduledExportConfig = {
    ...config,
    id,
    nextRunDate
  }

  // In production, this would be stored in database
  console.log('Created scheduled export:', scheduledExport)

  return scheduledExport
}

function calculateNextRunDate(frequency: ScheduledExportConfig['frequency']): Date {
  const now = new Date()
  
  switch (frequency) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    case 'monthly':
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      return nextMonth
    case 'quarterly':
      const nextQuarter = new Date(now)
      nextQuarter.setMonth(nextQuarter.getMonth() + 3)
      return nextQuarter
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
  }
}
