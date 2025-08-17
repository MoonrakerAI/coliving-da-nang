'use client'

import { useState, useEffect } from 'react'
import { Task, TaskStatus, TaskFiltersExtended, TaskSearchQuery, TaskSearchResult } from '@/types'
import { KanbanBoard } from '@/components/tasks/KanbanBoard'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskSearch } from '@/components/tasks/TaskSearch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ListBulletIcon,
  Squares2X2Icon,
  ChartBarSquareIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function TaskKanbanView() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<TaskFiltersExtended>({})
  const [searchQuery, setSearchQuery] = useState('')

  // WIP limits for columns
  const wipLimits = {
    [TaskStatus.PENDING]: undefined,
    [TaskStatus.IN_PROGRESS]: 5,
    [TaskStatus.COMPLETED]: undefined,
    [TaskStatus.OVERDUE]: undefined,
    [TaskStatus.CANCELLED]: undefined
  }

  // Load tasks
  useEffect(() => {
    loadTasks()
  }, [])

  // Apply filters
  useEffect(() => {
    applyFilters()
  }, [tasks, filters, searchQuery])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tasks')
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...tasks]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.instructions?.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (filters.status?.length) {
      filtered = filtered.filter(task => filters.status!.includes(task.status))
    }

    // Apply priority filter
    if (filters.priority?.length) {
      filtered = filtered.filter(task => filters.priority!.includes(task.priority))
    }

    // Apply category filter
    if (filters.category?.length) {
      filtered = filtered.filter(task => filters.category!.includes(task.category))
    }

    // Apply assignee filter
    if (filters.assignee?.length) {
      filtered = filtered.filter(task => 
        task.assignedTo.some(assignee => filters.assignee!.includes(assignee))
      )
    }

    // Apply date range filter
    if (filters.dateRange) {
      filtered = filtered.filter(task => {
        if (!task.dueDate) return false
        return task.dueDate >= filters.dateRange!.start && task.dueDate <= filters.dateRange!.end
      })
    }

    setFilteredTasks(filtered)
  }

  const handleTaskMove = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Update local state
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId ? { ...task, status: newStatus } : task
          )
        )
      } else {
        console.error('Failed to update task status')
      }
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const handleTaskClick = (task: Task) => {
    router.push(`/tasks/${task.id}`)
  }

  const handleSearch = async (query: TaskSearchQuery): Promise<TaskSearchResult[]> => {
    // Simple client-side search for now
    const results = tasks
      .filter(task => 
        task.title.toLowerCase().includes(query.query.toLowerCase()) ||
        task.description.toLowerCase().includes(query.query.toLowerCase())
      )
      .map(task => ({
        task,
        relevanceScore: 0.8, // Simple scoring
        matchedFields: ['title', 'description']
      }))
      .slice(0, query.limit || 10)

    return results
  }

  const clearFilters = () => {
    setFilters({})
    setSearchQuery('')
  }

  const getTaskCounts = () => {
    return {
      total: filteredTasks.length,
      pending: filteredTasks.filter(t => t.status === TaskStatus.PENDING).length,
      inProgress: filteredTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      completed: filteredTasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      overdue: filteredTasks.filter(t => t.status === TaskStatus.OVERDUE).length
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const counts = getTaskCounts()

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Board</h1>
          <p className="text-gray-600">Drag and drop tasks to update their status</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/tasks/new">
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </Link>
        </div>
      </div>

      {/* View Switcher */}
      <div className="flex items-center gap-2">
        <Link href="/tasks/views/list">
          <Button variant="outline" size="sm">
            <ListBulletIcon className="h-4 w-4 mr-2" />
            List View
          </Button>
        </Link>
        <Button variant="default" size="sm">
          <Squares2X2Icon className="h-4 w-4 mr-2" />
          Kanban
        </Button>
        <Link href="/tasks/views/dashboard">
          <Button variant="outline" size="sm">
            <ChartBarSquareIcon className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </Link>
      </div>

      {/* Search and Stats */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <TaskSearch
            onSearch={handleSearch}
            onTaskSelect={handleTaskClick}
            placeholder="Search tasks..."
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {counts.total} Total
          </Badge>
          <Badge variant="secondary">
            {counts.pending} To Do
          </Badge>
          <Badge className="bg-blue-100 text-blue-800">
            {counts.inProgress} In Progress
          </Badge>
          <Badge className="bg-green-100 text-green-800">
            {counts.completed} Done
          </Badge>
          {counts.overdue > 0 && (
            <Badge className="bg-red-100 text-red-800">
              {counts.overdue} Overdue
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <TaskFilters
        filters={filters}
        sortBy="dueDate" as any
        sortOrder="asc"
        onFiltersChange={setFilters}
        onSortChange={() => {}} // Not used in kanban view
        onClearFilters={clearFilters}
      />

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          tasks={filteredTasks}
          onTaskMove={handleTaskMove}
          onTaskClick={handleTaskClick}
          wipLimits={wipLimits}
        />
      </div>

      {/* Board Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Kanban Board Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Drag tasks between columns to update their status</li>
          <li>• The "In Progress" column has a work-in-progress limit of 5 tasks</li>
          <li>• Click on any task card to view details and make updates</li>
          <li>• Use filters to focus on specific categories, priorities, or assignees</li>
        </ul>
      </div>
    </div>
  )
}
