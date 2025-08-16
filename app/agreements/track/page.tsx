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
  FileText, 
  Clock, 
  Eye, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Send,
  MoreHorizontal,
  Calendar,
  User,
  Building
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Agreement } from '@/lib/db/models/agreement'

interface AgreementWithDetails extends Agreement {
  templateName: string
  propertyName: string
  daysUntilExpiry: number
  lastStatusChange: Date
}

export default function AgreementTrackingPage() {
  const [agreements, setAgreements] = useState<AgreementWithDetails[]>([])
  const [filteredAgreements, setFilteredAgreements] = useState<AgreementWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [propertyFilter, setPropertyFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('sentDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadAgreements()
  }, [])

  useEffect(() => {
    filterAndSortAgreements()
  }, [agreements, searchTerm, statusFilter, propertyFilter, sortBy, sortOrder])

  const loadAgreements = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/agreements/track')
      
      if (response.ok) {
        const data = await response.json()
        setAgreements(data.agreements)
      } else {
        console.error('Failed to load agreements')
      }
    } catch (error) {
      console.error('Error loading agreements:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortAgreements = () => {
    let filtered = agreements.filter(agreement => {
      const matchesSearch = 
        agreement.prospectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agreement.prospectEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agreement.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agreement.propertyName.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || agreement.status === statusFilter
      const matchesProperty = propertyFilter === 'all' || agreement.propertyId === propertyFilter
      
      return matchesSearch && matchesStatus && matchesProperty
    })

    // Sort agreements
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'prospectName':
          aValue = a.prospectName
          bValue = b.prospectName
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'sentDate':
          aValue = new Date(a.sentDate)
          bValue = new Date(b.sentDate)
          break
        case 'expirationDate':
          aValue = new Date(a.expirationDate)
          bValue = new Date(b.expirationDate)
          break
        case 'daysUntilExpiry':
          aValue = a.daysUntilExpiry
          bValue = b.daysUntilExpiry
          break
        default:
          aValue = a.sentDate
          bValue = b.sentDate
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredAgreements(filtered)
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent': return <Send className="h-4 w-4" />
      case 'viewed': return <Eye className="h-4 w-4" />
      case 'signed': return <CheckCircle className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'expired': return <XCircle className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'viewed': return 'bg-yellow-100 text-yellow-800'
      case 'signed': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'expired': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getUrgencyColor = (daysUntilExpiry: number, status: string) => {
    if (['Signed', 'Completed', 'Cancelled'].includes(status)) return ''
    
    if (daysUntilExpiry < 0) return 'text-red-600'
    if (daysUntilExpiry <= 1) return 'text-red-500'
    if (daysUntilExpiry <= 3) return 'text-orange-500'
    if (daysUntilExpiry <= 7) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const sendReminder = async (agreementId: string) => {
    try {
      const response = await fetch(`/api/agreements/${agreementId}/remind`, {
        method: 'POST'
      })
      
      if (response.ok) {
        // Refresh agreements to get updated reminder info
        loadAgreements()
      } else {
        console.error('Failed to send reminder')
      }
    } catch (error) {
      console.error('Error sending reminder:', error)
    }
  }

  const downloadDocument = async (agreementId: string) => {
    try {
      const response = await fetch(`/api/agreements/${agreementId}/document`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `agreement-${agreementId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.error('Failed to download document')
      }
    } catch (error) {
      console.error('Error downloading document:', error)
    }
  }

  const getUniqueProperties = () => {
    const properties = agreements.reduce((acc, agreement) => {
      if (!acc.find(p => p.id === agreement.propertyId)) {
        acc.push({
          id: agreement.propertyId,
          name: agreement.propertyName
        })
      }
      return acc
    }, [] as { id: string; name: string }[])
    
    return properties
  }

  const getStatusCounts = () => {
    return agreements.reduce((acc, agreement) => {
      acc[agreement.status] = (acc[agreement.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  const statusCounts = getStatusCounts()
  const uniqueProperties = getUniqueProperties()

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
          <h1 className="text-3xl font-bold">Agreement Tracking</h1>
          <p className="text-gray-600">Monitor and manage all digital lease agreements</p>
        </div>
        <Button onClick={loadAgreements}>
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
                <p className="text-sm font-medium text-gray-600">Pending Signatures</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {(statusCounts['Sent'] || 0) + (statusCounts['Viewed'] || 0)}
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
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {(statusCounts['Signed'] || 0) + (statusCounts['Completed'] || 0)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expired/Cancelled</p>
                <p className="text-2xl font-bold text-red-600">
                  {(statusCounts['Expired'] || 0) + (statusCounts['Cancelled'] || 0)}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
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
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Viewed">Viewed</SelectItem>
                <SelectItem value="Signed">Signed</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {uniqueProperties.map(property => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sentDate">Sent Date</SelectItem>
                <SelectItem value="prospectName">Prospect Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="expirationDate">Expiration Date</SelectItem>
                <SelectItem value="daysUntilExpiry">Days Until Expiry</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Agreements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Agreements ({filteredAgreements.length})</CardTitle>
          <CardDescription>
            Track the status and progress of all digital lease agreements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prospect</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent Date</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgreements.map((agreement) => (
                  <TableRow key={agreement.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="font-medium">{agreement.prospectName}</div>
                          <div className="text-sm text-gray-500">{agreement.prospectEmail}</div>
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
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span>{agreement.templateName}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={`${getStatusColor(agreement.status)} flex items-center gap-1`}>
                        {getStatusIcon(agreement.status)}
                        {agreement.status}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>{new Date(agreement.sentDate).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className={`flex items-center gap-2 ${getUrgencyColor(agreement.daysUntilExpiry, agreement.status)}`}>
                        <Clock className="h-4 w-4" />
                        <span>
                          {agreement.daysUntilExpiry < 0 
                            ? `Expired ${Math.abs(agreement.daysUntilExpiry)} days ago`
                            : `${agreement.daysUntilExpiry} days left`
                          }
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          {['Sent', 'Viewed'].includes(agreement.status) && (
                            <DropdownMenuItem onClick={() => sendReminder(agreement.id)}>
                              <Send className="h-4 w-4 mr-2" />
                              Send Reminder
                            </DropdownMenuItem>
                          )}
                          
                          {['Signed', 'Completed'].includes(agreement.status) && (
                            <DropdownMenuItem onClick={() => downloadDocument(agreement.id)}>
                              <Download className="h-4 w-4 mr-2" />
                              Download Document
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuItem onClick={() => window.open(`/agreements/sign/${agreement.id}`, '_blank')}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Agreement
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
    </div>
  )
}
