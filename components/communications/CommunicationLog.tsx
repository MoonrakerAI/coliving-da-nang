'use client';

import { useState, useEffect } from 'react';
import { Communication, CommunicationType, CommunicationPriority, CommunicationStatus } from '@/lib/db/models/communication';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, User, Tag, AlertTriangle, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface CommunicationLogProps {
  tenantId?: string;
  propertyId?: string;
  communications: Communication[];
  onAddCommunication: (communication: Omit<Communication, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateCommunication: (id: string, updates: Partial<Communication>) => void;
  onEscalateIssue: (communicationId: string, escalation: { escalatedTo: string; reason: string; notes?: string }) => void;
}

export default function CommunicationLog({
  tenantId,
  propertyId,
  communications,
  onAddCommunication,
  onUpdateCommunication,
  onEscalateIssue
}: CommunicationLogProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterType, setFilterType] = useState<CommunicationType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<CommunicationStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCommunication, setSelectedCommunication] = useState<Communication | null>(null);
  const [escalationForm, setEscalationForm] = useState<{
    communicationId: string;
    escalatedTo: string;
    reason: string;
    notes: string;
  } | null>(null);

  const [newCommunication, setNewCommunication] = useState({
    type: CommunicationType.GENERAL,
    subject: '',
    content: '',
    priority: CommunicationPriority.MEDIUM,
    duration: undefined as number | undefined,
    tags: [] as string[],
    attachments: [] as string[]
  });

  const filteredCommunications = communications.filter(comm => {
    const matchesType = filterType === 'all' || comm.type === filterType;
    const matchesStatus = filterStatus === 'all' || comm.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      comm.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comm.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesStatus && matchesSearch;
  });

  const getPriorityColor = (priority: CommunicationPriority) => {
    switch (priority) {
      case CommunicationPriority.URGENT: return 'bg-red-500';
      case CommunicationPriority.HIGH: return 'bg-orange-500';
      case CommunicationPriority.MEDIUM: return 'bg-yellow-500';
      case CommunicationPriority.LOW: return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: CommunicationStatus) => {
    switch (status) {
      case CommunicationStatus.OPEN: return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case CommunicationStatus.IN_PROGRESS: return <Clock className="h-4 w-4 text-yellow-500" />;
      case CommunicationStatus.RESOLVED: return <CheckCircle className="h-4 w-4 text-green-500" />;
      case CommunicationStatus.CLOSED: return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const handleAddCommunication = () => {
    if (!tenantId || !propertyId) return;

    onAddCommunication({
      tenantId,
      propertyId,
      type: newCommunication.type,
      subject: newCommunication.subject,
      content: newCommunication.content,
      timestamp: new Date(),
      duration: newCommunication.duration,
      priority: newCommunication.priority,
      status: CommunicationStatus.OPEN,
      createdBy: '', // Will be set by API
      attachments: newCommunication.attachments,
      tags: newCommunication.tags
    });

    setNewCommunication({
      type: CommunicationType.GENERAL,
      subject: '',
      content: '',
      priority: CommunicationPriority.MEDIUM,
      duration: undefined,
      tags: [],
      attachments: []
    });
    setShowAddForm(false);
  };

  const handleEscalate = () => {
    if (!escalationForm) return;

    onEscalateIssue(escalationForm.communicationId, {
      escalatedTo: escalationForm.escalatedTo,
      reason: escalationForm.reason,
      notes: escalationForm.notes
    });

    setEscalationForm(null);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Communication Log</h2>
        <Button onClick={() => setShowAddForm(true)}>
          Add Communication
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search communications..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filterType} onValueChange={(value) => setFilterType(value as CommunicationType | 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.values(CommunicationType).map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as CommunicationStatus | 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.values(CommunicationStatus).map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Communications List */}
      <div className="space-y-4">
        {filteredCommunications.map((comm) => (
          <Card key={comm.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  {getStatusIcon(comm.status)}
                  <div>
                    <CardTitle className="text-lg">{comm.subject}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Calendar className="h-4 w-4" />
                      {format(comm.timestamp, 'MMM dd, yyyy HH:mm')}
                      {comm.duration && (
                        <>
                          <Clock className="h-4 w-4 ml-2" />
                          {comm.duration}m
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(comm.priority)}>
                    {comm.priority}
                  </Badge>
                  <Badge variant="outline">{comm.type}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-3">{comm.content}</p>
              
              {comm.tags.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-4 w-4 text-gray-500" />
                  {comm.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  Created by {comm.createdBy}
                  {comm.assignedTo && (
                    <span className="ml-2">• Assigned to {comm.assignedTo}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCommunication(comm)}
                  >
                    View Details
                  </Button>
                  {comm.status !== CommunicationStatus.CLOSED && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEscalationForm({
                        communicationId: comm.id,
                        escalatedTo: '',
                        reason: '',
                        notes: ''
                      })}
                    >
                      Escalate
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Communication Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Communication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select value={newCommunication.type} onValueChange={(value) => 
                setNewCommunication(prev => ({ ...prev, type: value as CommunicationType }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Communication type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(CommunicationType).map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newCommunication.priority} onValueChange={(value) => 
                setNewCommunication(prev => ({ ...prev, priority: value as CommunicationPriority }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(CommunicationPriority).map(priority => (
                    <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Subject"
              value={newCommunication.subject}
              onChange={(e) => setNewCommunication(prev => ({ ...prev, subject: e.target.value }))}
            />
            <Textarea
              placeholder="Communication content"
              value={newCommunication.content}
              onChange={(e) => setNewCommunication(prev => ({ ...prev, content: e.target.value }))}
              rows={4}
            />
            {(newCommunication.type === CommunicationType.PHONE || newCommunication.type === CommunicationType.IN_PERSON) && (
              <Input
                type="number"
                placeholder="Duration (minutes)"
                value={newCommunication.duration || ''}
                onChange={(e) => setNewCommunication(prev => ({ 
                  ...prev, 
                  duration: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
              />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCommunication}>
                Add Communication
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Escalation Form */}
      {escalationForm && (
        <Card>
          <CardHeader>
            <CardTitle>Escalate Issue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Escalate to (User ID)"
              value={escalationForm.escalatedTo}
              onChange={(e) => setEscalationForm(prev => prev ? { ...prev, escalatedTo: e.target.value } : null)}
            />
            <Input
              placeholder="Escalation reason"
              value={escalationForm.reason}
              onChange={(e) => setEscalationForm(prev => prev ? { ...prev, reason: e.target.value } : null)}
            />
            <Textarea
              placeholder="Additional notes (optional)"
              value={escalationForm.notes}
              onChange={(e) => setEscalationForm(prev => prev ? { ...prev, notes: e.target.value } : null)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEscalationForm(null)}>
                Cancel
              </Button>
              <Button onClick={handleEscalate}>
                Escalate Issue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
