'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Edit, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  DollarSign,
  FileText,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Plus,
  Upload
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { Tenant } from '@/lib/db/models/tenant'

interface TenantProfileState {
  tenant: Tenant | null
  loading: boolean
  error: string | null
}

export default function TenantProfile() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.id as string
  
  const [state, setState] = useState<TenantProfileState>({
    tenant: null,
    loading: true,
    error: null
  })

  const fetchTenant = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      const response = await fetch(`/api/tenants/${tenantId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Tenant not found')
        }
        throw new Error('Failed to fetch tenant')
      }
      
      const data = await response.json()
      setState(prev => ({ ...prev, tenant: data.tenant, loading: false }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }

  useEffect(() => {
    if (tenantId) {
      fetchTenant()
    }
  }, [tenantId])

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Active': return 'default'
      case 'Moving Out': return 'secondary'
      case 'Moved Out': return 'outline'
      default: return 'outline'
    }
  }

  const getLeaseStatus = (tenant: Tenant) => {
    const currentLease = tenant.leaseHistory?.find(lease => lease.isActive) ||
      (tenant.leaseStart && tenant.leaseEnd ? {
        startDate: tenant.leaseStart,
        endDate: tenant.leaseEnd,
        isActive: true
      } : null)

    if (!currentLease) return { status: 'No Lease', variant: 'destructive' as const }

    const now = new Date()
    const leaseEnd = currentLease.endDate
    const daysUntilExpiry = Math.ceil((leaseEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry <= 0) {
      return { status: 'Expired', variant: 'destructive' as const }
    } else if (daysUntilExpiry <= 30) {
      return { status: `Expires in ${daysUntilExpiry} days`, variant: 'secondary' as const }
    } else {
      return { status: 'Active', variant: 'default' as const }
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date))
  }

  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading tenant profile...</div>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/tenants">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tenants
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-destructive font-medium">Error loading tenant</p>
              <p className="text-muted-foreground text-sm">{state.error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={fetchTenant}
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!state.tenant) {
    return null
  }

  const tenant = state.tenant
  const leaseStatus = getLeaseStatus(tenant)
  const roomNumber = tenant.roomAssignment?.roomNumber || tenant.roomNumber
  const emergencyContacts = tenant.emergencyContacts || (tenant.emergencyContact ? [tenant.emergencyContact] : [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/tenants">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tenants
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {tenant.firstName} {tenant.lastName}
            </h1>
            <p className="text-muted-foreground">{tenant.email}</p>
          </div>
        </div>
        <Link href={`/tenants/${tenant.id}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </Link>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={tenant.profilePhoto} />
              <AvatarFallback className="text-lg">
                {tenant.firstName[0]}{tenant.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-4">
                <Badge variant={getStatusBadgeVariant(tenant.status)}>
                  {tenant.status}
                </Badge>
                <Badge variant={leaseStatus.variant}>
                  {leaseStatus.status}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{tenant.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{tenant.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{roomNumber ? `Room ${roomNumber}` : 'No room assigned'}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lease">Lease & Room</TabsTrigger>
          <TabsTrigger value="contacts">Emergency Contacts</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lease Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Current Lease
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tenant.leaseStart && tenant.leaseEnd ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Start Date</span>
                      <span>{formatDate(tenant.leaseStart)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">End Date</span>
                      <span>{formatDate(tenant.leaseEnd)}</span>
                    </div>
                    {tenant.monthlyRentCents && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly Rent</span>
                        <span className="font-medium">{formatCurrency(tenant.monthlyRentCents)}</span>
                      </div>
                    )}
                    {tenant.depositCents && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Security Deposit</span>
                        <span className="font-medium">{formatCurrency(tenant.depositCents)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">No lease information available</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Emergency Contacts</span>
                  <span className="font-medium">{emergencyContacts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Documents</span>
                  <span className="font-medium">{tenant.documents?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Communications</span>
                  <span className="font-medium">{tenant.communicationHistory?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lease History</span>
                  <span className="font-medium">{tenant.leaseHistory?.length || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="lease" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Room Assignment & Lease Details</CardTitle>
            </CardHeader>
            <CardContent>
              {tenant.roomAssignment ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Room Number</Label>
                      <p className="font-medium">{tenant.roomAssignment.roomNumber}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Move-in Date</Label>
                      <p className="font-medium">{formatDate(tenant.roomAssignment.moveInDate)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Lease End Date</Label>
                      <p className="font-medium">{formatDate(tenant.roomAssignment.leaseEndDate)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <Badge variant={tenant.roomAssignment.isActive ? "default" : "outline"}>
                        {tenant.roomAssignment.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No room assignment information available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Emergency Contacts</CardTitle>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {emergencyContacts.length > 0 ? (
                <div className="space-y-4">
                  {emergencyContacts.map((contact, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{contact.name}</h4>
                        <div className="flex gap-2">
                          {contact.isPrimary && (
                            <Badge variant="default">Primary</Badge>
                          )}
                          {contact.verified && (
                            <Badge variant="secondary">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Phone: </span>
                          <span>{contact.phone}</span>
                        </div>
                        {contact.email && (
                          <div>
                            <span className="text-muted-foreground">Email: </span>
                            <span>{contact.email}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Relationship: </span>
                          <span>{contact.relationship}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No emergency contacts added yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Documents</CardTitle>
                <Button size="sm">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tenant.documents && tenant.documents.length > 0 ? (
                <div className="space-y-3">
                  {tenant.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.filename}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.type} • Uploaded {formatDate(doc.uploadDate)}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2" />
                  <p>No documents uploaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Communication History</CardTitle>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Note
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tenant.communicationHistory && tenant.communicationHistory.length > 0 ? (
                <div className="space-y-4">
                  {tenant.communicationHistory.map((comm) => (
                    <div key={comm.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{comm.type}</Badge>
                          {comm.subject && (
                            <span className="font-medium">{comm.subject}</span>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(comm.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{comm.content}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          By {comm.createdBy}
                        </span>
                        {comm.resolved && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Resolved
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                  <p>No communication history yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm font-medium ${className}`}>{children}</div>
}
