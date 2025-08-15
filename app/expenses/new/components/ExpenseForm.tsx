'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
    },
  })

  const selectedCategory = watch('category')
  const amount = watch('amount')

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
      // TODO: Implement API call to create expense
      console.log('Submitting expense:', data)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // TODO: Show success message and redirect
      alert('Expense created successfully!')
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
