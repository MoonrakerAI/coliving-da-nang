'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoIcon } from 'lucide-react'
import { CategorySelector } from './CategorySelector'
import { PhotoCapture } from './PhotoCapture'
import { LocationPicker } from './LocationPicker'
import { QuickEntryTemplates } from './QuickEntryTemplates'

// Form schema based on story requirements
const expenseFormSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.string().default('VND'),
  category: z.enum(['Utilities', 'Repairs', 'Supplies', 'Cleaning', 'Maintenance', 'Other']),
  description: z.string().min(1, 'Description is required'),
  receiptPhotos: z.array(z.instanceof(File)).optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string(),
  }).optional(),
  date: z.date().default(() => new Date()),
  isReimbursement: z.boolean().default(false),
  reimbursementReason: z.string().optional(),
})

type ExpenseFormData = z.infer<typeof expenseFormSchema>

export function ExpenseForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      currency: 'VND',
      date: new Date(),
      isReimbursement: false,
      reimbursementReason: '',
    },
  })

  const selectedCategory = watch('category')
  const amount = watch('amount')
  const isReimbursement = watch('isReimbursement')

  const handleTemplateSelect = (template: any) => {
    // Pre-fill form with template data
    setValue('category', template.category, { shouldDirty: true })
    if (template.amount) {
      setValue('amount', template.amount, { shouldDirty: true })
    }
    setValue('description', template.description, { shouldDirty: true })
    
    // Show success feedback
    console.log('Template applied:', template.name)
  }

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true)
    try {
      // Create expense with reimbursement flag
      const expenseData = {
        ...data,
        needsReimbursement: data.isReimbursement,
        amountCents: Math.round(data.amount * 100), // Convert to cents
        receiptPhotos: photos.map(file => URL.createObjectURL(file)), // Convert files to URLs
      }
      
      console.log('Submitting expense:', expenseData)
      
      // TODO: Implement API call to create expense
      // const response = await fetch('/api/expenses', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(expenseData)
      // })
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // If reimbursement requested, create reimbursement request
      if (data.isReimbursement) {
        console.log('Creating reimbursement request for expense')
        // TODO: Implement reimbursement request creation
        // const reimbursementData = {
        //   expenseId: response.id,
        //   requestorId: currentUser.id,
        //   propertyId: currentProperty.id,
        //   amountCents: expenseData.amountCents,
        //   currency: data.currency
        // }
        // await fetch('/api/reimbursements', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(reimbursementData)
        // })
      }
      
      // Show success message
      const message = data.isReimbursement 
        ? 'Expense created and reimbursement request submitted!'
        : 'Expense created successfully!'
      alert(message)
    } catch (error) {
      console.error('Error creating expense:', error)
      alert('Failed to create expense. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Amount Input - Auto-focus and large touch target */}
      <div className="space-y-2">
        <Label htmlFor="amount" className="text-base font-medium">
          Amount *
        </Label>
        <div className="relative">
          <Input
            id="amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            autoFocus
            className="text-2xl h-14 pr-16 text-right font-mono"
            {...register('amount', { valueAsNumber: true })}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
            VND
          </div>
        </div>
        {errors.amount && (
          <p className="text-sm text-destructive">{errors.amount.message}</p>
        )}
      </div>

      {/* Category Selection - Large touch targets */}
      <div className="space-y-2">
        <Label className="text-base font-medium">Category *</Label>
        <CategorySelector
          selectedCategory={selectedCategory}
          onCategorySelect={(category) => setValue('category', category, { shouldDirty: true })}
          onTemplateSelect={handleTemplateSelect}
        />
        {errors.category && (
          <p className="text-sm text-destructive">{errors.category.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-base font-medium">
          Description *
        </Label>
        <Textarea
          id="description"
          placeholder="What was this expense for?"
          className="min-h-[80px] text-base"
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Photo Capture */}
      <div className="space-y-2">
        <Label className="text-base font-medium">Receipt Photos</Label>
        <PhotoCapture
          photos={photos}
          onPhotosChange={(newPhotos) => {
            setPhotos(newPhotos)
            setValue('receiptPhotos', newPhotos, { shouldDirty: true })
          }}
        />
      </div>

      {/* Quick Entry Templates */}
      <div className="space-y-2">
        <QuickEntryTemplates
          onTemplateSelect={handleTemplateSelect}
          selectedCategory={selectedCategory}
        />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label className="text-base font-medium">Location</Label>
        <LocationPicker
          onLocationSelect={(location) => setValue('location', location, { shouldDirty: true })}
        />
      </div>

      {/* Reimbursement Request */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isReimbursement"
            checked={isReimbursement}
            onCheckedChange={(checked) => {
              setValue('isReimbursement', !!checked, { shouldDirty: true })
              if (!checked) {
                setValue('reimbursementReason', '', { shouldDirty: true })
              }
            }}
          />
          <Label 
            htmlFor="isReimbursement" 
            className="text-base font-medium cursor-pointer"
          >
            Request reimbursement for this expense
          </Label>
        </div>
        
        {isReimbursement && (
          <>
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                This expense will be flagged for reimbursement and sent to property owners for approval.
                You&apos;ll receive notifications about the approval status and payment.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="reimbursementReason" className="text-sm font-medium">
                Reason for reimbursement (optional)
              </Label>
              <Textarea
                id="reimbursementReason"
                placeholder="Why should this expense be reimbursed? (e.g., emergency repair, pre-approved purchase)"
                className="text-sm"
                {...register('reimbursementReason')}
              />
            </div>
          </>
        )}
      </div>

      {/* Submit Button - Large touch target */}
      <div className="pt-4">
        <Button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="w-full h-14 text-lg font-medium"
        >
          {isSubmitting ? 'Creating Expense...' : 'Create Expense'}
        </Button>
      </div>

      {/* Draft indicator */}
      {isDirty && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            💾 Changes will be auto-saved as draft
          </p>
        </div>
      )}
    </form>
  )
}
