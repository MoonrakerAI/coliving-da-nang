'use client'

import { RecurrencePattern } from '@/types'
import { Repeat } from 'lucide-react'

interface RecurrenceSelectorProps {
  recurrence?: RecurrencePattern
  onChange: (recurrence: RecurrencePattern | undefined) => void
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
}

export function RecurrenceSelector({ 
  recurrence, 
  onChange, 
  enabled, 
  onEnabledChange 
}: RecurrenceSelectorProps) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const handleRecurrenceChange = (field: keyof RecurrencePattern, value: any) => {
    const newRecurrence: RecurrencePattern = {
      type: 'weekly',
      interval: 1,
      assignmentRotation: false,
      ...recurrence,
      [field]: value
    }
    onChange(newRecurrence)
  }

  const toggleDayOfWeek = (day: number) => {
    const currentDays = recurrence?.daysOfWeek || []
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort()
    
    handleRecurrenceChange('daysOfWeek', newDays)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="enableRecurrence"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="enableRecurrence" className="text-sm font-medium text-gray-700">
          <Repeat className="w-4 h-4 inline mr-1" />
          Make this a recurring task
        </label>
      </div>

      {enabled && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-md border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recurrence Type
              </label>
              <select
                value={recurrence?.type || 'weekly'}
                onChange={(e) => handleRecurrenceChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Every
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  value={recurrence?.interval || 1}
                  onChange={(e) => handleRecurrenceChange('interval', parseInt(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">
                  {recurrence?.type === 'daily' && 'day(s)'}
                  {recurrence?.type === 'weekly' && 'week(s)'}
                  {recurrence?.type === 'monthly' && 'month(s)'}
                  {recurrence?.type === 'custom' && 'occurrence(s)'}
                </span>
              </div>
            </div>
          </div>

          {recurrence?.type === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Days of Week
              </label>
              <div className="flex flex-wrap gap-2">
                {dayNames.map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleDayOfWeek(index)}
                    className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                      recurrence?.daysOfWeek?.includes(index)
                        ? 'bg-blue-100 border-blue-300 text-blue-800'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {recurrence?.type === 'custom' && (!recurrence?.daysOfWeek || recurrence.daysOfWeek.length === 0) && (
                <p className="text-red-600 text-sm mt-1">Select at least one day</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date (Optional)
            </label>
            <input
              type="date"
              value={recurrence?.endDate ? new Date(recurrence.endDate).toISOString().split('T')[0] : ''}
              onChange={(e) => handleRecurrenceChange('endDate', e.target.value ? new Date(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={recurrence?.assignmentRotation || false}
                onChange={(e) => handleRecurrenceChange('assignmentRotation', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Rotate assignments between team members for fair distribution
              </span>
            </label>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <strong>Preview:</strong> This task will repeat{' '}
              {recurrence?.type === 'daily' && `every ${recurrence.interval} day(s)`}
              {recurrence?.type === 'weekly' && `every ${recurrence.interval} week(s)`}
              {recurrence?.type === 'monthly' && `every ${recurrence.interval} month(s)`}
              {recurrence?.type === 'custom' && recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0 && 
                `on ${recurrence.daysOfWeek.map(d => dayNames[d]).join(', ')}`}
              {recurrence?.endDate && ` until ${new Date(recurrence.endDate).toLocaleDateString()}`}
              {recurrence?.assignmentRotation && ' with rotating assignments'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
