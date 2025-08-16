'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Users, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'
import { Tenant } from '@/lib/db/models/tenant'

interface TenantsPageState {
  tenants: Tenant[]
  loading: boolean
  error: string | null
  searchQuery: string
  statusFilter: string
  leaseStatusFilter: string
}

export default function Tenants() {
  const [state, setState] = useState<TenantsPageState>({
    tenants: [],
    loading: true,
    error: null,
    searchQuery: '',
    statusFilter: 'all',
    leaseStatusFilter: 'all'
  })

  // Fetch tenants with current filters
  const fetchTenants = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      const params = new URLSearchParams()
      if (state.searchQuery) params.set('query', state.searchQuery)
      if (state.statusFilter !== 'all') params.set('status', state.statusFilter)
      if (state.leaseStatusFilter !== 'all') params.set('leaseStatus', state.leaseStatusFilter)
      
      const response = await fetch(`/api/tenants?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch tenants')
      }
      
      const data = await response.json()
      setState(prev => ({ ...prev, tenants: data.tenants, loading: false }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }

  // Fetch tenants on component mount and when filters change
  useEffect(() => {
    fetchTenants()
  }, [state.searchQuery, state.statusFilter, state.leaseStatusFilter])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (state.searchQuery !== undefined) {
        fetchTenants()
      }
    }, 300)
    
    return () => clearTimeout(timer)
  }, [state.searchQuery])

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">
            Manage tenant profiles, leases, and communications
          </p>
        </div>
        <Link href="/tenants/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Tenant
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tenants by name, email, or phone..."
                  value={state.searchQuery}
                  onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <Select 
              value={state.statusFilter} 
              onValueChange={(value) => setState(prev => ({ ...prev, statusFilter: value }))}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Moving Out">Moving Out</SelectItem>
                <SelectItem value="Moved Out">Moved Out</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={state.leaseStatusFilter} 
              onValueChange={(value) => setState(prev => ({ ...prev, leaseStatusFilter: value }))}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Lease Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leases</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {state.loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading tenants...</div>
        </div>
      ) : state.error ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-destructive font-medium">Error loading tenants</p>
              <p className="text-muted-foreground text-sm">{state.error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={fetchTenants}
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="flex items-center p-6">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Tenants</p>
                  <p className="text-2xl font-bold">{state.tenants.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-6">
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="h-4 w-4 bg-green-600 rounded-full"></div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">
                    {state.tenants.filter(t => t.status === 'Active').length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-6">
                <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                  <p className="text-2xl font-bold">
                    {state.tenants.filter(t => getLeaseStatus(t).status.includes('Expires')).length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-6">
                <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                  <div className="h-4 w-4 bg-red-600 rounded-full"></div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Moving Out</p>
                  <p className="text-2xl font-bold">
                    {state.tenants.filter(t => t.status === 'Moving Out').length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tenant List */}
          {state.tenants.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground font-medium">No tenants found</p>
                  <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {state.tenants.map((tenant) => {
                const leaseStatus = getLeaseStatus(tenant)
                const roomNumber = tenant.roomAssignment?.roomNumber || tenant.roomNumber
                
                return (
                  <Card key={tenant.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={tenant.profilePhoto} />
                          <AvatarFallback>
                            {tenant.firstName[0]}{tenant.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Link 
                            href={`/tenants/${tenant.id}`}
                            className="font-semibold hover:underline"
                          >
                            {tenant.firstName} {tenant.lastName}
                          </Link>
                          <p className="text-sm text-muted-foreground">{tenant.email}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <Badge variant={getStatusBadgeVariant(tenant.status)}>
                            {tenant.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Room</span>
                          <span className="text-sm font-medium">{roomNumber || 'Not assigned'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Lease</span>
                          <Badge variant={leaseStatus.variant}>
                            {leaseStatus.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Emergency Contacts</span>
                          <span className="text-sm font-medium">
                            {tenant.emergencyContacts?.length || (tenant.emergencyContact ? 1 : 0)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
