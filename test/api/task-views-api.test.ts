import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as searchTasks } from '@/app/api/tasks/search/route'
import { GET as getMetrics } from '@/app/api/tasks/metrics/route'
import { POST as bulkOperations } from '@/app/api/tasks/bulk/route'
import { GET as getPersonalDashboard } from '@/app/api/tasks/personal-dashboard/route'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

vi.mock('@vercel/kv', () => ({
  kv: {
    hgetall: vi.fn(),
    smembers: vi.fn(),
    hmset: vi.fn()
  }
}))

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {}
}))

const { getServerSession } = await import('next-auth')
const { kv } = await import('@vercel/kv')

const mockSession = {
  user: {
    email: 'test@example.com',
    name: 'Test User'
  }
}

const mockUserData = {
  email: 'test@example.com',
  name: 'Test User',
  role: 'owner',
  propertyId: 'prop1'
}

const mockTask = {
  id: '1',
  propertyId: 'prop1',
  title: 'Clean Kitchen',
  description: 'Deep clean the kitchen area',
  category: 'Cleaning',
  priority: 'High',
  assignedTo: '["user1"]',
  createdBy: 'test@example.com',
  status: 'Pending',
  completionPhotos: '[]',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  dueDate: '2024-01-15T00:00:00.000Z'
}

describe('Task Search API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(kv.hgetall).mockImplementation((key: string) => {
      if (key === 'user:test@example.com') return Promise.resolve(mockUserData)
      if (key === 'task:1') return Promise.resolve(mockTask)
      return Promise.resolve(null)
    })
    vi.mocked(kv.smembers).mockImplementation((key: string) => {
      if (key === 'owner:test@example.com:properties') return Promise.resolve(['prop1'])
      if (key === 'property:prop1:tasks') return Promise.resolve(['1'])
      return Promise.resolve([])
    })
  })

  it('should search tasks successfully', async () => {
    const request = new NextRequest('http://localhost/api/tasks/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'kitchen',
        limit: 10
      })
    })

    const response = await searchTasks(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results).toBeDefined()
    expect(data.total).toBeDefined()
    expect(data.query).toBe('kitchen')
  })

  it('should return error for short query', async () => {
    const request = new NextRequest('http://localhost/api/tasks/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'a',
        limit: 10
      })
    })

    const response = await searchTasks(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Query must be at least 2 characters')
  })

  it('should return unauthorized for no session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/tasks/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'kitchen',
        limit: 10
      })
    })

    const response = await searchTasks(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should apply filters correctly', async () => {
    const request = new NextRequest('http://localhost/api/tasks/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'kitchen',
        filters: {
          status: ['Pending'],
          priority: ['High']
        },
        limit: 10
      })
    })

    const response = await searchTasks(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results).toBeDefined()
    expect(data.filters).toEqual({
      status: ['Pending'],
      priority: ['High']
    })
  })
})

describe('Task Metrics API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(kv.hgetall).mockImplementation((key: string) => {
      if (key === 'user:test@example.com') return Promise.resolve(mockUserData)
      if (key === 'task:1') return Promise.resolve({
        ...mockTask,
        status: 'Completed',
        completedAt: '2024-01-05T00:00:00.000Z',
        qualityRating: '4'
      })
      return Promise.resolve(null)
    })
    vi.mocked(kv.smembers).mockImplementation((key: string) => {
      if (key === 'owner:test@example.com:properties') return Promise.resolve(['prop1'])
      if (key === 'property:prop1:tasks') return Promise.resolve(['1'])
      return Promise.resolve([])
    })
  })

  it('should calculate metrics successfully', async () => {
    const request = new NextRequest('http://localhost/api/tasks/metrics')

    const response = await getMetrics(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.completionRate).toBeDefined()
    expect(data.averageCompletionTime).toBeDefined()
    expect(data.overdueRate).toBeDefined()
    expect(data.tasksByUser).toBeDefined()
    expect(data.tasksByCategory).toBeDefined()
    expect(data.productivityTrends).toBeDefined()
  })

  it('should return unauthorized for no session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/tasks/metrics')

    const response = await getMetrics(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should handle no tasks gracefully', async () => {
    vi.mocked(kv.smembers).mockImplementation((key: string) => {
      if (key === 'owner:test@example.com:properties') return Promise.resolve([])
      return Promise.resolve([])
    })

    const request = new NextRequest('http://localhost/api/tasks/metrics')

    const response = await getMetrics(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.completionRate).toBe(0)
    expect(data.averageCompletionTime).toBe(0)
    expect(data.overdueRate).toBe(0)
  })
})

describe('Bulk Operations API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(kv.hgetall).mockImplementation((key: string) => {
      if (key === 'user:test@example.com') return Promise.resolve(mockUserData)
      if (key === 'task:1') return Promise.resolve(mockTask)
      return Promise.resolve(null)
    })
    vi.mocked(kv.smembers).mockImplementation((key: string) => {
      if (key === 'owner:test@example.com:properties') return Promise.resolve(['prop1'])
      if (key === 'property:prop1:tasks') return Promise.resolve(['1'])
      return Promise.resolve([])
    })
    vi.mocked(kv.hmset).mockResolvedValue('OK')
  })

  it('should perform bulk assign operation', async () => {
    const request = new NextRequest('http://localhost/api/tasks/bulk', {
      method: 'POST',
      body: JSON.stringify({
        taskIds: ['1'],
        operation: 'assign',
        value: ['user1', 'user2']
      })
    })

    const response = await bulkOperations(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.updatedCount).toBe(1)
    expect(data.operation).toBe('assign')
    expect(kv.hmset).toHaveBeenCalled()
  })

  it('should perform bulk priority change', async () => {
    const request = new NextRequest('http://localhost/api/tasks/bulk', {
      method: 'POST',
      body: JSON.stringify({
        taskIds: ['1'],
        operation: 'priority',
        value: 'Critical'
      })
    })

    const response = await bulkOperations(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.operation).toBe('priority')
  })

  it('should perform bulk completion', async () => {
    const request = new NextRequest('http://localhost/api/tasks/bulk', {
      method: 'POST',
      body: JSON.stringify({
        taskIds: ['1'],
        operation: 'complete',
        value: true
      })
    })

    const response = await bulkOperations(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.operation).toBe('complete')
  })

  it('should return error for no task IDs', async () => {
    const request = new NextRequest('http://localhost/api/tasks/bulk', {
      method: 'POST',
      body: JSON.stringify({
        taskIds: [],
        operation: 'assign',
        value: ['user1']
      })
    })

    const response = await bulkOperations(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('No task IDs provided')
  })

  it('should return unauthorized for no session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/tasks/bulk', {
      method: 'POST',
      body: JSON.stringify({
        taskIds: ['1'],
        operation: 'assign',
        value: ['user1']
      })
    })

    const response = await bulkOperations(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })
})

describe('Personal Dashboard API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(kv.hgetall).mockImplementation((key: string) => {
      if (key === 'user:test@example.com') return Promise.resolve(mockUserData)
      if (key === 'task:1') return Promise.resolve({
        ...mockTask,
        assignedTo: '["test@example.com"]',
        status: 'Completed',
        completedAt: new Date().toISOString()
      })
      return Promise.resolve(null)
    })
    vi.mocked(kv.smembers).mockImplementation((key: string) => {
      if (key === 'owner:test@example.com:properties') return Promise.resolve(['prop1'])
      if (key === 'property:prop1:tasks') return Promise.resolve(['1'])
      return Promise.resolve([])
    })
  })

  it('should get personal dashboard successfully', async () => {
    const request = new NextRequest('http://localhost/api/tasks/personal-dashboard')

    const response = await getPersonalDashboard(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.userId).toBe('test@example.com')
    expect(data.assignedTasks).toBeDefined()
    expect(data.completedToday).toBeDefined()
    expect(data.completedThisWeek).toBeDefined()
    expect(data.overdueCount).toBeDefined()
    expect(data.upcomingDeadlines).toBeDefined()
    expect(data.workloadDistribution).toBeDefined()
    expect(data.productivityScore).toBeDefined()
    expect(data.recentActivity).toBeDefined()
  })

  it('should return unauthorized for no session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/tasks/personal-dashboard')

    const response = await getPersonalDashboard(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should handle no assigned tasks', async () => {
    vi.mocked(kv.hgetall).mockImplementation((key: string) => {
      if (key === 'user:test@example.com') return Promise.resolve(mockUserData)
      if (key === 'task:1') return Promise.resolve({
        ...mockTask,
        assignedTo: '["other-user"]' // Not assigned to current user
      })
      return Promise.resolve(null)
    })

    const request = new NextRequest('http://localhost/api/tasks/personal-dashboard')

    const response = await getPersonalDashboard(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.assignedTasks).toHaveLength(0)
    expect(data.completedToday).toBe(0)
    expect(data.completedThisWeek).toBe(0)
  })

  it('should calculate productivity score correctly', async () => {
    const request = new NextRequest('http://localhost/api/tasks/personal-dashboard')

    const response = await getPersonalDashboard(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.productivityScore).toBeGreaterThanOrEqual(0)
    expect(data.productivityScore).toBeLessThanOrEqual(100)
  })
})
