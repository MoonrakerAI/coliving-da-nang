'use client'

import { useState } from 'react'
import { Payment, PaymentStatus } from '@/lib/db/models/payment'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PaymentTableProps {
  payments: any[]
  selectedPayments: string[]
  onSelectionChange: (selectedIds: string[]) => void
  onMarkAsPaid: (paymentId: string) => void
    onSendReminder: (paymentId: string) => void
  onToggleReminders: (paymentId: string, remindersPaused: boolean) => void
  onSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  onBulkAction: (action: 'markPaid' | 'sendReminders') => void
}

export function PaymentTable({ 
  payments, 
  selectedPayments, 
  onSelectionChange, 
  onMarkAsPaid,
    onSendReminder, 
  onToggleReminders,
  onSort,
  onBulkAction
}: PaymentTableProps) {
    const [isUpdating, setIsUpdating] = useState<Set<string>>(new Set())

  
  const getStatusColor = (status: string) => {
    switch (status) {
      case PaymentStatus.PAID:
        return 'bg-green-100 text-green-800'
      case PaymentStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800'
      case PaymentStatus.OVERDUE:
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onSelectionChange(payments.map(p => p.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectOne = (id: string) => {
    const newSelected = selectedPayments.includes(id)
      ? selectedPayments.filter(pid => pid !== id)
      : [...selectedPayments, id]
    onSelectionChange(newSelected)
  }

  const handleStatusUpdate = async (paymentId: string, status: keyof typeof PaymentStatus) => {
    setIsUpdating(prev => new Set(prev).add(paymentId))
    try {
      await onMarkAsPaid(paymentId)
    } finally {
      setIsUpdating(prev => {
        const newSet = new Set(prev)
        newSet.delete(paymentId)
        return newSet
      })
    }
  }

  
  const isOverdue = (payment: Payment) => {
    return new Date(payment.dueDate) < new Date() && payment.status !== PaymentStatus.PAID
  }

  const getDaysUntilDue = (dueDate: Date) => {
    return Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  }

  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
        <p className="text-gray-500">No payments match your current filters.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      {/* Bulk Actions Bar */}
      {selectedPayments.length > 0 && (
        <div className="bg-indigo-50 border-b border-indigo-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-indigo-700">
              {selectedPayments.length} payment{selectedPayments.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => onBulkAction('markPaid')}
                className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
              >
                Mark as Paid
              </button>
              <button
                onClick={() => onBulkAction('sendReminders')}
                className="px-3 py-1 text-sm font-medium text-indigo-700 bg-indigo-100 rounded hover:bg-indigo-200"
              >
                Send Reminders
              </button>
              <button
                onClick={() => onSelectionChange([])}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={payments.length > 0 && selectedPayments.length === payments.length}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tenant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Method
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.map((payment) => {
              const { tenant } = payment
              const overdue = isOverdue(payment)
              const daysUntilDue = getDaysUntilDue(payment.dueDate)
              
              return (
                <tr 
                  key={payment.id} 
                  className={`hover:bg-gray-50 ${overdue ? 'bg-red-50' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedPayments.includes(payment.id)}
                      onChange={() => handleSelectOne(payment.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-xs font-medium text-gray-600">
                          {tenant.firstName[0]}{tenant.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {tenant.firstName} {tenant.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          Room {tenant.roomNumber || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amountCents, payment.currency)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {payment.description}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${overdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                      {formatDate(payment.dueDate)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {daysUntilDue > 0 ? `${daysUntilDue} days` : `${Math.abs(daysUntilDue)} days overdue`}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.paymentMethod}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => console.log('View details for', payment.id)} // Replace with modal logic
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </button>
                    
                    {payment.status !== PaymentStatus.PAID && (
                      <button
                        onClick={() => handleStatusUpdate(payment.id, 'PAID')}
                        disabled={isUpdating.has(payment.id)}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                      >
                        {isUpdating.has(payment.id) ? 'Updating...' : 'Mark Paid'}
                      </button>
                    )}
                    
                                        {(payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.OVERDUE) && (
                      <>
                        <button
                          onClick={() => onSendReminder(payment.id)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Remind
                        </button>
                        <button
                          onClick={() => onToggleReminders(payment.id, !payment.remindersPaused)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {payment.remindersPaused ? 'Resume' : 'Pause'} Reminders
                        </button>
                      </>
                    )}

                                          )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
