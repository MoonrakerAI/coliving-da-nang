'use client'

import { useState } from 'react'
import { PaymentStatus } from '@/lib/db/models/payment'
import { Property } from '@/lib/db/models/property'

interface PaymentFiltersProps {
  filters: any
  onFilterChange: (filters: any) => void
  onClearFilters: () => void
  properties: Property[]
  paymentCounts: {
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

export function PaymentFilters({ filters, onFilterChange, onClearFilters, properties, paymentCounts }: PaymentFiltersProps) {
  
  const handleFilterChange = (key: string, value: any) => {
    onFilterChange({ [key]: value })
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
          onClick={() => handleFilterChange('status', 'all')}
          className={getStatusBadgeClass('all', paymentCounts.all)}
          disabled={paymentCounts.all === 0}
        >
          All ({paymentCounts.all})
        </button>
        <button
          onClick={() => handleFilterChange('status', PaymentStatus.PAID)}
          className={getStatusBadgeClass('paid', paymentCounts.paid)}
          disabled={paymentCounts.paid === 0}
        >
          ✓ Paid ({paymentCounts.paid})
        </button>
        <button
          onClick={() => handleFilterChange('status', PaymentStatus.PENDING)}
          className={getStatusBadgeClass('pending', paymentCounts.pending)}
          disabled={paymentCounts.pending === 0}
        >
          ⏳ Pending ({paymentCounts.pending})
        </button>
        <button
          onClick={() => handleFilterChange('status', PaymentStatus.OVERDUE)}
          className={getStatusBadgeClass('overdue', paymentCounts.overdue)}
          disabled={paymentCounts.overdue === 0}
        >
          ⚠️ Overdue ({paymentCounts.overdue})
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
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
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
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
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
            onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
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
            value={filters.startDate || ''}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
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
            value={filters.endDate || ''}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={onClearFilters}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Active Filters Summary */}
            {/* Property Filter */}
      <div className="mt-4">
        <label htmlFor="property" className="block text-sm font-medium text-gray-700 mb-1">
          Filter by Property
        </label>
        <select
          id="property"
          value={filters.propertyId}
          onChange={(e) => handleFilterChange('propertyId', e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="all">All Properties</option>
          {properties.map(property => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
      </div>

      {(filters.search || filters.status !== 'all' || filters.startDate || filters.endDate || filters.propertyId !== 'all') && (
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
                  Search: &ldquo;{filters.search}&rdquo;
                </span>
              )}
                            {filters.propertyId !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                  Property: {properties.find(p => p.id === filters.propertyId)?.name || 'Unknown'}
                </span>
              )}
              {(filters.startDate || filters.endDate) && (
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
