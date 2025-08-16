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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { ReimbursementStatusBadge } from '../../components/ReimbursementStatusBadge'

const approvalFormSchema = z.object({
  action: z.enum(['approve', 'deny']),
  comment: z.string().min(1, 'Comment is required for approval/denial'),
})

type ApprovalFormData = z.infer<typeof approvalFormSchema>

interface ApprovalFormProps {
  reimbursement: ReimbursementRequest
  approvedBy: string
  onApprovalSubmit: (data: ApprovalFormData) => Promise<void>
  className?: string
}

export function ApprovalForm({ 
  reimbursement, 
  approvedBy, 
  onApprovalSubmit, 
  className 
}: ApprovalFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAction, setSelectedAction] = useState<'approve' | 'deny' | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ApprovalFormData>({
    resolver: zodResolver(approvalFormSchema),
  })

  const comment = watch('comment')

  const onSubmit = async (data: ApprovalFormData) => {
    setIsSubmitting(true)
    try {
      await onApprovalSubmit(data)
    } catch (error) {
      console.error('Error submitting approval:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleActionSelect = (action: 'approve' | 'deny') => {
    setSelectedAction(action)
    setValue('action', action)
  }

  const formatCurrency = (amountCents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amountCents / 100)
  }

  // Don't show form if already processed
  if (reimbursement.status !== 'Requested') {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This reimbursement request has already been {reimbursement.status.toLowerCase()}.
              No further action is required.
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
          <span>Approval Required</span>
          <ReimbursementStatusBadge status={reimbursement.status} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Reimbursement Summary */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Amount</label>
                <p className="text-xl font-bold">
                  {formatCurrency(reimbursement.amountCents, reimbursement.currency)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Requestor</label>
                <p className="font-mono text-sm">{reimbursement.requestorId.slice(0, 8)}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Expense ID</label>
              <p className="font-mono text-sm">{reimbursement.expenseId}</p>
            </div>
          </div>

          {/* Action Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Decision *</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={selectedAction === 'approve' ? 'default' : 'outline'}
                className={`h-16 ${selectedAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                onClick={() => handleActionSelect('approve')}
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Approve
              </Button>
              <Button
                type="button"
                variant={selectedAction === 'deny' ? 'destructive' : 'outline'}
                className="h-16"
                onClick={() => handleActionSelect('deny')}
              >
                <XCircle className="h-5 w-5 mr-2" />
                Deny
              </Button>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-base font-medium">
              {selectedAction === 'approve' ? 'Approval Notes' : 'Reason for Denial'} *
            </Label>
            <Textarea
              id="comment"
              placeholder={
                selectedAction === 'approve'
                  ? "Add any notes about this approval..."
                  : selectedAction === 'deny'
                  ? "Explain why this reimbursement is being denied..."
                  : "Select approve or deny first..."
              }
              className="min-h-[100px]"
              disabled={!selectedAction}
              {...register('comment')}
            />
            {errors.comment && (
              <p className="text-sm text-destructive">{errors.comment.message}</p>
            )}
          </div>

          {/* Guidelines */}
          {selectedAction && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {selectedAction === 'approve' ? (
                  <>
                    <strong>Approval Guidelines:</strong> Ensure the expense is legitimate, 
                    properly documented, and within policy. The requestor will be notified 
                    and the request will move to payment processing.
                  </>
                ) : (
                  <>
                    <strong>Denial Guidelines:</strong> Provide a clear, specific reason 
                    for denial. The requestor will be notified and can resubmit with 
                    additional documentation if appropriate.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Button
              type="submit"
              disabled={!selectedAction || !comment?.trim() || isSubmitting}
              className={`min-w-[120px] ${
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
                'Approve Request'
              ) : selectedAction === 'deny' ? (
                'Deny Request'
              ) : (
                'Select Action'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
