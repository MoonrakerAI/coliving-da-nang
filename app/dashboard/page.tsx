'use client'

import { useState, useEffect, useCallback } from 'react'
import { PaymentStatusCard } from './components/PaymentStatusCard'
import { PaymentFilters } from './components/PaymentFilters'
import { PaymentTable } from './components/PaymentTable'
import { QuickActions } from './components/QuickActions'
import { Payment, PaymentStatus } from '@/lib/db/models/payment'
import { Property } from '@/lib/db/models/property'
import { Tenant } from '@/lib/db/models/tenant'

interface PaymentFilters {
  status: string
  search: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  startDate: string
  endDate: string
  propertyId: string
}

export default function Dashboard() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedPayments, setSelectedPayments] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<PaymentFilters>({
    status: 'all',
    search: '',
    sortBy: 'dueDate',
    sortOrder: 'asc',
    startDate: '',
    endDate: '',
    propertyId: 'all'
  })

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/payments')
      if (!response.ok) {
        throw new Error('Failed to fetch payments')
      }
      const data = await response.json()
      setPayments(data.payments || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchProperties = useCallback(async () => {
    try {
      // NOTE: Using a hardcoded ownerId for now.
      const response = await fetch('/api/properties?ownerId=a1b2c3d4-e5f6-7890-1234-567890abcdef')
      if (!response.ok) {
        throw new Error('Failed to fetch properties')
      }
      const data = await response.json()
      setProperties(data.properties || [])
    } catch (err) {
      // Non-critical error, so we can just log it.
      console.error(err instanceof Error ? err.message : 'Failed to load properties')
    }
  }, [])

  const applyFilters = useCallback(() => {
    let filtered = [...payments]

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(payment => payment.status === filters.status)
    }

    // Property filter
    if (filters.propertyId !== 'all') {
      filtered = filtered.filter(payment => payment.propertyId === filters.propertyId)
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(payment => 
        payment.description.toLowerCase().includes(searchLower) ||
        payment.reference?.toLowerCase().includes(searchLower) ||
        payment.tenantId.toLowerCase().includes(searchLower)
      )
    }

    // Date range filter
    if (filters.startDate) {
      filtered = filtered.filter(payment => 
        new Date(payment.dueDate) >= new Date(filters.startDate)
      )
    }
    if (filters.endDate) {
      filtered = filtered.filter(payment => 
        new Date(payment.dueDate) <= new Date(filters.endDate)
      )
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      switch (filters.sortBy) {
        case 'dueDate':
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          break
        case 'amount':
          comparison = a.amountCents - b.amountCents
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        default:
          comparison = 0
      }
      return filters.sortOrder === 'desc' ? -comparison : comparison
    })

    const enrichedPayments = filtered.map(payment => ({
      ...payment,
      tenant: tenants.find(t => t.id === payment.tenantId) || null
    })).filter(p => p.tenant) // Ensure tenant exists

    setFilteredPayments(enrichedPayments)
  }, [payments, filters, tenants])

  const handleFilterChange = (newFilters: Partial<PaymentFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const handleClearFilters = () => {
    setFilters({
      status: 'all',
      search: '',
      sortBy: 'dueDate',
      sortOrder: 'asc',
      startDate: '',
      endDate: '',
      propertyId: 'all'
    })
  }

  const handleStatusUpdate = async (paymentId: string, status: keyof typeof PaymentStatus) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, paidDate: status === PaymentStatus.PAID ? new Date() : null })
      })
      if (response.ok) {
        await fetchPayments()
      } else {
        console.error(`Failed to update payment ${paymentId} to ${status}`)
      }
    } catch (error) {
      console.error(`Error updating payment status:`, error)
    }
  }

  const handleToggleReminders = async (paymentId: string, remindersPaused: boolean) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remindersPaused })
      });
      if (response.ok) {
        await fetchPayments();
      } else {
        console.error(`Failed to update reminders status for payment ${paymentId}`);
      }
    } catch (error) {
      console.error('Error toggling reminders:', error);
    }
  };

  const handleSendReminder = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}/reminder`, {
        method: 'POST'
      })
      if (response.ok) {
        console.log('Reminder sent successfully')
      }
    } catch (error) {
      console.error('Failed to send reminder:', error)
    }
  }

  const handleExportPayments = async (format: 'csv' | 'excel') => {
    try {
      const response = await fetch(`/api/payments/export?format=${format}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `payments.${format}`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export payments:', error)
    }
  }

  const handleGenerateReport = async () => {
    try {
      const response = await fetch('/api/payments/report')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        window.open(url, '_blank')
      }
    } catch (error) {
      console.error('Failed to generate report:', error)
    }
  }

  const handleBulkAction = async (action: 'markPaid' | 'sendReminders') => {
    if (selectedPayments.length === 0) return

    try {
      const response = await fetch(`/api/payments/bulk-${action}`.replace(/([A-Z])/g, '-$1').toLowerCase(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIds: selectedPayments }),
      })

      if (response.ok) {
        console.log(`Bulk action '${action}' successful`)
        await fetchPayments() // Refresh data
        setSelectedPayments([]) // Clear selection
      } else {
        console.error(`Failed to perform bulk action: ${action}`)
      }
    } catch (error) {
      console.error(`Error during bulk action: ${action}`, error)
    }
  }

  const fetchTenants = useCallback(async () => {
    try {
      const response = await fetch('/api/tenants')
      if (!response.ok) {
        throw new Error('Failed to fetch tenants')
      }
      const data = await response.json()
      setTenants(data.tenants || [])
    } catch (err) {
      console.error(err instanceof Error ? err.message : 'Failed to load tenants')
    }
  }, [])

  // Fetch payments
  useEffect(() => {
    fetchPayments()
    fetchProperties()
    fetchTenants()
  }, [fetchPayments, fetchProperties, fetchTenants])

  // Apply filters
  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  // Calculate statistics
  const stats = {
    total: filteredPayments.length,
    paid: filteredPayments.filter(p => p.status === PaymentStatus.PAID).length,
    pending: filteredPayments.filter(p => p.status === PaymentStatus.PENDING).length,
    overdue: filteredPayments.filter(p => p.status === PaymentStatus.OVERDUE).length,
    totalAmount: filteredPayments.reduce((sum, p) => sum + p.amountCents, 0)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Dashboard</h1>
          <p className="text-muted-foreground">Loading payment data...</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Payment Dashboard</h1>
          <p className="text-red-600">{error}</p>
        </div>
        <button
          onClick={fetchPayments}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Dashboard</h1>
        <p className="text-muted-foreground">
          Track and manage all property payments
        </p>
      </div>
      
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Total Payments</h3>
          </div>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">All payment records</p>
        </div>
        
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Paid</h3>
          </div>
          <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
          <p className="text-xs text-muted-foreground">Completed payments</p>
        </div>
        
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Pending</h3>
          </div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <p className="text-xs text-muted-foreground">Awaiting payment</p>
        </div>
        
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Overdue</h3>
          </div>
          <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          <p className="text-xs text-muted-foreground">Past due date</p>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions
        onExportPayments={handleExportPayments}
        onGenerateReport={handleGenerateReport}
        onBulkAction={handleBulkAction}
        selectedCount={selectedPayments.length}
        totalPayments={stats.total}
      />

      {/* Filters */}
      <PaymentFilters
        filters={filters}
        onFilterChange={(filter) => handleFilterChange(filter)}
        onSort={(sortBy, sortOrder) => handleFilterChange({ sortBy, sortOrder })}
        properties={properties}
        onClearFilters={handleClearFilters}
        paymentCounts={{
          all: payments.length,
          paid: payments.filter(p => p.status === PaymentStatus.PAID).length,
          pending: payments.filter(p => p.status === PaymentStatus.PENDING).length,
          overdue: payments.filter(p => p.status === PaymentStatus.OVERDUE).length
        }}
      />

      {/* Payment Cards - Mobile View */}
      <div className="block md:hidden space-y-4">
        {filteredPayments.map(payment => (
                    <PaymentStatusCard
            key={payment.id}
            payment={payment}
            tenant={payment.tenant}
            onStatusUpdate={(status) => handleStatusUpdate(payment.id, status)}
            onSendReminder={() => handleSendReminder(payment.id)}
            onToggleReminders={handleToggleReminders}
            onViewDetails={() => { /* TODO: Implement modal view */ }}
          />
        ))}
      </div>

      {/* Payment Table - Desktop View */}
      <div className="hidden md:block">
        <PaymentTable
          payments={filteredPayments}
          selectedPayments={selectedPayments}
          onSelectionChange={setSelectedPayments}
          onMarkAsPaid={(paymentId) => handleStatusUpdate(paymentId, 'PAID')}
                    onSendReminder={handleSendReminder}
          onToggleReminders={handleToggleReminders}
          onBulkAction={handleBulkAction}
          onSort={(sortBy, sortOrder) => handleFilterChange({ sortBy, sortOrder })}
        />
      </div>
    </div>
  )
}
