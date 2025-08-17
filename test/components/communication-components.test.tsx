import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommunicationLog from '@/components/communications/CommunicationLog';
import NoteEditor from '@/components/communications/NoteEditor';
import IssueTracker from '@/components/communications/IssueTracker';
import TemplateSelector from '@/components/communications/TemplateSelector';
import { 
  Communication, 
  CommunicationTemplate,
  CommunicationType, 
  CommunicationPriority, 
  CommunicationStatus 
} from '@/lib/db/models/communication';

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => '2023-01-01 10:00')
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('Communication Components', () => {
  const mockCommunications: Communication[] = [
    {
      id: 'comm_1',
      tenantId: 'tenant_123',
      propertyId: 'prop_123',
      type: CommunicationType.EMAIL,
      subject: 'Test Email',
      content: 'This is a test email communication',
      timestamp: new Date('2023-01-01T10:00:00Z'),
      priority: CommunicationPriority.HIGH,
      status: CommunicationStatus.OPEN,
      createdBy: 'user_123',
      attachments: [],
      tags: ['urgent', 'follow-up'],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'comm_2',
      tenantId: 'tenant_123',
      propertyId: 'prop_123',
      type: CommunicationType.PHONE,
      subject: 'Phone Call Follow-up',
      content: 'Discussed maintenance issues',
      timestamp: new Date('2023-01-02T14:30:00Z'),
      duration: 15,
      priority: CommunicationPriority.MEDIUM,
      status: CommunicationStatus.RESOLVED,
      createdBy: 'user_123',
      attachments: [],
      tags: ['maintenance'],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockTemplates: CommunicationTemplate[] = [
    {
      id: 'tmpl_1',
      name: 'Welcome Template',
      category: 'Welcome',
      subject: 'Welcome {{tenantName}}!',
      content: 'Dear {{tenantName}}, welcome to {{propertyName}}.',
      variables: ['tenantName', 'propertyName'],
      language: 'en',
      usageCount: 5,
      isActive: true,
      createdBy: 'user_123',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'tmpl_2',
      name: 'Payment Reminder',
      category: 'Payment',
      subject: 'Payment Due',
      content: 'Your payment is due on {{dueDate}}.',
      variables: ['dueDate'],
      language: 'en',
      usageCount: 10,
      isActive: true,
      createdBy: 'user_123',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CommunicationLog', () => {
    const defaultProps = {
      tenantId: 'tenant_123',
      propertyId: 'prop_123',
      communications: mockCommunications,
      onAddCommunication: vi.fn(),
      onUpdateCommunication: vi.fn(),
      onEscalateIssue: vi.fn()
    };

    it('should render communication list', () => {
      render(<CommunicationLog {...defaultProps} />);
      
      expect(screen.getByText('Communication Log')).toBeInTheDocument();
      expect(screen.getByText('Test Email')).toBeInTheDocument();
      expect(screen.getByText('Phone Call Follow-up')).toBeInTheDocument();
    });

    it('should display communication details correctly', () => {
      render(<CommunicationLog {...defaultProps} />);
      
      // Check priority badges
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
      
      // Check communication types
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      
      // Check tags
      expect(screen.getByText('urgent')).toBeInTheDocument();
      expect(screen.getByText('maintenance')).toBeInTheDocument();
    });

    it('should filter communications by type', async () => {
      const user = userEvent.setup();
      render(<CommunicationLog {...defaultProps} />);
      
      // Open type filter dropdown
      const typeFilter = screen.getByDisplayValue('All Types');
      await user.click(typeFilter);
      
      // Select Email type
      await user.click(screen.getByText('Email'));
      
      // Should only show email communication
      expect(screen.getByText('Test Email')).toBeInTheDocument();
      expect(screen.queryByText('Phone Call Follow-up')).not.toBeInTheDocument();
    });

    it('should filter communications by search term', async () => {
      const user = userEvent.setup();
      render(<CommunicationLog {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search communications...');
      await user.type(searchInput, 'maintenance');
      
      // Should only show communications containing "maintenance"
      expect(screen.queryByText('Test Email')).not.toBeInTheDocument();
      expect(screen.getByText('Phone Call Follow-up')).toBeInTheDocument();
    });

    it('should open add communication form', async () => {
      const user = userEvent.setup();
      render(<CommunicationLog {...defaultProps} />);
      
      const addButton = screen.getByText('Add Communication');
      await user.click(addButton);
      
      expect(screen.getByText('Add New Communication')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Subject')).toBeInTheDocument();
    });

    it('should call onAddCommunication when form is submitted', async () => {
      const user = userEvent.setup();
      const mockOnAdd = vi.fn();
      
      render(<CommunicationLog {...defaultProps} onAddCommunication={mockOnAdd} />);
      
      // Open add form
      await user.click(screen.getByText('Add Communication'));
      
      // Fill form
      await user.type(screen.getByPlaceholderText('Subject'), 'New Communication');
      await user.type(screen.getByPlaceholderText('Communication content'), 'Test content');
      
      // Submit form
      await user.click(screen.getByText('Add Communication'));
      
      expect(mockOnAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'New Communication',
          content: 'Test content',
          tenantId: 'tenant_123',
          propertyId: 'prop_123'
        })
      );
    });

    it('should show escalation form when escalate button is clicked', async () => {
      const user = userEvent.setup();
      render(<CommunicationLog {...defaultProps} />);
      
      const escalateButtons = screen.getAllByText('Escalate');
      await user.click(escalateButtons[0]);
      
      expect(screen.getByText('Escalate Issue')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Escalate to (User ID)')).toBeInTheDocument();
    });
  });

  describe('NoteEditor', () => {
    const defaultProps = {
      onSave: vi.fn(),
      templates: mockTemplates
    };

    it('should render note editor form', () => {
      render(<NoteEditor {...defaultProps} />);
      
      expect(screen.getByText('Create New Note')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter note subject')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter note content...')).toBeInTheDocument();
    });

    it('should show template selector when templates are provided', () => {
      render(<NoteEditor {...defaultProps} />);
      
      expect(screen.getByText('Use Template (Optional)')).toBeInTheDocument();
      expect(screen.getByText('Select a template...')).toBeInTheDocument();
    });

    it('should populate form when template is selected', async () => {
      const user = userEvent.setup();
      render(<NoteEditor {...defaultProps} />);
      
      // Open template dropdown
      const templateSelect = screen.getByText('Select a template...');
      await user.click(templateSelect);
      
      // Select welcome template
      await user.click(screen.getByText('Welcome Template'));
      
      // Check if form is populated
      expect(screen.getByDisplayValue('Welcome Template')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Dear {{tenantName}}, welcome to {{propertyName}}.')).toBeInTheDocument();
    });

    it('should show duration field for phone calls and meetings', async () => {
      const user = userEvent.setup();
      render(<NoteEditor {...defaultProps} />);
      
      // Select phone call type
      const typeSelect = screen.getByDisplayValue('General Note');
      await user.click(typeSelect);
      await user.click(screen.getByText('Phone Call'));
      
      expect(screen.getByPlaceholderText('Enter duration in minutes')).toBeInTheDocument();
    });

    it('should call onSave with correct data', async () => {
      const user = userEvent.setup();
      const mockOnSave = vi.fn();
      
      render(<NoteEditor {...defaultProps} onSave={mockOnSave} />);
      
      // Fill form
      await user.type(screen.getByPlaceholderText('Enter note subject'), 'Test Note');
      await user.type(screen.getByPlaceholderText('Enter note content...'), 'Test content');
      
      // Save note
      await user.click(screen.getByText('Save Note'));
      
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Test Note',
          content: 'Test content',
          type: CommunicationType.GENERAL,
          priority: CommunicationPriority.MEDIUM
        })
      );
    });

    it('should manage tags correctly', async () => {
      const user = userEvent.setup();
      render(<NoteEditor {...defaultProps} />);
      
      // Add a tag
      const tagInput = screen.getByPlaceholderText('Add tag');
      await user.type(tagInput, 'urgent');
      await user.click(screen.getByRole('button', { name: /plus/i }));
      
      expect(screen.getByText('urgent')).toBeInTheDocument();
      
      // Remove the tag
      const removeButton = screen.getByRole('button', { name: /x/i });
      await user.click(removeButton);
      
      expect(screen.queryByText('urgent')).not.toBeInTheDocument();
    });
  });

  describe('IssueTracker', () => {
    const issues = mockCommunications.filter(comm => 
      comm.status === CommunicationStatus.OPEN || comm.status === CommunicationStatus.IN_PROGRESS
    );

    const defaultProps = {
      issues,
      onUpdateStatus: vi.fn(),
      onEscalateIssue: vi.fn(),
      onAssignIssue: vi.fn()
    };

    it('should render issue tracker with open issues', () => {
      render(<IssueTracker {...defaultProps} />);
      
      expect(screen.getByText('Issue Tracker')).toBeInTheDocument();
      expect(screen.getByText('Open Issues (1)')).toBeInTheDocument();
      expect(screen.getByText('Test Email')).toBeInTheDocument();
    });

    it('should show issue statistics', () => {
      render(<IssueTracker {...defaultProps} />);
      
      expect(screen.getByText('Open: 1')).toBeInTheDocument();
      expect(screen.getByText('Resolved: 0')).toBeInTheDocument();
    });

    it('should display days open for issues', () => {
      render(<IssueTracker {...defaultProps} />);
      
      // Should show days since the issue was created
      expect(screen.getByText(/days open/)).toBeInTheDocument();
    });

    it('should open status update modal', async () => {
      const user = userEvent.setup();
      render(<IssueTracker {...defaultProps} />);
      
      const updateButton = screen.getByText('Update Status');
      await user.click(updateButton);
      
      expect(screen.getByText('Update Issue Status')).toBeInTheDocument();
      expect(screen.getByText('Select status')).toBeInTheDocument();
    });

    it('should call onUpdateStatus when status is updated', async () => {
      const user = userEvent.setup();
      const mockOnUpdate = vi.fn();
      
      render(<IssueTracker {...defaultProps} onUpdateStatus={mockOnUpdate} />);
      
      // Open status update modal
      await user.click(screen.getByText('Update Status'));
      
      // Select resolved status
      const statusSelect = screen.getByText('Select status');
      await user.click(statusSelect);
      await user.click(screen.getByText('Resolved'));
      
      // Add notes
      await user.type(screen.getByPlaceholderText('Add notes about this status update...'), 'Issue resolved');
      
      // Update status
      await user.click(screen.getByText('Update Status'));
      
      expect(mockOnUpdate).toHaveBeenCalledWith(
        'comm_1',
        CommunicationStatus.RESOLVED,
        'Issue resolved'
      );
    });
  });

  describe('TemplateSelector', () => {
    const defaultProps = {
      templates: mockTemplates,
      categories: ['Welcome', 'Payment', 'General'],
      onSelectTemplate: vi.fn(),
      onCreateTemplate: vi.fn(),
      onUpdateTemplate: vi.fn(),
      onDeleteTemplate: vi.fn()
    };

    it('should render template selector with templates', () => {
      render(<TemplateSelector {...defaultProps} />);
      
      expect(screen.getByText('Communication Templates')).toBeInTheDocument();
      expect(screen.getByText('Welcome Template')).toBeInTheDocument();
      expect(screen.getByText('Payment Reminder')).toBeInTheDocument();
    });

    it('should show template usage statistics', () => {
      render(<TemplateSelector {...defaultProps} />);
      
      expect(screen.getByText('Used 5 times')).toBeInTheDocument();
      expect(screen.getByText('Used 10 times')).toBeInTheDocument();
    });

    it('should filter templates by search term', async () => {
      const user = userEvent.setup();
      render(<TemplateSelector {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search templates...');
      await user.type(searchInput, 'welcome');
      
      expect(screen.getByText('Welcome Template')).toBeInTheDocument();
      expect(screen.queryByText('Payment Reminder')).not.toBeInTheDocument();
    });

    it('should filter templates by category', async () => {
      const user = userEvent.setup();
      render(<TemplateSelector {...defaultProps} />);
      
      // Open category filter
      const categoryFilter = screen.getByDisplayValue('All Categories');
      await user.click(categoryFilter);
      
      // Select Payment category
      await user.click(screen.getByText('Payment'));
      
      expect(screen.queryByText('Welcome Template')).not.toBeInTheDocument();
      expect(screen.getByText('Payment Reminder')).toBeInTheDocument();
    });

    it('should call onSelectTemplate when template is used', async () => {
      const user = userEvent.setup();
      const mockOnSelect = vi.fn();
      
      render(<TemplateSelector {...defaultProps} onSelectTemplate={mockOnSelect} />);
      
      const useButtons = screen.getAllByText('Use Template');
      await user.click(useButtons[1]); // Payment template (no variables)
      
      expect(mockOnSelect).toHaveBeenCalledWith(mockTemplates[1]);
    });

    it('should show variable input for templates with variables', async () => {
      const user = userEvent.setup();
      render(<TemplateSelector {...defaultProps} />);
      
      const useButtons = screen.getAllByText('Use Template');
      await user.click(useButtons[0]); // Welcome template (has variables)
      
      expect(screen.getByText('Use Template: Welcome Template')).toBeInTheDocument();
      expect(screen.getByText('Fill in Template Variables')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter tenantName')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter propertyName')).toBeInTheDocument();
    });

    it('should open create template dialog', async () => {
      const user = userEvent.setup();
      render(<TemplateSelector {...defaultProps} />);
      
      const createButton = screen.getByText('Create Template');
      await user.click(createButton);
      
      expect(screen.getByText('Create New Template')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter template name')).toBeInTheDocument();
    });

    it('should call onCreateTemplate when new template is created', async () => {
      const user = userEvent.setup();
      const mockOnCreate = vi.fn();
      
      render(<TemplateSelector {...defaultProps} onCreateTemplate={mockOnCreate} />);
      
      // Open create dialog
      await user.click(screen.getByText('Create Template'));
      
      // Fill form
      await user.type(screen.getByPlaceholderText('Enter template name'), 'New Template');
      
      // Select category
      const categorySelect = screen.getByText('Select category');
      await user.click(categorySelect);
      await user.click(screen.getByText('General'));
      
      await user.type(screen.getByPlaceholderText('Enter subject template'), 'New Subject');
      await user.type(screen.getByPlaceholderText('Enter content template. Use {{variableName}} for variables.'), 'New content with {{variable}}');
      
      // Create template
      await user.click(screen.getByText('Create Template'));
      
      expect(mockOnCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Template',
          category: 'General',
          subject: 'New Subject',
          content: 'New content with {{variable}}'
        })
      );
    });
  });
});
