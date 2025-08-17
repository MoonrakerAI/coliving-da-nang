'use client'

import { useState, useCallback } from 'react'
import { Task, TaskStatus, TaskPriority, TaskCategory, KanbanColumn } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  CalendarIcon,
  UserIcon,
  FlagIcon,
  TagIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { format, isAfter, isBefore, isToday } from 'date-fns'

interface KanbanBoardProps {
  tasks: Task[]
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void
  onTaskClick: (task: Task) => void
  wipLimits?: Record<TaskStatus, number>
}

const defaultColumns: KanbanColumn[] = [
  {
    id: 'pending',
    title: 'To Do',
    status: TaskStatus.PENDING,
    tasks: []
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    status: TaskStatus.IN_PROGRESS,
    wipLimit: 5,
    tasks: []
  },
  {
    id: 'completed',
    title: 'Done',
    status: TaskStatus.COMPLETED,
    tasks: []
  }
]

const priorityColors = {
  [TaskPriority.LOW]: 'border-l-gray-400',
  [TaskPriority.MEDIUM]: 'border-l-blue-500',
  [TaskPriority.HIGH]: 'border-l-orange-500',
  [TaskPriority.CRITICAL]: 'border-l-red-500'
}

const priorityBadgeColors = {
  [TaskPriority.LOW]: 'bg-gray-100 text-gray-800',
  [TaskPriority.MEDIUM]: 'bg-blue-100 text-blue-800',
  [TaskPriority.HIGH]: 'bg-orange-100 text-orange-800',
  [TaskPriority.CRITICAL]: 'bg-red-100 text-red-800'
}

const categoryColors = {
  [TaskCategory.CLEANING]: 'bg-purple-100 text-purple-800',
  [TaskCategory.MAINTENANCE]: 'bg-orange-100 text-orange-800',
  [TaskCategory.ADMINISTRATIVE]: 'bg-blue-100 text-blue-800',
  [TaskCategory.INSPECTION]: 'bg-green-100 text-green-800',
  [TaskCategory.EMERGENCY]: 'bg-red-100 text-red-800',
  [TaskCategory.OTHER]: 'bg-gray-100 text-gray-800'
}

export function KanbanBoard({ tasks, onTaskMove, onTaskClick, wipLimits }: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  // Group tasks by status
  const tasksByStatus = tasks.reduce((acc, task) => {
    if (!acc[task.status]) acc[task.status] = []
    acc[task.status].push(task)
    return acc
  }, {} as Record<TaskStatus, Task[]>)

  // Create columns with tasks
  const columns = defaultColumns.map(column => ({
    ...column,
    tasks: tasksByStatus[column.status] || [],
    wipLimit: wipLimits?.[column.status] || column.wipLimit
  }))

  const handleDragStart = useCallback((e: React.DragEvent, task: Task) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', task.id)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnId)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault()
    setDragOverColumn(null)
    
    if (draggedTask && draggedTask.status !== targetStatus) {
      onTaskMove(draggedTask.id, targetStatus)
    }
    setDraggedTask(null)
  }, [draggedTask, onTaskMove])

  const getDueDateStatus = (dueDate?: Date) => {
    if (!dueDate) return null
    
    if (isToday(dueDate)) return 'today'
    if (isBefore(dueDate, new Date())) return 'overdue'
    if (isBefore(dueDate, new Date(Date.now() + 24 * 60 * 60 * 1000))) return 'tomorrow'
    return 'future'
  }

  const TaskCard = ({ task }: { task: Task }) => {
    const dueDateStatus = getDueDateStatus(task.dueDate)
    const isOverdue = dueDateStatus === 'overdue'
    const isDueToday = dueDateStatus === 'today'

    return (
      <Card
        className={`mb-3 cursor-pointer hover:shadow-md transition-shadow border-l-4 ${priorityColors[task.priority]} ${
          draggedTask?.id === task.id ? 'opacity-50' : ''
        }`}
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        onClick={() => onTaskClick(task)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-sm leading-tight">{task.title}</h4>
            <Badge className={`ml-2 ${priorityBadgeColors[task.priority]}`} size="sm">
              {task.priority}
            </Badge>
          </div>
          {task.description && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{task.description}</p>
          )}
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-2">
            {/* Category */}
            <Badge className={categoryColors[task.category]} size="sm">
              <TagIcon className="h-3 w-3 mr-1" />
              {task.category}
            </Badge>

            {/* Due Date */}
            {task.dueDate && (
              <div className={`flex items-center text-xs ${
                isOverdue ? 'text-red-600 font-semibold' : 
                isDueToday ? 'text-orange-600 font-medium' : 
                'text-gray-600'
              }`}>
                <CalendarIcon className="h-3 w-3 mr-1" />
                {format(task.dueDate, 'MMM d')}
                {isOverdue && <ExclamationTriangleIcon className="h-3 w-3 ml-1 text-red-500" />}
                {isDueToday && <span className="ml-1">(Today)</span>}
              </div>
            )}

            {/* Estimated Duration */}
            {task.estimatedDuration && (
              <div className="flex items-center text-xs text-gray-600">
                <ClockIcon className="h-3 w-3 mr-1" />
                {task.estimatedDuration}m
              </div>
            )}

            {/* Assignees */}
            {task.assignedTo.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center text-xs text-gray-600">
                  <UserIcon className="h-3 w-3 mr-1" />
                  Assigned to {task.assignedTo.length} user{task.assignedTo.length > 1 ? 's' : ''}
                </div>
                <div className="flex -space-x-1">
                  {task.assignedTo.slice(0, 3).map((userId, index) => (
                    <Avatar key={userId} className="h-6 w-6 border-2 border-white">
                      <AvatarFallback className="text-xs">
                        {index + 1}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {task.assignedTo.length > 3 && (
                    <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                      +{task.assignedTo.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Completion Info */}
            {task.status === TaskStatus.COMPLETED && task.completedAt && (
              <div className="text-xs text-green-600 flex items-center">
                <span>Completed {format(task.completedAt, 'MMM d, h:mm a')}</span>
                {task.qualityRating && (
                  <span className="ml-2">★ {task.qualityRating}/5</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex gap-6 h-full overflow-x-auto pb-4">
      {columns.map((column) => {
        const isOverLimit = column.wipLimit && column.tasks.length > column.wipLimit
        const isDragOver = dragOverColumn === column.id

        return (
          <div
            key={column.id}
            className={`flex-shrink-0 w-80 bg-gray-50 rounded-lg p-4 ${
              isDragOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{column.title}</h3>
                <Badge variant="secondary" className="text-xs">
                  {column.tasks.length}
                </Badge>
              </div>
              {column.wipLimit && (
                <div className={`text-xs px-2 py-1 rounded ${
                  isOverLimit ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  Limit: {column.wipLimit}
                </div>
              )}
            </div>

            {/* WIP Limit Warning */}
            {isOverLimit && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
                Work in progress limit exceeded
              </div>
            )}

            {/* Task Cards */}
            <div className="space-y-0 min-h-[200px]">
              {column.tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
              
              {column.tasks.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  {isDragOver ? 'Drop task here' : 'No tasks'}
                </div>
              )}
            </div>

            {/* Column Footer */}
            {column.status === TaskStatus.PENDING && (
              <Button variant="ghost" size="sm" className="w-full mt-3 text-gray-600">
                + Add Task
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
