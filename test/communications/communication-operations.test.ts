import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommunicationOperations, TemplateOperations } from '@/lib/db/operations/communications';
import { 
  CommunicationType, 
  CommunicationPriority, 
  CommunicationStatus,
  CreateCommunicationInput,
  CreateTemplateInput
} from '@/lib/db/models/communication';

// Mock Vercel KV
vi.mock('@vercel/kv', () => ({
  kv: {
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    sadd: vi.fn(),
    srem: vi.fn(),
    smembers: vi.fn()
  }
}));

import { kv } from '@vercel/kv';

describe('Communication Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CommunicationOperations', () => {
    describe('create', () => {
      it('should create a new communication', async () => {
        const mockCommunication: CreateCommunicationInput = {
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
          tags: []
        };

        vi.mocked(kv.set).mockResolvedValue('OK');
        vi.mocked(kv.sadd).mockResolvedValue(1);

        const result = await CommunicationOperations.create(mockCommunication);

        expect(result.id).toMatch(/^comm_/);
        expect(result.tenantId).toBe(mockCommunication.tenantId);
        expect(result.subject).toBe(mockCommunication.subject);
        expect(kv.set).toHaveBeenCalledWith(
          expect.stringMatching(/^communication:comm_/),
          expect.objectContaining({
            tenantId: mockCommunication.tenantId,
            subject: mockCommunication.subject
          })
        );
        expect(kv.sadd).toHaveBeenCalledWith(
          'tenant_communications:tenant_123',
          expect.stringMatching(/^comm_/)
        );
        expect(kv.sadd).toHaveBeenCalledWith(
          'property_communications:prop_123',
          expect.stringMatching(/^comm_/)
        );
      });

      it('should generate unique IDs for communications', async () => {
        const mockCommunication: CreateCommunicationInput = {
          tenantId: 'tenant_123',
          propertyId: 'prop_123',
          type: CommunicationType.EMAIL,
          subject: 'Test Subject',
          content: 'Test content',
          timestamp: new Date(),
          createdBy: 'user_123'
        };

        vi.mocked(kv.set).mockResolvedValue('OK');
        vi.mocked(kv.sadd).mockResolvedValue(1);

        const result1 = await CommunicationOperations.create(mockCommunication);
        const result2 = await CommunicationOperations.create(mockCommunication);

        expect(result1.id).not.toBe(result2.id);
        expect(result1.id).toMatch(/^comm_/);
        expect(result2.id).toMatch(/^comm_/);
      });
    });

    describe('getById', () => {
      it('should retrieve communication by ID', async () => {
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

        vi.mocked(kv.get).mockResolvedValue(mockCommunication);

        const result = await CommunicationOperations.getById('comm_123');

        expect(result).toEqual(mockCommunication);
        expect(kv.get).toHaveBeenCalledWith('communication:comm_123');
      });

      it('should return null for non-existent communication', async () => {
        vi.mocked(kv.get).mockResolvedValue(null);

        const result = await CommunicationOperations.getById('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('update', () => {
      it('should update existing communication', async () => {
        const existingCommunication = {
          id: 'comm_123',
          tenantId: 'tenant_123',
          propertyId: 'prop_123',
          type: CommunicationType.EMAIL,
          subject: 'Original Subject',
          content: 'Original content',
          timestamp: new Date(),
          priority: CommunicationPriority.MEDIUM,
          status: CommunicationStatus.OPEN,
          createdBy: 'user_123',
          attachments: [],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const updates = {
          subject: 'Updated Subject',
          status: CommunicationStatus.RESOLVED
        };

        vi.mocked(kv.get).mockResolvedValue(existingCommunication);
        vi.mocked(kv.set).mockResolvedValue('OK');

        const result = await CommunicationOperations.update('comm_123', updates);

        expect(result?.subject).toBe('Updated Subject');
        expect(result?.status).toBe(CommunicationStatus.RESOLVED);
        expect(result?.updatedAt).toBeInstanceOf(Date);
        expect(kv.set).toHaveBeenCalledWith(
          'communication:comm_123',
          expect.objectContaining({
            subject: 'Updated Subject',
            status: CommunicationStatus.RESOLVED
          })
        );
      });

      it('should return null for non-existent communication', async () => {
        vi.mocked(kv.get).mockResolvedValue(null);

        const result = await CommunicationOperations.update('nonexistent', {});

        expect(result).toBeNull();
      });
    });

    describe('delete', () => {
      it('should delete existing communication', async () => {
        const existingCommunication = {
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

        vi.mocked(kv.get).mockResolvedValue(existingCommunication);
        vi.mocked(kv.srem).mockResolvedValue(1);
        vi.mocked(kv.del).mockResolvedValue(1);

        const result = await CommunicationOperations.delete('comm_123');

        expect(result).toBe(true);
        expect(kv.srem).toHaveBeenCalledWith('tenant_communications:tenant_123', 'comm_123');
        expect(kv.srem).toHaveBeenCalledWith('property_communications:prop_123', 'comm_123');
        expect(kv.del).toHaveBeenCalledWith('communication:comm_123');
      });

      it('should return false for non-existent communication', async () => {
        vi.mocked(kv.get).mockResolvedValue(null);

        const result = await CommunicationOperations.delete('nonexistent');

        expect(result).toBe(false);
      });
    });

    describe('getByTenant', () => {
      it('should retrieve communications for tenant', async () => {
        const mockCommunications = [
          {
            id: 'comm_1',
            tenantId: 'tenant_123',
            propertyId: 'prop_123',
            type: CommunicationType.EMAIL,
            subject: 'Subject 1',
            content: 'Content 1',
            timestamp: new Date('2023-01-01'),
            priority: CommunicationPriority.HIGH,
            status: CommunicationStatus.OPEN,
            createdBy: 'user_123',
            attachments: [],
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'comm_2',
            tenantId: 'tenant_123',
            propertyId: 'prop_123',
            type: CommunicationType.PHONE,
            subject: 'Subject 2',
            content: 'Content 2',
            timestamp: new Date('2023-01-02'),
            priority: CommunicationPriority.MEDIUM,
            status: CommunicationStatus.RESOLVED,
            createdBy: 'user_123',
            attachments: [],
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];

        vi.mocked(kv.smembers).mockResolvedValue(['comm_1', 'comm_2']);
        vi.mocked(kv.get)
          .mockResolvedValueOnce(mockCommunications[0])
          .mockResolvedValueOnce(mockCommunications[1]);

        const result = await CommunicationOperations.getByTenant('tenant_123');

        expect(result).toHaveLength(2);
        expect(result[0].timestamp.getTime()).toBeGreaterThan(result[1].timestamp.getTime()); // Sorted by newest first
      });

      it('should filter communications by type', async () => {
        const mockCommunications = [
          {
            id: 'comm_1',
            tenantId: 'tenant_123',
            propertyId: 'prop_123',
            type: CommunicationType.EMAIL,
            subject: 'Email Subject',
            content: 'Email Content',
            timestamp: new Date(),
            priority: CommunicationPriority.MEDIUM,
            status: CommunicationStatus.OPEN,
            createdBy: 'user_123',
            attachments: [],
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'comm_2',
            tenantId: 'tenant_123',
            propertyId: 'prop_123',
            type: CommunicationType.PHONE,
            subject: 'Phone Subject',
            content: 'Phone Content',
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

        vi.mocked(kv.smembers).mockResolvedValue(['comm_1', 'comm_2']);
        vi.mocked(kv.get)
          .mockResolvedValueOnce(mockCommunications[0])
          .mockResolvedValueOnce(mockCommunications[1]);

        const result = await CommunicationOperations.getByTenant('tenant_123', {
          type: CommunicationType.EMAIL
        });

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe(CommunicationType.EMAIL);
      });
    });

    describe('escalateIssue', () => {
      it('should create escalation and update communication', async () => {
        const existingCommunication = {
          id: 'comm_123',
          tenantId: 'tenant_123',
          propertyId: 'prop_123',
          type: CommunicationType.COMPLAINT,
          subject: 'Urgent Issue',
          content: 'This needs immediate attention',
          timestamp: new Date(),
          priority: CommunicationPriority.HIGH,
          status: CommunicationStatus.OPEN,
          createdBy: 'user_123',
          attachments: [],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const escalationData = {
          communicationId: 'comm_123',
          escalatedFrom: 'user_123',
          escalatedTo: 'manager_456',
          reason: 'Requires manager attention'
        };

        vi.mocked(kv.get).mockResolvedValue(existingCommunication);
        vi.mocked(kv.set).mockResolvedValue('OK');

        const result = await CommunicationOperations.escalateIssue('comm_123', escalationData);

        expect(result.id).toMatch(/^esc_/);
        expect(result.communicationId).toBe('comm_123');
        expect(result.escalatedTo).toBe('manager_456');
        expect(kv.set).toHaveBeenCalledWith(
          expect.stringMatching(/^escalation:esc_/),
          expect.objectContaining({
            communicationId: 'comm_123',
            escalatedTo: 'manager_456'
          })
        );
      });
    });
  });

  describe('TemplateOperations', () => {
    describe('create', () => {
      it('should create a new template', async () => {
        const mockTemplate: CreateTemplateInput = {
          name: 'Test Template',
          category: 'General',
          subject: 'Test Subject {{name}}',
          content: 'Hello {{name}}, this is a test.',
          variables: ['name'],
          language: 'en',
          isActive: true,
          createdBy: 'user_123'
        };

        vi.mocked(kv.set).mockResolvedValue('OK');
        vi.mocked(kv.sadd).mockResolvedValue(1);

        const result = await TemplateOperations.create(mockTemplate);

        expect(result.id).toMatch(/^tmpl_/);
        expect(result.name).toBe(mockTemplate.name);
        expect(result.usageCount).toBe(0);
        expect(kv.set).toHaveBeenCalledWith(
          expect.stringMatching(/^template:tmpl_/),
          expect.objectContaining({
            name: mockTemplate.name,
            category: mockTemplate.category
          })
        );
        expect(kv.sadd).toHaveBeenCalledWith('templates:all', expect.stringMatching(/^tmpl_/));
        expect(kv.sadd).toHaveBeenCalledWith('templates:category:General', expect.stringMatching(/^tmpl_/));
      });
    });

    describe('getAll', () => {
      it('should retrieve all active templates', async () => {
        const mockTemplates = [
          {
            id: 'tmpl_1',
            name: 'Template 1',
            category: 'General',
            subject: 'Subject 1',
            content: 'Content 1',
            variables: [],
            language: 'en',
            usageCount: 5,
            isActive: true,
            createdBy: 'user_123',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'tmpl_2',
            name: 'Template 2',
            category: 'General',
            subject: 'Subject 2',
            content: 'Content 2',
            variables: [],
            language: 'en',
            usageCount: 10,
            isActive: true,
            createdBy: 'user_123',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];

        vi.mocked(kv.smembers).mockResolvedValue(['tmpl_1', 'tmpl_2']);
        vi.mocked(kv.get)
          .mockResolvedValueOnce(mockTemplates[0])
          .mockResolvedValueOnce(mockTemplates[1]);

        const result = await TemplateOperations.getAll();

        expect(result).toHaveLength(2);
        expect(result[0].usageCount).toBeGreaterThan(result[1].usageCount); // Sorted by usage count
      });

      it('should filter out inactive templates by default', async () => {
        const mockTemplates = [
          {
            id: 'tmpl_1',
            name: 'Active Template',
            category: 'General',
            subject: 'Subject 1',
            content: 'Content 1',
            variables: [],
            language: 'en',
            usageCount: 5,
            isActive: true,
            createdBy: 'user_123',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'tmpl_2',
            name: 'Inactive Template',
            category: 'General',
            subject: 'Subject 2',
            content: 'Content 2',
            variables: [],
            language: 'en',
            usageCount: 10,
            isActive: false,
            createdBy: 'user_123',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];

        vi.mocked(kv.smembers).mockResolvedValue(['tmpl_1', 'tmpl_2']);
        vi.mocked(kv.get)
          .mockResolvedValueOnce(mockTemplates[0])
          .mockResolvedValueOnce(mockTemplates[1]);

        const result = await TemplateOperations.getAll(true);

        expect(result).toHaveLength(1);
        expect(result[0].isActive).toBe(true);
      });
    });

    describe('incrementUsage', () => {
      it('should increment template usage count', async () => {
        const mockTemplate = {
          id: 'tmpl_123',
          name: 'Test Template',
          category: 'General',
          subject: 'Test Subject',
          content: 'Test Content',
          variables: [],
          language: 'en',
          usageCount: 5,
          isActive: true,
          createdBy: 'user_123',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        vi.mocked(kv.get).mockResolvedValue(mockTemplate);
        vi.mocked(kv.set).mockResolvedValue('OK');

        await TemplateOperations.incrementUsage('tmpl_123');

        expect(kv.set).toHaveBeenCalledWith(
          'template:tmpl_123',
          expect.objectContaining({
            usageCount: 6
          })
        );
      });
    });

    describe('getCategories', () => {
      it('should return unique categories from active templates', async () => {
        const mockTemplates = [
          {
            id: 'tmpl_1',
            name: 'Template 1',
            category: 'General',
            subject: 'Subject 1',
            content: 'Content 1',
            variables: [],
            language: 'en',
            usageCount: 0,
            isActive: true,
            createdBy: 'user_123',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'tmpl_2',
            name: 'Template 2',
            category: 'Payment',
            subject: 'Subject 2',
            content: 'Content 2',
            variables: [],
            language: 'en',
            usageCount: 0,
            isActive: true,
            createdBy: 'user_123',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'tmpl_3',
            name: 'Template 3',
            category: 'General',
            subject: 'Subject 3',
            content: 'Content 3',
            variables: [],
            language: 'en',
            usageCount: 0,
            isActive: true,
            createdBy: 'user_123',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];

        vi.mocked(kv.smembers).mockResolvedValue(['tmpl_1', 'tmpl_2', 'tmpl_3']);
        vi.mocked(kv.get)
          .mockResolvedValueOnce(mockTemplates[0])
          .mockResolvedValueOnce(mockTemplates[1])
          .mockResolvedValueOnce(mockTemplates[2]);

        const result = await TemplateOperations.getCategories();

        expect(result).toEqual(['General', 'Payment']);
        expect(result).toHaveLength(2); // Unique categories only
      });
    });
  });
});
