'use client'

import { useState, useEffect } from 'react'
import { Task, TaskCategory, TaskPriority, CreateTaskForm, RecurrencePattern } from '@/types'
import { Calendar, Clock, Users, Repeat } from 'lucide-react'

interface TaskFormProps {
  task?: Task
  onSubmit: (data: CreateTaskForm) => void
  onCancel: () => void
  isLoading?: boolean
  availableUsers?: Array<{ id: string; name: string; email: string }>
}

export function TaskForm({ 
  task, 
  onSubmit, 
  onCancel, 
  isLoading = false,
  availableUsers = []
}: TaskFormProps) {
  const [formData, setFormData] = useState<CreateTaskForm>({
    title: task?.title || '',
    description: task?.description || '',
    instructions: task?.instructions || '',
    category: task?.category || TaskCategory.OTHER,
    priority: task?.priority || TaskPriority.MEDIUM,
    assignedTo: task?.assignedTo || [],
    dueDate: task?.dueDate ? task.dueDate.toISOString().split('T')[0] : '',
    estimatedDuration: task?.estimatedDuration || undefined,
    recurrence: task?.recurrence || undefined
  })

  const [showRecurrence, setShowRecurrence] = useState(!!task?.recurrence)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (formData.assignedTo.length === 0) {
      newErrors.assignedTo = 'At least one person must be assigned'
    }

    if (formData.estimatedDuration && formData.estimatedDuration <= 0) {
      newErrors.estimatedDuration = 'Duration must be positive'
    }

    if (showRecurrence && formData.recurrence) {
      if (formData.recurrence.interval <= 0) {
        newErrors.recurrenceInterval = 'Interval must be positive'
      }
      
      if (formData.recurrence.type === 'custom' && (!formData.recurrence.daysOfWeek || formData.recurrence.daysOfWeek.length === 0)) {
        newErrors.recurrenceDays = 'Select at least one day for custom recurrence'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const submitData: CreateTaskForm = {
      ...formData,
      recurrence: showRecurrence ? formData.recurrence : undefined
    }

    onSubmit(submitData)
  }

  const handleRecurrenceChange = (field: keyof RecurrencePattern, value: any) => {
    setFormData(prev => ({
      ...prev,
      recurrence: {
        ...prev.recurrence,
        [field]: value
      } as RecurrencePattern
    }))
  }

  const toggleDayOfWeek = (day: number) => {
    const currentDays = formData.recurrence?.daysOfWeek || []
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort()
    
    handleRecurrenceChange('daysOfWeek', newDays)
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Task Title *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.title ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter task title"
          />
          {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.description ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Describe what needs to be done"
          />
          {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
        </div>

        <div>
          <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">
            Instructions (Optional)
          </label>
          <textarea
            id="instructions"
            rows={2}
            value={formData.instructions}
            onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Step-by-step instructions"
          />
        </div>
      </div>

      {/* Category and Priority */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as TaskCategory }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.values(TaskCategory).map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            id="priority"
            value={formData.priority}
            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.values(TaskPriority).map(priority => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <Users className="w-4 h-4 inline mr-1" />
          Assign To *
        </label>
        <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
          {availableUsers.map(user => (
            <label key={user.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.assignedTo.includes(user.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData(prev => ({ ...prev, assignedTo: [...prev.assignedTo, user.id] }))
                  } else {
                    setFormData(prev => ({ ...prev, assignedTo: prev.assignedTo.filter(id => id !== user.id) }))
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{user.name} ({user.email})</span>
            </label>
          ))}
        </div>
        {errors.assignedTo && <p className="text-red-600 text-sm mt-1">{errors.assignedTo}</p>}
      </div>

      {/* Due Date and Duration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            Due Date
          </label>
          <input
            type="date"
            id="dueDate"
            value={formData.dueDate}
            onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="estimatedDuration" className="block text-sm font-medium text-gray-700 mb-1">
            <Clock className="w-4 h-4 inline mr-1" />
            Estimated Duration (minutes)
          </label>
          <input
            type="number"
            id="estimatedDuration"
            min="1"
            value={formData.estimatedDuration || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: e.target.value ? parseInt(e.target.value) : undefined }))}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.estimatedDuration ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="30"
          />
          {errors.estimatedDuration && <p className="text-red-600 text-sm mt-1">{errors.estimatedDuration}</p>}
        </div>
      </div>

      {/* Recurrence */}
      <div>
        <div className="flex items-center space-x-2 mb-3">
          <input
            type="checkbox"
            id="showRecurrence"
            checked={showRecurrence}
            onChange={(e) => setShowRecurrence(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="showRecurrence" className="text-sm font-medium text-gray-700">
            <Repeat className="w-4 h-4 inline mr-1" />
            Make this a recurring task
          </label>
        </div>

        {showRecurrence && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recurrence Type
                </label>
                <select
                  value={formData.recurrence?.type || 'weekly'}
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
                <input
                  type="number"
                  min="1"
                  value={formData.recurrence?.interval || 1}
                  onChange={(e) => handleRecurrenceChange('interval', parseInt(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.recurrenceInterval ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.recurrenceInterval && <p className="text-red-600 text-sm mt-1">{errors.recurrenceInterval}</p>}
              </div>
            </div>

            {formData.recurrence?.type === 'custom' && (
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
                      className={`px-3 py-1 text-sm rounded-md border ${
                        formData.recurrence?.daysOfWeek?.includes(index)
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                {errors.recurrenceDays && <p className="text-red-600 text-sm mt-1">{errors.recurrenceDays}</p>}
              </div>
            )}

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.recurrence?.assignmentRotation || false}
                  onChange={(e) => handleRecurrenceChange('assignmentRotation', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Rotate assignments between team members</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  )
}
