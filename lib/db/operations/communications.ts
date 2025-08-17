import { kv } from '@vercel/kv';
import { 
  Communication, 
  CommunicationTemplate, 
  IssueEscalation,
  CreateCommunicationInput,
  UpdateCommunicationInput,
  CreateTemplateInput,
  UpdateTemplateInput,
  CommunicationFilter,
  CommunicationSchema,
  CommunicationTemplateSchema,
  IssueEscalationSchema
} from '../models/communication';

// Communication CRUD Operations
export class CommunicationOperations {
  private static readonly COMMUNICATION_PREFIX = 'communication:';
  private static readonly TENANT_COMMUNICATIONS_PREFIX = 'tenant_communications:';
  private static readonly PROPERTY_COMMUNICATIONS_PREFIX = 'property_communications:';

  static async create(input: CreateCommunicationInput): Promise<Communication> {
    const id = `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const communication: Communication = {
      ...input,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate the communication data
    const validatedCommunication = CommunicationSchema.parse(communication);

    // Store the communication
    await kv.set(`${this.COMMUNICATION_PREFIX}${id}`, validatedCommunication);

    // Add to tenant's communication list
    const tenantKey = `${this.TENANT_COMMUNICATIONS_PREFIX}${input.tenantId}`;
    await kv.sadd(tenantKey, id);

    // Add to property's communication list
    const propertyKey = `${this.PROPERTY_COMMUNICATIONS_PREFIX}${input.propertyId}`;
    await kv.sadd(propertyKey, id);

    return validatedCommunication;
  }

  static async getById(id: string): Promise<Communication | null> {
    const communication = await kv.get(`${this.COMMUNICATION_PREFIX}${id}`);
    return communication ? CommunicationSchema.parse(communication) : null;
  }

  static async update(id: string, input: UpdateCommunicationInput): Promise<Communication | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated: Communication = {
      ...existing,
      ...input,
      updatedAt: new Date()
    };

    const validatedCommunication = CommunicationSchema.parse(updated);
    await kv.set(`${this.COMMUNICATION_PREFIX}${id}`, validatedCommunication);

    return validatedCommunication;
  }

  static async delete(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;

    // Remove from all indexes
    await kv.srem(`${this.TENANT_COMMUNICATIONS_PREFIX}${existing.tenantId}`, id);
    await kv.srem(`${this.PROPERTY_COMMUNICATIONS_PREFIX}${existing.propertyId}`, id);
    
    // Delete the communication
    await kv.del(`${this.COMMUNICATION_PREFIX}${id}`);
    return true;
  }

  static async getByTenant(tenantId: string, filter?: Partial<CommunicationFilter>): Promise<Communication[]> {
    const communicationIds = await kv.smembers(`${this.TENANT_COMMUNICATIONS_PREFIX}${tenantId}`);
    const communications = await Promise.all(
      communicationIds.map(id => this.getById(id as string))
    );

    let results = communications.filter((comm): comm is Communication => comm !== null);

    // Apply filters
    if (filter) {
      if (filter.type) {
        results = results.filter(comm => comm.type === filter.type);
      }
      if (filter.priority) {
        results = results.filter(comm => comm.priority === filter.priority);
      }
      if (filter.status) {
        results = results.filter(comm => comm.status === filter.status);
      }
      if (filter.dateFrom) {
        results = results.filter(comm => comm.timestamp >= filter.dateFrom!);
      }
      if (filter.dateTo) {
        results = results.filter(comm => comm.timestamp <= filter.dateTo!);
      }
      if (filter.search) {
        const searchTerm = filter.search.toLowerCase();
        results = results.filter(comm => 
          comm.subject.toLowerCase().includes(searchTerm) ||
          comm.content.toLowerCase().includes(searchTerm)
        );
      }
      if (filter.tags && filter.tags.length > 0) {
        results = results.filter(comm => 
          filter.tags!.some(tag => comm.tags.includes(tag))
        );
      }
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 20;
    return results.slice(offset, offset + limit);
  }

  static async getByProperty(propertyId: string, filter?: Partial<CommunicationFilter>): Promise<Communication[]> {
    const communicationIds = await kv.smembers(`${this.PROPERTY_COMMUNICATIONS_PREFIX}${propertyId}`);
    const communications = await Promise.all(
      communicationIds.map(id => this.getById(id as string))
    );

    let results = communications.filter((comm): comm is Communication => comm !== null);

    // Apply same filtering logic as getByTenant
    if (filter) {
      if (filter.type) {
        results = results.filter(comm => comm.type === filter.type);
      }
      if (filter.priority) {
        results = results.filter(comm => comm.priority === filter.priority);
      }
      if (filter.status) {
        results = results.filter(comm => comm.status === filter.status);
      }
      if (filter.dateFrom) {
        results = results.filter(comm => comm.timestamp >= filter.dateFrom!);
      }
      if (filter.dateTo) {
        results = results.filter(comm => comm.timestamp <= filter.dateTo!);
      }
      if (filter.search) {
        const searchTerm = filter.search.toLowerCase();
        results = results.filter(comm => 
          comm.subject.toLowerCase().includes(searchTerm) ||
          comm.content.toLowerCase().includes(searchTerm)
        );
      }
    }

    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const offset = filter?.offset || 0;
    const limit = filter?.limit || 20;
    return results.slice(offset, offset + limit);
  }

  static async escalateIssue(communicationId: string, escalation: Omit<IssueEscalation, 'id' | 'timestamp'>): Promise<IssueEscalation> {
    const id = `esc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const issueEscalation: IssueEscalation = {
      ...escalation,
      id,
      timestamp: new Date()
    };

    const validatedEscalation = IssueEscalationSchema.parse(issueEscalation);
    await kv.set(`escalation:${id}`, validatedEscalation);

    // Update communication status to escalated
    await this.update(communicationId, { 
      status: 'In Progress',
      assignedTo: escalation.escalatedTo 
    });

    return validatedEscalation;
  }
}

// Template CRUD Operations
export class TemplateOperations {
  private static readonly TEMPLATE_PREFIX = 'template:';
  private static readonly TEMPLATES_LIST = 'templates:all';
  private static readonly CATEGORY_PREFIX = 'templates:category:';

  static async create(input: CreateTemplateInput): Promise<CommunicationTemplate> {
    const id = `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const template: CommunicationTemplate = {
      ...input,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const validatedTemplate = CommunicationTemplateSchema.parse(template);

    // Store the template
    await kv.set(`${this.TEMPLATE_PREFIX}${id}`, validatedTemplate);

    // Add to templates list
    await kv.sadd(this.TEMPLATES_LIST, id);

    // Add to category index
    await kv.sadd(`${this.CATEGORY_PREFIX}${input.category}`, id);

    return validatedTemplate;
  }

  static async getById(id: string): Promise<CommunicationTemplate | null> {
    const template = await kv.get(`${this.TEMPLATE_PREFIX}${id}`);
    return template ? CommunicationTemplateSchema.parse(template) : null;
  }

  static async update(id: string, input: UpdateTemplateInput): Promise<CommunicationTemplate | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated: CommunicationTemplate = {
      ...existing,
      ...input,
      updatedAt: new Date()
    };

    const validatedTemplate = CommunicationTemplateSchema.parse(updated);
    await kv.set(`${this.TEMPLATE_PREFIX}${id}`, validatedTemplate);

    // Update category index if category changed
    if (input.category && input.category !== existing.category) {
      await kv.srem(`${this.CATEGORY_PREFIX}${existing.category}`, id);
      await kv.sadd(`${this.CATEGORY_PREFIX}${input.category}`, id);
    }

    return validatedTemplate;
  }

  static async delete(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;

    // Remove from all indexes
    await kv.srem(this.TEMPLATES_LIST, id);
    await kv.srem(`${this.CATEGORY_PREFIX}${existing.category}`, id);
    
    // Delete the template
    await kv.del(`${this.TEMPLATE_PREFIX}${id}`);
    return true;
  }

  static async getAll(activeOnly: boolean = true): Promise<CommunicationTemplate[]> {
    const templateIds = await kv.smembers(this.TEMPLATES_LIST);
    const templates = await Promise.all(
      templateIds.map(id => this.getById(id as string))
    );

    let results = templates.filter((tmpl): tmpl is CommunicationTemplate => tmpl !== null);

    if (activeOnly) {
      results = results.filter(tmpl => tmpl.isActive);
    }

    // Sort by usage count (most used first), then by name
    results.sort((a, b) => {
      if (b.usageCount !== a.usageCount) {
        return b.usageCount - a.usageCount;
      }
      return a.name.localeCompare(b.name);
    });

    return results;
  }

  static async getByCategory(category: string, activeOnly: boolean = true): Promise<CommunicationTemplate[]> {
    const templateIds = await kv.smembers(`${this.CATEGORY_PREFIX}${category}`);
    const templates = await Promise.all(
      templateIds.map(id => this.getById(id as string))
    );

    let results = templates.filter((tmpl): tmpl is CommunicationTemplate => tmpl !== null);

    if (activeOnly) {
      results = results.filter(tmpl => tmpl.isActive);
    }

    results.sort((a, b) => {
      if (b.usageCount !== a.usageCount) {
        return b.usageCount - a.usageCount;
      }
      return a.name.localeCompare(b.name);
    });

    return results;
  }

  static async incrementUsage(id: string): Promise<void> {
    const template = await this.getById(id);
    if (template) {
      await this.update(id, { usageCount: template.usageCount + 1 });
    }
  }

  static async getCategories(): Promise<string[]> {
    const templates = await this.getAll(true);
    const categories = [...new Set(templates.map(tmpl => tmpl.category))];
    return categories.sort();
  }
}
