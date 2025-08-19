'use client'

import { useState } from 'react'
import { TaskFiltersExtended, TaskStatus, TaskPriority, TaskCategory, TaskSortField } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  FunnelIcon, 
  XMarkIcon, 
  CalendarIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface TaskFiltersProps {
  filters: TaskFiltersExtended
  sortBy: TaskSortField
  sortOrder: 'asc' | 'desc'
  onFiltersChange: (filters: TaskFiltersExtended) => void
  onSortChange: (sortBy: TaskSortField, sortOrder: 'asc' | 'desc') => void
  onClearFilters: () => void
  availableAssignees?: { id: string; name: string }[]
}

export function TaskFilters({
  filters,
  sortBy,
  sortOrder,
  onFiltersChange,
  onSortChange,
  onClearFilters,
  availableAssignees = []
}: TaskFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dateRangeOpen, setDateRangeOpen] = useState(false)

  const hasActiveFilters = Object.values(filters).some(value => {
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0
    return value !== undefined && value !== null
  })

  const updateFilter = <K extends keyof TaskFiltersExtended>(
    key: K,
    value: TaskFiltersExtended[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleArrayFilter = <T extends string | TaskStatus | TaskCategory | TaskPriority>(
    key: keyof TaskFiltersExtended,
    value: T,
    currentArray: T[] = []
  ) => {
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value]
    updateFilter(key, newArray.length > 0 ? newArray as any : undefined)
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.status?.length) count++
    if (filters.priority?.length) count++
    if (filters.category?.length) count++
    if (filters.assignee?.length) count++
    if (filters.dateRange) count++
    return count
  }

  return (
    <div className="flex items-center gap-2 p-4 bg-white border-b border-gray-200">
      {/* Quick Sort */}
      <Select
        value={`${sortBy}-${sortOrder}`}
        onValueChange={(value) => {
          const [field, order] = value.split('-') as [TaskSortField, 'asc' | 'desc']
          onSortChange(field, order)
        }}
      >
        <SelectTrigger className="w-48">
          <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Sort by..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={`${TaskSortField.DUE_DATE}-asc`}>Due Date (Earliest)</SelectItem>
          <SelectItem value={`${TaskSortField.DUE_DATE}-desc`}>Due Date (Latest)</SelectItem>
          <SelectItem value={`${TaskSortField.PRIORITY}-desc`}>Priority (High to Low)</SelectItem>
          <SelectItem value={`${TaskSortField.PRIORITY}-asc`}>Priority (Low to High)</SelectItem>
          <SelectItem value={`${TaskSortField.CREATED_DATE}-desc`}>Created (Newest)</SelectItem>
          <SelectItem value={`${TaskSortField.CREATED_DATE}-asc`}>Created (Oldest)</SelectItem>
          <SelectItem value={`${TaskSortField.TITLE}-asc`}>Title (A-Z)</SelectItem>
          <SelectItem value={`${TaskSortField.TITLE}-desc`}>Title (Z-A)</SelectItem>
        </SelectContent>
      </Select>

      {/* Quick Filters */}
      <div className="flex items-center gap-2">
        <Button
          variant={filters.status?.includes(TaskStatus.OVERDUE) ? "default" : "outline"}
          size="sm"
          onClick={() => toggleArrayFilter('status', TaskStatus.OVERDUE, filters.status)}
        >
          Overdue
        </Button>
        <Button
          variant={filters.priority?.includes(TaskPriority.CRITICAL) ? "default" : "outline"}
          size="sm"
          onClick={() => toggleArrayFilter('priority', TaskPriority.CRITICAL, filters.priority)}
        >
          Critical
        </Button>
        <Button
          variant={filters.status?.includes(TaskStatus.IN_PROGRESS) ? "default" : "outline"}
          size="sm"
          onClick={() => toggleArrayFilter('status', TaskStatus.IN_PROGRESS, filters.status)}
        >
          In Progress
        </Button>
      </div>

      {/* Advanced Filters */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <Badge className="ml-2 h-5 w-5 p-0 text-xs bg-blue-600">
                {getActiveFilterCount()}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-4" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Advanced Filters</h3>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFilters}
                  className="text-red-600 hover:text-red-700"
                >
                  Clear All
                </Button>
              )}
            </div>

            {/* Status Filter */}
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.values(TaskStatus).map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={filters.status?.includes(status) || false}
                      onCheckedChange={() => toggleArrayFilter('status', status, filters.status)}
                    />
                    <Label htmlFor={`status-${status}`} className="text-sm">
                      {status}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <Label className="text-sm font-medium">Priority</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.values(TaskPriority).map((priority) => (
                  <div key={priority} className="flex items-center space-x-2">
                    <Checkbox
                      id={`priority-${priority}`}
                      checked={filters.priority?.includes(priority) || false}
                      onCheckedChange={() => toggleArrayFilter('priority', priority, filters.priority)}
                    />
                    <Label htmlFor={`priority-${priority}`} className="text-sm">
                      {priority}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <Label className="text-sm font-medium">Category</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.values(TaskCategory).map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={filters.category?.includes(category) || false}
                      onCheckedChange={() => toggleArrayFilter('category', category, filters.category)}
                    />
                    <Label htmlFor={`category-${category}`} className="text-sm">
                      {category}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Assignee Filter */}
            {availableAssignees.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Assignee</Label>
                <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                  {availableAssignees.map((assignee) => (
                    <div key={assignee.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`assignee-${assignee.id}`}
                        checked={filters.assignee?.includes(assignee.id) || false}
                        onCheckedChange={() => toggleArrayFilter('assignee', assignee.id, filters.assignee)}
                      />
                      <Label htmlFor={`assignee-${assignee.id}`} className="text-sm">
                        {assignee.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Date Range Filter */}
            <div>
              <Label className="text-sm font-medium">Due Date Range</Label>
              <div className="flex items-center gap-2 mt-2">
                <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange ? (
                        `${format(filters.dateRange.start, 'MMM d')} - ${format(filters.dateRange.end, 'MMM d')}`
                      ) : (
                        'Select date range'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{
                        from: filters.dateRange?.start,
                        to: filters.dateRange?.end
                      }}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          updateFilter('dateRange', { start: range.from, end: range.to })
                        } else {
                          updateFilter('dateRange', undefined)
                        }
                        setDateRangeOpen(false)
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
                {filters.dateRange && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateFilter('dateRange', undefined)}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1 ml-2">
          {filters.status?.map((status) => (
            <Badge key={`status-${status}`} variant="secondary" className="text-xs">
              Status: {status}
              <button
                onClick={() => toggleArrayFilter('status', status, filters.status)}
                className="ml-1 hover:text-red-600"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.priority?.map((priority) => (
            <Badge key={`priority-${priority}`} variant="secondary" className="text-xs">
              Priority: {priority}
              <button
                onClick={() => toggleArrayFilter('priority', priority, filters.priority)}
                className="ml-1 hover:text-red-600"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.category?.map((category) => (
            <Badge key={`category-${category}`} variant="secondary" className="text-xs">
              Category: {category}
              <button
                onClick={() => toggleArrayFilter('category', category, filters.category)}
                className="ml-1 hover:text-red-600"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.dateRange && (
            <Badge variant="secondary" className="text-xs">
              Due: {format(filters.dateRange.start, 'MMM d')} - {format(filters.dateRange.end, 'MMM d')}
              <button
                onClick={() => updateFilter('dateRange', undefined)}
                className="ml-1 hover:text-red-600"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
