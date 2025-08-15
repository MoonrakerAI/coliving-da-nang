'use client'

import { useState } from 'react'
import { PaymentStatus } from '@/lib/db/models/payment'

interface PaymentFiltersProps {
  onFilterChange: (filters: PaymentFilters) => void
  totalCounts: {
    all: number
    paid: number
    pending: number
    overdue: number
  }
}

export interface PaymentFilters {
  status: string
  search: string
  dateRange: {
    start?: Date
    end?: Date
  }
  sortBy: 'tenant' | 'dueDate' | 'amount' | 'status'
  sortOrder: 'asc' | 'desc'
}

export function PaymentFilters({ onFilterChange, totalCounts }: PaymentFiltersProps) {
  const [filters, setFilters] = useState<PaymentFilters>({
    status: 'all',
    search: '',
    dateRange: {},
    sortBy: 'dueDate',
    sortOrder: 'asc'
  })

  const updateFilters = (newFilters: Partial<PaymentFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    onFilterChange(updatedFilters)
  }

  const clearFilters = () => {
    const clearedFilters: PaymentFilters = {
      status: 'all',
      search: '',
      dateRange: {},
      sortBy: 'dueDate',
      sortOrder: 'asc'
    }
    setFilters(clearedFilters)
    onFilterChange(clearedFilters)
  }

  const getStatusBadgeClass = (status: string, count: number) => {
    const baseClass = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors"
    const isActive = filters.status === status
    
    if (count === 0) {
      return `${baseClass} bg-gray-100 text-gray-400 cursor-not-allowed`
    }

    switch (status) {
      case 'paid':
        return `${baseClass} ${isActive ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'}`
      case 'pending':
        return `${baseClass} ${isActive ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`
      case 'overdue':
        return `${baseClass} ${isActive ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800 hover:bg-red-200'}`
      default:
        return `${baseClass} ${isActive ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`
    }
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => updateFilters({ status: 'all' })}
          className={getStatusBadgeClass('all', totalCounts.all)}
          disabled={totalCounts.all === 0}
        >
          All ({totalCounts.all})
        </button>
        <button
          onClick={() => updateFilters({ status: PaymentStatus.PAID })}
          className={getStatusBadgeClass('paid', totalCounts.paid)}
          disabled={totalCounts.paid === 0}
        >
          ✓ Paid ({totalCounts.paid})
        </button>
        <button
          onClick={() => updateFilters({ status: PaymentStatus.PENDING })}
          className={getStatusBadgeClass('pending', totalCounts.pending)}
          disabled={totalCounts.pending === 0}
        >
          ⏳ Pending ({totalCounts.pending})
        </button>
        <button
          onClick={() => updateFilters({ status: PaymentStatus.OVERDUE })}
          className={getStatusBadgeClass('overdue', totalCounts.overdue)}
          disabled={totalCounts.overdue === 0}
        >
          ⚠️ Overdue ({totalCounts.overdue})
        </button>
      </div>

      {/* Search and Sort Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="md:col-span-2">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search tenants or rooms
          </label>
          <div className="relative">
            <input
              type="text"
              id="search"
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              placeholder="Search by name or room number..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Sort By */}
        <div>
          <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
            Sort by
          </label>
          <select
            id="sortBy"
            value={filters.sortBy}
            onChange={(e) => updateFilters({ sortBy: e.target.value as PaymentFilters['sortBy'] })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="tenant">Tenant Name</option>
            <option value="dueDate">Due Date</option>
            <option value="amount">Amount</option>
            <option value="status">Status</option>
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">
            Order
          </label>
          <select
            id="sortOrder"
            value={filters.sortOrder}
            onChange={(e) => updateFilters({ sortOrder: e.target.value as 'asc' | 'desc' })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
            From Date
          </label>
          <input
            type="date"
            id="startDate"
            value={filters.dateRange.start ? filters.dateRange.start.toISOString().split('T')[0] : ''}
            onChange={(e) => updateFilters({ 
              dateRange: { 
                ...filters.dateRange, 
                start: e.target.value ? new Date(e.target.value) : undefined 
              } 
            })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
            To Date
          </label>
          <input
            type="date"
            id="endDate"
            value={filters.dateRange.end ? filters.dateRange.end.toISOString().split('T')[0] : ''}
            onChange={(e) => updateFilters({ 
              dateRange: { 
                ...filters.dateRange, 
                end: e.target.value ? new Date(e.target.value) : undefined 
              } 
            })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={clearFilters}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Active Filters Summary */}
      {(filters.search || filters.status !== 'all' || filters.dateRange.start || filters.dateRange.end) && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {filters.status !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                  Status: {filters.status}
                </span>
              )}
              {filters.search && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                  Search: "{filters.search}"
                </span>
              )}
              {(filters.dateRange.start || filters.dateRange.end) && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                  Date range
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
