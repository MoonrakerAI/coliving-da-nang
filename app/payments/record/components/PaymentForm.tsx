'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { PaymentMethod, PaymentStatus } from '@/lib/db/models/payment'
import { MethodSelector } from './MethodSelector'

// Form validation schema
const PaymentFormSchema = z.object({
  tenantId: z.string().uuid('Please select a valid tenant'),
  propertyId: z.string().uuid('Please select a valid property'),
  amountCents: z.number().int().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3-letter code').default('USD'),
  paymentMethod: z.enum(['Stripe', 'PayPal', 'Venmo', 'Wise', 'Revolut', 'Wire', 'Cash']),
  status: z.enum(['Pending', 'Paid', 'Overdue', 'Refunded']).default('Paid'),
  dueDate: z.string().min(1, 'Due date is required'),
  paidDate: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  description: z.string().min(1, 'Payment description is required')
})

type PaymentFormData = z.infer<typeof PaymentFormSchema>

interface Tenant {
  id: string
  name: string
  email: string
}

interface Property {
  id: string
  name: string
  address: string
}

export function PaymentForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<PaymentFormData>({
    resolver: zodResolver(PaymentFormSchema),
    defaultValues: {
      currency: 'USD',
      status: 'Paid',
      dueDate: new Date().toISOString().split('T')[0],
      paidDate: new Date().toISOString().split('T')[0]
    }
  })

  const watchedStatus = watch('status')
  const watchedPaymentMethod = watch('paymentMethod')

  // Load tenants and properties
  useEffect(() => {
    const loadData = async () => {
      try {
        const [tenantsRes, propertiesRes] = await Promise.all([
          fetch('/api/tenants'),
          fetch('/api/properties')
        ])

        if (tenantsRes.ok) {
          const tenantsData = await tenantsRes.json()
          setTenants(tenantsData.tenants || [])
        }

        if (propertiesRes.ok) {
          const propertiesData = await propertiesRes.json()
          setProperties(propertiesData.properties || [])
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoadingData(false)
      }
    }

    loadData()
  }, [])

  const onSubmit = async (data: PaymentFormData) => {
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      // Convert amount from dollars to cents
      const amountInCents = Math.round(data.amountCents * 100)
      
      // Prepare payload
      const payload = {
        ...data,
        amountCents: amountInCents,
        dueDate: new Date(data.dueDate),
        paidDate: data.paidDate ? new Date(data.paidDate) : undefined
      }

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to record payment')
      }

      const result = await response.json()
      
      setSubmitStatus('success')
      setSubmitMessage('Payment recorded successfully!')
      reset()
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setSubmitStatus('idle')
        setSubmitMessage('')
      }, 3000)

    } catch (error) {
      console.error('Error recording payment:', error)
      setSubmitStatus('error')
      setSubmitMessage(error instanceof Error ? error.message : 'Failed to record payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading form data...</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Status Messages */}
      {submitStatus === 'success' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {submitMessage}
          </AlertDescription>
        </Alert>
      )}

      {submitStatus === 'error' && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {submitMessage}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tenant Selection */}
        <div className="space-y-2">
          <Label htmlFor="tenantId">Tenant *</Label>
          <Select onValueChange={(value) => setValue('tenantId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select tenant" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name} ({tenant.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.tenantId && (
            <p className="text-sm text-red-600">{errors.tenantId.message}</p>
          )}
        </div>

        {/* Property Selection */}
        <div className="space-y-2">
          <Label htmlFor="propertyId">Property *</Label>
          <Select onValueChange={(value) => setValue('propertyId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name} - {property.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.propertyId && (
            <p className="text-sm text-red-600">{errors.propertyId.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="amountCents">Amount (USD) *</Label>
          <Input
            id="amountCents"
            type="number"
            step="0.01"
            min="0"
            placeholder="1500.00"
            {...register('amountCents', { valueAsNumber: true })}
          />
          {errors.amountCents && (
            <p className="text-sm text-red-600">{errors.amountCents.message}</p>
          )}
        </div>

        {/* Currency */}
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Input
            id="currency"
            {...register('currency')}
            placeholder="USD"
            maxLength={3}
          />
          {errors.currency && (
            <p className="text-sm text-red-600">{errors.currency.message}</p>
          )}
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Status *</Label>
          <Select onValueChange={(value) => setValue('status', value as any)} defaultValue="Paid">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
              <SelectItem value="Refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          {errors.status && (
            <p className="text-sm text-red-600">{errors.status.message}</p>
          )}
        </div>
      </div>

      {/* Payment Method */}
      <div className="space-y-2">
        <Label>Payment Method *</Label>
        <MethodSelector
          value={watchedPaymentMethod}
          onValueChange={(value) => setValue('paymentMethod', value)}
        />
        {errors.paymentMethod && (
          <p className="text-sm text-red-600">{errors.paymentMethod.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Due Date */}
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date *</Label>
          <Input
            id="dueDate"
            type="date"
            {...register('dueDate')}
          />
          {errors.dueDate && (
            <p className="text-sm text-red-600">{errors.dueDate.message}</p>
          )}
        </div>

        {/* Paid Date - only show if status is Paid */}
        {watchedStatus === 'Paid' && (
          <div className="space-y-2">
            <Label htmlFor="paidDate">Paid Date</Label>
            <Input
              id="paidDate"
              type="date"
              {...register('paidDate')}
            />
            {errors.paidDate && (
              <p className="text-sm text-red-600">{errors.paidDate.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Reference */}
      <div className="space-y-2">
        <Label htmlFor="reference">Reference Number</Label>
        <Input
          id="reference"
          {...register('reference')}
          placeholder="RENT-JAN-2025-001"
        />
        {errors.reference && (
          <p className="text-sm text-red-600">{errors.reference.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Input
          id="description"
          {...register('description')}
          placeholder="Monthly Rent - January 2025"
        />
        {errors.description && (
          <p className="text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Additional notes about this payment..."
          rows={3}
        />
        {errors.notes && (
          <p className="text-sm text-red-600">{errors.notes.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Record Payment
        </Button>
      </div>
    </form>
  )
}
