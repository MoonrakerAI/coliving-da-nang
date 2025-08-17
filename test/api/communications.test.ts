import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}));

vi.mock('@/lib/db/operations/communications', () => ({
  CommunicationOperations: {
    create: vi.fn(),
    getByTenant: vi.fn(),
    getByProperty: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    escalateIssue: vi.fn()
  },
  TemplateOperations: {
    create: vi.fn(),
    getAll: vi.fn(),
    getByCategory: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    incrementUsage: vi.fn(),
    getCategories: vi.fn()
  }
}));

import { POST as communicationsPost, GET as communicationsGet } from '@/app/api/communications/route';
import { GET as communicationGet, PATCH as communicationPatch, DELETE as communicationDelete } from '@/app/api/communications/[id]/route';
import { POST as escalatePost } from '@/app/api/communications/[id]/escalate/route';
import { POST as templatesPost, GET as templatesGet } from '@/app/api/communications/templates/route';
import { CommunicationOperations, TemplateOperations } from '@/lib/db/operations/communications';
import { CommunicationType, CommunicationPriority, CommunicationStatus } from '@/lib/db/models/communication';

describe('Communications API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('/api/communications', () => {
    describe('POST', () => {
      it('should create a new communication', async () => {
        const mockSession = { user: { id: 'user_123' } };
        const mockCommunication = {
          id: 'comm_123',
          tenantId: 'tenant_123',
          propertyId: 'prop_123',
          type: CommunicationType.EMAIL,
          subject: 'Test Subject',
          content: 'Test content',
          timestamp: new Date(),
          priority: CommunicationPriority.MEDIUM,
          status: CommunicationStatus.OPEN,
          createdBy: 'user_123',
          attachments: [],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        vi.mocked(getServerSession).mockResolvedValue(mockSession);
        vi.mocked(CommunicationOperations.create).mockResolvedValue(mockCommunication);

        const request = new NextRequest('http://localhost/api/communications', {
          method: 'POST',
          body: JSON.stringify({
            tenantId: 'tenant_123',
            propertyId: 'prop_123',
            type: CommunicationType.EMAIL,
            subject: 'Test Subject',
            content: 'Test content',
            timestamp: new Date().toISOString()
          })
        });

        const response = await communicationsPost(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.id).toBe('comm_123');
        expect(CommunicationOperations.create).toHaveBeenCalledWith(
          expect.objectContaining({
            tenantId: 'tenant_123',
            subject: 'Test Subject',
            createdBy: 'user_123'
          })
        );
      });

      it('should return 401 for unauthenticated requests', async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const request = new NextRequest('http://localhost/api/communications', {
          method: 'POST',
          body: JSON.stringify({})
        });

        const response = await communicationsPost(request);

        expect(response.status).toBe(401);
      });

      it('should return 500 for database errors', async () => {
        const mockSession = { user: { id: 'user_123' } };
        vi.mocked(getServerSession).mockResolvedValue(mockSession);
        vi.mocked(CommunicationOperations.create).mockRejectedValue(new Error('Database error'));

        const request = new NextRequest('http://localhost/api/communications', {
          method: 'POST',
          body: JSON.stringify({
            tenantId: 'tenant_123',
            propertyId: 'prop_123',
            type: CommunicationType.EMAIL,
            subject: 'Test Subject',
            content: 'Test content'
          })
        });

        const response = await communicationsPost(request);

        expect(response.status).toBe(500);
      });
    });

    describe('GET', () => {
      it('should get communications by tenant ID', async () => {
        const mockSession = { user: { id: 'user_123' } };
        const mockCommunications = [
          {
            id: 'comm_123',
            tenantId: 'tenant_123',
            propertyId: 'prop_123',
            type: CommunicationType.EMAIL,
            subject: 'Test Subject',
            content: 'Test content',
            timestamp: new Date(),
            priority: CommunicationPriority.MEDIUM,
            status: CommunicationStatus.OPEN,
            createdBy: 'user_123',
            attachments: [],
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];

        vi.mocked(getServerSession).mockResolvedValue(mockSession);
        vi.mocked(CommunicationOperations.getByTenant).mockResolvedValue(mockCommunications);

        const request = new NextRequest('http://localhost/api/communications?tenantId=tenant_123');

        const response = await communicationsGet(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveLength(1);
        expect(data[0].id).toBe('comm_123');
        expect(CommunicationOperations.getByTenant).toHaveBeenCalledWith(
          'tenant_123',
          expect.any(Object)
        );
      });

      it('should get communications by property ID', async () => {
        const mockSession = { user: { id: 'user_123' } };
        const mockCommunications = [];

        vi.mocked(getServerSession).mockResolvedValue(mockSession);
        vi.mocked(CommunicationOperations.getByProperty).mockResolvedValue(mockCommunications);

        const request = new NextRequest('http://localhost/api/communications?propertyId=prop_123');

        const response = await communicationsGet(request);

        expect(response.status).toBe(200);
        expect(CommunicationOperations.getByProperty).toHaveBeenCalledWith(
          'prop_123',
          expect.any(Object)
        );
      });

      it('should return 400 when neither tenantId nor propertyId is provided', async () => {
        const mockSession = { user: { id: 'user_123' } };
        vi.mocked(getServerSession).mockResolvedValue(mockSession);

        const request = new NextRequest('http://localhost/api/communications');

        const response = await communicationsGet(request);

        expect(response.status).toBe(400);
      });
    });
  });

  describe('/api/communications/[id]', () => {
    describe('GET', () => {
      it('should get communication by ID', async () => {
        const mockSession = { user: { id: 'user_123' } };
        const mockCommunication = {
          id: 'comm_123',
          tenantId: 'tenant_123',
          propertyId: 'prop_123',
          type: CommunicationType.EMAIL,
          subject: 'Test Subject',
          content: 'Test content',
          timestamp: new Date(),
          priority: CommunicationPriority.MEDIUM,
          status: CommunicationStatus.OPEN,
          createdBy: 'user_123',
          attachments: [],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        vi.mocked(getServerSession).mockResolvedValue(mockSession);
        vi.mocked(CommunicationOperations.getById).mockResolvedValue(mockCommunication);

        const request = new NextRequest('http://localhost/api/communications/comm_123');

        const response = await communicationGet(request, { params: { id: 'comm_123' } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.id).toBe('comm_123');
      });

      it('should return 404 for non-existent communication', async () => {
        const mockSession = { user: { id: 'user_123' } };
        vi.mocked(getServerSession).mockResolvedValue(mockSession);
        vi.mocked(CommunicationOperations.getById).mockResolvedValue(null);

        const request = new NextRequest('http://localhost/api/communications/nonexistent');

        const response = await communicationGet(request, { params: { id: 'nonexistent' } });

        expect(response.status).toBe(404);
      });
    });

    describe('PATCH', () => {
      it('should update communication', async () => {
        const mockSession = { user: { id: 'user_123' } };
        const mockUpdatedCommunication = {
          id: 'comm_123',
          tenantId: 'tenant_123',
          propertyId: 'prop_123',
          type: CommunicationType.EMAIL,
          subject: 'Updated Subject',
          content: 'Updated content',
          timestamp: new Date(),
          priority: CommunicationPriority.HIGH,
          status: CommunicationStatus.RESOLVED,
          createdBy: 'user_123',
          attachments: [],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        vi.mocked(getServerSession).mockResolvedValue(mockSession);
        vi.mocked(CommunicationOperations.update).mockResolvedValue(mockUpdatedCommunication);

        const request = new NextRequest('http://localhost/api/communications/comm_123', {
          method: 'PATCH',
          body: JSON.stringify({
            subject: 'Updated Subject',
            status: CommunicationStatus.RESOLVED
          })
        });

        const response = await communicationPatch(request, { params: { id: 'comm_123' } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.subject).toBe('Updated Subject');
        expect(data.status).toBe(CommunicationStatus.RESOLVED);
      });
    });

    describe('DELETE', () => {
      it('should delete communication', async () => {
        const mockSession = { user: { id: 'user_123' } };
        vi.mocked(getServerSession).mockResolvedValue(mockSession);
        vi.mocked(CommunicationOperations.delete).mockResolvedValue(true);

        const request = new NextRequest('http://localhost/api/communications/comm_123', {
          method: 'DELETE'
        });

        const response = await communicationDelete(request, { params: { id: 'comm_123' } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      });
    });
  });

  describe('/api/communications/[id]/escalate', () => {
    describe('POST', () => {
      it('should escalate communication', async () => {
        const mockSession = { user: { id: 'user_123' } };
        const mockCommunication = {
          id: 'comm_123',
          tenantId: 'tenant_123',
          propertyId: 'prop_123',
          type: CommunicationType.COMPLAINT,
          subject: 'Urgent Issue',
          content: 'This needs attention',
          timestamp: new Date(),
          priority: CommunicationPriority.HIGH,
          status: CommunicationStatus.OPEN,
          createdBy: 'user_123',
          attachments: [],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        const mockEscalation = {
          id: 'esc_123',
          communicationId: 'comm_123',
          escalatedFrom: 'user_123',
          escalatedTo: 'manager_456',
          reason: 'Requires manager attention',
          timestamp: new Date(),
          resolved: false
        };

        vi.mocked(getServerSession).mockResolvedValue(mockSession);
        vi.mocked(CommunicationOperations.getById).mockResolvedValue(mockCommunication);
        vi.mocked(CommunicationOperations.escalateIssue).mockResolvedValue(mockEscalation);

        const request = new NextRequest('http://localhost/api/communications/comm_123/escalate', {
          method: 'POST',
          body: JSON.stringify({
            escalatedTo: 'manager_456',
            reason: 'Requires manager attention'
          })
        });

        const response = await escalatePost(request, { params: { id: 'comm_123' } });
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.id).toBe('esc_123');
        expect(data.escalatedTo).toBe('manager_456');
      });

      it('should return 404 for non-existent communication', async () => {
        const mockSession = { user: { id: 'user_123' } };
        vi.mocked(getServerSession).mockResolvedValue(mockSession);
        vi.mocked(CommunicationOperations.getById).mockResolvedValue(null);

        const request = new NextRequest('http://localhost/api/communications/nonexistent/escalate', {
          method: 'POST',
          body: JSON.stringify({
            escalatedTo: 'manager_456',
            reason: 'Test reason'
          })
        });

        const response = await escalatePost(request, { params: { id: 'nonexistent' } });

        expect(response.status).toBe(404);
      });
    });
  });

  describe('/api/communications/templates', () => {
    describe('POST', () => {
      it('should create a new template', async () => {
        const mockSession = { user: { id: 'user_123' } };
        const mockTemplate = {
          id: 'tmpl_123',
          name: 'Test Template',
          category: 'General',
          subject: 'Test Subject',
          content: 'Test content with {{variable}}',
          variables: ['variable'],
          language: 'en',
          usageCount: 0,
          isActive: true,
          createdBy: 'user_123',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        vi.mocked(getServerSession).mockResolvedValue(mockSession);
        vi.mocked(TemplateOperations.create).mockResolvedValue(mockTemplate);

        const request = new NextRequest('http://localhost/api/communications/templates', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Template',
            category: 'General',
            subject: 'Test Subject',
            content: 'Test content with {{variable}}'
          })
        });

        const response = await templatesPost(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.id).toBe('tmpl_123');
        expect(data.name).toBe('Test Template');
      });
    });

    describe('GET', () => {
      it('should get all templates', async () => {
        const mockSession = { user: { id: 'user_123' } };
        const mockTemplates = [
          {
            id: 'tmpl_123',
            name: 'Test Template',
            category: 'General',
            subject: 'Test Subject',
            content: 'Test content',
            variables: [],
            language: 'en',
            usageCount: 0,
            isActive: true,
            createdBy: 'user_123',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];

        vi.mocked(getServerSession).mockResolvedValue(mockSession);
        vi.mocked(TemplateOperations.getAll).mockResolvedValue(mockTemplates);

        const request = new NextRequest('http://localhost/api/communications/templates');

        const response = await templatesGet(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveLength(1);
        expect(data[0].id).toBe('tmpl_123');
      });

      it('should get templates by category', async () => {
        const mockSession = { user: { id: 'user_123' } };
        const mockTemplates = [];

        vi.mocked(getServerSession).mockResolvedValue(mockSession);
        vi.mocked(TemplateOperations.getByCategory).mockResolvedValue(mockTemplates);

        const request = new NextRequest('http://localhost/api/communications/templates?category=Payment');

        const response = await templatesGet(request);

        expect(response.status).toBe(200);
        expect(TemplateOperations.getByCategory).toHaveBeenCalledWith('Payment', true);
      });
    });
  });
});
