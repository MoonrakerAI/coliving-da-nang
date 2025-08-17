import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config';
import { kv } from '@vercel/kv'
import { z } from 'zod'
import { TaskTemplate, TaskCategory, TaskPriority } from '@/types'

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  instructions: z.string().optional(),
  category: z.nativeEnum(TaskCategory),
  priority: z.nativeEnum(TaskPriority),
  estimatedDuration: z.number().positive().optional(),
  defaultRecurrence: z.object({
    type: z.enum(['daily', 'weekly', 'monthly', 'custom']),
    interval: z.number().positive(),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    endDate: z.string().optional(),
    assignmentRotation: z.boolean()
  }).optional(),
  isPublic: z.boolean().default(false)
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const isPublic = searchParams.get('public') === 'true'

    // Get all templates
    const templateKeys = await kv.keys('template:*')
    const templates: TaskTemplate[] = []

    if (templateKeys.length > 0) {
      const templateData = await kv.mget(...templateKeys)
      for (const template of templateData) {
        if (template) {
          // Include public templates or templates created by the user
          if (template.isPublic || template.createdBy === session.user.id) {
            templates.push({
              ...template,
              createdAt: new Date(template.createdAt),
              updatedAt: new Date(template.updatedAt)
            })
          }
        }
      }
    }

    // Apply filters
    let filteredTemplates = templates

    if (category) {
      filteredTemplates = filteredTemplates.filter(template => template.category === category)
    }

    if (isPublic !== null) {
      filteredTemplates = filteredTemplates.filter(template => template.isPublic === isPublic)
    }

    // Sort by usage count and creation date
    filteredTemplates.sort((a, b) => {
      if (a.usageCount !== b.usageCount) {
        return b.usageCount - a.usageCount
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return NextResponse.json({ 
      success: true, 
      data: filteredTemplates 
    })

  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
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
    const validatedData = createTemplateSchema.parse(body)

    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date()

    const template: TaskTemplate = {
      id: templateId,
      name: validatedData.name,
      description: validatedData.description,
      instructions: validatedData.instructions,
      category: validatedData.category,
      priority: validatedData.priority,
      estimatedDuration: validatedData.estimatedDuration,
      defaultRecurrence: validatedData.defaultRecurrence,
      isPublic: validatedData.isPublic,
      createdBy: session.user.id,
      usageCount: 0,
      createdAt: now,
      updatedAt: now
    }

    // Save template to KV store
    await kv.set(`template:${templateId}`, template)

    return NextResponse.json({ 
      success: true, 
      data: template 
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}
