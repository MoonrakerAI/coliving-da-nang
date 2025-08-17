'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Upload, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import Link from 'next/link'
import { CreateTenantInput } from '@/lib/db/models/tenant'

interface EmergencyContactForm {
  name: string
  phone: string
  email: string
  relationship: string
  isPrimary: boolean
  verified: boolean
}

interface TenantFormState {
  // Basic Information
  firstName: string
  lastName: string
  email: string
  phone: string
  profilePhoto?: string
  status: 'Active' | 'Moving Out' | 'Moved Out'
  propertyId: string
  
  // Room Assignment
  roomNumber: string
  moveInDate: string
  leaseEndDate: string
  
  // Lease Information
  monthlyRentCents: string
  depositCents: string
  
  // Emergency Contacts
  emergencyContacts: EmergencyContactForm[]
  
  // Form State
  loading: boolean
  error: string | null
}

export default function NewTenant() {
  const router = useRouter()
  const [formState, setFormState] = useState<TenantFormState>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: 'Active',
    propertyId: '',
    roomNumber: '',
    moveInDate: '',
    leaseEndDate: '',
    monthlyRentCents: '',
    depositCents: '',
    emergencyContacts: [],
    loading: false,
    error: null
  })

  const addEmergencyContact = () => {
    setFormState(prev => ({
      ...prev,
      emergencyContacts: [
        ...prev.emergencyContacts,
        {
          name: '',
          phone: '',
          email: '',
          relationship: '',
          isPrimary: prev.emergencyContacts.length === 0, // First contact is primary by default
          verified: false
        }
      ]
    }))
  }

  const updateEmergencyContact = (index: number, field: keyof EmergencyContactForm, value: any) => {
    setFormState(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      )
    }))
  }

  const removeEmergencyContact = (index: number) => {
    setFormState(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setFormState(prev => ({ ...prev, loading: true, error: null }))

      // Prepare tenant data
      const tenantData: CreateTenantInput = {
        firstName: formState.firstName,
        lastName: formState.lastName,
        email: formState.email,
        phone: formState.phone,
        profilePhoto: formState.profilePhoto,
        status: formState.status,
        propertyId: formState.propertyId || '00000000-0000-0000-0000-000000000000', // Default property ID
        emergencyContacts: formState.emergencyContacts.map(contact => ({
          ...contact,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        // Legacy fields for backward compatibility
        roomNumber: formState.roomNumber,
        leaseStart: formState.moveInDate ? new Date(formState.moveInDate) : new Date(),
        leaseEnd: formState.leaseEndDate ? new Date(formState.leaseEndDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        monthlyRentCents: formState.monthlyRentCents ? parseInt(formState.monthlyRentCents) * 100 : 0,
        depositCents: formState.depositCents ? parseInt(formState.depositCents) * 100 : 0,
        // Enhanced room assignment
        roomAssignment: formState.roomNumber ? {
          roomId: crypto.randomUUID(),
          roomNumber: formState.roomNumber,
          moveInDate: new Date(formState.moveInDate || Date.now()),
          leaseEndDate: new Date(formState.leaseEndDate || Date.now() + 365 * 24 * 60 * 60 * 1000),
          isActive: true
        } : undefined
      }

      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tenantData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create tenant')
      }

      const { tenant } = await response.json()
      
      // Redirect to tenant profile
      router.push(`/tenants/${tenant.id}`)
    } catch (error) {
      setFormState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/tenants">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tenants
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Tenant</h1>
          <p className="text-muted-foreground">
            Create a comprehensive tenant profile with all required information
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formState.firstName}
                  onChange={(e) => setFormState(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formState.lastName}
                  onChange={(e) => setFormState(prev => ({ ...prev, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formState.email}
                  onChange={(e) => setFormState(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formState.phone}
                  onChange={(e) => setFormState(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formState.status} 
                onValueChange={(value: any) => setFormState(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Moving Out">Moving Out</SelectItem>
                  <SelectItem value="Moved Out">Moved Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Room & Lease Information */}
        <Card>
          <CardHeader>
            <CardTitle>Room & Lease Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="roomNumber">Room Number</Label>
                <Input
                  id="roomNumber"
                  value={formState.roomNumber}
                  onChange={(e) => setFormState(prev => ({ ...prev, roomNumber: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="moveInDate">Move-in Date</Label>
                <Input
                  id="moveInDate"
                  type="date"
                  value={formState.moveInDate}
                  onChange={(e) => setFormState(prev => ({ ...prev, moveInDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="leaseEndDate">Lease End Date</Label>
                <Input
                  id="leaseEndDate"
                  type="date"
                  value={formState.leaseEndDate}
                  onChange={(e) => setFormState(prev => ({ ...prev, leaseEndDate: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monthlyRent">Monthly Rent (USD)</Label>
                <Input
                  id="monthlyRent"
                  type="number"
                  value={formState.monthlyRentCents}
                  onChange={(e) => setFormState(prev => ({ ...prev, monthlyRentCents: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="deposit">Security Deposit (USD)</Label>
                <Input
                  id="deposit"
                  type="number"
                  value={formState.depositCents}
                  onChange={(e) => setFormState(prev => ({ ...prev, depositCents: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Emergency Contacts</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addEmergencyContact}>
                <Plus className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {formState.emergencyContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No emergency contacts added yet</p>
                <p className="text-sm">Click &quot;Add Contact&quot; to add emergency contact information</p>
              </div>
            ) : (
              <div className="space-y-4">
                {formState.emergencyContacts.map((contact, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={contact.isPrimary ? "default" : "outline"}>
                          {contact.isPrimary ? "Primary" : "Secondary"}
                        </Badge>
                        {contact.verified && (
                          <Badge variant="secondary">Verified</Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeEmergencyContact(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Name *</Label>
                        <Input
                          value={contact.name}
                          onChange={(e) => updateEmergencyContact(index, 'name', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Phone *</Label>
                        <Input
                          value={contact.phone}
                          onChange={(e) => updateEmergencyContact(index, 'phone', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={contact.email}
                          onChange={(e) => updateEmergencyContact(index, 'email', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Relationship *</Label>
                        <Input
                          value={contact.relationship}
                          onChange={(e) => updateEmergencyContact(index, 'relationship', e.target.value)}
                          placeholder="e.g., Parent, Spouse, Friend"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`primary-${index}`}
                          checked={contact.isPrimary}
                          onCheckedChange={(checked) => {
                            // Only one contact can be primary
                            if (checked) {
                              setFormState(prev => ({
                                ...prev,
                                emergencyContacts: prev.emergencyContacts.map((c, i) => ({
                                  ...c,
                                  isPrimary: i === index
                                }))
                              }))
                            } else {
                              updateEmergencyContact(index, 'isPrimary', false)
                            }
                          }}
                        />
                        <Label htmlFor={`primary-${index}`}>Primary Contact</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`verified-${index}`}
                          checked={contact.verified}
                          onCheckedChange={(checked) => updateEmergencyContact(index, 'verified', checked)}
                        />
                        <Label htmlFor={`verified-${index}`}>Verified</Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Display */}
        {formState.error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{formState.error}</p>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/tenants">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={formState.loading}>
            {formState.loading ? (
              <>Creating...</>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Tenant
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
