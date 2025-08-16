'use client'

import { Property } from '@/lib/db/models/property'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  MapPin, 
  Users, 
  Settings, 
  BarChart3,
  Eye,
  MoreVertical
} from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PropertyCardProps {
  property: Property
  onUpdate: () => void
}

export function PropertyCard({ property, onUpdate }: PropertyCardProps) {
  const handleToggleStatus = async () => {
    try {
      const response = await fetch(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !property.isActive
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update property status')
      }

      onUpdate()
    } catch (error) {
      console.error('Error updating property status:', error)
      // TODO: Show toast notification
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-200">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{property.name}</h3>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <MapPin className="h-3 w-3" />
                <span>{property.address.city}, {property.address.state}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={property.isActive ? "default" : "secondary"}
              className={property.isActive ? "bg-green-100 text-green-800" : ""}
            >
              {property.isActive ? 'Active' : 'Inactive'}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleToggleStatus}>
                  {property.isActive ? 'Deactivate' : 'Activate'}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/properties/${property.id}/settings`}>
                    Edit Settings
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Address */}
        <div className="text-sm text-gray-600 mb-4">
          {property.address.street}<br />
          {property.address.city}, {property.address.state} {property.address.postalCode}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{property.roomCount} rooms</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-600">Max: {property.settings.maxOccupancy}</span>
          </div>
        </div>

        {/* Property Features */}
        <div className="flex flex-wrap gap-1 mb-4">
          {property.settings.allowPets && (
            <Badge variant="outline" className="text-xs">Pet Friendly</Badge>
          )}
          {property.settings.parkingAvailable && (
            <Badge variant="outline" className="text-xs">Parking</Badge>
          )}
          {!property.settings.smokingAllowed && (
            <Badge variant="outline" className="text-xs">No Smoking</Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 pb-6 flex gap-2">
        <Link href={`/properties/${property.id}`} className="flex-1">
          <Button variant="outline" className="w-full flex items-center gap-2">
            <Eye className="h-4 w-4" />
            View Details
          </Button>
        </Link>
        
        <Link href={`/properties/${property.id}/rooms`}>
          <Button variant="outline" size="sm" className="px-3">
            <Users className="h-4 w-4" />
          </Button>
        </Link>
        
        <Link href={`/properties/${property.id}/analytics`}>
          <Button variant="outline" size="sm" className="px-3">
            <BarChart3 className="h-4 w-4" />
          </Button>
        </Link>
        
        <Link href={`/properties/${property.id}/settings`}>
          <Button variant="outline" size="sm" className="px-3">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
