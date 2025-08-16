'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { ReimbursementReportFilters, ReportFilters } from './components/ReimbursementReportFilters'
import { ReimbursementReportDashboard } from './components/ReimbursementReportDashboard'
import { ReimbursementList } from '../components/ReimbursementList'
import { ReimbursementExportService, ExportOptions } from '@/lib/utils/reimbursement-export'
import { ReimbursementRequest } from '@/lib/db/models/reimbursement'
import { BarChart3, Download, FileText, Database } from 'lucide-react'

export default function ReimbursementReportsPage() {
  const [reimbursements, setReimbursements] = useState<ReimbursementRequest[]>([])
  const [filteredReimbursements, setFilteredReimbursements] = useState<ReimbursementRequest[]>([])
  const [filters, setFilters] = useState<ReportFilters>({})
  const [loading, setLoading] = useState(true)
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'pdf'>('csv')

  const fetchReimbursements = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/reimbursements')
      if (!response.ok) {
        throw new Error('Failed to fetch reimbursements')
      }
      const data = await response.json()
      setReimbursements(data.reimbursements || [])
    } catch (error) {
      console.error('Error fetching reimbursements:', error)
      toast.error('Failed to load reimbursement data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReimbursements()
  }, [fetchReimbursements])

  // Apply filters to reimbursements
  useEffect(() => {
    let filtered = [...reimbursements]

    // Filter by property ID
    if (filters.propertyId) {
      filtered = filtered.filter(r => r.propertyId.includes(filters.propertyId!))
    }

    // Filter by requestor ID
    if (filters.requestorId) {
      filtered = filtered.filter(r => r.requestorId.includes(filters.requestorId!))
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status)
    }

    // Filter by payment method
    if (filters.paymentMethod) {
      filtered = filtered.filter(r => r.paymentMethod === filters.paymentMethod)
    }

    // Filter by date range
    if (filters.dateFrom) {
      filtered = filtered.filter(r => r.createdAt >= filters.dateFrom!)
    }
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo)
      endDate.setHours(23, 59, 59, 999) // Include the entire end date
      filtered = filtered.filter(r => r.createdAt <= endDate)
    }

    // Filter by amount range
    if (filters.amountMin !== undefined) {
      filtered = filtered.filter(r => r.amountCents >= filters.amountMin!)
    }
    if (filters.amountMax !== undefined) {
      filtered = filtered.filter(r => r.amountCents <= filters.amountMax!)
    }

    setFilteredReimbursements(filtered)
  }, [reimbursements, filters])

  const handleExport = useCallback(() => {
    try {
      const exportOptions: ExportOptions = {
        format: exportFormat,
        includeStatusHistory: true,
        includeComments: true,
        dateRange: filters.dateFrom && filters.dateTo ? {
          from: filters.dateFrom,
          to: filters.dateTo
        } : undefined
      }

      ReimbursementExportService.exportReimbursements(filteredReimbursements, exportOptions)
      
      toast.success(`Report exported as ${exportFormat.toUpperCase()}`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export report')
    }
  }, [filteredReimbursements, exportFormat, filters])

  const handleRefresh = useCallback(() => {
    fetchReimbursements()
    toast.success('Data refreshed')
  }, [fetchReimbursements])

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reimbursement Reports</h1>
          <p className="text-muted-foreground">
            Analyze and export reimbursement data with comprehensive reporting tools
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="pdf">Summary</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExport} disabled={filteredReimbursements.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <ReimbursementReportFilters
        filters={filters}
        onFiltersChange={setFilters}
        onExport={handleExport}
        onRefresh={handleRefresh}
        loading={loading}
      />

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Report Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{filteredReimbursements.length}</p>
              <p className="text-sm text-muted-foreground">Filtered Records</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{reimbursements.length}</p>
              <p className="text-sm text-muted-foreground">Total Records</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                ${(filteredReimbursements.reduce((sum, r) => sum + r.amountCents, 0) / 100).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Filtered Amount</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {filteredReimbursements.length > 0 
                  ? new Date(Math.min(...filteredReimbursements.map(r => r.createdAt.getTime()))).toLocaleDateString()
                  : 'N/A'
                }
              </p>
              <p className="text-sm text-muted-foreground">Earliest Request</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Data View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <ReimbursementReportDashboard 
            reimbursements={filteredReimbursements}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filtered Reimbursement Data</CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing {filteredReimbursements.length} of {reimbursements.length} total records
              </p>
            </CardHeader>
            <CardContent>
              <ReimbursementList 
                reimbursements={filteredReimbursements}
                loading={loading}
                showFilters={false}
                showPagination={true}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Export Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Export Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setExportFormat('csv')
                handleExport()
              }}
              disabled={filteredReimbursements.length === 0}
            >
              <FileText className="h-4 w-4 mr-2" />
              Export as CSV
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setExportFormat('json')
                handleExport()
              }}
              disabled={filteredReimbursements.length === 0}
            >
              <Database className="h-4 w-4 mr-2" />
              Export as JSON
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setExportFormat('pdf')
                handleExport()
              }}
              disabled={filteredReimbursements.length === 0}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Export Summary
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
