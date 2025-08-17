'use client';

import { useState } from 'react';
import { CommunicationType, CommunicationPriority } from '@/lib/db/models/communication';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Save, FileText } from 'lucide-react';

interface NoteTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
}

interface NoteEditorProps {
  onSave: (note: {
    type: CommunicationType;
    subject: string;
    content: string;
    priority: CommunicationPriority;
    tags: string[];
    duration?: number;
  }) => void;
  templates?: NoteTemplate[];
  onCancel?: () => void;
  initialData?: {
    type?: CommunicationType;
    subject?: string;
    content?: string;
    priority?: CommunicationPriority;
    tags?: string[];
    duration?: number;
  };
}

export default function NoteEditor({ 
  onSave, 
  templates = [], 
  onCancel,
  initialData 
}: NoteEditorProps) {
  const [noteData, setNoteData] = useState({
    type: initialData?.type || CommunicationType.GENERAL,
    subject: initialData?.subject || '',
    content: initialData?.content || '',
    priority: initialData?.priority || CommunicationPriority.MEDIUM,
    tags: initialData?.tags || [],
    duration: initialData?.duration
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [newTag, setNewTag] = useState('');
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});

  const noteCategories = [
    { value: CommunicationType.MAINTENANCE_REQUEST, label: 'Maintenance Request', color: 'bg-orange-100 text-orange-800' },
    { value: CommunicationType.COMPLAINT, label: 'Complaint', color: 'bg-red-100 text-red-800' },
    { value: CommunicationType.PHONE, label: 'Phone Call', color: 'bg-blue-100 text-blue-800' },
    { value: CommunicationType.IN_PERSON, label: 'In-Person Meeting', color: 'bg-green-100 text-green-800' },
    { value: CommunicationType.EMAIL, label: 'Email', color: 'bg-purple-100 text-purple-800' },
    { value: CommunicationType.WHATSAPP, label: 'WhatsApp', color: 'bg-emerald-100 text-emerald-800' },
    { value: CommunicationType.GENERAL, label: 'General Note', color: 'bg-gray-100 text-gray-800' }
  ];

  const priorityOptions = [
    { value: CommunicationPriority.LOW, label: 'Low', color: 'bg-green-100 text-green-800' },
    { value: CommunicationPriority.MEDIUM, label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: CommunicationPriority.HIGH, label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: CommunicationPriority.URGENT, label: 'Urgent', color: 'bg-red-100 text-red-800' }
  ];

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    setSelectedTemplate(templateId);
    setNoteData(prev => ({
      ...prev,
      subject: template.name,
      content: template.content
    }));

    // Initialize template variables
    const variables: Record<string, string> = {};
    template.variables.forEach(variable => {
      variables[variable] = '';
    });
    setTemplateVariables(variables);
  };

  const applyTemplateVariables = () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;

    let processedContent = template.content;
    Object.entries(templateVariables).forEach(([variable, value]) => {
      const placeholder = `{{${variable}}}`;
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
    });

    setNoteData(prev => ({
      ...prev,
      content: processedContent
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !noteData.tags.includes(newTag.trim())) {
      setNoteData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNoteData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSave = () => {
    if (!noteData.subject.trim() || !noteData.content.trim()) {
      return;
    }

    onSave(noteData);
  };

  const isCallOrMeeting = noteData.type === CommunicationType.PHONE || noteData.type === CommunicationType.IN_PERSON;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {initialData ? 'Edit Note' : 'Create New Note'}
          </CardTitle>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Selection */}
        {templates.length > 0 && (
          <div className="space-y-3">
            <Label>Use Template (Optional)</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                      {template.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Template Variables */}
            {selectedTemplate && templates.find(t => t.id === selectedTemplate)?.variables.length > 0 && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <Label className="text-sm font-medium">Template Variables</Label>
                <div className="grid grid-cols-2 gap-3">
                  {templates.find(t => t.id === selectedTemplate)?.variables.map(variable => (
                    <div key={variable}>
                      <Label className="text-xs text-gray-600">{variable}</Label>
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
                <Button size="sm" onClick={applyTemplateVariables}>
                  Apply Variables
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Note Type and Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Note Type</Label>
            <Select value={noteData.type} onValueChange={(value) => 
              setNoteData(prev => ({ ...prev, type: value as CommunicationType }))
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {noteCategories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${category.color.split(' ')[0]}`} />
                      {category.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={noteData.priority} onValueChange={(value) => 
              setNoteData(prev => ({ ...prev, priority: value as CommunicationPriority }))
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map(priority => (
                  <SelectItem key={priority.value} value={priority.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${priority.color.split(' ')[0]}`} />
                      {priority.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Duration for calls/meetings */}
        {isCallOrMeeting && (
          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              placeholder="Enter duration in minutes"
              value={noteData.duration || ''}
              onChange={(e) => setNoteData(prev => ({ 
                ...prev, 
                duration: e.target.value ? parseInt(e.target.value) : undefined 
              }))}
            />
          </div>
        )}

        {/* Subject */}
        <div className="space-y-2">
          <Label>Subject</Label>
          <Input
            placeholder="Enter note subject"
            value={noteData.subject}
            onChange={(e) => setNoteData(prev => ({ ...prev, subject: e.target.value }))}
          />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Label>Content</Label>
          <Textarea
            placeholder="Enter note content..."
            value={noteData.content}
            onChange={(e) => setNoteData(prev => ({ ...prev, content: e.target.value }))}
            rows={8}
            className="resize-none"
          />
        </div>

        {/* Tags */}
        <div className="space-y-3">
          <Label>Tags</Label>
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Add tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
              className="flex-1"
            />
            <Button size="sm" onClick={addTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {noteData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {noteData.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleSave}
            disabled={!noteData.subject.trim() || !noteData.content.trim()}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Note
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
