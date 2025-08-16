'use client'

import { useState, useEffect } from 'react'
import { Property } from '@/lib/db/models/property'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Building2,
  ChevronDown,
  Plus,
  MapPin
} from 'lucide-react'
import Link from 'next/link'

interface PropertySelectorProps {
  selectedPropertyId?: string
  onPropertyChange?: (propertyId: string) => void
  showAddButton?: boolean
  className?: string
}

export function PropertySelector({ 
  selectedPropertyId, 
  onPropertyChange, 
  showAddButton = true,
  className = ""
}: PropertySelectorProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProperties()
  }, [])

  const fetchProperties = async () => {
    try {
      setLoading(true)
      // TODO: Replace with actual owner ID from auth context
      const ownerId = 'temp-owner-id'
      const response = await fetch(`/api/properties?ownerId=${ownerId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch properties')
      }
      
      const data = await response.json()
      setProperties(data.properties || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  const selectedProperty = properties.find(p => p.id === selectedPropertyId)

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-pulse bg-gray-200 h-10 w-48 rounded-md"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        Error loading properties
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="text-gray-600 text-sm">No properties found</div>
        {showAddButton && (
          <Link href="/properties/new">
            <Button size="sm" className="flex items-center gap-1">
              <Plus className="h-3 w-3" />
              Add Property
            </Button>
          </Link>
        )}
      </div>
    )
  }

  if (properties.length === 1) {
    // Single property - show as a simple display
    const property = properties[0]
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 rounded">
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{property.name}</div>
            <div className="text-xs text-gray-600 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {property.address.city}, {property.address.state}
            </div>
          </div>
        </div>
        <Badge variant={property.isActive ? "default" : "secondary"}>
          {property.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>
    )
  }

  // Multiple properties - show selector
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select value={selectedPropertyId} onValueChange={onPropertyChange}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select a property">
            {selectedProperty && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="truncate">{selectedProperty.name}</span>
                <Badge 
                  variant={selectedProperty.isActive ? "default" : "secondary"}
                  className="ml-auto"
                >
                  {selectedProperty.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {properties.map((property) => (
            <SelectItem key={property.id} value={property.id}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium">{property.name}</div>
                    <div className="text-xs text-gray-600 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {property.address.city}, {property.address.state}
                    </div>
                  </div>
                </div>
                <Badge 
                  variant={property.isActive ? "default" : "secondary"}
                  className="ml-2"
                >
                  {property.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showAddButton && (
        <Link href="/properties/new">
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </Link>
      )}
    </div>
  )
}

// Property switching context for multi-property support
export function PropertySwitcher({ 
  currentPropertyId, 
  onPropertySwitch 
}: { 
  currentPropertyId?: string
  onPropertySwitch: (propertyId: string) => void 
}) {
  return (
    <div className="border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Property:</span>
          <PropertySelector 
            selectedPropertyId={currentPropertyId}
            onPropertyChange={onPropertySwitch}
            showAddButton={false}
            className="flex-1"
          />
        </div>
        
        <Link href="/properties">
          <Button variant="ghost" size="sm">
            View All Properties
          </Button>
        </Link>
      </div>
    </div>
  )
}

// Multi-property dashboard stats
export function MultiPropertyStats({ properties }: { properties: Property[] }) {
  const totalProperties = properties.length
  const activeProperties = properties.filter(p => p.isActive).length
  const totalRooms = properties.reduce((sum, p) => sum + p.roomCount, 0)
  const occupancyRate = activeProperties > 0 ? (activeProperties / totalProperties) * 100 : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-gray-600">Total Properties</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{totalProperties}</div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-5 w-5 bg-green-100 rounded-full flex items-center justify-center">
            <div className="h-2 w-2 bg-green-600 rounded-full"></div>
          </div>
          <span className="text-sm font-medium text-gray-600">Active Properties</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{activeProperties}</div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-5 w-5 bg-purple-100 rounded-full flex items-center justify-center">
            <div className="h-2 w-2 bg-purple-600 rounded-full"></div>
          </div>
          <span className="text-sm font-medium text-gray-600">Total Rooms</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{totalRooms}</div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-5 w-5 bg-orange-100 rounded-full flex items-center justify-center">
            <div className="h-2 w-2 bg-orange-600 rounded-full"></div>
          </div>
          <span className="text-sm font-medium text-gray-600">Property Activity</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{Math.round(occupancyRate)}%</div>
      </div>
    </div>
  )
}
