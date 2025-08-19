'use client'

import { Property } from '@/lib/db/models/property'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Settings,
  Users,
  Clock,
  Wifi,
  Car,
  PawPrint,
  Cigarette,
  Shield,
  Edit
} from 'lucide-react'
import Link from 'next/link'

interface PropertySettingsProps {
  property: Property
}

export function PropertySettings({ property }: PropertySettingsProps) {
  return (
    <div className="space-y-6">
      {/* Settings Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Property Settings
            </CardTitle>
            <Link href={`/properties/${property.id}/settings`}>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edit Settings
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Occupancy Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Max Occupancy</p>
                <p className="text-sm text-gray-600">{property.settings.maxOccupancy} people</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Check-in/out</p>
                <p className="text-sm text-gray-600">
                  {property.settings.checkInTime} - {property.settings.checkOutTime}
                </p>
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div>
            <p className="font-medium text-gray-900 mb-3">Amenities & Policies</p>
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant={property.settings.allowPets ? "default" : "secondary"}
                className="flex items-center gap-1"
              >
                <PawPrint className="h-3 w-3" />
                {property.settings.allowPets ? 'Pets Allowed' : 'No Pets'}
              </Badge>

              <Badge 
                variant={property.settings.smokingAllowed ? "destructive" : "default"}
                className="flex items-center gap-1"
              >
                <Cigarette className="h-3 w-3" />
                {property.settings.smokingAllowed ? 'Smoking Allowed' : 'No Smoking'}
              </Badge>

              <Badge 
                variant={property.settings.parkingAvailable ? "default" : "secondary"}
                className="flex items-center gap-1"
              >
                <Car className="h-3 w-3" />
                {property.settings.parkingAvailable ? 'Parking Available' : 'No Parking'}
              </Badge>

              {property.settings.wifiPassword && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  WiFi Available
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* House Rules */}
      {property.houseRules && property.houseRules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              House Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {property.houseRules.map((rule, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span className="text-gray-700">{rule}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* WiFi Information */}
      {property.settings.wifiPassword && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              WiFi Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">WiFi Password:</p>
              <p className="font-mono text-gray-900 bg-white px-3 py-2 rounded border">
                {property.settings.wifiPassword}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
