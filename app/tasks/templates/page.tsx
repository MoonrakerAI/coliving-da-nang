'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { TaskTemplate, TaskCategory, CreateTaskForm } from '@/types'
import { Plus, Search, Filter, BookOpen, Users, Star } from 'lucide-react'

export default function TaskTemplatesPage() {
  const sessionResult = useSession()
  const session = sessionResult?.data ?? null
  const status = sessionResult?.status ?? 'loading'
  const router = useRouter()
  
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | ''>('')
  const [showPublicOnly, setShowPublicOnly] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    fetchTemplates()
  }, [session, status, router])

  useEffect(() => {
    applyFilters()
  }, [templates, searchQuery, selectedCategory, showPublicOnly])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedCategory) params.append('category', selectedCategory)
      if (showPublicOnly) params.append('public', 'true')

      const response = await fetch(`/api/tasks/templates?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }

      const result = await response.json()
      setTemplates(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = templates

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query)
      )
    }

    if (selectedCategory) {
      filtered = filtered.filter(template => template.category === selectedCategory)
    }

    if (showPublicOnly) {
      filtered = filtered.filter(template => template.isPublic)
    }

    setFilteredTemplates(filtered)
  }

  const handleUseTemplate = async (template: TaskTemplate) => {
    // Navigate to create task page with template pre-filled
    const templateData: Partial<CreateTaskForm> = {
      title: template.name,
      description: template.description,
      instructions: template.instructions,
      category: template.category,
      priority: template.priority,
      estimatedDuration: template.estimatedDuration,
      recurrence: template.defaultRecurrence,
      templateId: template.id
    }

    // Store template data in session storage for the new task form
    sessionStorage.setItem('taskTemplate', JSON.stringify(templateData))
    router.push('/tasks/new')
  }

  const incrementUsageCount = async (templateId: string) => {
    try {
      await fetch(`/api/tasks/templates/${templateId}/use`, {
        method: 'POST'
      })
    } catch (err) {
      console.error('Failed to increment usage count:', err)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Task Templates</h1>
              <p className="text-sm text-gray-600">Pre-built templates for common tasks</p>
            </div>
            <button
              onClick={() => router.push('/tasks/templates/new')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as TaskCategory | '')}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {Object.values(TaskCategory).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showPublicOnly}
                    onChange={(e) => setShowPublicOnly(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Public only</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.length > 0 ? (
            filteredTemplates.map(template => (
              <div key={template.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
                      <p className="text-sm text-gray-600 line-clamp-3">{template.description}</p>
                    </div>
                    {template.isPublic && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        <Users className="w-3 h-3 mr-1" />
                        Public
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Category:</span>
                      <span className="font-medium text-gray-900">{template.category}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Priority:</span>
                      <span className={`font-medium ${
                        template.priority === 'Critical' ? 'text-red-600' :
                        template.priority === 'High' ? 'text-orange-600' :
                        template.priority === 'Medium' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {template.priority}
                      </span>
                    </div>
                    
                    {template.estimatedDuration && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Duration:</span>
                        <span className="font-medium text-gray-900">{template.estimatedDuration} min</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Used:</span>
                      <div className="flex items-center">
                        <Star className="w-3 h-3 text-yellow-500 mr-1" />
                        <span className="font-medium text-gray-900">{template.usageCount} times</span>
                      </div>
                    </div>
                  </div>

                  {template.defaultRecurrence && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mb-4">
                      <span className="text-xs text-blue-800 font-medium">
                        Recurring: {template.defaultRecurrence.type} (every {template.defaultRecurrence.interval})
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        handleUseTemplate(template)
                        incrementUsageCount(template.id)
                      }}
                      className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                    >
                      Use Template
                    </button>
                    
                    <button
                      onClick={() => router.push(`/tasks/templates/${template.id}`)}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-600 mb-4">
                {templates.length === 0 
                  ? "Create your first template to get started"
                  : "Try adjusting your search or filters"
                }
              </p>
              {templates.length === 0 && (
                <button
                  onClick={() => router.push('/tasks/templates/new')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
