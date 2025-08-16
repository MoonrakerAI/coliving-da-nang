'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Room } from '@/lib/db/models/room'
import { OccupancyRecord } from '@/lib/db/models/room'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OccupancyCalendar } from '@/components/properties/OccupancyCalendar'
import { MaintenanceTracker } from '@/components/properties/MaintenanceTracker'
import { 
  ArrowLeft,
  Bed,
  DollarSign,
  Calendar,
  Users,
  Settings,
  CheckCircle,
  XCircle,
  Camera,
  Edit,
  History
} from 'lucide-react'
import Link from 'next/link'

export default function RoomDetailPage() {
  const params = useParams()
  const propertyId = params.id as string
  const roomId = params.roomId as string

  const [room, setRoom] = useState<Room | null>(null)
  const [occupancyHistory, setOccupancyHistory] = useState<OccupancyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (roomId) {
      fetchRoomData()
    }
  }, [roomId])

  const fetchRoomData = async () => {
    try {
      setLoading(true)
      
      // Fetch room and occupancy history in parallel
      const [roomRes, occupancyRes] = await Promise.all([
        fetch(`/api/rooms/${roomId}`),
        fetch(`/api/rooms/${roomId}/occupancy`)
      ])

      if (!roomRes.ok) {
        throw new Error('Room not found')
      }

      const roomData = await roomRes.json()
      setRoom(roomData.room)

      if (occupancyRes.ok) {
        const occupancyData = await occupancyRes.json()
        setOccupancyHistory(occupancyData.occupancyHistory || [])
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load room data')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAvailability = async () => {
    if (!room) return

    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isAvailable: !room.isAvailable
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update room availability')
      }

      fetchRoomData()
    } catch (error) {
      console.error('Error updating room availability:', error)
      // TODO: Show toast notification
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

  if (error || !room) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error: {error || 'Room not found'}</p>
          <Link href={`/properties/${propertyId}`}>
            <Button className="mt-2" variant="outline">
              Back to Property
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Excellent':
        return 'bg-green-100 text-green-800'
      case 'Good':
        return 'bg-blue-100 text-blue-800'
      case 'Fair':
        return 'bg-yellow-100 text-yellow-800'
      case 'Needs Repair':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
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
            <Bed className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Room {room.number}</h1>
            <p className="text-gray-600">{room.type} • {room.size} sq ft</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={getConditionColor(room.condition)}>
            {room.condition}
          </Badge>
          <Badge variant={room.isAvailable ? "default" : "secondary"}>
            {room.isAvailable ? 'Available' : 'Occupied'}
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-3 mb-8">
        <Button 
          onClick={handleToggleAvailability}
          variant={room.isAvailable ? "destructive" : "default"}
          className="flex items-center gap-2"
        >
          {room.isAvailable ? (
            <>
              <XCircle className="h-4 w-4" />
              Mark as Occupied
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              Mark as Available
            </>
          )}
        </Button>

        <Link href={`/properties/${propertyId}/rooms/${roomId}/edit`}>
          <Button variant="outline" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit Room
          </Button>
        </Link>

        <Button variant="outline" className="flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Manage Photos
        </Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Room Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bed className="h-5 w-5" />
                  Room Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Room Number</label>
                    <p className="text-gray-900 font-semibold">{room.number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Room Type</label>
                    <p className="text-gray-900">{room.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Size</label>
                    <p className="text-gray-900">{room.size} sq ft</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Condition</label>
                    <Badge className={getConditionColor(room.condition)}>
                      {room.condition}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Last Inspection</label>
                  <p className="text-gray-900">
                    {room.lastInspection 
                      ? new Date(room.lastInspection).toLocaleDateString()
                      : 'Never inspected'
                    }
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Availability Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    {room.isAvailable ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-gray-900">
                      {room.isAvailable ? 'Available for new tenant' : 'Currently occupied'}
                    </span>
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
                <div>
                  <label className="text-sm font-medium text-gray-600">Monthly Rent</label>
                  <p className="text-2xl font-bold text-gray-900">${room.monthlyRent.toLocaleString()}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Security Deposit</label>
                  <p className="text-xl font-semibold text-gray-900">${room.deposit.toLocaleString()}</p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Move-in Cost</span>
                    <span className="font-semibold text-gray-900">
                      ${(room.monthlyRent + room.deposit).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Room Features */}
          {room.features.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Room Features & Amenities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {room.features.map((feature, index) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Room Photos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Room Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {room.photos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {room.photos.map((photo, index) => (
                    <div key={index} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                      <Camera className="h-8 w-8 text-gray-400" />
                      {/* TODO: Implement actual photo display */}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Camera className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No photos uploaded yet</p>
                  <Button variant="outline">
                    Upload Photos
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="occupancy" className="space-y-6">
          <OccupancyCalendar 
            roomId={roomId}
            occupancyHistory={occupancyHistory}
            onUpdate={fetchRoomData}
          />

          {/* Occupancy History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Occupancy History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {occupancyHistory.length > 0 ? (
                <div className="space-y-4">
                  {occupancyHistory.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">
                          Tenant ID: {record.tenantId}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(record.startDate).toLocaleDateString()} - {
                            record.endDate 
                              ? new Date(record.endDate).toLocaleDateString()
                              : 'Present'
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          ${record.monthlyRent.toLocaleString()}/month
                        </p>
                        <Badge variant={
                          record.status === 'Current' ? 'default' : 
                          record.status === 'Past' ? 'secondary' : 'outline'
                        }>
                          {record.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No occupancy history yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <MaintenanceTracker 
            roomId={roomId}
            propertyId={propertyId}
            maintenanceRecords={[]}
            onUpdate={fetchRoomData}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
