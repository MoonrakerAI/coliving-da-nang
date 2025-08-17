import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/tasks/route'
import { PATCH, DELETE } from '@/app/api/tasks/[id]/route'
import { TaskCategory, TaskPriority, TaskStatus } from '@/types'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

vi.mock('@vercel/kv', () => ({
  kv: {
    keys: vi.fn(),
    get: vi.fn(),
    mget: vi.fn(),
    set: vi.fn()
  }
}))

const mockSession = {
  user: {
    id: 'user123',
    email: 'test@example.com',
    propertyId: 'prop123'
  }
}

const mockTask = {
  id: 'task123',
  propertyId: 'prop123',
  title: 'Clean Kitchen',
  description: 'Deep clean the kitchen area',
  category: TaskCategory.CLEANING,
  priority: TaskPriority.MEDIUM,
  assignedTo: ['user123'],
  createdBy: 'user123',
  status: TaskStatus.PENDING,
  completionPhotos: [],
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('Tasks API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/tasks', () => {
    it('should return tasks for authenticated user', async () => {
      const { getServerSession } = await import('next-auth')
      const { kv } = await import('@vercel/kv')
      
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(kv.keys).mockResolvedValue(['task:prop123:task123'])
      vi.mocked(kv.mget).mockResolvedValue([mockTask])

      const request = new NextRequest('http://localhost/api/tasks?propertyId=prop123')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].title).toBe('Clean Kitchen')
    })

    it('should return 401 for unauthenticated user', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/tasks?propertyId=prop123')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should return 400 when propertyId is missing', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost/api/tasks')
      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('should filter tasks by status', async () => {
      const { getServerSession } = await import('next-auth')
      const { kv } = await import('@vercel/kv')
      
      const completedTask = { ...mockTask, id: 'task456', status: TaskStatus.COMPLETED }
      
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(kv.keys).mockResolvedValue(['task:prop123:task123', 'task:prop123:task456'])
      vi.mocked(kv.mget).mockResolvedValue([mockTask, completedTask])

      const request = new NextRequest('http://localhost/api/tasks?propertyId=prop123&status=Completed')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].status).toBe(TaskStatus.COMPLETED)
    })
  })

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const { getServerSession } = await import('next-auth')
      const { kv } = await import('@vercel/kv')
      
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(kv.set).mockResolvedValue('OK')

      const taskData = {
        title: 'New Task',
        description: 'Task description',
        category: TaskCategory.MAINTENANCE,
        priority: TaskPriority.HIGH,
        assignedTo: ['user123'],
        propertyId: 'prop123'
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData)
      })
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.title).toBe('New Task')
      expect(data.data.status).toBe(TaskStatus.PENDING)
      expect(vi.mocked(kv.set)).toHaveBeenCalled()
    })

    it('should return 400 for invalid data', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const invalidData = {
        title: '', // Empty title should fail validation
        description: 'Task description'
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })
      
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should set status to OVERDUE for past due date', async () => {
      const { getServerSession } = await import('next-auth')
      const { kv } = await import('@vercel/kv')
      
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(kv.set).mockResolvedValue('OK')

      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)

      const taskData = {
        title: 'Overdue Task',
        description: 'Task description',
        category: TaskCategory.CLEANING,
        priority: TaskPriority.MEDIUM,
        assignedTo: ['user123'],
        dueDate: pastDate.toISOString().split('T')[0],
        propertyId: 'prop123'
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData)
      })
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.status).toBe(TaskStatus.OVERDUE)
    })
  })

  describe('PATCH /api/tasks/[id]', () => {
    it('should update an existing task', async () => {
      const { getServerSession } = await import('next-auth')
      const { kv } = await import('@vercel/kv')
      
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(kv.keys).mockResolvedValue(['task:prop123:task123'])
      vi.mocked(kv.get).mockResolvedValue(mockTask)
      vi.mocked(kv.set).mockResolvedValue('OK')

      const updateData = {
        title: 'Updated Task Title',
        priority: TaskPriority.HIGH
      }

      const request = new NextRequest('http://localhost/api/tasks/task123', {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      })
      
      const response = await PATCH(request, { params: { id: 'task123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.title).toBe('Updated Task Title')
      expect(data.data.priority).toBe(TaskPriority.HIGH)
    })

    it('should return 404 for non-existent task', async () => {
      const { getServerSession } = await import('next-auth')
      const { kv } = await import('@vercel/kv')
      
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(kv.keys).mockResolvedValue([])

      const request = new NextRequest('http://localhost/api/tasks/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated' })
      })
      
      const response = await PATCH(request, { params: { id: 'nonexistent' } })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/tasks/[id]', () => {
    it('should soft delete a task', async () => {
      const { getServerSession } = await import('next-auth')
      const { kv } = await import('@vercel/kv')
      
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(kv.keys).mockResolvedValue(['task:prop123:task123'])
      vi.mocked(kv.get).mockResolvedValue(mockTask)
      vi.mocked(kv.set).mockResolvedValue('OK')

      const request = new NextRequest('http://localhost/api/tasks/task123', {
        method: 'DELETE'
      })
      
      const response = await DELETE(request, { params: { id: 'task123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(vi.mocked(kv.set)).toHaveBeenCalledWith(
        'task:prop123:task123',
        expect.objectContaining({
          ...mockTask,
          deletedAt: expect.any(Date)
        })
      )
    })
  })
})
