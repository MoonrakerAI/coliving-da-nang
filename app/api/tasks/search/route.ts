import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config';
import { kv } from '@vercel/kv'
import { Task, TaskSearchResult, TaskSearchQuery } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchQuery: TaskSearchQuery = await request.json()
    const { query, filters, sortBy, sortOrder, limit = 10, offset = 0 } = searchQuery

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
    }

    // Get all tasks for the user's properties
    const userKey = `user:${session.user.email}`
    const userData = await kv.hgetall(userKey)
    
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const propertyIds = userData.role === 'owner' 
      ? await kv.smembers(`owner:${session.user.email}:properties`)
      : [userData.propertyId].filter(Boolean)

    if (!propertyIds.length) {
      return NextResponse.json({ results: [], total: 0 })
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
            recurrence: task.recurrence ? JSON.parse(task.recurrence) : undefined
          } as Task)
        }
      }
    }

    // Apply filters first
    let filteredTasks = allTasks

    if (filters?.status?.length) {
      filteredTasks = filteredTasks.filter(task => filters.status!.includes(task.status))
    }

    if (filters?.priority?.length) {
      filteredTasks = filteredTasks.filter(task => filters.priority!.includes(task.priority))
    }

    if (filters?.category?.length) {
      filteredTasks = filteredTasks.filter(task => filters.category!.includes(task.category))
    }

    if (filters?.assignee?.length) {
      filteredTasks = filteredTasks.filter(task => 
        task.assignedTo.some(assignee => filters.assignee!.includes(assignee))
      )
    }

    if (filters?.dateRange) {
      filteredTasks = filteredTasks.filter(task => {
        if (!task.dueDate) return false
        return task.dueDate >= filters.dateRange!.start && task.dueDate <= filters.dateRange!.end
      })
    }

    // Perform text search and calculate relevance scores
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0)
    const searchResults: TaskSearchResult[] = []

    for (const task of filteredTasks) {
      let relevanceScore = 0
      const matchedFields: string[] = []

      // Search in title (highest weight)
      const titleMatches = searchTerms.filter(term => 
        task.title.toLowerCase().includes(term)
      ).length
      if (titleMatches > 0) {
        relevanceScore += titleMatches * 0.4
        matchedFields.push('title')
      }

      // Search in description (medium weight)
      const descriptionMatches = searchTerms.filter(term => 
        task.description.toLowerCase().includes(term)
      ).length
      if (descriptionMatches > 0) {
        relevanceScore += descriptionMatches * 0.3
        matchedFields.push('description')
      }

      // Search in instructions (medium weight)
      if (task.instructions) {
        const instructionMatches = searchTerms.filter(term => 
          task.instructions!.toLowerCase().includes(term)
        ).length
        if (instructionMatches > 0) {
          relevanceScore += instructionMatches * 0.2
          matchedFields.push('instructions')
        }
      }

      // Search in category and priority (lower weight)
      if (searchTerms.some(term => task.category.toLowerCase().includes(term))) {
        relevanceScore += 0.1
        matchedFields.push('category')
      }

      if (searchTerms.some(term => task.priority.toLowerCase().includes(term))) {
        relevanceScore += 0.1
        matchedFields.push('priority')
      }

      // Only include tasks with matches
      if (relevanceScore > 0) {
        searchResults.push({
          task,
          relevanceScore: Math.min(relevanceScore, 1), // Cap at 1.0
          matchedFields
        })
      }
    }

    // Sort by relevance score (descending) or specified field
    searchResults.sort((a, b) => {
      if (sortBy && sortBy !== 'relevance') {
        const aValue = a.task[sortBy as keyof Task]
        const bValue = b.task[sortBy as keyof Task]
        
        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
        return 0
      }
      
      return b.relevanceScore - a.relevanceScore
    })

    // Apply pagination
    const paginatedResults = searchResults.slice(offset, offset + limit)

    return NextResponse.json({
      results: paginatedResults,
      total: searchResults.length,
      query,
      filters
    })

  } catch (error) {
    console.error('Task search error:', error)
    return NextResponse.json(
      { error: 'Failed to search tasks' },
      { status: 500 }
    )
  }
}
