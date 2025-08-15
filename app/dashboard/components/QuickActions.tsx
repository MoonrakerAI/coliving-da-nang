'use client'

import { useState } from 'react'

interface QuickActionsProps {
  onExportPayments: (format: 'csv' | 'excel') => void
  onGenerateReport: () => void
  onBulkReminders: () => void
  selectedCount: number
  totalPayments: number
}

export function QuickActions({ 
  onExportPayments, 
  onGenerateReport, 
  onBulkReminders,
  selectedCount,
  totalPayments 
}: QuickActionsProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [isSendingReminders, setIsSendingReminders] = useState(false)

  const handleExport = async (format: 'csv' | 'excel') => {
    setIsExporting(true)
    try {
      await onExportPayments(format)
    } finally {
      setIsExporting(false)
    }
  }

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true)
    try {
      await onGenerateReport()
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const handleBulkReminders = async () => {
    setIsSendingReminders(true)
    try {
      await onBulkReminders()
    } finally {
      setIsSendingReminders(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Export Actions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Export Data</h4>
          <div className="space-y-2">
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting || totalPayments === 0}
              className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              onClick={() => handleExport('excel')}
              disabled={isExporting || totalPayments === 0}
              className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? 'Exporting...' : 'Export Excel'}
            </button>
          </div>
        </div>

        {/* Report Actions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Reports</h4>
          <div className="space-y-2">
            <button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport || totalPayments === 0}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingReport ? 'Generating...' : 'Payment Summary'}
            </button>
            <button
              onClick={() => window.print()}
              className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Print View
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Bulk Actions</h4>
          <div className="space-y-2">
            <button
              onClick={handleBulkReminders}
              disabled={isSendingReminders || totalPayments === 0}
              className="w-full px-3 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 border border-yellow-300 rounded-md hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSendingReminders ? 'Sending...' : 'Send All Reminders'}
            </button>
            <div className="text-xs text-gray-500">
              {totalPayments} total payments
            </div>
          </div>
        </div>

        {/* Selection Info */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Selection</h4>
          <div className="p-3 bg-gray-50 rounded-md">
            <div className="text-sm text-gray-900">
              {selectedCount} of {totalPayments} selected
            </div>
            {selectedCount > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Use table actions for selected items
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">0</div>
            <div className="text-xs text-gray-500">Paid Today</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">0</div>
            <div className="text-xs text-gray-500">Due This Week</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">0</div>
            <div className="text-xs text-gray-500">Overdue</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-indigo-600">$0</div>
            <div className="text-xs text-gray-500">Monthly Total</div>
          </div>
        </div>
      </div>
    </div>
  )
}
