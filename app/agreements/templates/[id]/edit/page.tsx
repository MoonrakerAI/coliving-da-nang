'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  Save, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Eye,
  AlertCircle,
  FileText,
  Settings
} from 'lucide-react'
import { AgreementTemplate, TemplateVariable } from '@/lib/db/models/agreement'
import { COMMON_VARIABLES, DEFAULT_TEMPLATES } from '@/lib/agreements/templates'

export default function TemplateEditPage() {
  const router = useRouter()
  const params = useParams()
  const templateId = params.id as string
  const isNew = templateId === 'new'

  const [template, setTemplate] = useState<Partial<AgreementTemplate>>({
    name: '',
    content: '',
    description: '',
    category: 'Standard Lease',
    variables: [],
    isActive: true,
    version: 1
  })
  
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'content' | 'variables' | 'settings'>('content')
  const [contentPreview, setContentPreview] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    if (!isNew) {
      loadTemplate()
    }
  }, [templateId, isNew])

  useEffect(() => {
    // Generate preview when content or variables change
    generatePreview()
  }, [template.content, template.variables])

  const loadTemplate = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/agreements/templates/${templateId}`)
      if (response.ok) {
        const data = await response.json()
        setTemplate(data)
      } else {
        router.push('/agreements/templates')
      }
    } catch (error) {
      console.error('Error loading template:', error)
      router.push('/agreements/templates')
    } finally {
      setLoading(false)
    }
  }

  const generatePreview = () => {
    if (!template.content) return

    let preview = template.content
    
    // Replace variables with sample values
    template.variables?.forEach(variable => {
      const placeholder = `{{${variable.name}}}`
      let sampleValue = variable.defaultValue || '[Sample Value]'
      
      // Generate more realistic sample values based on variable name
      if (variable.name.includes('name')) sampleValue = 'John Doe'
      else if (variable.name.includes('email')) sampleValue = 'john.doe@example.com'
      else if (variable.name.includes('phone')) sampleValue = '+1 (555) 123-4567'
      else if (variable.name.includes('date')) sampleValue = new Date().toLocaleDateString()
      else if (variable.name.includes('rent')) sampleValue = '$1,200'
      else if (variable.name.includes('deposit')) sampleValue = '$2,400'
      else if (variable.name.includes('room')) sampleValue = 'Room 101'
      
      preview = preview.replace(new RegExp(placeholder, 'g'), sampleValue)
    })
    
    setContentPreview(preview)
  }

  const validateTemplate = (): string[] => {
    const errors: string[] = []
    
    if (!template.name?.trim()) {
      errors.push('Template name is required')
    }
    
    if (!template.content?.trim()) {
      errors.push('Template content is required')
    }
    
    if (template.content && template.content.length < 50) {
      errors.push('Template content is too short')
    }
    
    // Check for undefined variables in content
    if (template.content && template.variables) {
      const variableNames = template.variables.map(v => v.name)
      const contentVariables = extractVariablesFromContent(template.content)
      const undefinedVars = contentVariables.filter(name => !variableNames.includes(name))
      
      if (undefinedVars.length > 0) {
        errors.push(`Undefined variables in content: ${undefinedVars.join(', ')}`)
      }
    }
    
    // Check for duplicate variable names
    if (template.variables) {
      const names = template.variables.map(v => v.name)
      const duplicates = names.filter((name, index) => names.indexOf(name) !== index)
      if (duplicates.length > 0) {
        errors.push(`Duplicate variable names: ${duplicates.join(', ')}`)
      }
    }
    
    return errors
  }

  const extractVariablesFromContent = (content: string): string[] => {
    const variableRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g
    const matches = []
    let match
    
    while ((match = variableRegex.exec(content)) !== null) {
      matches.push(match[1])
    }
    
    return [...new Set(matches)]
  }

  const handleSave = async () => {
    const errors = validateTemplate()
    setValidationErrors(errors)
    
    if (errors.length > 0) {
      return
    }
    
    try {
      setSaving(true)
      
      const url = isNew 
        ? '/api/agreements/templates'
        : `/api/agreements/templates/${templateId}`
      
      const method = isNew ? 'POST' : 'PUT'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      })
      
      if (response.ok) {
        router.push('/agreements/templates')
      } else {
        const error = await response.json()
        setValidationErrors([error.message || 'Failed to save template'])
      }
    } catch (error) {
      console.error('Error saving template:', error)
      setValidationErrors(['Failed to save template'])
    } finally {
      setSaving(false)
    }
  }

  const addVariable = () => {
    const newVariable: TemplateVariable = {
      id: `var_${Date.now()}`,
      name: '',
      label: '',
      type: 'text',
      required: true,
      defaultValue: '',
      selectOptions: [],
      placeholder: '',
      description: ''
    }
    
    setTemplate(prev => ({
      ...prev,
      variables: [...(prev.variables || []), newVariable]
    }))
  }

  const updateVariable = (index: number, updates: Partial<TemplateVariable>) => {
    setTemplate(prev => ({
      ...prev,
      variables: prev.variables?.map((variable, i) => 
        i === index ? { ...variable, ...updates } : variable
      )
    }))
  }

  const removeVariable = (index: number) => {
    setTemplate(prev => ({
      ...prev,
      variables: prev.variables?.filter((_, i) => i !== index)
    }))
  }

  const addCommonVariables = (variableSet: TemplateVariable[]) => {
    const existingNames = new Set(template.variables?.map(v => v.name) || [])
    const newVariables = variableSet.filter(v => !existingNames.has(v.name))
    
    setTemplate(prev => ({
      ...prev,
      variables: [...(prev.variables || []), ...newVariables.map(v => ({
        ...v,
        id: `var_${Date.now()}_${v.name}`
      }))]
    }))
  }

  const loadDefaultTemplate = (templateKey: keyof typeof DEFAULT_TEMPLATES) => {
    setTemplate(prev => ({
      ...prev,
      content: DEFAULT_TEMPLATES[templateKey]
    }))
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            {isNew ? 'Create Template' : 'Edit Template'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isNew ? 'Create a new agreement template' : `Editing: ${template.name}`}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Template'}
        </Button>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800">Validation Errors</h3>
                <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'content', label: 'Content', icon: FileText },
            { id: 'variables', label: 'Variables', icon: Settings },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Content */}
        <div className="space-y-6">
          {activeTab === 'content' && (
            <Card>
              <CardHeader>
                <CardTitle>Template Content</CardTitle>
                <CardDescription>
                  Write your agreement template using variables in {{variable_name}} format
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isNew && (
                  <div className="space-y-2">
                    <Label>Quick Start Templates</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadDefaultTemplate('STANDARD_LEASE')}
                      >
                        Standard Lease
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadDefaultTemplate('SHORT_TERM')}
                      >
                        Short Term
                      </Button>
                    </div>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="content">Agreement Content</Label>
                  <Textarea
                    id="content"
                    value={template.content || ''}
                    onChange={(e) => setTemplate(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter your agreement template content..."
                    className="min-h-[400px] font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'variables' && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Template Variables</CardTitle>
                    <CardDescription>
                      Define variables that will be replaced with actual values
                    </CardDescription>
                  </div>
                  <Button onClick={addVariable} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Variable
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Common Variable Sets */}
                <div className="space-y-2">
                  <Label>Quick Add Common Variables</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCommonVariables(COMMON_VARIABLES.TENANT_INFO)}
                    >
                      Tenant Info
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCommonVariables(COMMON_VARIABLES.PROPERTY_INFO)}
                    >
                      Property Info
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCommonVariables(COMMON_VARIABLES.LEASE_TERMS)}
                    >
                      Lease Terms
                    </Button>
                  </div>
                </div>

                {/* Variable List */}
                <div className="space-y-4">
                  {template.variables?.map((variable, index) => (
                    <Card key={variable.id} className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Variable Name</Label>
                          <Input
                            value={variable.name}
                            onChange={(e) => updateVariable(index, { name: e.target.value })}
                            placeholder="variable_name"
                          />
                        </div>
                        <div>
                          <Label>Display Label</Label>
                          <Input
                            value={variable.label}
                            onChange={(e) => updateVariable(index, { label: e.target.value })}
                            placeholder="Display Label"
                          />
                        </div>
                        <div>
                          <Label>Type</Label>
                          <select
                            value={variable.type}
                            onChange={(e) => updateVariable(index, { type: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="boolean">Boolean</option>
                            <option value="select">Select</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={variable.required}
                              onCheckedChange={(checked) => updateVariable(index, { required: checked })}
                            />
                            <Label>Required</Label>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeVariable(index)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {variable.type === 'select' && (
                          <div className="col-span-2">
                            <Label>Options (comma-separated)</Label>
                            <Input
                              value={variable.selectOptions?.join(', ') || ''}
                              onChange={(e) => updateVariable(index, { 
                                selectOptions: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                              })}
                              placeholder="Option 1, Option 2, Option 3"
                            />
                          </div>
                        )}
                        <div className="col-span-2">
                          <Label>Default Value</Label>
                          <Input
                            value={variable.defaultValue || ''}
                            onChange={(e) => updateVariable(index, { defaultValue: e.target.value })}
                            placeholder="Default value"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                  
                  {(!template.variables || template.variables.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      No variables defined. Add variables to make your template dynamic.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'settings' && (
            <Card>
              <CardHeader>
                <CardTitle>Template Settings</CardTitle>
                <CardDescription>
                  Configure template metadata and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={template.name || ''}
                    onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter template name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={template.description || ''}
                    onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe this template"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={template.category || ''}
                    onChange={(e) => setTemplate(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g., Standard Lease, Short Term"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={template.isActive}
                    onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label>Active Template</Label>
                </div>
                
                {!isNew && (
                  <div className="pt-4 border-t">
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Version: {template.version}</div>
                      <div>Created: {template.createdAt ? new Date(template.createdAt).toLocaleString() : 'N/A'}</div>
                      <div>Updated: {template.updatedAt ? new Date(template.updatedAt).toLocaleString() : 'N/A'}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                <CardTitle>Live Preview</CardTitle>
              </div>
              <CardDescription>
                Preview how your template will look with sample data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg max-h-[600px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {contentPreview || 'Enter template content to see preview...'}
                </pre>
              </div>
            </CardContent>
          </Card>
          
          {template.variables && template.variables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Variables Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {template.variables.map((variable, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="font-mono">{{variable.name}}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{variable.type}</Badge>
                        {variable.required && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
