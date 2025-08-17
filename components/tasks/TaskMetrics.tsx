'use client'

import { TaskMetrics, UserTaskMetrics, CategoryMetrics, ProductivityTrend } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'

interface TaskMetricsProps {
  metrics: TaskMetrics
  className?: string
}

export function TaskMetrics({ metrics, className = "" }: TaskMetricsProps) {
  const getCompletionRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600'
    if (rate >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getProgressColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-500'
    if (rate >= 70) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`
    if (hours < 24) return `${hours.toFixed(1)}h`
    return `${Math.round(hours / 24)}d`
  }

  const getProductivityTrend = () => {
    if (metrics.productivityTrends.length < 2) return null
    
    const recent = metrics.productivityTrends.slice(-7) // Last 7 days
    const older = metrics.productivityTrends.slice(-14, -7) // Previous 7 days
    
    const recentAvg = recent.reduce((sum, trend) => sum + trend.tasksCompleted, 0) / recent.length
    const olderAvg = older.reduce((sum, trend) => sum + trend.tasksCompleted, 0) / older.length
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100
    return { change, isPositive: change > 0 }
  }

  const trend = getProductivityTrend()

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className={`text-2xl font-bold ${getCompletionRateColor(metrics.completionRate)}`}>
                  {metrics.completionRate.toFixed(1)}%
                </p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            </div>
            <Progress 
              value={metrics.completionRate} 
              className="mt-2"
              indicatorClassName={getProgressColor(metrics.completionRate)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Completion Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatDuration(metrics.averageCompletionTime)}
                </p>
              </div>
              <ClockIcon className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue Rate</p>
                <p className={`text-2xl font-bold ${
                  metrics.overdueRate > 20 ? 'text-red-600' : 
                  metrics.overdueRate > 10 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {metrics.overdueRate.toFixed(1)}%
                </p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Productivity Trend</p>
                <div className="flex items-center">
                  {trend && (
                    <>
                      <span className={`text-2xl font-bold ${
                        trend.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}%
                      </span>
                      {trend.isPositive ? (
                        <ArrowTrendingUpIcon className="h-5 w-5 text-green-500 ml-1" />
                      ) : (
                        <ArrowTrendingDownIcon className="h-5 w-5 text-red-500 ml-1" />
                      )}
                    </>
                  )}
                  {!trend && (
                    <span className="text-2xl font-bold text-gray-400">N/A</span>
                  )}
                </div>
              </div>
              <ChartBarIcon className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserGroupIcon className="h-5 w-5 mr-2" />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.values(metrics.tasksByUser)
                .sort((a, b) => b.completionRate - a.completionRate)
                .slice(0, 5)
                .map((user) => (
                <div key={user.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{user.userName}</span>
                      <span className={`text-sm font-semibold ${getCompletionRateColor(user.completionRate)}`}>
                        {user.completionRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                      <span>{user.totalCompleted}/{user.totalAssigned} tasks</span>
                      <span>{formatDuration(user.averageCompletionTime)} avg</span>
                    </div>
                    <Progress 
                      value={user.completionRate} 
                      className="h-2"
                      indicatorClassName={getProgressColor(user.completionRate)}
                    />
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2">
                        {user.qualityRating > 0 && (
                          <Badge variant="outline" className="text-xs">
                            ★ {user.qualityRating.toFixed(1)}
                          </Badge>
                        )}
                        {user.overdueCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {user.overdueCount} overdue
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Performance by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.values(metrics.tasksByCategory)
                .sort((a, b) => b.completedTasks - a.completedTasks)
                .map((category) => (
                <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{category.category}</span>
                      <span className="text-sm text-gray-600">
                        {category.completedTasks}/{category.totalTasks}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                      <span>
                        {((category.completedTasks / category.totalTasks) * 100).toFixed(1)}% complete
                      </span>
                      <span>{formatDuration(category.averageCompletionTime)} avg</span>
                    </div>
                    <Progress 
                      value={(category.completedTasks / category.totalTasks) * 100} 
                      className="h-2"
                    />
                    {category.overdueRate > 0 && (
                      <div className="mt-1">
                        <Badge variant="outline" className="text-xs text-red-600">
                          {category.overdueRate.toFixed(1)}% overdue rate
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Productivity Trends Chart */}
      {metrics.productivityTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Productivity Trends (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between space-x-1">
              {metrics.productivityTrends.slice(-30).map((trend, index) => {
                const maxTasks = Math.max(...metrics.productivityTrends.map(t => t.tasksCompleted))
                const height = (trend.tasksCompleted / maxTasks) * 100
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                      style={{ height: `${height}%`, minHeight: '4px' }}
                      title={`${trend.tasksCompleted} tasks completed on ${trend.date.toLocaleDateString()}`}
                    />
                    {index % 7 === 0 && (
                      <span className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-left">
                        {trend.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-4">
              <span>Tasks Completed</span>
              <span>Avg: {(metrics.productivityTrends.reduce((sum, t) => sum + t.tasksCompleted, 0) / metrics.productivityTrends.length).toFixed(1)} per day</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
