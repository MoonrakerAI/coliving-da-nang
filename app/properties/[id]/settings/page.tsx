'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Property } from '@/lib/db/models/property'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PropertySettings } from '@/components/properties/PropertySettings'
import { 
  ArrowLeft,
  Settings,
  Save,
  Building2,
  MapPin,
  Users,
  Shield,
  Clock,
  Wifi,
  Car,
  PawPrint,
  Cigarette,
  Plus,
  X
} from 'lucide-react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'

interface PropertyFormData {
  name: string
  address: {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  roomCount: number
  settings: {
    allowPets: boolean
    smokingAllowed: boolean
    maxOccupancy: number
    checkInTime: string
    checkOutTime: string
    wifiPassword: string
    parkingAvailable: boolean
  }
  houseRules: string[]
  isActive: boolean
}

export default function PropertySettingsPage() {
  const params = useParams()
  const router = useRouter()
  const propertyId = params.id as string

  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newRule, setNewRule] = useState('')

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<PropertyFormData>()

  const fetchProperty = useCallback(async () => {
    if (!propertyId) return
    try {
      setLoading(true)
      const response = await fetch(`/api/properties/${propertyId}`)
      
      if (!response.ok) {
        throw new Error('Property not found')
      }
      
      const data = await response.json()
      const prop = data.property
      setProperty(prop)

      // Populate form with existing data
      setValue('name', prop.name)
      setValue('address', prop.address)
      setValue('roomCount', prop.roomCount)
      setValue('settings', prop.settings)
      setValue('houseRules', prop.houseRules)
      setValue('isActive', prop.isActive)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load property')
    } finally {
      setLoading(false)
    }
  }, [propertyId, setValue])

  useEffect(() => {
    fetchProperty()
  }, [fetchProperty])

  const onSubmit = async (data: PropertyFormData) => {
    try {
      setSaving(true)
      
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Failed to update property')
      }

      // Refresh property data
      await fetchProperty()
      
      // Show success message (TODO: implement toast)
      console.log('Property updated successfully')
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update property')
    } finally {
      setSaving(false)
    }
  }

  const addHouseRule = () => {
    if (newRule.trim()) {
      const currentRules = watch('houseRules') || []
      setValue('houseRules', [...currentRules, newRule.trim()])
      setNewRule('')
    }
  }

  const removeHouseRule = (index: number) => {
    const currentRules = watch('houseRules') || []
    setValue('houseRules', currentRules.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error: {error || 'Property not found'}</p>
          <Link href={`/properties/${propertyId}`}>
            <Button className="mt-2" variant="outline">
              Back to Property
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
        <Link href={`/properties/${propertyId}`}>
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Property
          </Button>
        </Link>
        
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Settings className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Property Settings</h1>
            <p className="text-gray-600">{property.name}</p>
          </div>
        </div>

        <Badge variant={property.isActive ? "default" : "secondary"}>
          {property.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList>
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="rules">House Rules</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Property Name</Label>
                  <Input
                    id="name"
                    {...register('name', { required: 'Property name is required' })}
                    placeholder="Enter property name"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="roomCount">Number of Rooms</Label>
                  <Input
                    id="roomCount"
                    type="number"
                    {...register('roomCount', { 
                      required: 'Room count is required',
                      min: { value: 1, message: 'Must have at least 1 room' }
                    })}
                    placeholder="Enter number of rooms"
                  />
                  {errors.roomCount && (
                    <p className="text-sm text-red-600 mt-1">{errors.roomCount.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    {...register('address.street', { required: 'Street address is required' })}
                    placeholder="Enter street address"
                  />
                  {errors.address?.street && (
                    <p className="text-sm text-red-600 mt-1">{errors.address.street.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      {...register('address.city', { required: 'City is required' })}
                      placeholder="Enter city"
                    />
                    {errors.address?.city && (
                      <p className="text-sm text-red-600 mt-1">{errors.address.city.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      {...register('address.state', { required: 'State is required' })}
                      placeholder="Enter state/province"
                    />
                    {errors.address?.state && (
                      <p className="text-sm text-red-600 mt-1">{errors.address.state.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      {...register('address.postalCode', { required: 'Postal code is required' })}
                      placeholder="Enter postal code"
                    />
                    {errors.address?.postalCode && (
                      <p className="text-sm text-red-600 mt-1">{errors.address.postalCode.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      {...register('address.country', { required: 'Country is required' })}
                      placeholder="Enter country"
                    />
                    {errors.address?.country && (
                      <p className="text-sm text-red-600 mt-1">{errors.address.country.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {/* Property Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Occupancy Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="maxOccupancy">Maximum Occupancy</Label>
                  <Input
                    id="maxOccupancy"
                    type="number"
                    {...register('settings.maxOccupancy', { 
                      required: 'Max occupancy is required',
                      min: { value: 1, message: 'Must allow at least 1 person' }
                    })}
                    placeholder="Enter maximum occupancy"
                  />
                  {errors.settings?.maxOccupancy && (
                    <p className="text-sm text-red-600 mt-1">{errors.settings.maxOccupancy.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="checkInTime">Check-in Time</Label>
                    <Input
                      id="checkInTime"
                      type="time"
                      {...register('settings.checkInTime', { required: 'Check-in time is required' })}
                    />
                    {errors.settings?.checkInTime && (
                      <p className="text-sm text-red-600 mt-1">{errors.settings.checkInTime.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="checkOutTime">Check-out Time</Label>
                    <Input
                      id="checkOutTime"
                      type="time"
                      {...register('settings.checkOutTime', { required: 'Check-out time is required' })}
                    />
                    {errors.settings?.checkOutTime && (
                      <p className="text-sm text-red-600 mt-1">{errors.settings.checkOutTime.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Amenities & Policies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Amenities & Policies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PawPrint className="h-5 w-5 text-gray-600" />
                    <div>
                      <Label htmlFor="allowPets">Allow Pets</Label>
                      <p className="text-sm text-gray-600">Allow tenants to have pets</p>
                    </div>
                  </div>
                  <Switch
                    id="allowPets"
                    {...register('settings.allowPets')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Cigarette className="h-5 w-5 text-gray-600" />
                    <div>
                      <Label htmlFor="smokingAllowed">Allow Smoking</Label>
                      <p className="text-sm text-gray-600">Allow smoking on the property</p>
                    </div>
                  </div>
                  <Switch
                    id="smokingAllowed"
                    {...register('settings.smokingAllowed')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Car className="h-5 w-5 text-gray-600" />
                    <div>
                      <Label htmlFor="parkingAvailable">Parking Available</Label>
                      <p className="text-sm text-gray-600">Property has parking spaces</p>
                    </div>
                  </div>
                  <Switch
                    id="parkingAvailable"
                    {...register('settings.parkingAvailable')}
                  />
                </div>

                <div>
                  <Label htmlFor="wifiPassword" className="flex items-center gap-2">
                    <Wifi className="h-4 w-4" />
                    WiFi Password
                  </Label>
                  <Input
                    id="wifiPassword"
                    type="password"
                    {...register('settings.wifiPassword')}
                    placeholder="Enter WiFi password (optional)"
                  />
                  <p className="text-sm text-gray-600 mt-1">Leave empty if no WiFi or password not shared</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            {/* House Rules */}
            <Card>
              <CardHeader>
                <CardTitle>House Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    placeholder="Add a new house rule..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHouseRule())}
                  />
                  <Button type="button" onClick={addHouseRule} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {watch('houseRules')?.map((rule, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-900">{rule}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeHouseRule(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {(!watch('houseRules') || watch('houseRules').length === 0) && (
                  <p className="text-gray-600 text-center py-4">No house rules added yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            {/* Advanced Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isActive">Property Status</Label>
                    <p className="text-sm text-gray-600">
                      {watch('isActive') ? 'Property is active and accepting tenants' : 'Property is inactive'}
                    </p>
                  </div>
                  <Switch
                    id="isActive"
                    {...register('isActive')}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <Link href={`/properties/${propertyId}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
