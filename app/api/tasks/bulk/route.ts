import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { kv } from '@vercel/kv'
import { BulkTaskOperation, TaskStatus } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const operation: BulkTaskOperation = await request.json()
    const { taskIds, operation: operationType, value } = operation

    if (!taskIds || taskIds.length === 0) {
      return NextResponse.json({ error: 'No task IDs provided' }, { status: 400 })
    }

    // Verify user has access to all tasks
    const userKey = `user:${session.user.email}`
    const userData = await kv.hgetall(userKey)
    
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const propertyIds = userData.role === 'owner' 
      ? await kv.smembers(`owner:${session.user.email}:properties`)
      : [userData.propertyId].filter(Boolean)

    // Get all accessible task IDs
    const accessibleTaskIds = new Set<string>()
    for (const propertyId of propertyIds) {
      const taskIds = await kv.smembers(`property:${propertyId}:tasks`)
      taskIds.forEach(id => accessibleTaskIds.add(id))
    }

    // Filter to only tasks user has access to
    const validTaskIds = taskIds.filter(id => accessibleTaskIds.has(id))
    
    if (validTaskIds.length === 0) {
      return NextResponse.json({ error: 'No accessible tasks found' }, { status: 403 })
    }

    const updatedTasks = []
    const now = new Date().toISOString()

    // Process bulk operation
    for (const taskId of validTaskIds) {
      const task = await kv.hgetall(`task:${taskId}`)
      if (!task || task.deletedAt) continue

      const updates: Record<string, any> = {
        updatedAt: now
      }

      switch (operationType) {
        case 'assign':
          updates.assignedTo = JSON.stringify(value)
          break

        case 'priority':
          updates.priority = value
          break

        case 'category':
          updates.category = value
          break

        case 'deadline':
          updates.dueDate = new Date(value).toISOString()
          break

        case 'complete':
          updates.status = TaskStatus.COMPLETED
          updates.completedAt = now
          updates.completedBy = session.user.email
          break

        case 'cancel':
          updates.status = TaskStatus.CANCELLED
          break

        default:
          continue
      }

      // Apply updates
      await kv.hmset(`task:${taskId}`, updates)
      
      // Get updated task for response
      const updatedTask = await kv.hgetall(`task:${taskId}`)
      updatedTasks.push({
        ...updatedTask,
        id: taskId,
        assignedTo: JSON.parse(updatedTask.assignedTo || '[]'),
        completionPhotos: JSON.parse(updatedTask.completionPhotos || '[]')
      })
    }

    return NextResponse.json({
      success: true,
      updatedCount: updatedTasks.length,
      operation: operationType,
      tasks: updatedTasks
    })

  } catch (error) {
    console.error('Bulk operation error:', error)
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    )
  }
}
