import {
  createAgreementTemplate,
  updateAgreementTemplate,
  getAgreementTemplate,
  getPropertyAgreementTemplates,
  getActivePropertyAgreementTemplates,
  deleteAgreementTemplate,
  populateTemplateContent
} from '../db/operations/agreements'
import {
  AgreementTemplate,
  CreateAgreementTemplateInput,
  UpdateAgreementTemplateInput,
  TemplateVariable,
  TemplateVariableValue
} from '../db/models/agreement'
import { v4 as uuidv4 } from 'uuid'

// Template validation and business logic
export class AgreementTemplateService {
  
  // Create a new template with validation
  static async createTemplate(input: CreateAgreementTemplateInput): Promise<AgreementTemplate> {
    try {
      // Validate template content has required structure
      this.validateTemplateContent(input.content, input.variables || [])
      
      // Ensure template variables have unique names
      this.validateTemplateVariables(input.variables || [])
      
      // Add IDs to template variables if not present
      const processedVariables = (input.variables || []).map(variable => ({
        ...variable,
        id: variable.id || uuidv4()
      }))
      
      const templateInput = {
        ...input,
        variables: processedVariables
      }
      
      return await createAgreementTemplate(templateInput)
    } catch (error) {
      console.error('Error in createTemplate service:', error)
      throw error
    }
  }
  
  // Update template with version control
  static async updateTemplate(input: UpdateAgreementTemplateInput): Promise<AgreementTemplate | null> {
    try {
      const existing = await getAgreementTemplate(input.id)
      if (!existing) {
        throw new Error('Template not found')
      }
      
      // If content or variables changed, increment version
      let newVersion = existing.version
      if (input.content && input.content !== existing.content) {
        newVersion = existing.version + 1
      }
      if (input.variables && JSON.stringify(input.variables) !== JSON.stringify(existing.variables)) {
        newVersion = existing.version + 1
      }
      
      // Validate if content or variables are being updated
      if (input.content || input.variables) {
        const content = input.content || existing.content
        const variables = input.variables || existing.variables
        this.validateTemplateContent(content, variables)
        this.validateTemplateVariables(variables)
      }
      
      const updateInput = {
        ...input,
        version: newVersion
      }
      
      return await updateAgreementTemplate(updateInput)
    } catch (error) {
      console.error('Error in updateTemplate service:', error)
      throw error
    }
  }
  
  // Get template with enhanced data
  static async getTemplate(id: string): Promise<AgreementTemplate | null> {
    try {
      return await getAgreementTemplate(id)
    } catch (error) {
      console.error('Error in getTemplate service:', error)
      return null
    }
  }
  
  // Get all templates for a property
  static async getPropertyTemplates(propertyId: string, activeOnly: boolean = false): Promise<AgreementTemplate[]> {
    try {
      if (activeOnly) {
        return await getActivePropertyAgreementTemplates(propertyId)
      }
      return await getPropertyAgreementTemplates(propertyId)
    } catch (error) {
      console.error('Error in getPropertyTemplates service:', error)
      return []
    }
  }
  
  // Clone template for modification
  static async cloneTemplate(templateId: string, newName: string, propertyId?: string, createdBy: string = 'system'): Promise<AgreementTemplate> {
    try {
      const original = await getAgreementTemplate(templateId)
      if (!original) {
        throw new Error('Original template not found')
      }
      
      const cloneInput: CreateAgreementTemplateInput = {
        name: newName,
        propertyId: propertyId || original.propertyId,
        content: original.content,
        variables: original.variables,
        description: original.description,
        category: original.category,
        isActive: true,
        version: 1,
        createdBy: createdBy
      }
      
      return await this.createTemplate(cloneInput)
    } catch (error) {
      console.error('Error in cloneTemplate service:', error)
      throw error
    }
  }
  
  // Preview template with sample data
  static async previewTemplate(templateId: string, sampleValues: TemplateVariableValue[]): Promise<string> {
    try {
      return await populateTemplateContent(templateId, sampleValues)
    } catch (error) {
      console.error('Error in previewTemplate service:', error)
      throw error
    }
  }
  
  // Deactivate template (soft delete)
  static async deactivateTemplate(id: string): Promise<boolean> {
    try {
      const result = await updateAgreementTemplate({
        id,
        isActive: false
      })
      return result !== null
    } catch (error) {
      console.error('Error in deactivateTemplate service:', error)
      return false
    }
  }
  
  // Permanently delete template
  static async deleteTemplate(id: string): Promise<boolean> {
    try {
      return await deleteAgreementTemplate(id)
    } catch (error) {
      console.error('Error in deleteTemplate service:', error)
      return false
    }
  }
  
  // Get template usage statistics
  static async getTemplateUsageStats(templateId: string): Promise<{
    totalSent: number;
    totalSigned: number;
    totalCompleted: number;
    averageSigningTime: number; // in hours
  }> {
    try {
      // This would require agreement data - placeholder for now
      // In a real implementation, we'd query agreements by templateId
      return {
        totalSent: 0,
        totalSigned: 0,
        totalCompleted: 0,
        averageSigningTime: 0
      }
    } catch (error) {
      console.error('Error in getTemplateUsageStats service:', error)
      return {
        totalSent: 0,
        totalSigned: 0,
        totalCompleted: 0,
        averageSigningTime: 0
      }
    }
  }
  
  // ===== PRIVATE VALIDATION METHODS =====
  
  private static validateTemplateContent(content: string, variables: TemplateVariable[]): void {
    // Check that all variables referenced in content exist in variables array
    const variableNames = variables.map(v => v.name)
    const contentVariables = this.extractVariablesFromContent(content)
    
    const missingVariables = contentVariables.filter(name => !variableNames.includes(name))
    if (missingVariables.length > 0) {
      throw new Error(`Template content references undefined variables: ${missingVariables.join(', ')}`)
    }
    
    // Check for basic template structure
    if (content.length < 50) {
      throw new Error('Template content is too short to be a valid agreement')
    }
    
    // Ensure content has basic legal structure (very basic check)
    const requiredSections = ['tenant', 'property', 'rent']
    const contentLower = content.toLowerCase()
    const missingSections = requiredSections.filter(section => !contentLower.includes(section))
    
    if (missingSections.length > 0) {
      console.warn(`Template may be missing important sections: ${missingSections.join(', ')}`)
    }
  }
  
  private static validateTemplateVariables(variables: TemplateVariable[]): void {
    // Check for duplicate variable names
    const names = variables.map(v => v.name)
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index)
    
    if (duplicates.length > 0) {
      throw new Error(`Duplicate variable names found: ${duplicates.join(', ')}`)
    }
    
    // Validate variable names (alphanumeric and underscore only)
    const invalidNames = variables.filter(v => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v.name))
    if (invalidNames.length > 0) {
      throw new Error(`Invalid variable names (use alphanumeric and underscore only): ${invalidNames.map(v => v.name).join(', ')}`)
    }
    
    // Validate select type variables have options
    const selectVariablesWithoutOptions = variables.filter(v => 
      v.type === 'select' && (!v.selectOptions || v.selectOptions.length === 0)
    )
    if (selectVariablesWithoutOptions.length > 0) {
      throw new Error(`Select variables must have options: ${selectVariablesWithoutOptions.map(v => v.name).join(', ')}`)
    }
  }
  
  private static extractVariablesFromContent(content: string): string[] {
    // Extract variables in {{variable_name}} format
    const variableRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g
    const matches = []
    let match
    
    while ((match = variableRegex.exec(content)) !== null) {
      matches.push(match[1])
    }
    
    // Return unique variable names
    return Array.from(new Set(matches))
  }
}

// Default template content for common lease types
export const DEFAULT_TEMPLATES = {
  STANDARD_LEASE: `
# COLIVING LEASE AGREEMENT

**Property:** {{property_name}}
**Address:** {{property_address}}

**Tenant Information:**
- Name: {{tenant_name}}
- Email: {{tenant_email}}
- Phone: {{tenant_phone}}

**Lease Terms:**
- Room Number: {{room_number}}
- Lease Start Date: {{lease_start_date}}
- Lease End Date: {{lease_end_date}}
- Monthly Rent: $\{{monthly_rent}}
- Security Deposit: $\{{security_deposit}}

**Agreement:**
The Tenant agrees to rent the above-described room in the coliving property under the following terms and conditions:

1. **Rent Payment:** Monthly rent of $\{{monthly_rent}} is due on the {{rent_due_date}} of each month.

2. **Security Deposit:** A security deposit of $\{{security_deposit}} is required and will be returned upon satisfactory completion of the lease term.

3. **House Rules:** Tenant agrees to abide by all house rules and community guidelines.

4. **Utilities:** {{utilities_included}}

5. **Termination:** This lease may be terminated with {{notice_period}} days written notice.

**Signatures:**
By signing below, both parties agree to the terms and conditions outlined in this agreement.

Tenant Signature: _________________________ Date: _________

Property Owner Signature: _________________________ Date: _________
`,

  SHORT_TERM: `
# SHORT-TERM COLIVING AGREEMENT

**Property:** {{property_name}}
**Duration:** {{stay_duration}}

**Guest Information:**
- Name: {{guest_name}}
- Email: {{guest_email}}
- Check-in: {{checkin_date}}
- Check-out: {{checkout_date}}

**Room:** {{room_number}}
**Total Cost:** $\{{total_cost}}

**Terms:**
This is a short-term accommodation agreement for coliving space. Guest agrees to:
- Respect house rules and other residents
- Pay all fees upfront
- Provide valid identification
- Leave room in clean condition

**Cancellation Policy:** {{cancellation_policy}}

Signatures required for stays longer than {{signature_threshold}} days.
`
}

// Common template variables for different lease types
export const COMMON_VARIABLES = {
  TENANT_INFO: [
    { name: 'tenant_name', label: 'Tenant Full Name', type: 'text' as const, required: true },
    { name: 'tenant_email', label: 'Tenant Email', type: 'text' as const, required: true },
    { name: 'tenant_phone', label: 'Tenant Phone', type: 'text' as const, required: true }
  ],
  PROPERTY_INFO: [
    { name: 'property_name', label: 'Property Name', type: 'text' as const, required: true },
    { name: 'property_address', label: 'Property Address', type: 'text' as const, required: true },
    { name: 'room_number', label: 'Room Number', type: 'text' as const, required: true }
  ],
  LEASE_TERMS: [
    { name: 'lease_start_date', label: 'Lease Start Date', type: 'date' as const, required: true },
    { name: 'lease_end_date', label: 'Lease End Date', type: 'date' as const, required: true },
    { name: 'monthly_rent', label: 'Monthly Rent ($)', type: 'number' as const, required: true },
    { name: 'security_deposit', label: 'Security Deposit ($)', type: 'number' as const, required: true },
    { name: 'rent_due_date', label: 'Rent Due Date', type: 'select' as const, required: true, 
      selectOptions: ['1st', '5th', '10th', '15th', '20th', '25th'] },
    { name: 'notice_period', label: 'Notice Period (days)', type: 'number' as const, required: true, defaultValue: '30' }
  ],
  UTILITIES: [
    { name: 'utilities_included', label: 'Utilities Included', type: 'select' as const, required: true,
      selectOptions: ['All utilities included', 'Electricity not included', 'Internet not included', 'Custom arrangement'] }
  ]
}
