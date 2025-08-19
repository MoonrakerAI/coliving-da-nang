import { ReimbursementRequest } from '@/lib/db/models/reimbursement'

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf'
  includeStatusHistory?: boolean
  includeComments?: boolean
  dateRange?: {
    from: Date
    to: Date
  }
}

export class ReimbursementExportService {
  static exportToCSV(reimbursements: ReimbursementRequest[], options: ExportOptions = { format: 'csv' }): string {
    const headers = [
      'ID',
      'Expense ID',
      'Requestor ID',
      'Property ID',
      'Amount (USD)',
      'Currency',
      'Status',
      'Reason',
      'Payment Method',
      'Payment Reference',
      'Created At',
      'Approved At',
      'Paid At',
      'Processing Days'
    ]

    if (options.includeComments) {
      headers.push('Comments')
    }

    if (options.includeStatusHistory) {
      headers.push('Status History')
    }

    const rows = reimbursements.map(reimbursement => {
      const approvedAt = reimbursement.statusHistory.find(h => h.toStatus === 'Approved')?.changedAt
      const paidAt = reimbursement.statusHistory.find(h => h.toStatus === 'Paid')?.changedAt
      
      const processingDays = paidAt 
        ? Math.round((new Date(paidAt).getTime() - reimbursement.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : null

      const row = [
        reimbursement.id,
        reimbursement.expenseId,
        reimbursement.requestorId,
        reimbursement.propertyId,
        (reimbursement.amountCents / 100).toFixed(2),
        reimbursement.currency,
        reimbursement.status,
        reimbursement.deniedReason || reimbursement.comments?.[0] || '',
        reimbursement.paymentMethod || '',
        reimbursement.paymentReference || '',
        reimbursement.createdAt.toISOString(),
        approvedAt || '',
        paidAt || '',
        processingDays?.toString() || ''
      ]

      if (options.includeComments) {
        const comments = reimbursement.statusHistory
          .filter(h => h.comment)
          .map(h => `${h.toStatus}: ${h.comment}`)
          .join('; ')
        row.push(comments)
      }

      if (options.includeStatusHistory) {
        const history = reimbursement.statusHistory
          .map(h => `${h.toStatus} (${new Date(h.changedAt).toISOString()})`)
          .join('; ')
        row.push(history)
      }

      return row
    })

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
      .join('\n')

    return csvContent
  }

  static exportToJSON(reimbursements: ReimbursementRequest[], options: ExportOptions = { format: 'json' }): string {
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalRecords: reimbursements.length,
      options,
      data: reimbursements.map(reimbursement => {
        const baseData: any = {
          id: reimbursement.id,
          expenseId: reimbursement.expenseId,
          requestorId: reimbursement.requestorId,
          propertyId: reimbursement.propertyId,
          amountCents: reimbursement.amountCents,
          currency: reimbursement.currency,
          status: reimbursement.status,
          reason: reimbursement.deniedReason || reimbursement.comments?.[0],
          paymentMethod: reimbursement.paymentMethod,
          paymentReference: reimbursement.paymentReference,
          createdAt: reimbursement.createdAt.toISOString(),
          updatedAt: reimbursement.updatedAt.toISOString(),
          paidDate: reimbursement.paidDate?.toISOString()
        }

        if (options.includeStatusHistory) {
          baseData.statusHistory = reimbursement.statusHistory
        }

        return baseData
      })
    }

    return JSON.stringify(exportData, null, 2)
  }

  static generateSummaryReport(reimbursements: ReimbursementRequest[]): string {
    const totalRequests = reimbursements.length
    const totalAmount = reimbursements.reduce((sum, r) => sum + r.amountCents, 0)
    const paidAmount = reimbursements
      .filter(r => r.status === 'Paid')
      .reduce((sum, r) => sum + r.amountCents, 0)
    
    const statusBreakdown = reimbursements.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const paymentMethodBreakdown = reimbursements
      .filter(r => r.paymentMethod)
      .reduce((acc, r) => {
        const method = r.paymentMethod!
        acc[method] = (acc[method] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    const completedRequests = reimbursements.filter(r => 
      ['Paid', 'Denied'].includes(r.status) && r.statusHistory.length > 1
    )
    
    const averageProcessingTime = completedRequests.length > 0
      ? completedRequests.reduce((sum, r) => {
          const created = new Date(r.createdAt)
          const completed = new Date(r.statusHistory[r.statusHistory.length - 1].changedAt)
          return sum + (completed.getTime() - created.getTime())
        }, 0) / completedRequests.length / (1000 * 60 * 60 * 24)
      : 0

    return `
REIMBURSEMENT SUMMARY REPORT
Generated: ${new Date().toISOString()}

OVERVIEW
========
Total Requests: ${totalRequests}
Total Amount: $${(totalAmount / 100).toFixed(2)}
Paid Amount: $${(paidAmount / 100).toFixed(2)}
Payment Rate: ${totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(1) : 0}%
Average Processing Time: ${averageProcessingTime.toFixed(1)} days

STATUS BREAKDOWN
===============
${Object.entries(statusBreakdown)
  .map(([status, count]) => `${status}: ${count} (${((count / totalRequests) * 100).toFixed(1)}%)`)
  .join('\n')}

PAYMENT METHODS
==============
${Object.entries(paymentMethodBreakdown)
  .map(([method, count]) => `${method}: ${count}`)
  .join('\n')}

RECENT ACTIVITY
==============
${reimbursements
  .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  .slice(0, 10)
  .map(r => `${r.id.slice(0, 8)}: $${(r.amountCents / 100).toFixed(2)} - ${r.status}`)
  .join('\n')}
`.trim()
  }

  static downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }

  static exportReimbursements(
    reimbursements: ReimbursementRequest[], 
    options: ExportOptions
  ) {
    const timestamp = new Date().toISOString().split('T')[0]
    
    switch (options.format) {
      case 'csv':
        const csvContent = this.exportToCSV(reimbursements, options)
        this.downloadFile(csvContent, `reimbursements-${timestamp}.csv`, 'text/csv')
        break
        
      case 'json':
        const jsonContent = this.exportToJSON(reimbursements, options)
        this.downloadFile(jsonContent, `reimbursements-${timestamp}.json`, 'application/json')
        break
        
      case 'pdf':
        // For PDF export, we'll generate a summary report as text
        // In a real implementation, you'd use a PDF library like jsPDF
        const summaryContent = this.generateSummaryReport(reimbursements)
        this.downloadFile(summaryContent, `reimbursement-summary-${timestamp}.txt`, 'text/plain')
        break
        
      default:
        throw new Error(`Unsupported export format: ${options.format}`)
    }
  }
}
