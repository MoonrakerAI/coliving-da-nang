'use client'

import { useState } from 'react'
import { Payment, PaymentStatus } from '@/lib/db/models/payment'
import { Tenant } from '@/lib/db/models/tenant'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PaymentStatusCardProps {
  payment: Payment
  tenant: Tenant
  onStatusUpdate: (paymentId: string, status: keyof typeof PaymentStatus) => void
  onSendReminder: (paymentId: string) => void
  onViewDetails: (paymentId: string) => void
}

export function PaymentStatusCard({ 
  payment, 
  tenant, 
  onStatusUpdate, 
  onSendReminder,
  onViewDetails 
}: PaymentStatusCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case PaymentStatus.PAID:
        return 'bg-green-100 text-green-800 border-green-200'
      case PaymentStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case PaymentStatus.OVERDUE:
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case PaymentStatus.PAID:
        return '✓'
      case PaymentStatus.PENDING:
        return '⏳'
      case PaymentStatus.OVERDUE:
        return '⚠️'
      default:
        return '❓'
    }
  }

  const handleStatusUpdate = async (newStatus: keyof typeof PaymentStatus) => {
    setIsUpdating(true)
    try {
      await onStatusUpdate(payment.id, newStatus)
    } finally {
      setIsUpdating(false)
    }
  }

  const isOverdue = new Date(payment.dueDate) < new Date() && payment.status !== PaymentStatus.PAID
  const daysUntilDue = Math.ceil((new Date(payment.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {tenant.firstName[0]}{tenant.lastName[0]}
            </span>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              {tenant.firstName} {tenant.lastName}
            </h3>
            <p className="text-sm text-gray-500">Room {tenant.roomNumber || 'N/A'}</p>
          </div>
        </div>
        
        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}>
          <span className="mr-1">{getStatusIcon(payment.status)}</span>
          {payment.status}
        </div>
      </div>

      {/* Payment Details */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Amount</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(payment.amountCents, payment.currency)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Due Date</span>
          <div className="text-right">
            <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
              {formatDate(payment.dueDate)}
            </span>
            {daysUntilDue > 0 && (
              <p className="text-xs text-gray-500">
                {daysUntilDue} days remaining
              </p>
            )}
            {isOverdue && (
              <p className="text-xs text-red-500">
                {Math.abs(daysUntilDue)} days overdue
              </p>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Payment Method</span>
          <span className="text-sm text-gray-900">{payment.paymentMethod}</span>
        </div>

        {payment.paidDate && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Paid Date</span>
            <span className="text-sm text-gray-900">{formatDate(payment.paidDate)}</span>
          </div>
        )}

        {payment.reference && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Reference</span>
            <span className="text-sm text-gray-900 font-mono">{payment.reference}</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => onViewDetails(payment.id)}
          className="flex-1 min-w-0 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          View Details
        </button>
        
        {payment.status !== PaymentStatus.PAID && (
          <button
            onClick={() => handleStatusUpdate('PAID')}
            disabled={isUpdating}
            className="flex-1 min-w-0 px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Updating...' : 'Mark Paid'}
          </button>
        )}
        
        {(payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.OVERDUE) && (
          <button
            onClick={() => onSendReminder(payment.id)}
            className="px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 border border-transparent rounded-md hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Send Reminder
          </button>
        )}
      </div>

      {payment.notes && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Note:</span> {payment.notes}
          </p>
        </div>
      )}
    </div>
  )
}
