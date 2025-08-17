'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ReimbursementRequest } from '@/lib/db/models/reimbursement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react'
import { ReimbursementStatusBadge } from '../../components/ReimbursementStatusBadge'
import { format } from 'date-fns'

const paymentFormSchema = z.object({
  paymentMethod: z.enum(['Stripe', 'PayPal', 'Venmo', 'Wise', 'Revolut', 'Wire', 'Cash']),
  paymentReference: z.string().optional(),
  paidDate: z.date().optional(),
  notes: z.string().optional(),
})

type PaymentFormData = z.infer<typeof paymentFormSchema>

interface PaymentRecordingFormProps {
  reimbursement: ReimbursementRequest
  paidBy: string
  onPaymentSubmit: (data: PaymentFormData) => Promise<void>
  className?: string
}

export function PaymentRecordingForm({ 
  reimbursement, 
  paidBy, 
  onPaymentSubmit, 
  className 
}: PaymentRecordingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      paidDate: new Date(),
    }
  })

  const paymentMethod = watch('paymentMethod')
  const paidDate = watch('paidDate')

  const onSubmit = async (data: PaymentFormData) => {
    setIsSubmitting(true)
    try {
      await onPaymentSubmit(data)
    } catch (error) {
      console.error('Error recording payment:', error)
    } finally {
      setIsSubmitting(false)
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

  // Don't show form if not approved
  if (reimbursement.status !== 'Approved') {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This reimbursement request must be approved before payment can be recorded.
              Current status: <ReimbursementStatusBadge status={reimbursement.status} className="ml-1" />
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
            <DollarSign className="h-5 w-5" />
            Record Payment
          </span>
          <ReimbursementStatusBadge status={reimbursement.status} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Payment Summary */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Amount to Pay</label>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(reimbursement.amountCents, reimbursement.currency)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Requestor</label>
                <p className="font-mono text-sm">{reimbursement.requestorId.slice(0, 8)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Request ID</label>
                <p className="font-mono text-sm">{reimbursement.id.slice(0, 8)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Expense ID</label>
                <p className="font-mono text-sm">{reimbursement.expenseId.slice(0, 8)}</p>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod" className="text-base font-medium">
              Payment Method *
            </Label>
            <Select onValueChange={(value) => setValue('paymentMethod', value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Stripe">Stripe</SelectItem>
                <SelectItem value="PayPal">PayPal</SelectItem>
                <SelectItem value="Venmo">Venmo</SelectItem>
                <SelectItem value="Wise">Wise (TransferWise)</SelectItem>
                <SelectItem value="Revolut">Revolut</SelectItem>
                <SelectItem value="Wire">Wire Transfer</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
              </SelectContent>
            </Select>
            {errors.paymentMethod && (
              <p className="text-sm text-destructive">{errors.paymentMethod.message}</p>
            )}
          </div>

          {/* Payment Reference */}
          <div className="space-y-2">
            <Label htmlFor="paymentReference" className="text-base font-medium">
              Payment Reference
              {paymentMethod && ['Stripe', 'PayPal', 'Wire'].includes(paymentMethod) && (
                <span className="text-sm text-muted-foreground ml-1">(recommended)</span>
              )}
            </Label>
            <Input
              id="paymentReference"
              placeholder={
                paymentMethod === 'Stripe' ? 'pi_1234567890abcdef' :
                paymentMethod === 'PayPal' ? 'PAYID-1234567890' :
                paymentMethod === 'Wire' ? 'Wire confirmation number' :
                paymentMethod === 'Venmo' ? 'Venmo transaction ID' :
                paymentMethod === 'Wise' ? 'Wise transfer ID' :
                paymentMethod === 'Revolut' ? 'Revolut transaction ID' :
                'Transaction reference or confirmation number'
              }
              {...register('paymentReference')}
            />
            <p className="text-xs text-muted-foreground">
              {paymentMethod === 'Stripe' && 'Enter the Stripe payment intent ID (pi_...)'}
              {paymentMethod === 'PayPal' && 'Enter the PayPal transaction ID'}
              {paymentMethod === 'Wire' && 'Enter the wire transfer confirmation number'}
              {paymentMethod === 'Cash' && 'Optional: Enter receipt number or note'}
              {!paymentMethod && 'Transaction reference for tracking and reconciliation'}
            </p>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Payment Date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paidDate ? format(paidDate, 'PPP') : 'Select payment date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paidDate}
                  onSelect={(date) => {
                    setValue('paidDate', date)
                    setCalendarOpen(false)
                  }}
                  disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              When was this payment made? Defaults to today.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base font-medium">
              Payment Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this payment (optional)..."
              className="min-h-[80px]"
              {...register('notes')}
            />
          </div>

          {/* Payment Integration Info */}
          {paymentMethod && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {paymentMethod === 'Stripe' && (
                  <>
                    <strong>Stripe Integration:</strong> This payment will be linked to your Stripe account. 
                    The payment intent ID will be used for reconciliation.
                  </>
                )}
                {paymentMethod === 'PayPal' && (
                  <>
                    <strong>PayPal Integration:</strong> This payment will be tracked in your PayPal history. 
                    The transaction ID helps with reconciliation.
                  </>
                )}
                {paymentMethod === 'Wire' && (
                  <>
                    <strong>Wire Transfer:</strong> Manual bank transfer. Please ensure the confirmation 
                    number is accurate for tracking purposes.
                  </>
                )}
                {paymentMethod === 'Cash' && (
                  <>
                    <strong>Cash Payment:</strong> Physical cash payment. Consider providing a receipt 
                    to the requestor for their records.
                  </>
                )}
                {['Venmo', 'Wise', 'Revolut'].includes(paymentMethod) && (
                  <>
                    <strong>{paymentMethod} Payment:</strong> Digital payment via {paymentMethod}. 
                    The transaction ID helps with tracking and reconciliation.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Button
              type="submit"
              disabled={!paymentMethod || isSubmitting}
              className="min-w-[140px] bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                'Recording Payment...'
              ) : (
                'Record Payment'
              )}
            </Button>
          </div>

          {/* Final Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Recording this payment will mark the reimbursement as &quot;Paid&quot; 
              and notify the requestor. This action cannot be undone. Please ensure the payment 
              has been successfully processed before proceeding.
            </AlertDescription>
          </Alert>
        </form>
      </CardContent>
    </Card>
  )
}
