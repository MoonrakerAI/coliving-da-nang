'use client'

import { useState, useEffect } from 'react'
import { ReimbursementRequest } from '@/lib/db/models/reimbursement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, RefreshCw } from 'lucide-react'
import { ReimbursementStatusBadge } from './ReimbursementStatusBadge'
import { formatDistanceToNow } from 'date-fns'

interface ReimbursementListProps {
  propertyId?: string
  requestorId?: string
  showFilters?: boolean
  className?: string
}

export function ReimbursementList({ 
  propertyId, 
  requestorId, 
  showFilters = true,
  className 
}: ReimbursementListProps) {
  const [reimbursements, setReimbursements] = useState<ReimbursementRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date')

  const fetchReimbursements = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (propertyId) params.append('propertyId', propertyId)
      if (requestorId) params.append('requestorId', requestorId)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      
      const response = await fetch(`/api/reimbursements?${params.toString()}`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch reimbursements')
      }
      
      setReimbursements(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReimbursements()
  }, [propertyId, requestorId, statusFilter])

  // Filter and sort reimbursements
  const filteredAndSortedReimbursements = reimbursements
    .filter(reimbursement => {
      if (!searchTerm) return true
      const searchLower = searchTerm.toLowerCase()
      return (
        reimbursement.id.toLowerCase().includes(searchLower) ||
        reimbursement.expenseId.toLowerCase().includes(searchLower) ||
        reimbursement.amountCents.toString().includes(searchLower)
      )
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()
        case 'amount':
          return b.amountCents - a.amountCents
        case 'status':
          return a.status.localeCompare(b.status)
        default:
          return 0
      }
    })

  const formatCurrency = (amountCents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amountCents / 100)
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading reimbursements...
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center text-destructive">
            <p>Error loading reimbursements: {error}</p>
            <Button 
              variant="outline" 
              onClick={fetchReimbursements}
              className="mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Reimbursement Requests</span>
          <Badge variant="secondary">{filteredAndSortedReimbursements.length}</Badge>
        </CardTitle>
        
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, expense ID, or amount..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Requested">Requested</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Denied">Denied</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={fetchReimbursements}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {filteredAndSortedReimbursements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {reimbursements.length === 0 
              ? 'No reimbursement requests found'
              : 'No reimbursements match your search criteria'
            }
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedReimbursements.map((reimbursement) => (
              <div
                key={reimbursement.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        #{reimbursement.id.slice(0, 8)}
                      </span>
                      <ReimbursementStatusBadge status={reimbursement.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Expense: {reimbursement.expenseId.slice(0, 8)}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold text-lg">
                      {formatCurrency(reimbursement.amountCents, reimbursement.currency)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(reimbursement.requestDate), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                
                {reimbursement.comments.length > 0 && (
                  <div className="text-sm text-muted-foreground mb-2">
                    Latest: {reimbursement.comments[reimbursement.comments.length - 1]}
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Requestor: {reimbursement.requestorId.slice(0, 8)}</span>
                  {reimbursement.approvedBy && (
                    <span>Approved by: {reimbursement.approvedBy.slice(0, 8)}</span>
                  )}
                  {reimbursement.paidDate && (
                    <span>Paid: {formatDistanceToNow(new Date(reimbursement.paidDate), { addSuffix: true })}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
