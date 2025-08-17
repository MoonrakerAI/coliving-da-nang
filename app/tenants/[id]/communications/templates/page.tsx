'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CommunicationTemplate } from '@/lib/db/models/communication';
import TemplateSelector from '@/components/communications/TemplateSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileTemplate, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CommunicationTemplatesPage() {
  const params = useParams();
  const tenantId = params.id as string;

  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
    loadCategories();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/communications/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/communications/templates/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories([...data, 'Welcome', 'Payment Reminder', 'Maintenance', 'General']);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleCreateTemplate = async (template: Omit<CommunicationTemplate, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await fetch('/api/communications/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });

      if (response.ok) {
        const newTemplate = await response.json();
        setTemplates(prev => [newTemplate, ...prev]);
        toast.success('Template created successfully');
        await loadCategories(); // Refresh categories
      } else {
        throw new Error('Failed to create template');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  const handleUpdateTemplate = async (id: string, updates: Partial<CommunicationTemplate>) => {
    try {
      const response = await fetch(`/api/communications/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedTemplate = await response.json();
        setTemplates(prev => 
          prev.map(tmpl => tmpl.id === id ? updatedTemplate : tmpl)
        );
        toast.success('Template updated successfully');
        await loadCategories(); // Refresh categories
      } else {
        throw new Error('Failed to update template');
      }
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await fetch(`/api/communications/templates/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setTemplates(prev => prev.filter(tmpl => tmpl.id !== id));
        toast.success('Template deleted successfully');
        await loadCategories(); // Refresh categories
      } else {
        throw new Error('Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleSelectTemplate = async (template: CommunicationTemplate, variables?: Record<string, string>) => {
    // Increment usage count
    await fetch(`/api/communications/templates/${template.id}`, { method: 'POST' });
    
    // Process template content with variables
    let processedContent = template.content;
    let processedSubject = template.subject;
    
    if (variables) {
      Object.entries(variables).forEach(([variable, value]) => {
        const placeholder = `{{${variable}}}`;
        processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
        processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), value);
      });
    }

    // Create a new communication with the template content
    try {
      const response = await fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          propertyId: '', // Will need to get this from tenant data
          type: 'General',
          subject: processedSubject,
          content: processedContent,
          timestamp: new Date(),
          priority: 'Medium',
          status: 'Open',
          attachments: [],
          tags: [template.category]
        })
      });

      if (response.ok) {
        toast.success('Communication created from template');
        // Optionally redirect to communications page
        window.location.href = `/tenants/${tenantId}/communications`;
      } else {
        throw new Error('Failed to create communication from template');
      }
    } catch (error) {
      console.error('Error creating communication from template:', error);
      toast.error('Failed to create communication from template');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Communication Templates</h1>
          <p className="text-gray-600 mt-2">Manage and use communication templates</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <FileTemplate className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Used</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.length > 0 ? Math.max(...templates.map(t => t.usageCount)) : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Template Selector */}
      <TemplateSelector
        templates={templates}
        categories={categories}
        onSelectTemplate={handleSelectTemplate}
        onCreateTemplate={handleCreateTemplate}
        onUpdateTemplate={handleUpdateTemplate}
        onDeleteTemplate={handleDeleteTemplate}
      />
    </div>
  );
}
