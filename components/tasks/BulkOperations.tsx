'use client'

import { useState } from 'react'
import { TaskPriority, TaskCategory, TaskStatus, BulkTaskOperation } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  UserIcon,
  FlagIcon,
  TagIcon,
  CalendarIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface BulkOperationsProps {
  selectedTaskIds: string[]
  onBulkOperation: (operation: BulkTaskOperation) => Promise<void>
  onCancel: () => void
  availableAssignees?: { id: string; name: string }[]
}

export function BulkOperations({
  selectedTaskIds,
  onBulkOperation,
  onCancel,
  availableAssignees = []
}: BulkOperationsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const handleBulkAssign = async () => {
    if (selectedAssignees.length === 0) return
    
    setIsLoading(true)
    try {
      await onBulkOperation({
        taskIds: selectedTaskIds,
        operation: 'assign',
        value: selectedAssignees
      })
      onCancel()
    } catch (error) {
      console.error('Bulk assign failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkPriority = async (priority: TaskPriority) => {
    setIsLoading(true)
    try {
      await onBulkOperation({
        taskIds: selectedTaskIds,
        operation: 'priority',
        value: priority
      })
      onCancel()
    } catch (error) {
      console.error('Bulk priority change failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkCategory = async (category: TaskCategory) => {
    setIsLoading(true)
    try {
      await onBulkOperation({
        taskIds: selectedTaskIds,
        operation: 'category',
        value: category
      })
      onCancel()
    } catch (error) {
      console.error('Bulk category change failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkDeadline = async () => {
    if (!selectedDate) return
    
    setIsLoading(true)
    try {
      await onBulkOperation({
        taskIds: selectedTaskIds,
        operation: 'deadline',
        value: selectedDate
      })
      onCancel()
    } catch (error) {
      console.error('Bulk deadline change failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkComplete = async () => {
    setIsLoading(true)
    try {
      await onBulkOperation({
        taskIds: selectedTaskIds,
        operation: 'complete',
        value: true
      })
      onCancel()
    } catch (error) {
      console.error('Bulk complete failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkCancel = async () => {
    setIsLoading(true)
    try {
      await onBulkOperation({
        taskIds: selectedTaskIds,
        operation: 'cancel',
        value: true
      })
      onCancel()
    } catch (error) {
      console.error('Bulk cancel failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleAssignee = (assigneeId: string) => {
    setSelectedAssignees(prev => 
      prev.includes(assigneeId)
        ? prev.filter(id => id !== assigneeId)
        : [...prev, assigneeId]
    )
  }

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white shadow-lg border rounded-lg p-4 max-w-4xl w-full mx-4 z-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {selectedTaskIds.length} task{selectedTaskIds.length > 1 ? 's' : ''} selected
          </Badge>
          <span className="text-sm text-gray-600">Bulk Operations</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
        >
          <XMarkIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Assign Users */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center">
            <UserIcon className="h-4 w-4 mr-1" />
            Assign to Users
          </Label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {availableAssignees.map((assignee) => (
              <div key={assignee.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`assignee-${assignee.id}`}
                  checked={selectedAssignees.includes(assignee.id)}
                  onChange={() => toggleAssignee(assignee.id)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor={`assignee-${assignee.id}`} className="text-sm">
                  {assignee.name}
                </Label>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            onClick={handleBulkAssign}
            disabled={selectedAssignees.length === 0 || isLoading}
            className="w-full"
          >
            Assign Selected
          </Button>
        </div>

        {/* Change Priority */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center">
            <FlagIcon className="h-4 w-4 mr-1" />
            Change Priority
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(TaskPriority).map((priority) => (
              <Button
                key={priority}
                variant="outline"
                size="sm"
                onClick={() => handleBulkPriority(priority)}
                disabled={isLoading}
                className={`text-xs ${
                  priority === TaskPriority.CRITICAL ? 'border-red-300 text-red-700' :
                  priority === TaskPriority.HIGH ? 'border-orange-300 text-orange-700' :
                  priority === TaskPriority.MEDIUM ? 'border-blue-300 text-blue-700' :
                  'border-gray-300 text-gray-700'
                }`}
              >
                {priority}
              </Button>
            ))}
          </div>
        </div>

        {/* Change Category */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center">
            <TagIcon className="h-4 w-4 mr-1" />
            Change Category
          </Label>
          <Select onValueChange={(value) => handleBulkCategory(value as TaskCategory)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TaskCategory).map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Set Deadline */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center">
            <CalendarIcon className="h-4 w-4 mr-1" />
            Set Deadline
          </Label>
          <div className="flex gap-2">
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Pick date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date)
                    setDatePickerOpen(false)
                  }}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button
            size="sm"
            onClick={handleBulkDeadline}
            disabled={!selectedDate || isLoading}
            className="w-full"
          >
            Set Deadline
          </Button>
        </div>

        {/* Status Actions */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center">
            <CheckCircleIcon className="h-4 w-4 mr-1" />
            Status Actions
          </Label>
          <div className="space-y-2">
            <Button
              size="sm"
              onClick={handleBulkComplete}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Mark Complete
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkCancel}
              disabled={isLoading}
              className="w-full border-red-300 text-red-700 hover:bg-red-50"
            >
              Cancel Tasks
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Quick Actions</Label>
          <div className="space-y-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkPriority(TaskPriority.HIGH)}
              disabled={isLoading}
              className="w-full"
            >
              Set High Priority
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                setSelectedDate(tomorrow)
                handleBulkDeadline()
              }}
              disabled={isLoading}
              className="w-full"
            >
              Due Tomorrow
            </Button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Processing...</span>
          </div>
        </div>
      )}
    </div>
  )
}
