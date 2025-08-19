'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { CreateTaskForm } from '@/types'
import { TaskForm } from '@/components/tasks/TaskForm'
import { ArrowLeft } from 'lucide-react'

export default function NewTaskPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; email: string }>>([])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    fetchAvailableUsers()
  }, [session, status, router])

  const fetchAvailableUsers = async () => {
    try {
      const propertyId = session?.user?.propertyIds?.[0]
      if (!propertyId) return

      // Fetch tenants and managers for the property
      const [tenantsResponse, managersResponse] = await Promise.all([
        fetch(`/api/tenants?propertyId=${propertyId}`),
        fetch(`/api/users?propertyId=${propertyId}&role=manager`)
      ])

      const users = []
      
      if (tenantsResponse.ok) {
        const tenantsResult = await tenantsResponse.json()
        const tenants = tenantsResult.data || []
        users.push(...tenants.map((tenant: any) => ({
          id: tenant.id,
          name: `${tenant.firstName} ${tenant.lastName}`,
          email: tenant.email
        })))
      }

      if (managersResponse.ok) {
        const managersResult = await managersResponse.json()
        const managers = managersResult.data || []
        users.push(...managers.map((manager: any) => ({
          id: manager.id,
          name: manager.name,
          email: manager.email
        })))
      }

      // Add current user if not already included
      if (session?.user && !users.find(u => u.id === session.user.id)) {
        users.push({
          id: session.user.id,
          name: session.user.name || 'You',
          email: session.user.email || ''
        })
      }

      setAvailableUsers(users)
    } catch (err) {
      console.error('Error fetching users:', err)
      // Fallback to current user only
      if (session?.user) {
        setAvailableUsers([{
          id: session.user.id,
          name: session.user.name || 'You',
          email: session.user.email || ''
        }])
      }
    }
  }

  const handleSubmit = async (data: CreateTaskForm) => {
    try {
      setIsLoading(true)
      setError(null)

      const propertyId = session?.user?.propertyIds?.[0]
      if (!propertyId) {
        throw new Error('No property associated with your account')
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          propertyId
        })
      })

      if (!response.ok) {
        const errorResult = await response.json()
        throw new Error(errorResult.error || 'Failed to create task')
      }

      const result = await response.json()
      
      // Redirect to the task details page or back to tasks list
      router.push(`/tasks/${result.data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/tasks')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={handleCancel}
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              Back to Tasks
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Task</h1>
              <p className="text-sm text-gray-600">Set up a new task for your property</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error creating task</h3>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <TaskForm
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isLoading}
              availableUsers={availableUsers}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
