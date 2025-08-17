'use client'

import { useState, useEffect } from 'react'
import { Task, TaskFiltersExtended, TaskSortField, TaskSearchQuery, TaskSearchResult } from '@/types'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskSearch } from '@/components/tasks/TaskSearch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ListBulletIcon,
  Squares2X2Icon,
  ChartBarSquareIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function TaskListView() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [filters, setFilters] = useState<TaskFiltersExtended>({})
  const [sortBy, setSortBy] = useState<TaskSortField>(TaskSortField.DUE_DATE)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [searchQuery, setSearchQuery] = useState('')

  // Load tasks
  useEffect(() => {
    loadTasks()
  }, [])

  // Apply filters and sorting
  useEffect(() => {
    applyFiltersAndSort()
  }, [tasks, filters, sortBy, sortOrder, searchQuery])

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

  const applyFiltersAndSort = () => {
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

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case TaskSortField.TITLE:
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case TaskSortField.DUE_DATE:
          aValue = a.dueDate || new Date('2099-12-31')
          bValue = b.dueDate || new Date('2099-12-31')
          break
        case TaskSortField.PRIORITY:
          const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 }
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder]
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder]
          break
        case TaskSortField.CREATED_DATE:
          aValue = a.createdAt
          bValue = b.createdAt
          break
        case TaskSortField.STATUS:
          aValue = a.status
          bValue = b.status
          break
        case TaskSortField.CATEGORY:
          aValue = a.category
          bValue = b.category
          break
        default:
          aValue = a.createdAt
          bValue = b.createdAt
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    setFilteredTasks(filtered)
  }

  const handleSort = (field: TaskSortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const handleSelectTask = (taskId: string, selected: boolean) => {
    if (selected) {
      setSelectedTasks([...selectedTasks, taskId])
    } else {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId))
    }
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedTasks(filteredTasks.map(task => task.id))
    } else {
      setSelectedTasks([])
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600">Manage and track all property tasks</p>
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
        <Button variant="default" size="sm">
          <ListBulletIcon className="h-4 w-4 mr-2" />
          List View
        </Button>
        <Link href="/tasks/views/kanban">
          <Button variant="outline" size="sm">
            <Squares2X2Icon className="h-4 w-4 mr-2" />
            Kanban
          </Button>
        </Link>
        <Link href="/tasks/views/dashboard">
          <Button variant="outline" size="sm">
            <ChartBarSquareIcon className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <TaskSearch
            onSearch={handleSearch}
            onTaskSelect={handleTaskClick}
            placeholder="Search tasks..."
          />
        </div>
        {selectedTasks.length > 0 && (
          <Badge variant="secondary">
            {selectedTasks.length} selected
          </Badge>
        )}
      </div>

      {/* Filters */}
      <TaskFilters
        filters={filters}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onFiltersChange={setFilters}
        onSortChange={(field, order) => {
          setSortBy(field)
          setSortOrder(order)
        }}
        onClearFilters={clearFilters}
      />

      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{filteredTasks.length}</div>
            <div className="text-sm text-gray-600">Total Tasks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {filteredTasks.filter(t => t.status === 'Completed').length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {filteredTasks.filter(t => t.status === 'In Progress').length}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {filteredTasks.filter(t => t.status === 'Overdue').length}
            </div>
            <div className="text-sm text-gray-600">Overdue</div>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <TaskList
        tasks={filteredTasks}
        sortBy={sortBy}
        sortOrder={sortOrder}
        selectedTasks={selectedTasks}
        onSort={handleSort}
        onSelectTask={handleSelectTask}
        onSelectAll={handleSelectAll}
        onTaskClick={handleTaskClick}
      />

      {/* Bulk Actions */}
      {selectedTasks.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white shadow-lg border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {selectedTasks.length} task{selectedTasks.length > 1 ? 's' : ''} selected
            </span>
            <Button size="sm" variant="outline">
              Assign
            </Button>
            <Button size="sm" variant="outline">
              Change Priority
            </Button>
            <Button size="sm" variant="outline">
              Set Deadline
            </Button>
            <Button size="sm" variant="outline">
              Mark Complete
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setSelectedTasks([])}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
