'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Users, 
  UserCheck, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Search,
  Calendar,
  Building,
  Mail,
  Phone,
  FileText,
  ArrowRight,
  RefreshCw
} from 'lucide-react'
import { Agreement } from '@/lib/db/models/agreement'

interface AgreementWithTenantStatus extends Agreement {
  templateName: string
  propertyName: string
  tenantCreated: boolean
  tenantId?: string
  tenantName?: string
  integrationStatus: 'pending' | 'completed' | 'failed' | 'not_applicable'
  integrationErrors?: string[]
}

export default function TenantIntegrationPage() {
  const [agreements, setAgreements] = useState<AgreementWithTenantStatus[]>([])
  const [filteredAgreements, setFilteredAgreements] = useState<AgreementWithTenantStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [integrationFilter, setIntegrationFilter] = useState<string>('all')
  const [processingTenant, setProcessingTenant] = useState<string | null>(null)

  useEffect(() => {
    loadAgreements()
  }, [])

  useEffect(() => {
    filterAgreements()
  }, [agreements, searchTerm, statusFilter, integrationFilter])

  const loadAgreements = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/agreements/track')
      
      if (response.ok) {
        const data = await response.json()
        
        // Enhance agreements with tenant integration status
        const enhancedAgreements = data.agreements.map((agreement: any) => ({
          ...agreement,
          tenantCreated: !!agreement.tenantId,
          integrationStatus: getIntegrationStatus(agreement)
        }))
        
        setAgreements(enhancedAgreements)
      } else {
        console.error('Failed to load agreements')
      }
    } catch (error) {
      console.error('Error loading agreements:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAgreements = () => {
    let filtered = agreements.filter(agreement => {
      const matchesSearch = 
        agreement.prospectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agreement.prospectEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agreement.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agreement.propertyName.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || agreement.status === statusFilter
      const matchesIntegration = integrationFilter === 'all' || agreement.integrationStatus === integrationFilter
      
      return matchesSearch && matchesStatus && matchesIntegration
    })

    setFilteredAgreements(filtered)
  }

  const getIntegrationStatus = (agreement: any): 'pending' | 'completed' | 'failed' | 'not_applicable' => {
    if (!['Signed', 'Completed'].includes(agreement.status)) {
      return 'not_applicable'
    }
    
    if (agreement.tenantId) {
      return 'completed'
    }
    
    if (['Signed', 'Completed'].includes(agreement.status)) {
      return 'pending'
    }
    
    return 'not_applicable'
  }

  const getIntegrationStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'not_applicable': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getIntegrationStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'failed': return <AlertTriangle className="h-4 w-4" />
      case 'not_applicable': return <FileText className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const createTenantProfile = async (agreementId: string) => {
    try {
      setProcessingTenant(agreementId)
      
      const response = await fetch(`/api/agreements/${agreementId}/create-tenant`, {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Tenant profile created:', result)
        
        // Reload agreements to reflect changes
        await loadAgreements()
      } else {
        const error = await response.json()
        console.error('Failed to create tenant profile:', error.error)
      }
    } catch (error) {
      console.error('Error creating tenant profile:', error)
    } finally {
      setProcessingTenant(null)
    }
  }

  const getStatusCounts = () => {
    return agreements.reduce((acc, agreement) => {
      acc[agreement.integrationStatus] = (acc[agreement.integrationStatus] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  const statusCounts = getStatusCounts()

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tenant Profile Integration</h1>
          <p className="text-gray-600">Monitor and manage automatic tenant profile creation from signed agreements</p>
        </div>
        <Button onClick={loadAgreements}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Agreements</p>
                <p className="text-2xl font-bold">{agreements.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tenants Created</p>
                <p className="text-2xl font-bold text-green-600">
                  {statusCounts['completed'] || 0}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Integration</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {statusCounts['pending'] || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Integration Errors</p>
                <p className="text-2xl font-bold text-red-600">
                  {statusCounts['failed'] || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, template, or property..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Signed">Signed</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={integrationFilter} onValueChange={setIntegrationFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by integration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Integration Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="not_applicable">Not Applicable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Integration Table */}
      <Card>
        <CardHeader>
          <CardTitle>Agreement to Tenant Integration ({filteredAgreements.length})</CardTitle>
          <CardDescription>
            Track the automatic creation of tenant profiles from signed agreements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prospect</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Agreement Status</TableHead>
                  <TableHead>Integration Status</TableHead>
                  <TableHead>Tenant Profile</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgreements.map((agreement) => (
                  <TableRow key={agreement.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="font-medium">{agreement.prospectName}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {agreement.prospectEmail}
                          </div>
                          {agreement.prospectPhone && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {agreement.prospectPhone}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-500" />
                        <span>{agreement.propertyName}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={`flex items-center gap-1`}>
                        {agreement.status === 'Signed' && <CheckCircle className="h-3 w-3" />}
                        {agreement.status === 'Completed' && <CheckCircle className="h-3 w-3" />}
                        {agreement.status}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={`${getIntegrationStatusColor(agreement.integrationStatus)} flex items-center gap-1`}>
                        {getIntegrationStatusIcon(agreement.integrationStatus)}
                        {agreement.integrationStatus === 'not_applicable' ? 'N/A' : 
                         agreement.integrationStatus.charAt(0).toUpperCase() + agreement.integrationStatus.slice(1)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      {agreement.tenantCreated ? (
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">
                            {agreement.tenantName || 'Created'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-500">Not Created</span>
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {agreement.integrationStatus === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => createTenantProfile(agreement.id)}
                          disabled={processingTenant === agreement.id}
                        >
                          {processingTenant === agreement.id ? (
                            'Creating...'
                          ) : (
                            <>
                              <ArrowRight className="h-4 w-4 mr-1" />
                              Create Tenant
                            </>
                          )}
                        </Button>
                      )}
                      
                      {agreement.integrationStatus === 'completed' && agreement.tenantId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/tenants/${agreement.tenantId}`, '_blank')}
                        >
                          View Tenant
                        </Button>
                      )}
                      
                      {agreement.integrationStatus === 'not_applicable' && (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredAgreements.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No agreements found matching your criteria
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Integration Process Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Automatic Tenant Profile Creation</h3>
              <p className="text-sm text-blue-700 mt-1">
                When agreements are completed via DocuSign, tenant profiles are automatically created with 
                lease information, emergency contacts, and document references. The system extracts data 
                from the signed agreement and creates a complete tenant record, assigns rooms (if specified), 
                sets up calendar integration, and sends welcome emails.
              </p>
              <div className="mt-3 text-sm text-blue-700">
                <strong>Integration includes:</strong> Tenant profile creation, lease history setup, 
                document storage, room assignment, calendar integration, and welcome communications.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
