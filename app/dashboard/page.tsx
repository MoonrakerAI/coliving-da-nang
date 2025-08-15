'use client'

import { useState, useEffect } from 'react'
import { PaymentStatusCard } from './components/PaymentStatusCard'
import { PaymentFilters } from './components/PaymentFilters'
import { PaymentTable } from './components/PaymentTable'
import { QuickActions } from './components/QuickActions'
import { Payment, PaymentStatus } from '@/lib/db/models/payment'

interface PaymentFilters {
  status: string
  search: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  startDate: string
  endDate: string
}

export default function Dashboard() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([])
  const [selectedPayments, setSelectedPayments] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<PaymentFilters>({
    status: 'all',
    search: '',
    sortBy: 'dueDate',
    sortOrder: 'asc',
    startDate: '',
    endDate: ''
  })

  // Fetch payments
  useEffect(() => {
    fetchPayments()
  }, [])

  // Apply filters
  useEffect(() => {
    applyFilters()
  }, [payments, filters])

  const fetchPayments = async () => {
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
  }

  const applyFilters = () => {
    let filtered = [...payments]

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(payment => payment.status === filters.status)
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

    setFilteredPayments(filtered)
  }

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
      endDate: ''
    })
  }

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: PaymentStatus.PAID, paidDate: new Date() })
      })
      if (response.ok) {
        await fetchPayments()
      }
    } catch (error) {
      console.error('Failed to mark payment as paid:', error)
    }
  }

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

  const handleBulkReminders = async () => {
    try {
      const overduePayments = filteredPayments.filter(p => p.status === PaymentStatus.OVERDUE)
      const response = await fetch('/api/payments/bulk-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIds: overduePayments.map(p => p.id) })
      })
      if (response.ok) {
        console.log('Bulk reminders sent successfully')
      }
    } catch (error) {
      console.error('Failed to send bulk reminders:', error)
    }
  }

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
        onBulkReminders={handleBulkReminders}
        selectedCount={selectedPayments.length}
        totalPayments={stats.total}
      />

      {/* Filters */}
      <PaymentFilters
        filters={filters}
        onFilterChange={handleFilterChange}
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
            onMarkAsPaid={() => handleMarkAsPaid(payment.id)}
            onSendReminder={() => handleSendReminder(payment.id)}
          />
        ))}
      </div>

      {/* Payment Table - Desktop View */}
      <div className="hidden md:block">
        <PaymentTable
          payments={filteredPayments}
          selectedPayments={selectedPayments}
          onSelectionChange={setSelectedPayments}
          onMarkAsPaid={handleMarkAsPaid}
          onSendReminder={handleSendReminder}
          onSort={(sortBy, sortOrder) => handleFilterChange({ sortBy, sortOrder })}
        />
      </div>
    </div>
  )
}
