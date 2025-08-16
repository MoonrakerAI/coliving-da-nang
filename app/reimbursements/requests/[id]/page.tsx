'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ReimbursementRequest } from '@/lib/db/models/reimbursement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, RefreshCw, Download, ExternalLink } from 'lucide-react'
import { ReimbursementStatusBadge } from '../../components/ReimbursementStatusBadge'
import { ReimbursementStatusHistory } from '../../components/ReimbursementStatusHistory'
import { formatDistanceToNow, format } from 'date-fns'
import Link from 'next/link'

export default function ReimbursementRequestDetailPage() {
  const params = useParams()
  const id = params.id as string
  
  const [reimbursement, setReimbursement] = useState<ReimbursementRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReimbursement = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/reimbursements?id=${id}`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch reimbursement')
      }
      
      // Find the specific reimbursement by ID
      const foundReimbursement = data.data.find((r: ReimbursementRequest) => r.id === id)
      if (!foundReimbursement) {
        throw new Error('Reimbursement request not found')
      }
      
      setReimbursement(foundReimbursement)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchReimbursement()
    }
  }, [id])

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
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading reimbursement details...
        </div>
      </div>
    )
  }

  if (error || !reimbursement) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-8">
          <p className="text-destructive mb-4">
            {error || 'Reimbursement request not found'}
          </p>
          <div className="space-x-4">
            <Button variant="outline" onClick={fetchReimbursement}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button variant="outline" asChild>
              <Link href="/reimbursements/requests">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to List
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/reimbursements/requests">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              Reimbursement Request #{reimbursement.id.slice(0, 8)}
            </h1>
            <p className="text-muted-foreground">
              Created {formatDistanceToNow(new Date(reimbursement.requestDate), { addSuffix: true })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <ReimbursementStatusBadge status={reimbursement.status} />
          <Button variant="outline" onClick={fetchReimbursement}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Amount</label>
                  <p className="text-2xl font-bold">
                    {formatCurrency(reimbursement.amountCents, reimbursement.currency)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <ReimbursementStatusBadge status={reimbursement.status} />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Expense ID</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="font-mono text-sm">{reimbursement.expenseId}</span>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/expenses/${reimbursement.expenseId}`}>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Request Date</label>
                  <p className="mt-1">{format(new Date(reimbursement.requestDate), 'PPP')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Requestor ID</label>
                  <p className="font-mono text-sm mt-1">{reimbursement.requestorId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Property ID</label>
                  <p className="font-mono text-sm mt-1">{reimbursement.propertyId}</p>
                </div>
              </div>
              
              {reimbursement.approvedBy && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Approved By</label>
                      <p className="font-mono text-sm mt-1">{reimbursement.approvedBy}</p>
                    </div>
                    {reimbursement.approvedDate && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Approved Date</label>
                        <p className="mt-1">{format(new Date(reimbursement.approvedDate), 'PPP')}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {reimbursement.paidDate && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Payment Date</label>
                      <p className="mt-1">{format(new Date(reimbursement.paidDate), 'PPP')}</p>
                    </div>
                    {reimbursement.paymentMethod && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                        <p className="mt-1">{reimbursement.paymentMethod}</p>
                      </div>
                    )}
                  </div>
                  {reimbursement.paymentReference && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Payment Reference</label>
                      <p className="font-mono text-sm mt-1">{reimbursement.paymentReference}</p>
                    </div>
                  )}
                </>
              )}
              
              {reimbursement.deniedReason && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Denial Reason</label>
                    <p className="mt-1 text-destructive">{reimbursement.deniedReason}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          {reimbursement.comments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reimbursement.comments.map((comment, index) => (
                    <div key={index} className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">{comment}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status History */}
          <ReimbursementStatusHistory statusHistory={reimbursement.statusHistory} />
          
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/expenses/${reimbursement.expenseId}`}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Related Expense
                </Link>
              </Button>
              
              {reimbursement.status === 'Paid' && (
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Receipt
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
