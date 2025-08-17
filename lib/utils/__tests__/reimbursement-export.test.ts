import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ReimbursementExportService } from '../reimbursement-export'
import { ReimbursementRequest } from '@/lib/db/models/reimbursement'

// Mock data for testing
const mockReimbursements: ReimbursementRequest[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    expenseId: '123e4567-e89b-12d3-a456-426614174001',
    requestorId: '123e4567-e89b-12d3-a456-426614174002',
    propertyId: '123e4567-e89b-12d3-a456-426614174003',
    amountCents: 5000,
    currency: 'USD',
    status: 'Paid',
    reason: 'Office supplies',
    paymentMethod: 'Stripe',
    paymentReference: 'pi_1234567890abcdef',
    paidDate: new Date('2024-01-15'),
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15'),
    statusHistory: [
      {
        status: 'Requested',
        changedAt: new Date('2024-01-10'),
        changedBy: '123e4567-e89b-12d3-a456-426614174002'
      },
      {
        status: 'Approved',
        changedAt: new Date('2024-01-12'),
        changedBy: '123e4567-e89b-12d3-a456-426614174004',
        comment: 'Approved for office supplies'
      },
      {
        status: 'Paid',
        changedAt: new Date('2024-01-15'),
        changedBy: '123e4567-e89b-12d3-a456-426614174004'
      }
    ]
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174010',
    expenseId: '123e4567-e89b-12d3-a456-426614174011',
    requestorId: '123e4567-e89b-12d3-a456-426614174012',
    propertyId: '123e4567-e89b-12d3-a456-426614174013',
    amountCents: 3000,
    currency: 'USD',
    status: 'Requested',
    reason: 'Maintenance tools',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
    statusHistory: [
      {
        status: 'Requested',
        changedAt: new Date('2024-01-20'),
        changedBy: '123e4567-e89b-12d3-a456-426614174012'
      }
    ]
  }
]

describe('ReimbursementExportService', () => {
  describe('exportToCSV', () => {
    it('should export basic CSV format', () => {
      const csv = ReimbursementExportService.exportToCSV(mockReimbursements)
      
      expect(csv).toContain('"ID","Expense ID","Requestor ID"')
      expect(csv).toContain('123e4567-e89b-12d3-a456-426614174000')
      expect(csv).toContain('50.00') // Amount in dollars
      expect(csv).toContain('Paid')
      expect(csv).toContain('Office supplies')
    })

    it('should include comments when requested', () => {
      const csv = ReimbursementExportService.exportToCSV(mockReimbursements, {
        format: 'csv',
        includeComments: true
      })
      
      expect(csv).toContain('Comments')
      expect(csv).toContain('Approved: Approved for office supplies')
    })

    it('should include status history when requested', () => {
      const csv = ReimbursementExportService.exportToCSV(mockReimbursements, {
        format: 'csv',
        includeStatusHistory: true
      })
      
      expect(csv).toContain('Status History')
      expect(csv).toContain('Requested (2024-01-10')
      expect(csv).toContain('Approved (2024-01-12')
      expect(csv).toContain('Paid (2024-01-15')
    })

    it('should handle empty array', () => {
      const csv = ReimbursementExportService.exportToCSV([])
      
      expect(csv).toContain('"ID","Expense ID","Requestor ID"')
      expect(csv.split('\n')).toHaveLength(1) // Only header row
    })

    it('should escape quotes in CSV', () => {
      const reimbursementWithQuotes = {
        ...mockReimbursements[0],
        reason: 'Office supplies "premium" quality'
      }
      
      const csv = ReimbursementExportService.exportToCSV([reimbursementWithQuotes])
      
      expect(csv).toContain('""premium""') // Escaped quotes
    })
  })

  describe('exportToJSON', () => {
    it('should export valid JSON format', () => {
      const json = ReimbursementExportService.exportToJSON(mockReimbursements)
      const parsed = JSON.parse(json)
      
      expect(parsed.totalRecords).toBe(2)
      expect(parsed.data).toHaveLength(2)
      expect(parsed.data[0].id).toBe('123e4567-e89b-12d3-a456-426614174000')
      expect(parsed.data[0].amountCents).toBe(5000)
      expect(parsed.exportedAt).toBeDefined()
    })

    it('should include status history when requested', () => {
      const json = ReimbursementExportService.exportToJSON(mockReimbursements, {
        format: 'json',
        includeStatusHistory: true
      })
      const parsed = JSON.parse(json)
      
      expect(parsed.data[0].statusHistory).toBeDefined()
      expect(parsed.data[0].statusHistory).toHaveLength(3)
    })

    it('should handle empty array', () => {
      const json = ReimbursementExportService.exportToJSON([])
      const parsed = JSON.parse(json)
      
      expect(parsed.totalRecords).toBe(0)
      expect(parsed.data).toHaveLength(0)
    })
  })

  describe('generateSummaryReport', () => {
    it('should generate comprehensive summary', () => {
      const summary = ReimbursementExportService.generateSummaryReport(mockReimbursements)
      
      expect(summary).toContain('REIMBURSEMENT SUMMARY REPORT')
      expect(summary).toContain('Total Requests: 2')
      expect(summary).toContain('Total Amount: $80.00')
      expect(summary).toContain('Paid Amount: $50.00')
      expect(summary).toContain('Payment Rate: 62.5%')
      expect(summary).toContain('STATUS BREAKDOWN')
      expect(summary).toContain('Paid: 1 (50.0%)')
      expect(summary).toContain('Requested: 1 (50.0%)')
      expect(summary).toContain('PAYMENT METHODS')
      expect(summary).toContain('Stripe: 1')
    })

    it('should handle empty array', () => {
      const summary = ReimbursementExportService.generateSummaryReport([])
      
      expect(summary).toContain('Total Requests: 0')
      expect(summary).toContain('Total Amount: $0.00')
      expect(summary).toContain('Payment Rate: 0%')
    })

    it('should calculate average processing time correctly', () => {
      const summary = ReimbursementExportService.generateSummaryReport(mockReimbursements)
      
      // First reimbursement: 5 days from creation to payment
      expect(summary).toContain('Average Processing Time: 5.0 days')
    })
  })

  describe('downloadFile', () => {
    // Mock DOM methods for testing
    const mockCreateElement = vi.fn()
    const mockAppendChild = vi.fn()
    const mockRemoveChild = vi.fn()
    const mockClick = vi.fn()
    const mockCreateObjectURL = vi.fn()
    const mockRevokeObjectURL = vi.fn()

    beforeEach(() => {
      // Mock document methods
      Object.defineProperty(document, 'createElement', {
        value: mockCreateElement,
        writable: true
      })
      Object.defineProperty(document.body, 'appendChild', {
        value: mockAppendChild,
        writable: true
      })
      Object.defineProperty(document.body, 'removeChild', {
        value: mockRemoveChild,
        writable: true
      })

      // Mock URL methods
      Object.defineProperty(URL, 'createObjectURL', {
        value: mockCreateObjectURL,
        writable: true
      })
      Object.defineProperty(URL, 'revokeObjectURL', {
        value: mockRevokeObjectURL,
        writable: true
      })

      // Mock link element
      const mockLink = {
        href: '',
        download: '',
        click: mockClick
      }
      mockCreateElement.mockReturnValue(mockLink)
      mockCreateObjectURL.mockReturnValue('blob:mock-url')

      // Clear all mocks
      vi.clearAllMocks()
    })

    it('should create and trigger download', () => {
      ReimbursementExportService.downloadFile('test content', 'test.csv', 'text/csv')

      expect(mockCreateElement).toHaveBeenCalledWith('a')
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockAppendChild).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(mockRemoveChild).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })

  describe('exportReimbursements', () => {
    // Mock the downloadFile method
    const originalDownloadFile = ReimbursementExportService.downloadFile
    const mockDownloadFile = vi.fn()

    beforeEach(() => {
      ReimbursementExportService.downloadFile = mockDownloadFile
      vi.clearAllMocks()
    })

    afterEach(() => {
      ReimbursementExportService.downloadFile = originalDownloadFile
    })

    it('should export CSV format', () => {
      ReimbursementExportService.exportReimbursements(mockReimbursements, {
        format: 'csv'
      })

      expect(mockDownloadFile).toHaveBeenCalledWith(
        expect.stringContaining('"ID","Expense ID"'),
        expect.stringMatching(/reimbursements-\d{4}-\d{2}-\d{2}\.csv/),
        'text/csv'
      )
    })

    it('should export JSON format', () => {
      ReimbursementExportService.exportReimbursements(mockReimbursements, {
        format: 'json'
      })

      expect(mockDownloadFile).toHaveBeenCalledWith(
        expect.stringContaining('"totalRecords": 2'),
        expect.stringMatching(/reimbursements-\d{4}-\d{2}-\d{2}\.json/),
        'application/json'
      )
    })

    it('should export PDF format as summary', () => {
      ReimbursementExportService.exportReimbursements(mockReimbursements, {
        format: 'pdf'
      })

      expect(mockDownloadFile).toHaveBeenCalledWith(
        expect.stringContaining('REIMBURSEMENT SUMMARY REPORT'),
        expect.stringMatching(/reimbursement-summary-\d{4}-\d{2}-\d{2}\.txt/),
        'text/plain'
      )
    })

    it('should throw error for unsupported format', () => {
      expect(() => {
        ReimbursementExportService.exportReimbursements(mockReimbursements, {
          format: 'xml' as any
        })
      }).toThrow('Unsupported export format: xml')
    })
  })
})
