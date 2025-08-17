'use client'

import { useState, useMemo } from 'react'
import { Task, TaskSortField, TaskStatus, TaskPriority, TaskCategory } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  ChevronUpIcon, 
  ChevronDownIcon, 
  CalendarIcon,
  UserIcon,
  FlagIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import { format, isAfter, isBefore, isToday } from 'date-fns'

interface TaskListProps {
  tasks: Task[]
  sortBy: TaskSortField
  sortOrder: 'asc' | 'desc'
  selectedTasks: string[]
  onSort: (field: TaskSortField) => void
  onSelectTask: (taskId: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onTaskClick: (task: Task) => void
}

const priorityColors = {
  [TaskPriority.LOW]: 'bg-gray-100 text-gray-800',
  [TaskPriority.MEDIUM]: 'bg-blue-100 text-blue-800',
  [TaskPriority.HIGH]: 'bg-orange-100 text-orange-800',
  [TaskPriority.CRITICAL]: 'bg-red-100 text-red-800'
}

const statusColors = {
  [TaskStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [TaskStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [TaskStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [TaskStatus.OVERDUE]: 'bg-red-100 text-red-800',
  [TaskStatus.CANCELLED]: 'bg-gray-100 text-gray-800'
}

const categoryColors = {
  [TaskCategory.CLEANING]: 'bg-purple-100 text-purple-800',
  [TaskCategory.MAINTENANCE]: 'bg-orange-100 text-orange-800',
  [TaskCategory.ADMINISTRATIVE]: 'bg-blue-100 text-blue-800',
  [TaskCategory.INSPECTION]: 'bg-green-100 text-green-800',
  [TaskCategory.EMERGENCY]: 'bg-red-100 text-red-800',
  [TaskCategory.OTHER]: 'bg-gray-100 text-gray-800'
}

export function TaskList({
  tasks,
  sortBy,
  sortOrder,
  selectedTasks,
  onSort,
  onSelectTask,
  onSelectAll,
  onTaskClick
}: TaskListProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const allSelected = tasks.length > 0 && selectedTasks.length === tasks.length
  const someSelected = selectedTasks.length > 0 && selectedTasks.length < tasks.length

  const toggleRowExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedRows(newExpanded)
  }

  const getDueDateStatus = (dueDate?: Date) => {
    if (!dueDate) return null
    
    if (isToday(dueDate)) return 'today'
    if (isBefore(dueDate, new Date())) return 'overdue'
    if (isBefore(dueDate, new Date(Date.now() + 24 * 60 * 60 * 1000))) return 'tomorrow'
    return 'future'
  }

  const getDueDateColor = (status: string | null) => {
    switch (status) {
      case 'overdue': return 'text-red-600 font-semibold'
      case 'today': return 'text-orange-600 font-semibold'
      case 'tomorrow': return 'text-yellow-600 font-medium'
      default: return 'text-gray-600'
    }
  }

  const SortButton = ({ field, children }: { field: TaskSortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort(field)}
      className="h-auto p-1 font-medium text-left justify-start"
    >
      {children}
      {sortBy === field && (
        sortOrder === 'asc' ? 
          <ChevronUpIcon className="ml-1 h-4 w-4" /> : 
          <ChevronDownIcon className="ml-1 h-4 w-4" />
      )}
    </Button>
  )

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="grid grid-cols-12 gap-4 items-center text-sm font-medium text-gray-700">
          <div className="col-span-1">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onCheckedChange={(checked) => onSelectAll(!!checked)}
            />
          </div>
          <div className="col-span-4">
            <SortButton field={TaskSortField.TITLE}>Task</SortButton>
          </div>
          <div className="col-span-2">
            <SortButton field={TaskSortField.ASSIGNEE}>
              <UserIcon className="h-4 w-4 mr-1" />
              Assignee
            </SortButton>
          </div>
          <div className="col-span-1">
            <SortButton field={TaskSortField.PRIORITY}>
              <FlagIcon className="h-4 w-4 mr-1" />
              Priority
            </SortButton>
          </div>
          <div className="col-span-1">
            <SortButton field={TaskSortField.CATEGORY}>
              <TagIcon className="h-4 w-4 mr-1" />
              Category
            </SortButton>
          </div>
          <div className="col-span-2">
            <SortButton field={TaskSortField.DUE_DATE}>
              <CalendarIcon className="h-4 w-4 mr-1" />
              Due Date
            </SortButton>
          </div>
          <div className="col-span-1">
            <SortButton field={TaskSortField.STATUS}>Status</SortButton>
          </div>
        </div>
      </div>

      {/* Task Rows */}
      <div className="divide-y divide-gray-200">
        {tasks.map((task) => {
          const isSelected = selectedTasks.includes(task.id)
          const isExpanded = expandedRows.has(task.id)
          const dueDateStatus = getDueDateStatus(task.dueDate)

          return (
            <div key={task.id} className={`${isSelected ? 'bg-blue-50' : 'bg-white'} hover:bg-gray-50`}>
              {/* Main Row */}
              <div className="px-4 py-3">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-1">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => onSelectTask(task.id, !!checked)}
                    />
                  </div>
                  
                  <div className="col-span-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRowExpansion(task.id)}
                        className="h-6 w-6 p-0"
                        data-testid={`expand-task-${task.id}`}
                      >
                        {isExpanded ? 
                          <ChevronDownIcon className="h-4 w-4" /> : 
                          <ChevronUpIcon className="h-4 w-4" />
                        }
                      </Button>
                      <div>
                        <button
                          onClick={() => onTaskClick(task)}
                          className="text-left hover:text-blue-600 transition-colors"
                        >
                          <div className="font-medium text-gray-900">{task.title}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {task.description}
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="flex flex-wrap gap-1">
                      {task.assignedTo.slice(0, 2).map((userId, index) => (
                        <Badge key={userId} variant="outline" className="text-xs">
                          User {index + 1}
                        </Badge>
                      ))}
                      {task.assignedTo.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{task.assignedTo.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="col-span-1">
                    <Badge className={priorityColors[task.priority]}>
                      {task.priority}
                    </Badge>
                  </div>

                  <div className="col-span-1">
                    <Badge className={categoryColors[task.category]}>
                      {task.category}
                    </Badge>
                  </div>

                  <div className="col-span-2">
                    {task.dueDate ? (
                      <div className={`text-sm ${getDueDateColor(dueDateStatus)}`}>
                        {format(task.dueDate, 'MMM d, yyyy')}
                        {dueDateStatus === 'today' && <span className="ml-1">(Today)</span>}
                        {dueDateStatus === 'overdue' && <span className="ml-1">(Overdue)</span>}
                        {dueDateStatus === 'tomorrow' && <span className="ml-1">(Tomorrow)</span>}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No due date</span>
                    )}
                  </div>

                  <div className="col-span-1">
                    <Badge className={statusColors[task.status]}>
                      {task.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-3 border-t border-gray-100 bg-gray-50">
                  <div className="grid grid-cols-2 gap-6 mt-3 text-sm">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Details</h4>
                      {task.instructions && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-700">Instructions:</span>
                          <p className="text-gray-600 mt-1">{task.instructions}</p>
                        </div>
                      )}
                      {task.estimatedDuration && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-700">Estimated Duration:</span>
                          <span className="text-gray-600 ml-2">{task.estimatedDuration} minutes</span>
                        </div>
                      )}
                      <div className="mb-2">
                        <span className="font-medium text-gray-700">Created:</span>
                        <span className="text-gray-600 ml-2">
                          {format(task.createdAt, 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Progress</h4>
                      {task.completedAt && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-700">Completed:</span>
                          <span className="text-gray-600 ml-2">
                            {format(task.completedAt, 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                      )}
                      {task.completionNotes && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-700">Notes:</span>
                          <p className="text-gray-600 mt-1">{task.completionNotes}</p>
                        </div>
                      )}
                      {task.qualityRating && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-700">Quality Rating:</span>
                          <span className="text-gray-600 ml-2">{task.qualityRating}/5</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {tasks.length === 0 && (
        <div className="px-4 py-8 text-center text-gray-500">
          No tasks found matching your criteria.
        </div>
      )}
    </div>
  )
}
