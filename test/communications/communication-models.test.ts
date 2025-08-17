import { describe, it, expect } from 'vitest';
import {
  CommunicationSchema,
  CommunicationTemplateSchema,
  IssueEscalationSchema,
  CreateCommunicationSchema,
  UpdateCommunicationSchema,
  CommunicationType,
  CommunicationPriority,
  CommunicationStatus
} from '@/lib/db/models/communication';

describe('Communication Models', () => {
  describe('CommunicationSchema', () => {
    it('should validate a valid communication', () => {
      const validCommunication = {
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

      const result = CommunicationSchema.safeParse(validCommunication);
      expect(result.success).toBe(true);
    });

    it('should reject communication with missing required fields', () => {
      const invalidCommunication = {
        id: 'comm_123',
        tenantId: 'tenant_123'
        // Missing required fields
      };

      const result = CommunicationSchema.safeParse(invalidCommunication);
      expect(result.success).toBe(false);
    });

    it('should set default values correctly', () => {
      const communication = {
        id: 'comm_123',
        tenantId: 'tenant_123',
        propertyId: 'prop_123',
        type: CommunicationType.EMAIL,
        subject: 'Test Subject',
        content: 'Test content',
        timestamp: new Date(),
        createdBy: 'user_123'
      };

      const result = CommunicationSchema.parse(communication);
      expect(result.priority).toBe(CommunicationPriority.MEDIUM);
      expect(result.status).toBe(CommunicationStatus.OPEN);
      expect(result.attachments).toEqual([]);
      expect(result.tags).toEqual([]);
    });

    it('should validate communication types', () => {
      const validTypes = Object.values(CommunicationType);
      
      validTypes.forEach(type => {
        const communication = {
          id: 'comm_123',
          tenantId: 'tenant_123',
          propertyId: 'prop_123',
          type,
          subject: 'Test Subject',
          content: 'Test content',
          timestamp: new Date(),
          createdBy: 'user_123'
        };

        const result = CommunicationSchema.safeParse(communication);
        expect(result.success).toBe(true);
      });
    });

    it('should validate priority levels', () => {
      const validPriorities = Object.values(CommunicationPriority);
      
      validPriorities.forEach(priority => {
        const communication = {
          id: 'comm_123',
          tenantId: 'tenant_123',
          propertyId: 'prop_123',
          type: CommunicationType.EMAIL,
          subject: 'Test Subject',
          content: 'Test content',
          timestamp: new Date(),
          priority,
          createdBy: 'user_123'
        };

        const result = CommunicationSchema.safeParse(communication);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('CommunicationTemplateSchema', () => {
    it('should validate a valid template', () => {
      const validTemplate = {
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

      const result = CommunicationTemplateSchema.safeParse(validTemplate);
      expect(result.success).toBe(true);
    });

    it('should set default values for template', () => {
      const template = {
        id: 'tmpl_123',
        name: 'Test Template',
        category: 'General',
        subject: 'Test Subject',
        content: 'Test content',
        createdBy: 'user_123'
      };

      const result = CommunicationTemplateSchema.parse(template);
      expect(result.variables).toEqual([]);
      expect(result.language).toBe('en');
      expect(result.usageCount).toBe(0);
      expect(result.isActive).toBe(true);
    });

    it('should reject template with empty name', () => {
      const invalidTemplate = {
        id: 'tmpl_123',
        name: '',
        category: 'General',
        subject: 'Test Subject',
        content: 'Test content',
        createdBy: 'user_123'
      };

      const result = CommunicationTemplateSchema.safeParse(invalidTemplate);
      expect(result.success).toBe(false);
    });
  });

  describe('IssueEscalationSchema', () => {
    it('should validate a valid escalation', () => {
      const validEscalation = {
        id: 'esc_123',
        communicationId: 'comm_123',
        escalatedFrom: 'user_123',
        escalatedTo: 'user_456',
        reason: 'Urgent issue requiring manager attention',
        timestamp: new Date(),
        resolved: false
      };

      const result = IssueEscalationSchema.safeParse(validEscalation);
      expect(result.success).toBe(true);
    });

    it('should set default values for escalation', () => {
      const escalation = {
        id: 'esc_123',
        communicationId: 'comm_123',
        escalatedFrom: 'user_123',
        escalatedTo: 'user_456',
        reason: 'Urgent issue'
      };

      const result = IssueEscalationSchema.parse(escalation);
      expect(result.resolved).toBe(false);
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('CreateCommunicationSchema', () => {
    it('should validate input for creating communication', () => {
      const createInput = {
        tenantId: 'tenant_123',
        propertyId: 'prop_123',
        type: CommunicationType.EMAIL,
        subject: 'Test Subject',
        content: 'Test content',
        timestamp: new Date(),
        createdBy: 'user_123'
      };

      const result = CreateCommunicationSchema.safeParse(createInput);
      expect(result.success).toBe(true);
    });

    it('should reject input with id field', () => {
      const createInput = {
        id: 'comm_123', // Should not be allowed in create input
        tenantId: 'tenant_123',
        propertyId: 'prop_123',
        type: CommunicationType.EMAIL,
        subject: 'Test Subject',
        content: 'Test content',
        timestamp: new Date(),
        createdBy: 'user_123'
      };

      const result = CreateCommunicationSchema.safeParse(createInput);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateCommunicationSchema', () => {
    it('should validate partial update input', () => {
      const updateInput = {
        subject: 'Updated Subject',
        status: CommunicationStatus.RESOLVED
      };

      const result = UpdateCommunicationSchema.safeParse(updateInput);
      expect(result.success).toBe(true);
      expect(result.data?.updatedAt).toBeInstanceOf(Date);
    });

    it('should allow empty update input', () => {
      const updateInput = {};

      const result = UpdateCommunicationSchema.safeParse(updateInput);
      expect(result.success).toBe(true);
    });
  });
});
