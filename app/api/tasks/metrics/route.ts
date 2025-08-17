import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { kv } from '@vercel/kv'
import { Task, TaskMetrics, UserTaskMetrics, CategoryMetrics, ProductivityTrend, TaskCategory, TaskStatus } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's properties
    const userKey = `user:${session.user.email}`
    const userData = await kv.hgetall(userKey)
    
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const propertyIds = userData.role === 'owner' 
      ? await kv.smembers(`owner:${session.user.email}:properties`)
      : [userData.propertyId].filter(Boolean)

    if (!propertyIds.length) {
      return NextResponse.json({
        completionRate: 0,
        averageCompletionTime: 0,
        overdueRate: 0,
        tasksByUser: {},
        tasksByCategory: {},
        productivityTrends: []
      })
    }

    // Get all tasks for user's properties
    const allTasks: Task[] = []
    for (const propertyId of propertyIds) {
      const taskIds = await kv.smembers(`property:${propertyId}:tasks`)
      for (const taskId of taskIds) {
        const task = await kv.hgetall(`task:${taskId}`)
        if (task && !task.deletedAt) {
          allTasks.push({
            ...task,
            id: taskId,
            createdAt: new Date(task.createdAt),
            updatedAt: new Date(task.updatedAt),
            dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
            completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
            assignedTo: JSON.parse(task.assignedTo || '[]'),
            completionPhotos: JSON.parse(task.completionPhotos || '[]'),
            recurrence: task.recurrence ? JSON.parse(task.recurrence) : undefined,
            estimatedDuration: task.estimatedDuration ? parseInt(task.estimatedDuration) : undefined,
            qualityRating: task.qualityRating ? parseFloat(task.qualityRating) : undefined
          } as Task)
        }
      }
    }

    // Calculate overall metrics
    const totalTasks = allTasks.length
    const completedTasks = allTasks.filter(t => t.status === TaskStatus.COMPLETED)
    const overdueTasks = allTasks.filter(t => t.status === TaskStatus.OVERDUE)
    
    const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0
    const overdueRate = totalTasks > 0 ? (overdueTasks.length / totalTasks) * 100 : 0

    // Calculate average completion time
    const completedWithTimes = completedTasks.filter(t => t.completedAt && t.createdAt)
    const averageCompletionTime = completedWithTimes.length > 0 
      ? completedWithTimes.reduce((sum, task) => {
          const hours = (task.completedAt!.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60)
          return sum + hours
        }, 0) / completedWithTimes.length
      : 0

    // Calculate metrics by user
    const tasksByUser: Record<string, UserTaskMetrics> = {}
    const userTasks = new Map<string, Task[]>()

    // Group tasks by user
    allTasks.forEach(task => {
      task.assignedTo.forEach(userId => {
        if (!userTasks.has(userId)) {
          userTasks.set(userId, [])
        }
        userTasks.get(userId)!.push(task)
      })
    })

    // Calculate user metrics
    for (const [userId, tasks] of userTasks.entries()) {
      const userCompleted = tasks.filter(t => t.status === TaskStatus.COMPLETED)
      const userOverdue = tasks.filter(t => t.status === TaskStatus.OVERDUE)
      
      const userCompletionRate = tasks.length > 0 ? (userCompleted.length / tasks.length) * 100 : 0
      
      const userCompletedWithTimes = userCompleted.filter(t => t.completedAt && t.createdAt)
      const userAvgTime = userCompletedWithTimes.length > 0
        ? userCompletedWithTimes.reduce((sum, task) => {
            const hours = (task.completedAt!.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60)
            return sum + hours
          }, 0) / userCompletedWithTimes.length
        : 0

      const userQualityRating = userCompleted.filter(t => t.qualityRating).length > 0
        ? userCompleted.reduce((sum, task) => sum + (task.qualityRating || 0), 0) / 
          userCompleted.filter(t => t.qualityRating).length
        : 0

      tasksByUser[userId] = {
        userId,
        userName: `User ${userId.slice(-4)}`, // Simple user name for now
        totalAssigned: tasks.length,
        totalCompleted: userCompleted.length,
        completionRate: userCompletionRate,
        averageCompletionTime: userAvgTime,
        overdueCount: userOverdue.length,
        qualityRating: userQualityRating
      }
    }

    // Calculate metrics by category
    const tasksByCategory: Record<TaskCategory, CategoryMetrics> = {} as Record<TaskCategory, CategoryMetrics>
    
    Object.values(TaskCategory).forEach(category => {
      const categoryTasks = allTasks.filter(t => t.category === category)
      const categoryCompleted = categoryTasks.filter(t => t.status === TaskStatus.COMPLETED)
      const categoryOverdue = categoryTasks.filter(t => t.status === TaskStatus.OVERDUE)
      
      const categoryCompletedWithTimes = categoryCompleted.filter(t => t.completedAt && t.createdAt)
      const categoryAvgTime = categoryCompletedWithTimes.length > 0
        ? categoryCompletedWithTimes.reduce((sum, task) => {
            const hours = (task.completedAt!.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60)
            return sum + hours
          }, 0) / categoryCompletedWithTimes.length
        : 0

      const categoryOverdueRate = categoryTasks.length > 0 ? (categoryOverdue.length / categoryTasks.length) * 100 : 0

      tasksByCategory[category] = {
        category,
        totalTasks: categoryTasks.length,
        completedTasks: categoryCompleted.length,
        averageCompletionTime: categoryAvgTime,
        overdueRate: categoryOverdueRate
      }
    })

    // Calculate productivity trends (last 30 days)
    const productivityTrends: ProductivityTrend[] = []
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo)
      date.setDate(date.getDate() + i)
      
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)

      const tasksCompleted = allTasks.filter(t => 
        t.completedAt && 
        t.completedAt >= dayStart && 
        t.completedAt <= dayEnd
      ).length

      const tasksCreated = allTasks.filter(t => 
        t.createdAt >= dayStart && 
        t.createdAt <= dayEnd
      ).length

      const dayCompletedWithTimes = allTasks.filter(t => 
        t.completedAt && 
        t.completedAt >= dayStart && 
        t.completedAt <= dayEnd &&
        t.createdAt
      )

      const avgCompletionTime = dayCompletedWithTimes.length > 0
        ? dayCompletedWithTimes.reduce((sum, task) => {
            const hours = (task.completedAt!.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60)
            return sum + hours
          }, 0) / dayCompletedWithTimes.length
        : 0

      productivityTrends.push({
        date,
        tasksCompleted,
        tasksCreated,
        averageCompletionTime: avgCompletionTime
      })
    }

    const metrics: TaskMetrics = {
      completionRate,
      averageCompletionTime,
      overdueRate,
      tasksByUser,
      tasksByCategory,
      productivityTrends
    }

    return NextResponse.json(metrics)

  } catch (error) {
    console.error('Task metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate task metrics' },
      { status: 500 }
    )
  }
}
