import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { kv } from '@vercel/kv'
import { z } from 'zod'
import { Task, TaskStatus } from '@/types'

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  instructions: z.string().optional(),
  category: z.string().optional(),
  priority: z.string().optional(),
  assignedTo: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
  estimatedDuration: z.number().positive().optional(),
  status: z.nativeEnum(TaskStatus).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const taskId = params.id
    
    // Find the task across all properties the user has access to
    const taskKeys = await kv.keys(`task:*:${taskId}`)
    
    if (taskKeys.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const task = await kv.get(taskKeys[0])
    
    if (!task || task.deletedAt) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Convert date strings back to Date objects
    const taskWithDates = {
      ...task,
      createdAt: new Date(task.createdAt),
      updatedAt: new Date(task.updatedAt),
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      completedAt: task.completedAt ? new Date(task.completedAt) : undefined
    }

    return NextResponse.json({ 
      success: true, 
      data: taskWithDates 
    })

  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const taskId = params.id
    const body = await request.json()
    const validatedData = updateTaskSchema.parse(body)

    // Find the task
    const taskKeys = await kv.keys(`task:*:${taskId}`)
    
    if (taskKeys.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const existingTask = await kv.get(taskKeys[0])
    
    if (!existingTask || existingTask.deletedAt) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Update task with new data
    const updatedTask: Task = {
      ...existingTask,
      ...validatedData,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : existingTask.dueDate,
      updatedAt: new Date()
    }

    // Update overdue status if due date has passed
    if (updatedTask.dueDate && updatedTask.status === TaskStatus.PENDING) {
      const now = new Date()
      if (updatedTask.dueDate < now) {
        updatedTask.status = TaskStatus.OVERDUE
      }
    }

    await kv.set(taskKeys[0], updatedTask)

    // Convert date strings back to Date objects for response
    const taskWithDates = {
      ...updatedTask,
      createdAt: new Date(updatedTask.createdAt),
      updatedAt: new Date(updatedTask.updatedAt),
      dueDate: updatedTask.dueDate ? new Date(updatedTask.dueDate) : undefined,
      completedAt: updatedTask.completedAt ? new Date(updatedTask.completedAt) : undefined
    }

    return NextResponse.json({ 
      success: true, 
      data: taskWithDates 
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const taskId = params.id

    // Find the task
    const taskKeys = await kv.keys(`task:*:${taskId}`)
    
    if (taskKeys.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const existingTask = await kv.get(taskKeys[0])
    
    if (!existingTask || existingTask.deletedAt) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Soft delete the task
    const deletedTask = {
      ...existingTask,
      deletedAt: new Date(),
      updatedAt: new Date()
    }

    await kv.set(taskKeys[0], deletedTask)

    return NextResponse.json({ 
      success: true, 
      message: 'Task deleted successfully' 
    })

  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
