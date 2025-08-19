'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Property } from '@/lib/db/models/property'
import { Room } from '@/lib/db/models/room'
import { PropertyAnalytics } from '@/lib/db/models/room'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RoomGrid } from '@/components/properties/RoomGrid'
import { 
  Building2, 
  MapPin, 
  Users, 
  Settings, 
  BarChart3,
  ArrowLeft,
  Plus,
  Calendar,
  DollarSign,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'

export default function PropertyDetailPage() {
  const params = useParams()
  const propertyId = params.id as string

  const [property, setProperty] = useState<Property | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [analytics, setAnalytics] = useState<PropertyAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPropertyData = useCallback(async () => {
    if (!propertyId) return

    try {
      setLoading(true)
      
      // Fetch property, rooms, and analytics in parallel
      const [propertyRes, roomsRes, analyticsRes] = await Promise.all([
        fetch(`/api/properties/${propertyId}`),
        fetch(`/api/properties/${propertyId}/rooms`),
        fetch(`/api/properties/${propertyId}/analytics`)
      ])

      if (!propertyRes.ok) {
        throw new Error('Property not found')
      }

      const propertyData = await propertyRes.json()
      setProperty(propertyData.property)

      if (roomsRes.ok) {
        const roomsData = await roomsRes.json()
        setRooms(roomsData.rooms || [])
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json()
        setAnalytics(analyticsData.analytics)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load property data')
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => {
    fetchPropertyData()
  }, [fetchPropertyData])

  const onUpdate = async () => {
    try {
      setLoading(true)
      
      // Fetch property, rooms, and analytics in parallel
      const [propertyRes, roomsRes, analyticsRes] = await Promise.all([
        fetch(`/api/properties/${propertyId}`),
        fetch(`/api/properties/${propertyId}/rooms`),
        fetch(`/api/properties/${propertyId}/analytics`)
      ])

      if (!propertyRes.ok) {
        throw new Error('Property not found')
      }

      const propertyData = await propertyRes.json()
      setProperty(propertyData.property)

      if (roomsRes.ok) {
        const roomsData = await roomsRes.json()
        setRooms(roomsData.rooms || [])
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json()
        setAnalytics(analyticsData.analytics)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load property data')
    } finally {
      setLoading(false)
    }
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
          <Link href="/properties">
            <Button className="mt-2" variant="outline">
              Back to Properties
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
        <Link href="/properties">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <MapPin className="h-3 w-3" />
              <span>{property.address.city}, {property.address.state}</span>
            </div>
          </div>
        </div>

        <Badge 
          variant={property.isActive ? "default" : "secondary"}
          className={property.isActive ? "bg-green-100 text-green-800" : ""}
        >
          {property.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Quick Stats */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Occupancy</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(analytics.occupancyRate * 100)}%
            </div>
            <div className="text-xs text-gray-500">
              {analytics.occupiedRooms} of {analytics.totalRooms} rooms
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Monthly Revenue</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              ${analytics.totalMonthlyRevenue.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">
              Avg: ${Math.round(analytics.averageMonthlyRent).toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Avg Stay</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(analytics.averageOccupancyDuration)}
            </div>
            <div className="text-xs text-gray-500">days</div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-600">Maintenance</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {analytics.maintenanceRequestsCount}
            </div>
            <div className="text-xs text-gray-500">requests</div>
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="rooms" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Link href={`/properties/${propertyId}/rooms/new`}>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Room
              </Button>
            </Link>
            
            <Link href={`/properties/${propertyId}/settings`}>
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>
        </div>

        <TabsContent value="rooms" className="space-y-6">
          <RoomGrid 
            rooms={rooms} 
            propertyId={propertyId}
            onUpdate={fetchPropertyData}
          />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Property Details */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Property Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Address</label>
                  <p className="text-gray-900">
                    {property.address.street}<br />
                    {property.address.city}, {property.address.state} {property.address.postalCode}<br />
                    {property.address.country}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Room Count</label>
                  <p className="text-gray-900">{property.roomCount} rooms</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Max Occupancy</label>
                  <p className="text-gray-900">{property.settings.maxOccupancy} people</p>
                </div>
              </div>
            </div>

            {/* Property Settings */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Settings & Amenities</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Pets Allowed</span>
                  <Badge variant={property.settings.allowPets ? "default" : "secondary"}>
                    {property.settings.allowPets ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Smoking Allowed</span>
                  <Badge variant={property.settings.smokingAllowed ? "default" : "secondary"}>
                    {property.settings.smokingAllowed ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Parking Available</span>
                  <Badge variant={property.settings.parkingAvailable ? "default" : "secondary"}>
                    {property.settings.parkingAvailable ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Check-in Time</span>
                  <span className="text-gray-900">{property.settings.checkInTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Check-out Time</span>
                  <span className="text-gray-900">{property.settings.checkOutTime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* House Rules */}
          {property.houseRules && property.houseRules.length > 0 && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">House Rules</h3>
              <ul className="space-y-2">
                {property.houseRules.map((rule, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span className="text-gray-700">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {analytics ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Occupancy Analytics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Rooms</span>
                    <span className="font-semibold">{analytics.totalRooms}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Occupied Rooms</span>
                    <span className="font-semibold">{analytics.occupiedRooms}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Available Rooms</span>
                    <span className="font-semibold">{analytics.availableRooms}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Occupancy Rate</span>
                    <span className="font-semibold">{Math.round(analytics.occupancyRate * 100)}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Financial Analytics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Monthly Rent</span>
                    <span className="font-semibold">${analytics.averageMonthlyRent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Monthly Revenue</span>
                    <span className="font-semibold">${analytics.totalMonthlyRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Stay Duration</span>
                    <span className="font-semibold">{Math.round(analytics.averageOccupancyDuration)} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Maintenance Requests</span>
                    <span className="font-semibold">{analytics.maintenanceRequestsCount}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
              <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Analytics data is being calculated...</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
