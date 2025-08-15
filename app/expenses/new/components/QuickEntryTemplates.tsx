'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Zap, Plus, Star, Edit, Trash2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ExpenseCategory = 'Utilities' | 'Repairs' | 'Supplies' | 'Cleaning' | 'Maintenance' | 'Other'

interface QuickTemplate {
  id: string
  name: string
  category: ExpenseCategory
  amount?: number
  description: string
  isFrequent: boolean
  lastUsed?: Date
  useCount: number
  propertySpecific?: boolean
}

interface QuickEntryTemplatesProps {
  onTemplateSelect: (template: QuickTemplate) => void
  selectedCategory?: ExpenseCategory
}

export function QuickEntryTemplates({ onTemplateSelect, selectedCategory }: QuickEntryTemplatesProps) {
  const [templates, setTemplates] = useState<QuickTemplate[]>([
    {
      id: 'template_1',
      name: 'Monthly Electricity',
      category: 'Utilities',
      amount: 150000,
      description: 'Monthly electricity bill payment',
      isFrequent: true,
      lastUsed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      useCount: 12,
      propertySpecific: true
    },
    {
      id: 'template_2',
      name: 'Water Bill',
      category: 'Utilities',
      amount: 80000,
      description: 'Monthly water utility payment',
      isFrequent: true,
      lastUsed: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      useCount: 8,
      propertySpecific: true
    },
    {
      id: 'template_3',
      name: 'Cleaning Supplies',
      category: 'Cleaning',
      amount: 50000,
      description: 'Weekly cleaning supplies purchase',
      isFrequent: true,
      lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      useCount: 15,
      propertySpecific: false
    },
    {
      id: 'template_4',
      name: 'Plumbing Repair',
      category: 'Repairs',
      amount: 200000,
      description: 'Standard plumbing repair service',
      isFrequent: false,
      lastUsed: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      useCount: 3,
      propertySpecific: false
    }
  ])

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<QuickTemplate | null>(null)
  const [newTemplate, setNewTemplate] = useState<Partial<QuickTemplate>>({
    name: '',
    category: 'Other',
    amount: undefined,
    description: '',
    isFrequent: false,
    propertySpecific: false
  })

  // Filter templates based on selected category
  const filteredTemplates = selectedCategory 
    ? templates.filter(t => t.category === selectedCategory)
    : templates

  // Sort templates by frequency and recent usage
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    // Frequent templates first
    if (a.isFrequent !== b.isFrequent) {
      return a.isFrequent ? -1 : 1
    }
    // Then by use count
    if (a.useCount !== b.useCount) {
      return b.useCount - a.useCount
    }
    // Finally by last used date
    const aLastUsed = a.lastUsed?.getTime() || 0
    const bLastUsed = b.lastUsed?.getTime() || 0
    return bLastUsed - aLastUsed
  })

  const handleTemplateSelect = (template: QuickTemplate) => {
    // Update usage statistics
    const updatedTemplate = {
      ...template,
      lastUsed: new Date(),
      useCount: template.useCount + 1
    }
    
    setTemplates(prev => prev.map(t => 
      t.id === template.id ? updatedTemplate : t
    ))
    
    onTemplateSelect(updatedTemplate)
  }

  const handleCreateTemplate = () => {
    if (newTemplate.name && newTemplate.description) {
      const template: QuickTemplate = {
        id: `template_${Date.now()}`,
        name: newTemplate.name,
        category: newTemplate.category || 'Other',
        amount: newTemplate.amount,
        description: newTemplate.description,
        isFrequent: newTemplate.isFrequent || false,
        useCount: 0,
        propertySpecific: newTemplate.propertySpecific || false
      }
      
      setTemplates(prev => [...prev, template])
      setNewTemplate({
        name: '',
        category: 'Other',
        amount: undefined,
        description: '',
        isFrequent: false,
        propertySpecific: false
      })
      setShowCreateDialog(false)
    }
  }

  const handleEditTemplate = (template: QuickTemplate) => {
    setEditingTemplate(template)
    setNewTemplate(template)
    setShowCreateDialog(true)
  }

  const handleUpdateTemplate = () => {
    if (editingTemplate && newTemplate.name && newTemplate.description) {
      const updatedTemplate: QuickTemplate = {
        ...editingTemplate,
        name: newTemplate.name,
        category: newTemplate.category || 'Other',
        amount: newTemplate.amount,
        description: newTemplate.description,
        isFrequent: newTemplate.isFrequent || false,
        propertySpecific: newTemplate.propertySpecific || false
      }
      
      setTemplates(prev => prev.map(t => 
        t.id === editingTemplate.id ? updatedTemplate : t
      ))
      
      setEditingTemplate(null)
      setNewTemplate({
        name: '',
        category: 'Other',
        amount: undefined,
        description: '',
        isFrequent: false,
        propertySpecific: false
      })
      setShowCreateDialog(false)
    }
  }

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId))
  }

  const resetDialog = () => {
    setEditingTemplate(null)
    setNewTemplate({
      name: '',
      category: 'Other',
      amount: undefined,
      description: '',
      isFrequent: false,
      propertySpecific: false
    })
    setShowCreateDialog(false)
  }

  const formatLastUsed = (date: Date) => {
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    return `${Math.floor(diffInDays / 30)} months ago`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">Quick Entry Templates</h3>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={resetDialog}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Plus className="w-3 h-3 mr-1" />
              New
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Monthly Internet Bill"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="template-category">Category</Label>
                <Select
                  value={newTemplate.category}
                  onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value as ExpenseCategory }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Utilities">Utilities</SelectItem>
                    <SelectItem value="Repairs">Repairs</SelectItem>
                    <SelectItem value="Supplies">Supplies</SelectItem>
                    <SelectItem value="Cleaning">Cleaning</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="template-amount">Amount (VND)</Label>
                <Input
                  id="template-amount"
                  type="number"
                  placeholder="Optional"
                  value={newTemplate.amount || ''}
                  onChange={(e) => setNewTemplate(prev => ({ 
                    ...prev, 
                    amount: e.target.value ? Number(e.target.value) : undefined 
                  }))}
                />
              </div>
              
              <div>
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  placeholder="Template description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newTemplate.isFrequent}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, isFrequent: e.target.checked }))}
                  />
                  Frequent expense
                </label>
                
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newTemplate.propertySpecific}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, propertySpecific: e.target.checked }))}
                  />
                  Property-specific
                </label>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                  disabled={!newTemplate.name || !newTemplate.description}
                  className="flex-1"
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
                <Button variant="outline" onClick={resetDialog}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Template List */}
      <div className="space-y-2">
        {sortedTemplates.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No templates available</p>
            <p className="text-xs">Create your first template to get started</p>
          </div>
        ) : (
          sortedTemplates.map((template) => (
            <div
              key={template.id}
              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleTemplateSelect(template)}
                className="flex-1 justify-start h-auto p-0"
              >
                <div className="flex items-center gap-2 w-full">
                  {template.isFrequent && (
                    <Star className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{template.name}</p>
                      {template.amount && (
                        <span className="text-xs font-mono text-muted-foreground flex-shrink-0">
                          {template.amount.toLocaleString()} VND
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {template.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {template.category}
                      </span>
                      {template.lastUsed && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <div className="flex items-center gap-1">
                            <Clock className="w-2 h-2" />
                            <span className="text-xs text-muted-foreground">
                              {formatLastUsed(template.lastUsed)}
                            </span>
                          </div>
                        </>
                      )}
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        Used {template.useCount}x
                      </span>
                    </div>
                  </div>
                </div>
              </Button>
              
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditTemplate(template)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
