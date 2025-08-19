'use client'

import { useState, useEffect, useCallback } from 'react'
import { Property } from '@/lib/db/models/property'
import { PropertyCard } from '@/components/properties/PropertyCard'
import { MultiPropertyStats } from '@/components/properties/PropertySelector'
import { Button } from '@/components/ui/button'
import { Plus, Building2 } from 'lucide-react'
import Link from 'next/link'

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProperties = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])


  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error: {error}</p>
          <Button 
            onClick={fetchProperties} 
            className="mt-2"
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
            <p className="text-gray-600">Manage your coliving properties and rooms</p>
          </div>
        </div>
        
        <Link href="/properties/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        </Link>
      </div>

      {/* Properties Grid */}
      {properties.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Properties Yet</h3>
          <p className="text-gray-600 mb-6">Get started by adding your first coliving property</p>
          <Link href="/properties/new">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Property
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <PropertyCard 
              key={property.id} 
              property={property}
              onUpdate={fetchProperties}
            />
          ))}
        </div>
      )}

      {/* Multi-Property Stats */}
      {properties.length > 0 && (
        <MultiPropertyStats properties={properties} />
      )}
    </div>
  )
}
