import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config';
import { kv } from '@vercel/kv'
import { put } from '@vercel/blob'
import { Task } from '@/types'

export async function POST(
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

    const formData = await request.formData()
    const files = formData.getAll('photos') as File[]

    if (files.length === 0) {
      return NextResponse.json({ 
        error: 'No photos provided' 
      }, { status: 400 })
    }

    const uploadedPhotos: string[] = []

    // Upload each photo to Vercel Blob
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ 
          error: 'Only image files are allowed' 
        }, { status: 400 })
      }

      // Limit file size to 5MB
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ 
          error: 'File size must be less than 5MB' 
        }, { status: 400 })
      }

      const filename = `task-${taskId}-${Date.now()}-${file.name}`
      const blob = await put(filename, file, {
        access: 'public',
        addRandomSuffix: true
      })

      uploadedPhotos.push(blob.url)
    }

    // Update task with new photos
    const updatedTask: Task = {
      ...existingTask,
      completionPhotos: [...existingTask.completionPhotos, ...uploadedPhotos],
      updatedAt: new Date()
    }

    await kv.set(taskKeys[0], updatedTask)

    return NextResponse.json({ 
      success: true, 
      data: {
        photos: uploadedPhotos,
        totalPhotos: updatedTask.completionPhotos.length
      },
      message: 'Photos uploaded successfully'
    })

  } catch (error) {
    console.error('Error uploading photos:', error)
    return NextResponse.json(
      { error: 'Failed to upload photos' },
      { status: 500 }
    )
  }
}
