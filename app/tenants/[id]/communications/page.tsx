'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Communication, CommunicationTemplate } from '@/lib/db/models/communication';
import CommunicationLog from '@/components/communications/CommunicationLog';
import NoteEditor from '@/components/communications/NoteEditor';
import IssueTracker from '@/components/communications/IssueTracker';
import TemplateSelector from '@/components/communications/TemplateSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, MessageSquare, AlertTriangle, FileText, File } from 'lucide-react';
import { toast } from 'sonner';

export default function TenantCommunicationsPage() {
  const params = useParams();
  const tenantId = params.id as string;

  const [communications, setCommunications] = useState<Communication[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [activeTab, setActiveTab] = useState('log');

  useEffect(() => {
    loadCommunications();
    loadTemplates();
    loadCategories();
  }, [tenantId]);

  const loadCommunications = async () => {
    try {
      const response = await fetch(`/api/communications?tenantId=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setCommunications(data);
      }
    } catch (error) {
      console.error('Error loading communications:', error);
      toast.error('Failed to load communications');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/communications/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/communications/templates/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleAddCommunication = async (communication: Omit<Communication, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(communication)
      });

      if (response.ok) {
        const newCommunication = await response.json();
        setCommunications(prev => [newCommunication, ...prev]);
        toast.success('Communication added successfully');
      } else {
        throw new Error('Failed to add communication');
      }
    } catch (error) {
      console.error('Error adding communication:', error);
      toast.error('Failed to add communication');
    }
  };

  const handleUpdateCommunication = async (id: string, updates: Partial<Communication>) => {
    try {
      const response = await fetch(`/api/communications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedCommunication = await response.json();
        setCommunications(prev => 
          prev.map(comm => comm.id === id ? updatedCommunication : comm)
        );
        toast.success('Communication updated successfully');
      } else {
        throw new Error('Failed to update communication');
      }
    } catch (error) {
      console.error('Error updating communication:', error);
      toast.error('Failed to update communication');
    }
  };

  const handleEscalateIssue = async (communicationId: string, escalation: { escalatedTo: string; reason: string; notes?: string }) => {
    try {
      const response = await fetch(`/api/communications/${communicationId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(escalation)
      });

      if (response.ok) {
        await loadCommunications(); // Reload to get updated status
        toast.success('Issue escalated successfully');
      } else {
        throw new Error('Failed to escalate issue');
      }
    } catch (error) {
      console.error('Error escalating issue:', error);
      toast.error('Failed to escalate issue');
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
      } else {
        throw new Error('Failed to update template');
      }
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const response = await fetch(`/api/communications/templates/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setTemplates(prev => prev.filter(tmpl => tmpl.id !== id));
        toast.success('Template deleted successfully');
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
    if (variables) {
      Object.entries(variables).forEach(([variable, value]) => {
        const placeholder = `{{${variable}}}`;
        processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
      });
    }

    // Switch to note editor with template data
    setShowNoteEditor(true);
    setActiveTab('editor');
  };

  const issues = communications.filter(comm => 
    comm.type === 'Maintenance Request' || 
    comm.type === 'Complaint' || 
    comm.status === 'Open' || 
    comm.status === 'In Progress'
  );

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
          <h1 className="text-3xl font-bold">Tenant Communications</h1>
          <p className="text-gray-600 mt-2">Manage all communications for this tenant</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setShowNoteEditor(true);
              setActiveTab('editor');
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Quick Note
          </Button>
          <Button onClick={() => setActiveTab('templates')}>
            <File className="h-4 w-4 mr-2" />
            Use Template
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Communications</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{communications.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {issues.filter(i => i.status === 'Open').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <FileText className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {issues.filter(i => i.status === 'In Progress').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {communications.filter(comm => {
                const commDate = new Date(comm.timestamp);
                const now = new Date();
                return commDate.getMonth() === now.getMonth() && 
                       commDate.getFullYear() === now.getFullYear();
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="log">Communication Log</TabsTrigger>
          <TabsTrigger value="issues">Issue Tracker</TabsTrigger>
          <TabsTrigger value="editor">Note Editor</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="mt-6">
          <CommunicationLog
            tenantId={tenantId}
            communications={communications}
            onAddCommunication={handleAddCommunication}
            onUpdateCommunication={handleUpdateCommunication}
            onEscalateIssue={handleEscalateIssue}
          />
        </TabsContent>

        <TabsContent value="issues" className="mt-6">
          <IssueTracker
            issues={issues}
            onUpdateStatus={(issueId, status, notes) => 
              handleUpdateCommunication(issueId, { status, ...(notes && { content: notes }) })
            }
            onEscalateIssue={handleEscalateIssue}
            onAssignIssue={(issueId, assignedTo) => 
              handleUpdateCommunication(issueId, { assignedTo })
            }
          />
        </TabsContent>

        <TabsContent value="editor" className="mt-6">
          {showNoteEditor ? (
            <NoteEditor
              onSave={(note) => {
                handleAddCommunication({
                  tenantId,
                  propertyId: '', // Will need to get this from tenant data
                  type: note.type,
                  subject: note.subject,
                  content: note.content,
                  timestamp: new Date(),
                  duration: note.duration,
                  priority: note.priority,
                  status: 'Open',
                  createdBy: '',
                  attachments: [],
                  tags: note.tags
                });
                setShowNoteEditor(false);
              }}
              onCancel={() => setShowNoteEditor(false)}
              templates={templates}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No note is being edited</p>
                  <Button onClick={() => setShowNoteEditor(true)}>
                    Create New Note
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplateSelector
            templates={templates}
            categories={categories}
            onSelectTemplate={handleSelectTemplate}
            onCreateTemplate={handleCreateTemplate}
            onUpdateTemplate={handleUpdateTemplate}
            onDeleteTemplate={handleDeleteTemplate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
