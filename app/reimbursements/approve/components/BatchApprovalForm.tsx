'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ReimbursementRequest } from '@/lib/db/models/reimbursement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, AlertTriangle, Users } from 'lucide-react'
import { ReimbursementStatusBadge } from '../../components/ReimbursementStatusBadge'

const batchApprovalFormSchema = z.object({
  action: z.enum(['approve', 'deny']),
  comment: z.string().min(1, 'Comment is required for batch approval/denial'),
  selectedIds: z.array(z.string()).min(1, 'Select at least one reimbursement request'),
})

type BatchApprovalFormData = z.infer<typeof batchApprovalFormSchema>

interface BatchApprovalFormProps {
  reimbursements: ReimbursementRequest[]
  approvedBy: string
  onBatchApprovalSubmit: (data: BatchApprovalFormData) => Promise<void>
  className?: string
}

export function BatchApprovalForm({ 
  reimbursements, 
  approvedBy, 
  onBatchApprovalSubmit, 
  className 
}: BatchApprovalFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAction, setSelectedAction] = useState<'approve' | 'deny' | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BatchApprovalFormData>({
    resolver: zodResolver(batchApprovalFormSchema),
  })

  const comment = watch('comment')

  // Filter to only show requested reimbursements
  const pendingReimbursements = reimbursements.filter(r => r.status === 'Requested')

  const onSubmit = async (data: BatchApprovalFormData) => {
    setIsSubmitting(true)
    try {
      await onBatchApprovalSubmit({
        ...data,
        selectedIds
      })
      // Reset form after successful submission
      setSelectedIds([])
      setSelectedAction(null)
      setValue('comment', '')
    } catch (error) {
      console.error('Error submitting batch approval:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleActionSelect = (action: 'approve' | 'deny') => {
    setSelectedAction(action)
    setValue('action', action)
  }

  const handleSelectAll = () => {
    if (selectedIds.length === pendingReimbursements.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(pendingReimbursements.map(r => r.id))
    }
  }

  const handleSelectReimbursement = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id))
    }
  }

  const formatCurrency = (amountCents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amountCents / 100)
  }

  const selectedReimbursements = pendingReimbursements.filter(r => selectedIds.includes(r.id))
  const totalAmount = selectedReimbursements.reduce((sum, r) => sum + r.amountCents, 0)

  if (pendingReimbursements.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No pending reimbursement requests available for batch approval.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Batch Approval
          </span>
          <Badge variant="secondary">{pendingReimbursements.length} pending</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Reimbursement Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Select Requests</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedIds.length === pendingReimbursements.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {pendingReimbursements.map((reimbursement) => (
                <div
                  key={reimbursement.id}
                  className="flex items-center space-x-3 p-3 border-b last:border-b-0 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedIds.includes(reimbursement.id)}
                    onCheckedChange={(checked) => 
                      handleSelectReimbursement(reimbursement.id, !!checked)
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">
                        #{reimbursement.id.slice(0, 8)}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(reimbursement.amountCents, reimbursement.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Expense: {reimbursement.expenseId.slice(0, 8)}</span>
                      <span>Requestor: {reimbursement.requestorId.slice(0, 8)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {selectedIds.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span>{selectedIds.length} request(s) selected</span>
                  <span className="font-semibold">
                    Total: {formatCurrency(totalAmount, 'USD')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Selection */}
          {selectedIds.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Batch Decision *</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={selectedAction === 'approve' ? 'default' : 'outline'}
                  className={`h-16 ${selectedAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  onClick={() => handleActionSelect('approve')}
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Approve All Selected
                </Button>
                <Button
                  type="button"
                  variant={selectedAction === 'deny' ? 'destructive' : 'outline'}
                  className="h-16"
                  onClick={() => handleActionSelect('deny')}
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  Deny All Selected
                </Button>
              </div>
            </div>
          )}

          {/* Comment */}
          {selectedAction && selectedIds.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="comment" className="text-base font-medium">
                {selectedAction === 'approve' ? 'Batch Approval Notes' : 'Batch Denial Reason'} *
              </Label>
              <Textarea
                id="comment"
                placeholder={
                  selectedAction === 'approve'
                    ? "Add notes for all approved requests..."
                    : "Explain why these reimbursements are being denied..."
                }
                className="min-h-[100px]"
                {...register('comment')}
              />
              {errors.comment && (
                <p className="text-sm text-destructive">{errors.comment.message}</p>
              )}
            </div>
          )}

          {/* Guidelines */}
          {selectedAction && selectedIds.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {selectedAction === 'approve' ? (
                  <>
                    <strong>Batch Approval:</strong> This will approve {selectedIds.length} 
                    reimbursement request(s) totaling {formatCurrency(totalAmount, 'USD')}. 
                    All requestors will be notified and requests will move to payment processing.
                  </>
                ) : (
                  <>
                    <strong>Batch Denial:</strong> This will deny {selectedIds.length} 
                    reimbursement request(s). All requestors will be notified with the 
                    provided reason.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          {selectedIds.length > 0 && (
            <div className="flex justify-end space-x-3">
              <Button
                type="submit"
                disabled={!selectedAction || !comment?.trim() || isSubmitting}
                className={`min-w-[140px] ${
                  selectedAction === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : selectedAction === 'deny'
                    ? 'bg-destructive hover:bg-destructive/90'
                    : ''
                }`}
              >
                {isSubmitting ? (
                  'Processing...'
                ) : selectedAction === 'approve' ? (
                  `Approve ${selectedIds.length} Request(s)`
                ) : selectedAction === 'deny' ? (
                  `Deny ${selectedIds.length} Request(s)`
                ) : (
                  'Select Action'
                )}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
