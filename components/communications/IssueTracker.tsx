'use client';

import { useState } from 'react';
import { Communication, CommunicationStatus, CommunicationPriority } from '@/lib/db/models/communication';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Clock, CheckCircle, XCircle, ArrowUp, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface IssueTrackerProps {
  issues: Communication[];
  onUpdateStatus: (issueId: string, status: CommunicationStatus, notes?: string) => void;
  onEscalateIssue: (issueId: string, escalation: { escalatedTo: string; reason: string; notes?: string }) => void;
  onAssignIssue: (issueId: string, assignedTo: string) => void;
}

export default function IssueTracker({
  issues,
  onUpdateStatus,
  onEscalateIssue,
  onAssignIssue
}: IssueTrackerProps) {
  const [selectedIssue, setSelectedIssue] = useState<Communication | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<{
    issueId: string;
    status: CommunicationStatus;
    notes: string;
  } | null>(null);
  const [escalationForm, setEscalationForm] = useState<{
    issueId: string;
    escalatedTo: string;
    reason: string;
    notes: string;
  } | null>(null);
  const [assignmentForm, setAssignmentForm] = useState<{
    issueId: string;
    assignedTo: string;
  } | null>(null);

  const getStatusIcon = (status: CommunicationStatus) => {
    switch (status) {
      case CommunicationStatus.OPEN:
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case CommunicationStatus.IN_PROGRESS:
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case CommunicationStatus.RESOLVED:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case CommunicationStatus.CLOSED:
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: CommunicationPriority) => {
    switch (priority) {
      case CommunicationPriority.URGENT:
        return 'bg-red-500 text-white';
      case CommunicationPriority.HIGH:
        return 'bg-orange-500 text-white';
      case CommunicationPriority.MEDIUM:
        return 'bg-yellow-500 text-white';
      case CommunicationPriority.LOW:
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: CommunicationStatus) => {
    switch (status) {
      case CommunicationStatus.OPEN:
        return 'bg-red-100 text-red-800';
      case CommunicationStatus.IN_PROGRESS:
        return 'bg-yellow-100 text-yellow-800';
      case CommunicationStatus.RESOLVED:
        return 'bg-green-100 text-green-800';
      case CommunicationStatus.CLOSED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysOpen = (timestamp: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - timestamp.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const sortedIssues = [...issues].sort((a, b) => {
    // Sort by priority first (urgent first), then by date (oldest first)
    const priorityOrder = {
      [CommunicationPriority.URGENT]: 0,
      [CommunicationPriority.HIGH]: 1,
      [CommunicationPriority.MEDIUM]: 2,
      [CommunicationPriority.LOW]: 3
    };
    
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    
    return a.timestamp.getTime() - b.timestamp.getTime();
  });

  const handleStatusUpdate = () => {
    if (!statusUpdate) return;
    
    onUpdateStatus(statusUpdate.issueId, statusUpdate.status, statusUpdate.notes);
    setStatusUpdate(null);
  };

  const handleEscalation = () => {
    if (!escalationForm) return;
    
    onEscalateIssue(escalationForm.issueId, {
      escalatedTo: escalationForm.escalatedTo,
      reason: escalationForm.reason,
      notes: escalationForm.notes
    });
    setEscalationForm(null);
  };

  const handleAssignment = () => {
    if (!assignmentForm) return;
    
    onAssignIssue(assignmentForm.issueId, assignmentForm.assignedTo);
    setAssignmentForm(null);
  };

  const openIssues = sortedIssues.filter(issue => 
    issue.status === CommunicationStatus.OPEN || issue.status === CommunicationStatus.IN_PROGRESS
  );
  const resolvedIssues = sortedIssues.filter(issue => 
    issue.status === CommunicationStatus.RESOLVED || issue.status === CommunicationStatus.CLOSED
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Issue Tracker</h2>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Open: {openIssues.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Resolved: {resolvedIssues.length}</span>
          </div>
        </div>
      </div>

      {/* Open Issues */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-red-600">Open Issues ({openIssues.length})</h3>
        {openIssues.map((issue) => (
          <Card key={issue.id} className="border-l-4 border-l-red-500">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  {getStatusIcon(issue.status)}
                  <div>
                    <CardTitle className="text-lg">{issue.subject}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(issue.timestamp, 'MMM dd, yyyy')}
                      </div>
                      <span className="text-red-600 font-medium">
                        {getDaysOpen(issue.timestamp)} days open
                      </span>
                      {issue.assignedTo && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {issue.assignedTo}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(issue.priority)}>
                    {issue.priority}
                  </Badge>
                  <Badge className={getStatusColor(issue.status)}>
                    {issue.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">{issue.content}</p>
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Type: {issue.type}
                  {issue.tags.length > 0 && (
                    <span className="ml-2">
                      Tags: {issue.tags.join(', ')}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStatusUpdate({
                      issueId: issue.id,
                      status: CommunicationStatus.IN_PROGRESS,
                      notes: ''
                    })}
                  >
                    Update Status
                  </Button>
                  {!issue.assignedTo && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAssignmentForm({
                        issueId: issue.id,
                        assignedTo: ''
                      })}
                    >
                      Assign
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEscalationForm({
                      issueId: issue.id,
                      escalatedTo: '',
                      reason: '',
                      notes: ''
                    })}
                  >
                    <ArrowUp className="h-4 w-4 mr-1" />
                    Escalate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resolved Issues */}
      {resolvedIssues.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-green-600">Resolved Issues ({resolvedIssues.length})</h3>
          {resolvedIssues.slice(0, 5).map((issue) => (
            <Card key={issue.id} className="border-l-4 border-l-green-500 opacity-75">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(issue.status)}
                    <div>
                      <CardTitle className="text-lg">{issue.subject}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(issue.timestamp, 'MMM dd, yyyy')}
                        </div>
                        {issue.assignedTo && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {issue.assignedTo}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(issue.priority)}>
                      {issue.priority}
                    </Badge>
                    <Badge className={getStatusColor(issue.status)}>
                      {issue.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
          {resolvedIssues.length > 5 && (
            <p className="text-sm text-gray-600 text-center">
              ... and {resolvedIssues.length - 5} more resolved issues
            </p>
          )}
        </div>
      )}

      {/* Status Update Modal */}
      {statusUpdate && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Update Issue Status</h3>
            <div className="space-y-4">
              <Select 
                value={statusUpdate.status} 
                onValueChange={(value) => setStatusUpdate(prev => prev ? { ...prev, status: value as CommunicationStatus } : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(CommunicationStatus).map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Add notes about this status update..."
                value={statusUpdate.notes}
                onChange={(e) => setStatusUpdate(prev => prev ? { ...prev, notes: e.target.value } : null)}
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStatusUpdate(null)}>
                  Cancel
                </Button>
                <Button onClick={handleStatusUpdate}>
                  Update Status
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Escalation Modal */}
      {escalationForm && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Escalate Issue</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Escalate to (User ID or Email)"
                value={escalationForm.escalatedTo}
                onChange={(e) => setEscalationForm(prev => prev ? { ...prev, escalatedTo: e.target.value } : null)}
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Escalation reason"
                value={escalationForm.reason}
                onChange={(e) => setEscalationForm(prev => prev ? { ...prev, reason: e.target.value } : null)}
                className="w-full p-2 border rounded"
              />
              <Textarea
                placeholder="Additional notes..."
                value={escalationForm.notes}
                onChange={(e) => setEscalationForm(prev => prev ? { ...prev, notes: e.target.value } : null)}
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEscalationForm(null)}>
                  Cancel
                </Button>
                <Button onClick={handleEscalation}>
                  Escalate
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Assignment Modal */}
      {assignmentForm && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Assign Issue</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Assign to (User ID or Email)"
                value={assignmentForm.assignedTo}
                onChange={(e) => setAssignmentForm(prev => prev ? { ...prev, assignedTo: e.target.value } : null)}
                className="w-full p-2 border rounded"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAssignmentForm(null)}>
                  Cancel
                </Button>
                <Button onClick={handleAssignment}>
                  Assign
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
