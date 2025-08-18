'use client'

import { Room, RoomType, RoomCondition } from '@/lib/db/models/room'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Bed, 
  DollarSign, 
  Users, 
  Calendar,
  Settings,
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface RoomGridProps {
  rooms: Room[]
  propertyId: string
  onUpdate: () => void
}

export function RoomGrid({ rooms, propertyId, onUpdate }: RoomGridProps) {
  const handleToggleAvailability = async (roomId: string, currentAvailability: boolean) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isAvailable: !currentAvailability
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update room availability')
      }

      onUpdate()
    } catch (error) {
      console.error('Error updating room availability:', error)
      // TODO: Show toast notification
    }
  }

  const getRoomTypeIcon = (type: RoomType) => {
    switch (type) {
      case 'Single':
        return <Bed className="h-4 w-4" />
      case 'Double':
        return <Users className="h-4 w-4" />
      case 'Suite':
        return <Settings className="h-4 w-4" />
      case 'Studio':
        return <Eye className="h-4 w-4" />
      default:
        return <Bed className="h-4 w-4" />
    }
  }

  const getConditionColor = (condition: RoomCondition) => {
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

  const getAvailabilityIcon = (isAvailable: boolean) => {
    return isAvailable ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    )
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-12">
        <Bed className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Rooms Yet</h3>
        <p className="text-gray-600 mb-6">Add rooms to start managing occupancy and tracking revenue</p>
        <Link href={`/properties/${propertyId}/rooms/new`}>
          <Button className="flex items-center gap-2">
            <Bed className="h-4 w-4" />
            Add First Room
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Room Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Bed className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Total Rooms</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{rooms.length}</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Available</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {rooms.filter(room => room.isAvailable).length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-gray-600">Occupied</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {rooms.filter(room => !room.isAvailable).length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-600">Avg Rent</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ${Math.round(rooms.reduce((sum, room) => sum + room.monthlyRent, 0) / rooms.length).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <Card key={room.id} role="article" className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {getRoomTypeIcon(room.type)}
                  Room {room.number}
                </CardTitle>
                
                <div className="flex items-center gap-2">
                  {getAvailabilityIcon(room.isAvailable)}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => handleToggleAvailability(room.id, room.isAvailable)}
                      >
                        Mark as {room.isAvailable ? 'Occupied' : 'Available'}
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/properties/${propertyId}/rooms/${room.id}/edit`}>
                          Edit Room
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/properties/${propertyId}/rooms/${room.id}`}>
                          View Details
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{room.type}</Badge>
                <Badge className={getConditionColor(room.condition)}>
                  {room.condition}
                </Badge>
                <Badge variant={room.isAvailable ? "default" : "secondary"}>
                  {room.isAvailable ? 'Available' : 'Occupied'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Room Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Size</span>
                  <p className="font-medium">{room.size} sq ft</p>
                </div>
                <div>
                  <span className="text-gray-600">Monthly Rent</span>
                  <p className="font-medium">${room.monthlyRent.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-600">Deposit</span>
                  <p className="font-medium">${room.deposit.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-600">Last Inspection</span>
                  <p className="font-medium">
                    {room.lastInspection 
                      ? new Date(room.lastInspection).toLocaleDateString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>

              {/* Room Features */}
              {room.features.length > 0 && (
                <div>
                  <span className="text-sm text-gray-600 block mb-2">Features</span>
                  <div className="flex flex-wrap gap-1">
                    {room.features.slice(0, 3).map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {room.features.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{room.features.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Link href={`/properties/${propertyId}/rooms/${room.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    View Details
                  </Button>
                </Link>
                
                <Link href={`/properties/${propertyId}/rooms/${room.id}/occupancy`}>
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Room Card */}
      <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors duration-200">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bed className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Add New Room</h3>
          <p className="text-gray-600 mb-4 text-center">
            Expand your property by adding more rooms
          </p>
          <Link href={`/properties/${propertyId}/rooms/new`}>
            <Button className="flex items-center gap-2">
              <Bed className="h-4 w-4" />
              Add Room
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
