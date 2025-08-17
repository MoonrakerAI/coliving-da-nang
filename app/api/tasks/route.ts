import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { kv } from '@vercel/kv'
import { z } from 'zod'
import { 
  Task, 
  TaskCategory, 
  TaskPriority, 
  TaskStatus, 
  CreateTaskForm,
  TaskFilters 
} from '@/types'

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  instructions: z.string().optional(),
  category: z.nativeEnum(TaskCategory),
  priority: z.nativeEnum(TaskPriority),
  assignedTo: z.array(z.string()),
  dueDate: z.string().optional(),
  estimatedDuration: z.number().positive().optional(),
  recurrence: z.object({
    type: z.enum(['daily', 'weekly', 'monthly', 'custom']),
    interval: z.number().positive(),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    endDate: z.string().optional(),
    assignmentRotation: z.boolean()
  }).optional(),
  templateId: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')
    const assignedTo = searchParams.get('assignedTo')

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    // Get all tasks for the property
    const taskKeys = await kv.keys(`task:${propertyId}:*`)
    const tasks: Task[] = []

    if (taskKeys.length > 0) {
      const taskData = await kv.mget(...taskKeys)
      for (const task of taskData) {
        if (task && !task.deletedAt) {
          tasks.push({
            ...task,
            createdAt: new Date(task.createdAt),
            updatedAt: new Date(task.updatedAt),
            dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
            completedAt: task.completedAt ? new Date(task.completedAt) : undefined
          })
        }
      }
    }

    // Apply filters
    let filteredTasks = tasks

    if (status) {
      filteredTasks = filteredTasks.filter(task => task.status === status)
    }

    if (category) {
      filteredTasks = filteredTasks.filter(task => task.category === category)
    }

    if (priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === priority)
    }

    if (assignedTo) {
      filteredTasks = filteredTasks.filter(task => task.assignedTo.includes(assignedTo))
    }

    // Sort by priority and due date
    filteredTasks.sort((a, b) => {
      const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 }
      const aPriority = priorityOrder[a.priority] || 0
      const bPriority = priorityOrder[b.priority] || 0
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }
      
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime()
      }
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return NextResponse.json({ 
      success: true, 
      data: filteredTasks 
    })

  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createTaskSchema.parse(body)

    // Get property ID from request or user session
    const propertyId = body.propertyId || session.user.propertyId
    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date()

    // Update overdue status if due date has passed
    let status = TaskStatus.PENDING
    if (validatedData.dueDate) {
      const dueDate = new Date(validatedData.dueDate)
      if (dueDate < now) {
        status = TaskStatus.OVERDUE
      }
    }

    const task: Task = {
      id: taskId,
      propertyId,
      title: validatedData.title,
      description: validatedData.description,
      instructions: validatedData.instructions,
      category: validatedData.category,
      priority: validatedData.priority,
      assignedTo: validatedData.assignedTo,
      createdBy: session.user.id,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
      estimatedDuration: validatedData.estimatedDuration,
      status,
      completionPhotos: [],
      recurrence: validatedData.recurrence,
      templateId: validatedData.templateId,
      createdAt: now,
      updatedAt: now
    }

    // Save task to KV store
    await kv.set(`task:${propertyId}:${taskId}`, task)

    // If this is a recurring task, schedule the next occurrence
    if (task.recurrence) {
      await scheduleNextRecurrence(task)
    }

    return NextResponse.json({ 
      success: true, 
      data: task 
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}

async function scheduleNextRecurrence(task: Task) {
  if (!task.recurrence || !task.dueDate) return

  const { type, interval, daysOfWeek, endDate, assignmentRotation } = task.recurrence
  let nextDueDate = new Date(task.dueDate)

  switch (type) {
    case 'daily':
      nextDueDate.setDate(nextDueDate.getDate() + interval)
      break
    case 'weekly':
      nextDueDate.setDate(nextDueDate.getDate() + (interval * 7))
      break
    case 'monthly':
      nextDueDate.setMonth(nextDueDate.getMonth() + interval)
      break
    case 'custom':
      if (daysOfWeek && daysOfWeek.length > 0) {
        // Find next occurrence based on days of week
        const currentDay = nextDueDate.getDay()
        const nextDay = daysOfWeek.find(day => day > currentDay) || daysOfWeek[0]
        const daysToAdd = nextDay > currentDay ? nextDay - currentDay : 7 - currentDay + nextDay
        nextDueDate.setDate(nextDueDate.getDate() + daysToAdd)
      }
      break
  }

  // Check if we've reached the end date
  if (endDate && nextDueDate > new Date(endDate)) {
    return
  }

  // Handle assignment rotation
  let nextAssignedTo = task.assignedTo
  if (assignmentRotation && task.assignedTo.length > 1) {
    // Rotate assignments for fair distribution
    nextAssignedTo = [task.assignedTo[1], ...task.assignedTo.slice(2), task.assignedTo[0]]
  }

  // Create next recurring task
  const nextTaskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const nextTask: Task = {
    ...task,
    id: nextTaskId,
    assignedTo: nextAssignedTo,
    dueDate: nextDueDate,
    status: TaskStatus.PENDING,
    completedAt: undefined,
    completedBy: undefined,
    completionNotes: undefined,
    completionPhotos: [],
    qualityRating: undefined,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  await kv.set(`task:${task.propertyId}:${nextTaskId}`, nextTask)
}
