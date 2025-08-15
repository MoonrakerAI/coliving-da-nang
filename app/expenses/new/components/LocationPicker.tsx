'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, Loader2, X, Navigation, Store, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Location {
  lat: number
  lng: number
  address: string
  accuracy?: number
  timestamp?: number
}

interface MerchantSuggestion {
  id: string
  name: string
  category: string
  address: string
  distance: number
  lat: number
  lng: number
}

interface LocationPickerProps {
  onLocationSelect: (location: Location | undefined) => void
}

export function LocationPicker({ onLocationSelect }: LocationPickerProps) {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null)
  const [manualAddress, setManualAddress] = useState('')
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null)
  const [merchantSuggestions, setMerchantSuggestions] = useState<MerchantSuggestion[]>([])
  const [showMerchants, setShowMerchants] = useState(false)

  // Check geolocation permission on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.permissions?.query({ name: 'geolocation' }).then((result) => {
        setLocationPermission(result.state as 'granted' | 'denied' | 'prompt')
      })
    }
  }, [])

  const getCurrentLocation = async () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by this browser.')
      return
    }

    setIsGettingLocation(true)
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        )
      })

      const { latitude, longitude, accuracy } = position.coords
      
      // Reverse geocode to get address (mock implementation)
      const address = await reverseGeocode(latitude, longitude)
      
      const location: Location = {
        lat: latitude,
        lng: longitude,
        address,
        accuracy,
        timestamp: Date.now()
      }
      
      setCurrentLocation(location)
      setLocationAccuracy(accuracy)
      onLocationSelect(location)
      setLocationPermission('granted')
      
      // Get merchant suggestions based on location
      await getMerchantSuggestions(latitude, longitude)
    } catch (error) {
      console.error('Geolocation error:', error)
      setLocationPermission('denied')
      
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert('Location access denied. You can enter the address manually.')
            break
          case error.POSITION_UNAVAILABLE:
            alert('Location information unavailable. Please enter address manually.')
            break
          case error.TIMEOUT:
            alert('Location request timed out. Please try again or enter address manually.')
            break
        }
      }
    } finally {
      setIsGettingLocation(false)
    }
  }

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    // Mock reverse geocoding - in real implementation, use Google Maps API or similar
    // For Da Nang area, provide realistic addresses
    const mockAddresses = [
      'Hải Châu District, Da Nang, Vietnam',
      'Thanh Khê District, Da Nang, Vietnam',
      'Sơn Trà District, Da Nang, Vietnam',
      'Ngũ Hành Sơn District, Da Nang, Vietnam',
    ]
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return mockAddresses[Math.floor(Math.random() * mockAddresses.length)]
  }

  const getMerchantSuggestions = async (lat: number, lng: number) => {
    // Mock merchant suggestions - in real implementation, use Google Places API or similar
    const mockMerchants: MerchantSuggestion[] = [
      {
        id: 'merchant_1',
        name: 'Big C Da Nang',
        category: 'Supermarket',
        address: '255-257 Hùng Vương, Thạch Thang, Hải Châu, Da Nang',
        distance: 0.8,
        lat: lat + 0.001,
        lng: lng + 0.001
      },
      {
        id: 'merchant_2',
        name: 'Coopmart Da Nang',
        category: 'Supermarket',
        address: '478 Điện Biên Phủ, Thanh Khê, Da Nang',
        distance: 1.2,
        lat: lat - 0.002,
        lng: lng + 0.003
      },
      {
        id: 'merchant_3',
        name: 'Circle K',
        category: 'Convenience Store',
        address: 'Lê Duẩn, Hải Châu, Da Nang',
        distance: 0.3,
        lat: lat + 0.0005,
        lng: lng - 0.001
      },
      {
        id: 'merchant_4',
        name: 'Vincom Plaza',
        category: 'Shopping Mall',
        address: '910A Ngô Quyền, An Hải Bắc, Sơn Trà, Da Nang',
        distance: 2.1,
        lat: lat + 0.005,
        lng: lng - 0.002
      }
    ]
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Sort by distance and take closest 4
    const sortedMerchants = mockMerchants.sort((a, b) => a.distance - b.distance).slice(0, 4)
    setMerchantSuggestions(sortedMerchants)
    setShowMerchants(true)
  }

  const getAccuracyLevel = (accuracy: number | null): { level: string; icon: React.ReactNode; color: string } => {
    if (!accuracy) return { level: 'Unknown', icon: <WifiOff className="w-3 h-3" />, color: 'text-gray-500' }
    
    if (accuracy <= 10) {
      return { level: 'High', icon: <Wifi className="w-3 h-3" />, color: 'text-green-600' }
    } else if (accuracy <= 50) {
      return { level: 'Medium', icon: <Wifi className="w-3 h-3" />, color: 'text-yellow-600' }
    } else {
      return { level: 'Low', icon: <WifiOff className="w-3 h-3" />, color: 'text-red-600' }
    }
  }

  const selectMerchant = (merchant: MerchantSuggestion) => {
    const location: Location = {
      lat: merchant.lat,
      lng: merchant.lng,
      address: merchant.address,
      accuracy: locationAccuracy,
      timestamp: Date.now()
    }
    setCurrentLocation(location)
    onLocationSelect(location)
    setShowMerchants(false)
  }

  const handleManualAddressSubmit = () => {
    if (manualAddress.trim()) {
      const location: Location = {
        lat: 16.0544, // Da Nang approximate coordinates
        lng: 108.2022,
        address: manualAddress.trim()
      }
      setCurrentLocation(location)
      onLocationSelect(location)
      setShowManualEntry(false)
    }
  }

  const clearLocation = () => {
    setCurrentLocation(null)
    setManualAddress('')
    setLocationAccuracy(null)
    setMerchantSuggestions([])
    setShowMerchants(false)
    onLocationSelect(undefined)
    setShowManualEntry(false)
  }

  return (
    <div className="space-y-3">
      {/* Current Location Display */}
      {currentLocation && (
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <MapPin className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium">Current Location</p>
              {locationAccuracy && (
                <div className={cn("flex items-center gap-1", getAccuracyLevel(locationAccuracy).color)}>
                  {getAccuracyLevel(locationAccuracy).icon}
                  <span className="text-xs font-medium">
                    {getAccuracyLevel(locationAccuracy).level}
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground break-words">
              {currentLocation.address}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
              </p>
              {locationAccuracy && (
                <p className="text-xs text-muted-foreground">
                  ±{locationAccuracy.toFixed(0)}m
                </p>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearLocation}
            className="p-1 h-auto"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Location Actions */}
      {!currentLocation && (
        <div className="space-y-2">
          {/* Auto Location Button */}
          <Button
            type="button"
            variant="outline"
            onClick={getCurrentLocation}
            disabled={isGettingLocation || locationPermission === 'denied'}
            className="w-full h-12 flex items-center gap-2"
          >
            {isGettingLocation ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MapPin className="w-4 h-4" />
            )}
            {isGettingLocation ? 'Getting Location...' : 'Use Current Location'}
          </Button>

          {/* Manual Entry Toggle */}
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowManualEntry(!showManualEntry)}
            className="w-full text-sm"
          >
            {showManualEntry ? 'Cancel Manual Entry' : 'Enter Address Manually'}
          </Button>
        </div>
      )}

      {/* Manual Address Entry */}
      {showManualEntry && !currentLocation && (
        <div className="space-y-2">
          <Input
            placeholder="Enter address (e.g., Hải Châu District, Da Nang)"
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualAddressSubmit()}
            className="text-sm"
          />
          <Button
            type="button"
            onClick={handleManualAddressSubmit}
            disabled={!manualAddress.trim()}
            className="w-full"
          >
            Set Location
          </Button>
        </div>
      )}

      {/* Privacy Notice */}
      {locationPermission === 'prompt' && (
        <p className="text-xs text-muted-foreground">
          📍 Location helps categorize expenses by merchant area
        </p>
      )}

      {/* Permission Denied Notice */}
      {locationPermission === 'denied' && (
        <p className="text-xs text-muted-foreground">
          Location access denied. You can enable it in browser settings or enter address manually.
        </p>
      )}

      {/* Merchant Suggestions */}
      {showMerchants && merchantSuggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Nearby Merchants</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowMerchants(false)}
              className="h-6 px-2 text-xs"
            >
              Hide
            </Button>
          </div>
          <div className="space-y-1">
            {merchantSuggestions.map((merchant) => (
              <Button
                key={merchant.id}
                type="button"
                variant="ghost"
                onClick={() => selectMerchant(merchant)}
                className="w-full justify-start h-auto p-2 border border-dashed border-muted-foreground/25 hover:border-muted-foreground/50"
              >
                <div className="flex items-center gap-2 w-full">
                  <Store className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-xs truncate">{merchant.name}</p>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {merchant.distance}km
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {merchant.category} • {merchant.address}
                    </p>
                  </div>
                  <Navigation className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
