'use client';

import { useState, useEffect } from 'react';
import { CommunicationTemplate } from '@/lib/db/models/communication';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Plus, Edit, Trash2, Copy, Eye } from 'lucide-react';

interface TemplateSelectorProps {
  templates: CommunicationTemplate[];
  onSelectTemplate: (template: CommunicationTemplate, variables?: Record<string, string>) => void;
  onCreateTemplate?: (template: Omit<CommunicationTemplate, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateTemplate?: (id: string, template: Partial<CommunicationTemplate>) => void;
  onDeleteTemplate?: (id: string) => void;
  categories: string[];
}

export default function TemplateSelector({
  templates,
  onSelectTemplate,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  categories
}: TemplateSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CommunicationTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CommunicationTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: '',
    subject: '',
    content: '',
    variables: [] as string[],
    language: 'en',
    isActive: true
  });

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchTerm === '' || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory && template.isActive;
  });

  const sortedTemplates = filteredTemplates.sort((a, b) => {
    // Sort by usage count (most used first), then by name
    if (b.usageCount !== a.usageCount) {
      return b.usageCount - a.usageCount;
    }
    return a.name.localeCompare(b.name);
  });

  const extractVariables = (content: string): string[] => {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = variableRegex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  };

  const handleCreateTemplate = () => {
    if (!onCreateTemplate) return;
    
    const variables = extractVariables(newTemplate.content);
    
    onCreateTemplate({
      ...newTemplate,
      variables,
      createdBy: '' // Will be set by API
    });

    setNewTemplate({
      name: '',
      category: '',
      subject: '',
      content: '',
      variables: [],
      language: 'en',
      isActive: true
    });
    setShowCreateForm(false);
  };

  const handleUpdateTemplate = () => {
    if (!editingTemplate || !onUpdateTemplate) return;
    
    const variables = extractVariables(editingTemplate.content);
    
    onUpdateTemplate(editingTemplate.id, {
      ...editingTemplate,
      variables
    });
    
    setEditingTemplate(null);
  };

  const handleUseTemplate = (template: CommunicationTemplate) => {
    if (template.variables.length > 0) {
      // Initialize variables
      const variables: Record<string, string> = {};
      template.variables.forEach(variable => {
        variables[variable] = templateVariables[variable] || '';
      });
      setTemplateVariables(variables);
      setPreviewTemplate(template);
    } else {
      onSelectTemplate(template);
    }
  };

  const applyTemplate = () => {
    if (!previewTemplate) return;
    
    onSelectTemplate(previewTemplate, templateVariables);
    setPreviewTemplate(null);
    setTemplateVariables({});
  };

  const renderTemplateContent = (content: string, variables: Record<string, string>) => {
    let processedContent = content;
    Object.entries(variables).forEach(([variable, value]) => {
      const placeholder = `{{${variable}}}`;
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value || `{{${variable}}}`);
    });
    return processedContent;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Communication Templates</h2>
        {onCreateTemplate && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{template.category}</Badge>
                    {template.usageCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        Used {template.usageCount} times
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewTemplate(template)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {onUpdateTemplate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingTemplate(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {onDeleteTemplate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">{template.subject}</p>
              <p className="text-sm text-gray-700 line-clamp-3 mb-4">
                {template.content.substring(0, 150)}...
              </p>
              
              {template.variables.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Variables:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map(variable => (
                      <Badge key={variable} variant="outline" className="text-xs">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => handleUseTemplate(template)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Use Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Template Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter template name"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={newTemplate.category} onValueChange={(value) => 
                  setNewTemplate(prev => ({ ...prev, category: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Subject Template</Label>
              <Input
                value={newTemplate.subject}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Enter subject template"
              />
            </div>
            <div>
              <Label>Content Template</Label>
              <Textarea
                value={newTemplate.content}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter content template. Use {{variableName}} for variables."
                rows={8}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use double curly braces for variables: {`{{tenantName}}, {{propertyAddress}}`}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate}>
                Create Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Template Name</Label>
                  <Input
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={editingTemplate.category} onValueChange={(value) => 
                    setEditingTemplate(prev => prev ? { ...prev, category: value } : null)
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Subject Template</Label>
                <Input
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, subject: e.target.value } : null)}
                />
              </div>
              <div>
                <Label>Content Template</Label>
                <Textarea
                  value={editingTemplate.content}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, content: e.target.value } : null)}
                  rows={8}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateTemplate}>
                  Update Template
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Preview with Variables Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Use Template: {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              {previewTemplate.variables.length > 0 && (
                <div className="space-y-3">
                  <Label>Fill in Template Variables</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {previewTemplate.variables.map(variable => (
                      <div key={variable}>
                        <Label className="text-sm">{variable}</Label>
                        <Input
                          placeholder={`Enter ${variable}`}
                          value={templateVariables[variable] || ''}
                          onChange={(e) => setTemplateVariables(prev => ({
                            ...prev,
                            [variable]: e.target.value
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <Label>Preview</Label>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium mb-2">
                    Subject: {renderTemplateContent(previewTemplate.subject, templateVariables)}
                  </p>
                  <div className="text-sm whitespace-pre-wrap">
                    {renderTemplateContent(previewTemplate.content, templateVariables)}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                  Cancel
                </Button>
                <Button onClick={applyTemplate}>
                  Use This Template
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
