'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Room } from '@/lib/db/models/room'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  Bed,
  Save,
  Plus,
  X,
  DollarSign,
  Ruler,
  Settings
} from 'lucide-react'
import Link from 'next/link'
import { useForm, Controller } from 'react-hook-form'
import { RoomType, RoomCondition } from '@/lib/db/models/room'

interface RoomFormData {
  number: string
  type: RoomType
  size: number
  features: string[]
  monthlyRent: number
  deposit: number
  isAvailable: boolean
  condition: RoomCondition
}

export default function EditRoomPage() {
  const params = useParams()
  const router = useRouter()
  const propertyId = params.id as string
  const roomId = params.roomId as string

  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newFeature, setNewFeature] = useState('')

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<RoomFormData>()

  useEffect(() => {
    if (roomId) {
      fetchRoom()
    }
  }, [roomId])

  const fetchRoom = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/rooms/${roomId}`)
      
      if (!response.ok) {
        throw new Error('Room not found')
      }
      
      const data = await response.json()
      const roomData = data.room
      setRoom(roomData)

      // Populate form with existing data
      setValue('number', roomData.number)
      setValue('type', roomData.type)
      setValue('size', roomData.size)
      setValue('features', roomData.features)
      setValue('monthlyRent', roomData.monthlyRent)
      setValue('deposit', roomData.deposit)
      setValue('isAvailable', roomData.isAvailable)
      setValue('condition', roomData.condition)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load room')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: RoomFormData) => {
    try {
      setSaving(true)
      setError(null)
      
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update room')
      }

      // Redirect back to room detail page
      router.push(`/properties/${propertyId}/rooms/${roomId}`)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update room')
    } finally {
      setSaving(false)
    }
  }

  const addFeature = () => {
    if (newFeature.trim()) {
      const currentFeatures = watch('features') || []
      setValue('features', [...currentFeatures, newFeature.trim()])
      setNewFeature('')
    }
  }

  const removeFeature = (index: number) => {
    const currentFeatures = watch('features') || []
    setValue('features', currentFeatures.filter((_, i) => i !== index))
  }

  const roomTypes: RoomType[] = ['Single', 'Double', 'Suite', 'Studio']
  const roomConditions: RoomCondition[] = ['Excellent', 'Good', 'Fair', 'Needs Repair']

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error: {error || 'Room not found'}</p>
          <Link href={`/properties/${propertyId}/rooms/${roomId}`}>
            <Button className="mt-2" variant="outline">
              Back to Room
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/properties/${propertyId}/rooms/${roomId}`}>
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Room
          </Button>
        </Link>
        
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Bed className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Room {room.number}</h1>
            <p className="text-gray-600">Update room details and settings</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bed className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="number">Room Number</Label>
                <Input
                  id="number"
                  {...register('number', { required: 'Room number is required' })}
                  placeholder="e.g., 101, A1, Room 1"
                />
                {errors.number && (
                  <p className="text-sm text-red-600 mt-1">{errors.number.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="type">Room Type</Label>
                <Controller
                  name="type"
                  control={control}
                  rules={{ required: 'Room type is required' }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select room type" />
                      </SelectTrigger>
                      <SelectContent>
                        {roomTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && (
                  <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="size" className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Size (sq ft)
                </Label>
                <Input
                  id="size"
                  type="number"
                  step="0.1"
                  {...register('size', { 
                    required: 'Room size is required',
                    min: { value: 1, message: 'Size must be at least 1 sq ft' }
                  })}
                  placeholder="Enter room size"
                />
                {errors.size && (
                  <p className="text-sm text-red-600 mt-1">{errors.size.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="condition">Condition</Label>
                <Controller
                  name="condition"
                  control={control}
                  rules={{ required: 'Room condition is required' }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {roomConditions.map((condition) => (
                          <SelectItem key={condition} value={condition}>
                            {condition}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.condition && (
                  <p className="text-sm text-red-600 mt-1">{errors.condition.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monthlyRent">Monthly Rent ($)</Label>
                <Input
                  id="monthlyRent"
                  type="number"
                  step="0.01"
                  {...register('monthlyRent', { 
                    required: 'Monthly rent is required',
                    min: { value: 0, message: 'Rent cannot be negative' }
                  })}
                  placeholder="Enter monthly rent"
                />
                {errors.monthlyRent && (
                  <p className="text-sm text-red-600 mt-1">{errors.monthlyRent.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="deposit">Security Deposit ($)</Label>
                <Input
                  id="deposit"
                  type="number"
                  step="0.01"
                  {...register('deposit', { 
                    required: 'Security deposit is required',
                    min: { value: 0, message: 'Deposit cannot be negative' }
                  })}
                  placeholder="Enter security deposit"
                />
                {errors.deposit && (
                  <p className="text-sm text-red-600 mt-1">{errors.deposit.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features & Amenities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Features & Amenities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Add a room feature (e.g., Private bathroom, Balcony, AC)"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
              />
              <Button type="button" onClick={addFeature} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {watch('features')?.map((feature, index) => (
                <Badge key={index} variant="outline" className="flex items-center gap-1">
                  {feature}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => removeFeature(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>

            {(!watch('features') || watch('features').length === 0) && (
              <p className="text-gray-600 text-sm">No features added yet</p>
            )}
          </CardContent>
        </Card>

        {/* Availability */}
        <Card>
          <CardHeader>
            <CardTitle>Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isAvailable">Room Available</Label>
                <p className="text-sm text-gray-600">
                  {watch('isAvailable') ? 'Room is available for new tenants' : 'Room is currently occupied'}
                </p>
              </div>
              <Controller
                name="isAvailable"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="isAvailable"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <Link href={`/properties/${propertyId}/rooms/${roomId}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
