'use client'

import { Task, TaskPriority, TaskStatus } from '@/types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { format } from 'date-fns'
import { Clock, User, Calendar, Camera, Star } from 'lucide-react'

interface TaskCardProps {
  task: Task
  onComplete?: (taskId: string) => void
  onEdit?: (taskId: string) => void
  onView?: (taskId: string) => void
  showActions?: boolean
}

export function TaskCard({ 
  task, 
  onComplete, 
  onEdit, 
  onView, 
  showActions = true 
}: TaskCardProps) {
  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.CRITICAL:
        return 'bg-red-100 text-red-800 border-red-200'
      case TaskPriority.HIGH:
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case TaskPriority.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case TaskPriority.LOW:
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return 'success'
      case TaskStatus.IN_PROGRESS:
        return 'warning'
      case TaskStatus.OVERDUE:
        return 'error'
      case TaskStatus.CANCELLED:
        return 'neutral'
      default:
        return 'info'
    }
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== TaskStatus.COMPLETED
  const canComplete = task.status === TaskStatus.PENDING || task.status === TaskStatus.IN_PROGRESS

  return (
    <div className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow ${
      isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'
    }`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">{task.title}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
            <StatusBadge status={task.status} variant={getStatusColor(task.status)} />
          </div>
        </div>

        {/* Category */}
        <div className="mb-3">
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            {task.category}
          </span>
        </div>

        {/* Task Details */}
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                {format(new Date(task.dueDate), 'MMM d, yyyy')}
              </span>
            </div>
          )}
          
          {task.estimatedDuration && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{task.estimatedDuration} min</span>
            </div>
          )}
          
          <div className="flex items-center gap-1">
            <User className="w-4 h-4" />
            <span>{task.assignedTo.length} assigned</span>
          </div>

          {task.completionPhotos.length > 0 && (
            <div className="flex items-center gap-1">
              <Camera className="w-4 h-4" />
              <span>{task.completionPhotos.length} photos</span>
            </div>
          )}
        </div>

        {/* Completion Info */}
        {task.status === TaskStatus.COMPLETED && task.completedAt && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-800">
                Completed {format(new Date(task.completedAt), 'MMM d, yyyy HH:mm')}
              </span>
              {task.qualityRating && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-green-800">{task.qualityRating}/5</span>
                </div>
              )}
            </div>
            {task.completionNotes && (
              <p className="text-green-700 text-sm mt-2">{task.completionNotes}</p>
            )}
          </div>
        )}

        {/* Recurrence Info */}
        {task.recurrence && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mb-4">
            <span className="text-xs text-blue-800 font-medium">
              Recurring: {task.recurrence.type} (every {task.recurrence.interval})
            </span>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
            <button
              onClick={() => onView?.(task.id)}
              className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              View Details
            </button>
            
            {canComplete && onComplete && (
              <button
                onClick={() => onComplete(task.id)}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
              >
                Mark Complete
              </button>
            )}
            
            {onEdit && task.status !== TaskStatus.COMPLETED && (
              <button
                onClick={() => onEdit(task.id)}
                className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Edit
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
