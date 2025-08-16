import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AgreementTemplateService } from '@/lib/agreements/templates'
import { 
  AgreementTemplate,
  CreateAgreementTemplateInput,
  TemplateVariable
} from '@/lib/db/models/agreement'
import { v4 as uuidv4 } from 'uuid'

// Mock Redis database
const mockDb = new Map<string, any>()
const mockSets = new Map<string, Set<string>>()

// Mock the database operations
vi.mock('@/lib/db', () => ({
  db: {
    hset: vi.fn((key: string, data: Record<string, string>) => {
      mockDb.set(key, data)
      return Promise.resolve()
    }),
    hgetall: vi.fn((key: string) => {
      const data = mockDb.get(key)
      return Promise.resolve(data || {})
    }),
    sadd: vi.fn((key: string, value: string) => {
      if (!mockSets.has(key)) {
        mockSets.set(key, new Set())
      }
      mockSets.get(key)!.add(value)
      return Promise.resolve()
    }),
    smembers: vi.fn((key: string) => {
      const set = mockSets.get(key)
      return Promise.resolve(set ? Array.from(set) : [])
    }),
    pipeline: vi.fn(() => ({
      hset: vi.fn(),
      sadd: vi.fn(),
      exec: vi.fn(() => Promise.resolve())
    }))
  }
}))

describe('Agreement Template System', () => {
  const mockPropertyId = uuidv4()
  const mockUserId = uuidv4()

  beforeEach(() => {
    mockDb.clear()
    mockSets.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Template Model Validation', () => {
    it('should validate required template fields', () => {
      const validTemplate: CreateAgreementTemplateInput = {
        name: 'Test Template',
        propertyId: mockPropertyId,
        content: 'This is a test agreement template with {{tenant_name}} and {{monthly_rent}}.',
        variables: [
          {
            id: uuidv4(),
            name: 'tenant_name',
            label: 'Tenant Name',
            type: 'text',
            required: true
          },
          {
            id: uuidv4(),
            name: 'monthly_rent',
            label: 'Monthly Rent',
            type: 'number',
            required: true
          }
        ],
        createdBy: mockUserId
      }

      expect(() => {
        // This would normally be validated by Zod schema
        expect(validTemplate.name).toBeTruthy()
        expect(validTemplate.propertyId).toBeTruthy()
        expect(validTemplate.content).toBeTruthy()
        expect(validTemplate.createdBy).toBeTruthy()
      }).not.toThrow()
    })

    it('should validate template variables', () => {
      const validVariable: TemplateVariable = {
        id: uuidv4(),
        name: 'test_variable',
        label: 'Test Variable',
        type: 'text',
        required: true,
        defaultValue: '',
        selectOptions: [],
        placeholder: 'Enter value',
        description: 'A test variable'
      }

      expect(validVariable.name).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
      expect(validVariable.label).toBeTruthy()
      expect(['text', 'number', 'date', 'boolean', 'select']).toContain(validVariable.type)
    })
  })

  describe('AgreementTemplateService', () => {
    it('should create a new template', async () => {
      const templateInput: CreateAgreementTemplateInput = {
        name: 'Standard Lease Template',
        propertyId: mockPropertyId,
        content: 'Lease agreement for {{tenant_name}} at {{property_address}}. Monthly rent: {{monthly_rent}}.',
        variables: [
          {
            id: uuidv4(),
            name: 'tenant_name',
            label: 'Tenant Name',
            type: 'text',
            required: true
          },
          {
            id: uuidv4(),
            name: 'property_address',
            label: 'Property Address',
            type: 'text',
            required: true
          },
          {
            id: uuidv4(),
            name: 'monthly_rent',
            label: 'Monthly Rent',
            type: 'number',
            required: true
          }
        ],
        description: 'Standard lease agreement template',
        category: 'Standard Lease',
        createdBy: mockUserId
      }

      const template = await AgreementTemplateService.createTemplate(templateInput)

      expect(template).toBeDefined()
      expect(template.name).toBe(templateInput.name)
      expect(template.propertyId).toBe(templateInput.propertyId)
      expect(template.content).toBe(templateInput.content)
      expect(template.variables).toHaveLength(3)
      expect(template.version).toBe(1)
      expect(template.isActive).toBe(true)
    })

    it('should validate template content against variables', async () => {
      const templateInput: CreateAgreementTemplateInput = {
        name: 'Invalid Template',
        propertyId: mockPropertyId,
        content: 'This template references {{undefined_variable}} which is not defined.',
        variables: [
          {
            id: uuidv4(),
            name: 'defined_variable',
            label: 'Defined Variable',
            type: 'text',
            required: true
          }
        ],
        createdBy: mockUserId
      }

      await expect(AgreementTemplateService.createTemplate(templateInput))
        .rejects.toThrow('undefined variables')
    })

    it('should prevent duplicate variable names', async () => {
      const templateInput: CreateAgreementTemplateInput = {
        name: 'Duplicate Variables Template',
        propertyId: mockPropertyId,
        content: 'Template with {{duplicate_name}}.',
        variables: [
          {
            id: uuidv4(),
            name: 'duplicate_name',
            label: 'First Variable',
            type: 'text',
            required: true
          },
          {
            id: uuidv4(),
            name: 'duplicate_name',
            label: 'Second Variable',
            type: 'text',
            required: true
          }
        ],
        createdBy: mockUserId
      }

      await expect(AgreementTemplateService.createTemplate(templateInput))
        .rejects.toThrow('Duplicate variable names')
    })

    it('should update template with version control', async () => {
      // First create a template
      const templateInput: CreateAgreementTemplateInput = {
        name: 'Version Test Template',
        propertyId: mockPropertyId,
        content: 'Original content with {{tenant_name}}.',
        variables: [
          {
            id: uuidv4(),
            name: 'tenant_name',
            label: 'Tenant Name',
            type: 'text',
            required: true
          }
        ],
        createdBy: mockUserId
      }

      const originalTemplate = await AgreementTemplateService.createTemplate(templateInput)
      expect(originalTemplate.version).toBe(1)

      // Update the content
      const updatedTemplate = await AgreementTemplateService.updateTemplate({
        id: originalTemplate.id,
        content: 'Updated content with {{tenant_name}} and {{new_variable}}.',
        variables: [
          ...originalTemplate.variables,
          {
            id: uuidv4(),
            name: 'new_variable',
            label: 'New Variable',
            type: 'text',
            required: false
          }
        ]
      })

      expect(updatedTemplate).toBeDefined()
      expect(updatedTemplate!.version).toBe(2)
      expect(updatedTemplate!.content).toContain('Updated content')
      expect(updatedTemplate!.variables).toHaveLength(2)
    })

    it('should clone template with new variables', async () => {
      const originalTemplate = await AgreementTemplateService.createTemplate({
        name: 'Original Template',
        propertyId: mockPropertyId,
        content: 'Original template with {{tenant_name}}.',
        variables: [
          {
            id: uuidv4(),
            name: 'tenant_name',
            label: 'Tenant Name',
            type: 'text',
            required: true
          }
        ],
        createdBy: mockUserId
      })

      const clonedTemplate = await AgreementTemplateService.cloneTemplate(
        originalTemplate.id,
        'Cloned Template',
        mockPropertyId
      )

      expect(clonedTemplate.name).toBe('Cloned Template')
      expect(clonedTemplate.content).toBe(originalTemplate.content)
      expect(clonedTemplate.variables).toHaveLength(1)
      expect(clonedTemplate.variables[0].name).toBe('tenant_name')
      expect(clonedTemplate.variables[0].id).not.toBe(originalTemplate.variables[0].id)
      expect(clonedTemplate.id).not.toBe(originalTemplate.id)
    })

    it('should preview template with variable substitution', async () => {
      const template = await AgreementTemplateService.createTemplate({
        name: 'Preview Template',
        propertyId: mockPropertyId,
        content: 'Lease for {{tenant_name}} at {{property_address}}. Rent: ${{monthly_rent}}/month.',
        variables: [
          {
            id: uuidv4(),
            name: 'tenant_name',
            label: 'Tenant Name',
            type: 'text',
            required: true
          },
          {
            id: uuidv4(),
            name: 'property_address',
            label: 'Property Address',
            type: 'text',
            required: true
          },
          {
            id: uuidv4(),
            name: 'monthly_rent',
            label: 'Monthly Rent',
            type: 'number',
            required: true
          }
        ],
        createdBy: mockUserId
      })

      const preview = await AgreementTemplateService.previewTemplate(template.id, [
        { variableId: template.variables[0].id, name: 'tenant_name', value: 'John Doe' },
        { variableId: template.variables[1].id, name: 'property_address', value: '123 Main St' },
        { variableId: template.variables[2].id, name: 'monthly_rent', value: '1200' }
      ])

      expect(preview).toBe('Lease for John Doe at 123 Main St. Rent: $1200/month.')
    })

    it('should get property templates', async () => {
      // Create multiple templates for the property
      const template1 = await AgreementTemplateService.createTemplate({
        name: 'Template 1',
        propertyId: mockPropertyId,
        content: 'Template 1 content',
        variables: [],
        createdBy: mockUserId
      })

      const template2 = await AgreementTemplateService.createTemplate({
        name: 'Template 2',
        propertyId: mockPropertyId,
        content: 'Template 2 content',
        variables: [],
        isActive: false,
        createdBy: mockUserId
      })

      const allTemplates = await AgreementTemplateService.getPropertyTemplates(mockPropertyId, false)
      const activeTemplates = await AgreementTemplateService.getPropertyTemplates(mockPropertyId, true)

      expect(allTemplates).toHaveLength(2)
      expect(activeTemplates).toHaveLength(1)
      expect(activeTemplates[0].name).toBe('Template 1')
    })

    it('should deactivate template', async () => {
      const template = await AgreementTemplateService.createTemplate({
        name: 'Template to Deactivate',
        propertyId: mockPropertyId,
        content: 'Template content',
        variables: [],
        createdBy: mockUserId
      })

      expect(template.isActive).toBe(true)

      const success = await AgreementTemplateService.deactivateTemplate(template.id)
      expect(success).toBe(true)

      const updatedTemplate = await AgreementTemplateService.getTemplate(template.id)
      expect(updatedTemplate?.isActive).toBe(false)
    })
  })

  describe('Template Variable Types', () => {
    it('should handle text variables', () => {
      const textVariable: TemplateVariable = {
        id: uuidv4(),
        name: 'tenant_name',
        label: 'Tenant Name',
        type: 'text',
        required: true,
        placeholder: 'Enter tenant name'
      }

      expect(textVariable.type).toBe('text')
      expect(textVariable.required).toBe(true)
    })

    it('should handle select variables with options', () => {
      const selectVariable: TemplateVariable = {
        id: uuidv4(),
        name: 'lease_type',
        label: 'Lease Type',
        type: 'select',
        required: true,
        selectOptions: ['Monthly', 'Yearly', 'Short-term']
      }

      expect(selectVariable.type).toBe('select')
      expect(selectVariable.selectOptions).toHaveLength(3)
      expect(selectVariable.selectOptions).toContain('Monthly')
    })

    it('should handle number variables', () => {
      const numberVariable: TemplateVariable = {
        id: uuidv4(),
        name: 'monthly_rent',
        label: 'Monthly Rent',
        type: 'number',
        required: true,
        defaultValue: '1000'
      }

      expect(numberVariable.type).toBe('number')
      expect(numberVariable.defaultValue).toBe('1000')
    })

    it('should handle date variables', () => {
      const dateVariable: TemplateVariable = {
        id: uuidv4(),
        name: 'lease_start',
        label: 'Lease Start Date',
        type: 'date',
        required: true
      }

      expect(dateVariable.type).toBe('date')
    })

    it('should handle boolean variables', () => {
      const booleanVariable: TemplateVariable = {
        id: uuidv4(),
        name: 'pets_allowed',
        label: 'Pets Allowed',
        type: 'boolean',
        required: false,
        defaultValue: 'false'
      }

      expect(booleanVariable.type).toBe('boolean')
      expect(booleanVariable.defaultValue).toBe('false')
    })
  })

  describe('Template Content Validation', () => {
    it('should validate minimum content length', async () => {
      const shortTemplate: CreateAgreementTemplateInput = {
        name: 'Short Template',
        propertyId: mockPropertyId,
        content: 'Too short',
        variables: [],
        createdBy: mockUserId
      }

      await expect(AgreementTemplateService.createTemplate(shortTemplate))
        .rejects.toThrow('too short')
    })

    it('should extract variables from content correctly', () => {
      const content = 'Agreement for {{tenant_name}} at {{property_address}}. Rent: {{monthly_rent}}. Deposit: {{security_deposit}}.'
      
      // This would be tested in the service's private method
      // For now, we test the pattern matching logic
      const variableRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g
      const matches = []
      let match
      
      while ((match = variableRegex.exec(content)) !== null) {
        matches.push(match[1])
      }
      
      const uniqueVariables = [...new Set(matches)]
      
      expect(uniqueVariables).toHaveLength(4)
      expect(uniqueVariables).toContain('tenant_name')
      expect(uniqueVariables).toContain('property_address')
      expect(uniqueVariables).toContain('monthly_rent')
      expect(uniqueVariables).toContain('security_deposit')
    })

    it('should handle complex template content', async () => {
      const complexContent = `
# COLIVING LEASE AGREEMENT

**Property:** {{property_name}}
**Address:** {{property_address}}

**Tenant Information:**
- Name: {{tenant_name}}
- Email: {{tenant_email}}
- Phone: {{tenant_phone}}

**Lease Terms:**
- Room Number: {{room_number}}
- Lease Start: {{lease_start_date}}
- Lease End: {{lease_end_date}}
- Monthly Rent: ${{monthly_rent}}
- Security Deposit: ${{security_deposit}}

**Special Conditions:**
{{special_conditions}}

**Signatures:**
Tenant: _________________________ Date: _________
Owner: _________________________ Date: _________
`

      const variables: TemplateVariable[] = [
        { id: uuidv4(), name: 'property_name', label: 'Property Name', type: 'text', required: true },
        { id: uuidv4(), name: 'property_address', label: 'Property Address', type: 'text', required: true },
        { id: uuidv4(), name: 'tenant_name', label: 'Tenant Name', type: 'text', required: true },
        { id: uuidv4(), name: 'tenant_email', label: 'Tenant Email', type: 'text', required: true },
        { id: uuidv4(), name: 'tenant_phone', label: 'Tenant Phone', type: 'text', required: true },
        { id: uuidv4(), name: 'room_number', label: 'Room Number', type: 'text', required: true },
        { id: uuidv4(), name: 'lease_start_date', label: 'Lease Start Date', type: 'date', required: true },
        { id: uuidv4(), name: 'lease_end_date', label: 'Lease End Date', type: 'date', required: true },
        { id: uuidv4(), name: 'monthly_rent', label: 'Monthly Rent', type: 'number', required: true },
        { id: uuidv4(), name: 'security_deposit', label: 'Security Deposit', type: 'number', required: true },
        { id: uuidv4(), name: 'special_conditions', label: 'Special Conditions', type: 'text', required: false }
      ]

      const template = await AgreementTemplateService.createTemplate({
        name: 'Complex Template',
        propertyId: mockPropertyId,
        content: complexContent,
        variables,
        createdBy: mockUserId
      })

      expect(template).toBeDefined()
      expect(template.variables).toHaveLength(11)
      expect(template.content).toContain('COLIVING LEASE AGREEMENT')
    })
  })
})
