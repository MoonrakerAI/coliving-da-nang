import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config';
import { kv } from '@vercel/kv'
import { Task, PersonalTaskDashboard, TaskActivity, TaskCategory, TaskStatus } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.email

    // Get user's properties
    const userKey = `user:${userId}`
    const userData = await kv.hgetall(userKey)
    
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const propertyIds = userData.role === 'owner' 
      ? await kv.smembers(`owner:${userId}:properties`)
      : [userData.propertyId].filter(Boolean)

    if (!propertyIds.length) {
      return NextResponse.json({
        userId,
        assignedTasks: [],
        completedToday: 0,
        completedThisWeek: 0,
        overdueCount: 0,
        upcomingDeadlines: [],
        workloadDistribution: {},
        productivityScore: 0,
        recentActivity: []
      })
    }

    // Get all tasks assigned to this user
    const assignedTasks: Task[] = []
    for (const propertyId of propertyIds) {
      const taskIds = await kv.smembers(`property:${propertyId}:tasks`)
      for (const taskId of taskIds) {
        const task = await kv.hgetall(`task:${taskId}`)
        if (task && !task.deletedAt) {
          const taskObj = {
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
          } as Task

          // Only include tasks assigned to this user
          if (taskObj.assignedTo.includes(userId)) {
            assignedTasks.push(taskObj)
          }
        }
      }
    }

    // Calculate metrics
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0)

    // Completed today
    const completedToday = assignedTasks.filter(task => 
      task.status === TaskStatus.COMPLETED &&
      task.completedAt &&
      task.completedAt >= todayStart &&
      task.completedAt <= todayEnd
    ).length

    // Completed this week
    const completedThisWeek = assignedTasks.filter(task => 
      task.status === TaskStatus.COMPLETED &&
      task.completedAt &&
      task.completedAt >= weekStart
    ).length

    // Overdue count
    const overdueCount = assignedTasks.filter(task => 
      task.status === TaskStatus.OVERDUE ||
      (task.dueDate && task.dueDate < now && task.status !== TaskStatus.COMPLETED)
    ).length

    // Upcoming deadlines (next 7 days)
    const nextWeek = new Date(now)
    nextWeek.setDate(now.getDate() + 7)
    
    const upcomingDeadlines = assignedTasks
      .filter(task => 
        task.dueDate &&
        task.dueDate >= now &&
        task.dueDate <= nextWeek &&
        task.status !== TaskStatus.COMPLETED
      )
      .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0))
      .slice(0, 5)

    // Workload distribution by category
    const workloadDistribution: Record<TaskCategory, number> = {} as Record<TaskCategory, number>
    Object.values(TaskCategory).forEach(category => {
      workloadDistribution[category] = assignedTasks.filter(task => 
        task.category === category && 
        task.status !== TaskStatus.COMPLETED &&
        task.status !== TaskStatus.CANCELLED
      ).length
    })

    // Calculate productivity score (0-100)
    const totalAssigned = assignedTasks.length
    const totalCompleted = assignedTasks.filter(t => t.status === TaskStatus.COMPLETED).length
    const completionRate = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0
    
    // Factor in overdue penalty and recent activity bonus
    const overduePenalty = Math.min(overdueCount * 10, 30) // Max 30 point penalty
    const recentActivityBonus = Math.min(completedThisWeek * 2, 20) // Max 20 point bonus
    
    const productivityScore = Math.max(0, Math.min(100, 
      completionRate - overduePenalty + recentActivityBonus
    ))

    // Recent activity (last 10 activities)
    const recentActivity: TaskActivity[] = []
    const completedTasks = assignedTasks
      .filter(task => task.completedAt)
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))
      .slice(0, 10)

    completedTasks.forEach((task, index) => {
      recentActivity.push({
        id: `activity-${task.id}-${index}`,
        taskId: task.id,
        taskTitle: task.title,
        action: 'completed',
        timestamp: task.completedAt!,
        userId,
        userName: userData.name || 'You',
        details: task.completionNotes
      })
    })

    const personalDashboard: PersonalTaskDashboard = {
      userId,
      assignedTasks: assignedTasks.filter(t => 
        t.status !== TaskStatus.COMPLETED && 
        t.status !== TaskStatus.CANCELLED
      ),
      completedToday,
      completedThisWeek,
      overdueCount,
      upcomingDeadlines,
      workloadDistribution,
      productivityScore: Math.round(productivityScore),
      recentActivity
    }

    return NextResponse.json(personalDashboard)

  } catch (error) {
    console.error('Personal dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to load personal dashboard' },
      { status: 500 }
    )
  }
}
