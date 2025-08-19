'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Agreement, AgreementStatus } from '@/lib/db/models/agreement'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Send, 
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react'
import Link from 'next/link'

interface AgreementFilters {
  status: string
  search: string
  dateRange: string
}

export default function AgreementsPage() {
  const sessionResult = useSession()
  const session = sessionResult?.data ?? null
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [filteredAgreements, setFilteredAgreements] = useState<Agreement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AgreementFilters>({
    status: 'all',
    search: '',
    dateRange: 'all'
  })

  useEffect(() => {
    fetchAgreements()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [agreements, filters])

  const fetchAgreements = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/agreements')
      if (!response.ok) {
        throw new Error('Failed to fetch agreements')
      }
      const data = await response.json()
      setAgreements(data.agreements || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agreements')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...agreements]

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(agreement => agreement.status === filters.status)
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(agreement => 
        agreement.prospectName.toLowerCase().includes(searchLower) ||
        agreement.prospectEmail.toLowerCase().includes(searchLower)
      )
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date()
      const days = filters.dateRange === '7' ? 7 : filters.dateRange === '30' ? 30 : 90
      const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
      filtered = filtered.filter(agreement => new Date(agreement.sentDate) >= cutoff)
    }

    setFilteredAgreements(filtered)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case AgreementStatus.SENT:
        return <Send className="h-4 w-4" />
      case AgreementStatus.VIEWED:
        return <Eye className="h-4 w-4" />
      case AgreementStatus.SIGNED:
        return <CheckCircle className="h-4 w-4" />
      case AgreementStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4" />
      case AgreementStatus.EXPIRED:
        return <Clock className="h-4 w-4" />
      case AgreementStatus.CANCELLED:
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case AgreementStatus.SENT:
        return 'bg-blue-100 text-blue-800'
      case AgreementStatus.VIEWED:
        return 'bg-yellow-100 text-yellow-800'
      case AgreementStatus.SIGNED:
        return 'bg-green-100 text-green-800'
      case AgreementStatus.COMPLETED:
        return 'bg-green-100 text-green-800'
      case AgreementStatus.EXPIRED:
        return 'bg-red-100 text-red-800'
      case AgreementStatus.CANCELLED:
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleSendReminder = async (agreementId: string) => {
    try {
      const response = await fetch(`/api/agreements/${agreementId}/remind`, {
        method: 'POST'
      })
      if (response.ok) {
        // Show success message
        console.log('Reminder sent successfully')
        await fetchAgreements() // Refresh data
      }
    } catch (error) {
      console.error('Failed to send reminder:', error)
    }
  }

  const stats = {
    total: agreements.length,
    sent: agreements.filter(a => a.status === AgreementStatus.SENT).length,
    signed: agreements.filter(a => a.status === AgreementStatus.SIGNED).length,
    completed: agreements.filter(a => a.status === AgreementStatus.COMPLETED).length,
    expired: agreements.filter(a => a.status === AgreementStatus.EXPIRED).length
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Digital Agreements</h1>
          <p className="text-muted-foreground">Loading agreements...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Digital Agreements</h1>
          <p className="text-red-600">{error}</p>
        </div>
        <Button onClick={fetchAgreements}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Digital Agreements</h1>
          <p className="text-muted-foreground">
            Manage tenant agreements and e-signatures
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/agreements/templates">
            <Button variant="outline">
              Manage Templates
            </Button>
          </Link>
          <Link href="/agreements/send">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Send Agreement
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Total</h3>
          </div>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">All agreements</p>
        </div>
        
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Sent</h3>
          </div>
          <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
          <p className="text-xs text-muted-foreground">Awaiting signature</p>
        </div>
        
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Signed</h3>
          </div>
          <div className="text-2xl font-bold text-green-600">{stats.signed}</div>
          <p className="text-xs text-muted-foreground">Recently signed</p>
        </div>
        
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Completed</h3>
          </div>
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <p className="text-xs text-muted-foreground">Fully processed</p>
        </div>
        
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Expired</h3>
          </div>
          <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          <p className="text-xs text-muted-foreground">Need attention</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by name or email..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
        </div>
        
        <select
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
        >
          <option value="all">All Status</option>
          <option value={AgreementStatus.SENT}>Sent</option>
          <option value={AgreementStatus.VIEWED}>Viewed</option>
          <option value={AgreementStatus.SIGNED}>Signed</option>
          <option value={AgreementStatus.COMPLETED}>Completed</option>
          <option value={AgreementStatus.EXPIRED}>Expired</option>
          <option value={AgreementStatus.CANCELLED}>Cancelled</option>
        </select>
        
        <select
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          value={filters.dateRange}
          onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
        >
          <option value="all">All Time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Agreements Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {filteredAgreements.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Send className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No agreements found</h3>
            <p className="text-gray-500 mb-4">
              {filters.status !== 'all' || filters.search || filters.dateRange !== 'all'
                ? 'No agreements match your current filters.'
                : 'Get started by sending your first agreement.'
              }
            </p>
            <Link href="/agreements/send">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Send Agreement
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prospect
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAgreements.map((agreement) => (
                  <tr key={agreement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {agreement.prospectName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {agreement.prospectEmail}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        Property {agreement.propertyId}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={`inline-flex items-center gap-1 ${getStatusColor(agreement.status)}`}>
                        {getStatusIcon(agreement.status)}
                        {agreement.status}
                      </Badge>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(agreement.sentDate).toLocaleDateString()}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(agreement.expirationDate).toLocaleDateString()}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Link href={`/agreements/${agreement.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      
                      {['Sent', 'Viewed'].includes(agreement.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendReminder(agreement.id)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {agreement.signedDocumentUrl && (
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
