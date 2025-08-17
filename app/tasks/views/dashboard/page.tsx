'use client'

import { useState, useEffect } from 'react'
import { Task, TaskMetrics, PersonalTaskDashboard, TaskSearchQuery, TaskSearchResult } from '@/types'
import { TaskMetrics as TaskMetricsComponent } from '@/components/tasks/TaskMetrics'
import { TaskSearch } from '@/components/tasks/TaskSearch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  ListBulletIcon,
  Squares2X2Icon,
  ChartBarSquareIcon,
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  TrophyIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, isToday, isTomorrow } from 'date-fns'

export default function TaskDashboardView() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [metrics, setMetrics] = useState<TaskMetrics | null>(null)
  const [personalDashboard, setPersonalDashboard] = useState<PersonalTaskDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  // Load data
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load tasks
      const tasksResponse = await fetch('/api/tasks')
      const tasksData = await tasksResponse.json()
      const allTasks = tasksData.tasks || []
      setTasks(allTasks)

      // Load metrics
      const metricsResponse = await fetch('/api/tasks/metrics')
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setMetrics(metricsData)
      }

      // Load personal dashboard
      const personalResponse = await fetch('/api/tasks/personal-dashboard')
      if (personalResponse.ok) {
        const personalData = await personalResponse.json()
        setPersonalDashboard(personalData)
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
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
        relevanceScore: 0.8,
        matchedFields: ['title', 'description']
      }))
      .slice(0, query.limit || 10)

    return results
  }

  const getUpcomingTasks = () => {
    return tasks
      .filter(task => task.dueDate && task.status !== 'Completed')
      .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0))
      .slice(0, 5)
  }

  const getRecentActivity = () => {
    return tasks
      .filter(task => task.completedAt)
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))
      .slice(0, 5)
  }

  const getTaskStats = () => {
    const total = tasks.length
    const completed = tasks.filter(t => t.status === 'Completed').length
    const inProgress = tasks.filter(t => t.status === 'In Progress').length
    const overdue = tasks.filter(t => t.status === 'Overdue').length
    const pending = tasks.filter(t => t.status === 'Pending').length

    return { total, completed, inProgress, overdue, pending }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const stats = getTaskStats()
  const upcomingTasks = getUpcomingTasks()
  const recentActivity = getRecentActivity()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Dashboard</h1>
          <p className="text-gray-600">Overview of task performance and metrics</p>
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
        <Link href="/tasks/views/kanban">
          <Button variant="outline" size="sm">
            <Squares2X2Icon className="h-4 w-4 mr-2" />
            Kanban
          </Button>
        </Link>
        <Button variant="default" size="sm">
          <ChartBarSquareIcon className="h-4 w-4 mr-2" />
          Dashboard
        </Button>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md">
        <TaskSearch
          onSearch={handleSearch}
          onTaskSelect={handleTaskClick}
          placeholder="Search tasks..."
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Tasks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-sm text-gray-600">Overdue</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={() => handleTaskClick(task)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{task.title}</div>
                    <div className="text-xs text-gray-600">{task.category}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-medium ${
                      task.dueDate && isToday(task.dueDate) ? 'text-orange-600' :
                      task.dueDate && isTomorrow(task.dueDate) ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>
                      {task.dueDate && format(task.dueDate, 'MMM d')}
                    </div>
                    <Badge className="text-xs" variant="outline">
                      {task.priority}
                    </Badge>
                  </div>
                </div>
              ))}
              {upcomingTasks.length === 0 && (
                <div className="text-center text-gray-500 text-sm py-4">
                  No upcoming deadlines
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ClockIcon className="h-5 w-5 mr-2" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={() => handleTaskClick(task)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{task.title}</div>
                    <div className="text-xs text-green-600">Completed</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-600">
                      {task.completedAt && format(task.completedAt, 'MMM d, h:mm a')}
                    </div>
                    {task.qualityRating && (
                      <div className="text-xs text-yellow-600">
                        ★ {task.qualityRating}/5
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <div className="text-center text-gray-500 text-sm py-4">
                  No recent activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Personal Stats */}
        {personalDashboard && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrophyIcon className="h-5 w-5 mr-2" />
                Your Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Completed Today</span>
                  <span className="font-semibold">{personalDashboard.completedToday}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">This Week</span>
                  <span className="font-semibold">{personalDashboard.completedThisWeek}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Assigned Tasks</span>
                  <span className="font-semibold">{personalDashboard.assignedTasks.length}</span>
                </div>
                {personalDashboard.overdueCount > 0 && (
                  <div className="flex items-center justify-between text-red-600">
                    <span className="text-sm">Overdue</span>
                    <span className="font-semibold flex items-center">
                      <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                      {personalDashboard.overdueCount}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Productivity Score</span>
                    <Badge className={`${
                      personalDashboard.productivityScore >= 80 ? 'bg-green-100 text-green-800' :
                      personalDashboard.productivityScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {personalDashboard.productivityScore}/100
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Task Metrics */}
      {metrics && (
        <TaskMetricsComponent metrics={metrics} />
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/tasks/new">
              <Button variant="outline" className="w-full">
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </Link>
            <Link href="/tasks/templates">
              <Button variant="outline" className="w-full">
                View Templates
              </Button>
            </Link>
            <Link href="/tasks/views/list?filter=overdue">
              <Button variant="outline" className="w-full">
                Review Overdue
              </Button>
            </Link>
            <Link href="/tasks/views/list?filter=high-priority">
              <Button variant="outline" className="w-full">
                High Priority
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
