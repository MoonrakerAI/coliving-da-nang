'use client'

import { useState, useEffect } from 'react'
import { ReimbursementRequest } from '@/lib/db/models/reimbursement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react'
import { PaymentRecordingForm } from './components/PaymentRecordingForm'
import { ReimbursementList } from '../components/ReimbursementList'
import { toast } from 'sonner'

export default function ReimbursementPaymentPage() {
  const [reimbursements, setReimbursements] = useState<ReimbursementRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // TODO: Get current user from auth context
  const currentUserId = 'current-user-id' // Placeholder

  const fetchApprovedReimbursements = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/reimbursements?status=Approved')
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch approved reimbursements')
      }
      
      setReimbursements(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await fetchApprovedReimbursements()
    setRefreshing(false)
  }

  useEffect(() => {
    fetchApprovedReimbursements()
  }, [])

  const handlePaymentSubmit = async (reimbursementId: string, data: any) => {
    try {
      const response = await fetch(`/api/reimbursements/${reimbursementId}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          paidBy: currentUserId
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to record payment')
      }

      toast.success(result.message)
      await refreshData()
    } catch (error) {
      console.error('Error recording payment:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to record payment')
    }
  }

  const approvedReimbursements = reimbursements.filter(r => r.status === 'Approved')
  const totalApprovedAmount = approvedReimbursements.reduce((sum, r) => sum + r.amountCents, 0)

  const formatCurrency = (amountCents: number, currency = 'USD') => {
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
          Loading approved reimbursements...
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Recording</h1>
          <p className="text-muted-foreground">
            Record payments for approved reimbursement requests
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={refreshData}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Requests</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{approvedReimbursements.length}</div>
            <p className="text-xs text-muted-foreground">
              Ready for payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalApprovedAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Approved payment value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All Requests</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reimbursements.length}</div>
            <p className="text-xs text-muted-foreground">
              Total requests today
            </p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error loading reimbursements: {error}
          </AlertDescription>
        </Alert>
      )}

      {approvedReimbursements.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h3 className="text-lg font-medium mb-2">No payments pending</h3>
              <p>All approved reimbursement requests have been paid, or there are no approved requests.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Approved Requests Awaiting Payment</h2>
            <Badge variant="secondary">{approvedReimbursements.length} pending</Badge>
          </div>
          
          {/* Payment Forms */}
          <div className="grid gap-6">
            {approvedReimbursements.map((reimbursement) => (
              <PaymentRecordingForm
                key={reimbursement.id}
                reimbursement={reimbursement}
                paidBy={currentUserId}
                onPaymentSubmit={(data) => handlePaymentSubmit(reimbursement.id, data)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Payment Integration Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Integration Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Digital Payment Methods</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Stripe:</strong> Use payment intent IDs (pi_...)</li>
                <li>• <strong>PayPal:</strong> Include transaction IDs for tracking</li>
                <li>• <strong>Wise:</strong> Reference transfer confirmation numbers</li>
                <li>• <strong>Venmo/Revolut:</strong> Note transaction references</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Manual Payment Methods</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Wire Transfer:</strong> Include confirmation numbers</li>
                <li>• <strong>Cash:</strong> Provide receipt numbers when possible</li>
                <li>• <strong>Check:</strong> Note check numbers and bank details</li>
                <li>• Always keep records for accounting purposes</li>
              </ul>
            </div>
          </div>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Recording a payment will automatically update the expense 
              record and notify the requestor. Ensure payments are successfully processed before 
              marking them as paid in the system.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* All Reimbursements List */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">All Reimbursement Requests</h2>
        <ReimbursementList showFilters={true} />
      </div>
    </div>
  )
}
