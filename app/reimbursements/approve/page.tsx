'use client'

import { useState, useEffect } from 'react'
import { ReimbursementRequest } from '@/lib/db/models/reimbursement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, CheckCircle, Users, AlertTriangle } from 'lucide-react'
import { ApprovalForm } from './components/ApprovalForm'
import { BatchApprovalForm } from './components/BatchApprovalForm'
import { ReimbursementList } from '../components/ReimbursementList'
import { toast } from 'sonner'

export default function ReimbursementApprovalPage() {
  const [reimbursements, setReimbursements] = useState<ReimbursementRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // TODO: Get current user from auth context
  const currentUserId = 'current-user-id' // Placeholder

  const fetchPendingReimbursements = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/reimbursements?status=Requested')
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch pending reimbursements')
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
    await fetchPendingReimbursements()
    setRefreshing(false)
  }

  useEffect(() => {
    fetchPendingReimbursements()
  }, [])

  const handleApprovalSubmit = async (reimbursementId: string, data: any) => {
    try {
      const response = await fetch(`/api/reimbursements/${reimbursementId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          approvedBy: currentUserId
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to process approval')
      }

      toast.success(result.message)
      await refreshData()
    } catch (error) {
      console.error('Error processing approval:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to process approval')
    }
  }

  const handleBatchApprovalSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/reimbursements/batch-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reimbursementIds: data.selectedIds,
          action: data.action,
          comment: data.comment,
          approvedBy: currentUserId
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to process batch approval')
      }

      toast.success(result.message)
      await refreshData()
    } catch (error) {
      console.error('Error processing batch approval:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to process batch approval')
    }
  }

  const pendingReimbursements = reimbursements.filter(r => r.status === 'Requested')
  const totalPendingAmount = pendingReimbursements.reduce((sum, r) => sum + r.amountCents, 0)

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
          Loading pending approvals...
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reimbursement Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve reimbursement requests from your properties
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
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingReimbursements.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting your approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPendingAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Pending approval value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All Requests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
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

      {pendingReimbursements.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h3 className="text-lg font-medium mb-2">All caught up!</h3>
              <p>No pending reimbursement requests require your approval.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="individual" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="individual">Individual Approval</TabsTrigger>
            <TabsTrigger value="batch">Batch Approval</TabsTrigger>
          </TabsList>

          <TabsContent value="individual" className="space-y-6">
            <div className="grid gap-6">
              {pendingReimbursements.map((reimbursement) => (
                <ApprovalForm
                  key={reimbursement.id}
                  reimbursement={reimbursement}
                  approvedBy={currentUserId}
                  onApprovalSubmit={(data) => handleApprovalSubmit(reimbursement.id, data)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="batch" className="space-y-6">
            <BatchApprovalForm
              reimbursements={pendingReimbursements}
              approvedBy={currentUserId}
              onBatchApprovalSubmit={handleBatchApprovalSubmit}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* All Reimbursements List */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">All Reimbursement Requests</h2>
        <ReimbursementList showFilters={true} />
      </div>
    </div>
  )
}
