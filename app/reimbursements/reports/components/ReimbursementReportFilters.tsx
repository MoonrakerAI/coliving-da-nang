'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Filter, Download, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

export interface ReportFilters {
  propertyId?: string
  requestorId?: string
  status?: string
  paymentMethod?: string
  dateFrom?: Date
  dateTo?: Date
  amountMin?: number
  amountMax?: number
}

interface ReimbursementReportFiltersProps {
  filters: ReportFilters
  onFiltersChange: (filters: ReportFilters) => void
  onExport: () => void
  onRefresh: () => void
  loading?: boolean
  className?: string
}

export function ReimbursementReportFilters({
  filters,
  onFiltersChange,
  onExport,
  onRefresh,
  loading = false,
  className
}: ReimbursementReportFiltersProps) {
  const [dateFromOpen, setDateFromOpen] = useState(false)
  const [dateToOpen, setDateToOpen] = useState(false)

  const updateFilter = (key: keyof ReportFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== '' && value !== null
  )

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>From Date</Label>
            <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateFrom ? format(filters.dateFrom, 'PPP') : 'Select start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateFrom}
                  onSelect={(date) => {
                    updateFilter('dateFrom', date)
                    setDateFromOpen(false)
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>To Date</Label>
            <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateTo ? format(filters.dateTo, 'PPP') : 'Select end date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateTo}
                  onSelect={(date) => {
                    updateFilter('dateTo', date)
                    setDateToOpen(false)
                  }}
                  disabled={(date) => 
                    date > new Date() || 
                    (filters.dateFrom ? date < filters.dateFrom : false)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Status and Payment Method */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={filters.status || ''} 
              onValueChange={(value) => updateFilter('status', value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="Requested">Requested</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Denied">Denied</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select 
              value={filters.paymentMethod || ''} 
              onValueChange={(value) => updateFilter('paymentMethod', value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All payment methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Payment Methods</SelectItem>
                <SelectItem value="Stripe">Stripe</SelectItem>
                <SelectItem value="PayPal">PayPal</SelectItem>
                <SelectItem value="Venmo">Venmo</SelectItem>
                <SelectItem value="Wise">Wise</SelectItem>
                <SelectItem value="Revolut">Revolut</SelectItem>
                <SelectItem value="Wire">Wire Transfer</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Amount Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Minimum Amount ($)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={filters.amountMin ? (filters.amountMin / 100).toString() : ''}
              onChange={(e) => {
                const value = e.target.value
                updateFilter('amountMin', value ? Math.round(parseFloat(value) * 100) : undefined)
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Maximum Amount ($)</Label>
            <Input
              type="number"
              placeholder="999999.99"
              value={filters.amountMax ? (filters.amountMax / 100).toString() : ''}
              onChange={(e) => {
                const value = e.target.value
                updateFilter('amountMax', value ? Math.round(parseFloat(value) * 100) : undefined)
              }}
            />
          </div>
        </div>

        {/* Property and Requestor IDs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Property ID</Label>
            <Input
              placeholder="Filter by property ID"
              value={filters.propertyId || ''}
              onChange={(e) => updateFilter('propertyId', e.target.value || undefined)}
            />
          </div>

          <div className="space-y-2">
            <Label>Requestor ID</Label>
            <Input
              placeholder="Filter by requestor ID"
              value={filters.requestorId || ''}
              onChange={(e) => updateFilter('requestorId', e.target.value || undefined)}
            />
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={clearFilters}>
              Clear All Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
