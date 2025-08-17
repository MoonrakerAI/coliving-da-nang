'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CommunicationTemplate } from '@/lib/db/models/communication';
import NoteEditor from '@/components/communications/NoteEditor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function NewCommunicationPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
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
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (note: {
    type: any;
    subject: string;
    content: string;
    priority: any;
    tags: string[];
    duration?: number;
  }) => {
    try {
      const response = await fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          propertyId: '', // Will need to get this from tenant data
          type: note.type,
          subject: note.subject,
          content: note.content,
          timestamp: new Date(),
          duration: note.duration,
          priority: note.priority,
          status: 'Open',
          attachments: [],
          tags: note.tags
        })
      });

      if (response.ok) {
        toast.success('Communication saved successfully');
        router.push(`/tenants/${tenantId}/communications`);
      } else {
        throw new Error('Failed to save communication');
      }
    } catch (error) {
      console.error('Error saving communication:', error);
      toast.error('Failed to save communication');
    }
  };

  const handleCancel = () => {
    router.push(`/tenants/${tenantId}/communications`);
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
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={handleCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Communications
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Communication</h1>
          <p className="text-gray-600 mt-2">Create a new communication entry</p>
        </div>
      </div>

      <NoteEditor
        onSave={handleSave}
        onCancel={handleCancel}
        templates={templates}
      />
    </div>
  );
}
