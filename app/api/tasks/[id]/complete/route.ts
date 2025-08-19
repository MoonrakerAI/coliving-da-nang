import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config';
import { kv } from '@vercel/kv'
import { z } from 'zod'
import { Task, TaskStatus } from '@/types'

const completeTaskSchema = z.object({
  completionNotes: z.string().optional(),
  completionPhotos: z.array(z.string()).optional(),
  qualityRating: z.number().min(1).max(5).optional()
})

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
    const validatedData = completeTaskSchema.parse(body)

    // Find the task
    const taskKeys = await kv.keys(`task:*:${taskId}`)
    
    if (taskKeys.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const existingTask = await kv.get(taskKeys[0]) as any
    
    if (!existingTask || existingTask.deletedAt) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check if user is assigned to this task
    if (!existingTask.assignedTo.includes(session.user.id)) {
      return NextResponse.json({ 
        error: 'You are not assigned to this task' 
      }, { status: 403 })
    }

    // Check if task is already completed
    if (existingTask.status === TaskStatus.COMPLETED) {
      return NextResponse.json({ 
        error: 'Task is already completed' 
      }, { status: 400 })
    }

    const now = new Date()

    // Update task as completed
    const completedTask: Task = {
      ...existingTask,
      status: TaskStatus.COMPLETED,
      completedAt: now,
      completedBy: session.user.id,
      completionNotes: validatedData.completionNotes,
      completionPhotos: validatedData.completionPhotos || [],
      qualityRating: validatedData.qualityRating,
      updatedAt: now
    }

    await kv.set(taskKeys[0], completedTask)

    // Convert date strings back to Date objects for response
    const taskWithDates = {
      ...completedTask,
      createdAt: new Date(completedTask.createdAt),
      updatedAt: new Date(completedTask.updatedAt),
      dueDate: completedTask.dueDate ? new Date(completedTask.dueDate) : undefined,
      completedAt: completedTask.completedAt ? new Date(completedTask.completedAt) : new Date()
    }

    return NextResponse.json({ 
      success: true, 
      data: taskWithDates,
      message: 'Task completed successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error completing task:', error)
    return NextResponse.json(
      { error: 'Failed to complete task' },
      { status: 500 }
    )
  }
}
