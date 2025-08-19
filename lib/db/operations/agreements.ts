import { db } from '../../db'
import { getProperty } from './properties'
import { 
  Agreement,
  AgreementTemplate,
  AgreementStatusHistory,
  CreateAgreementInput,
  CreateAgreementTemplateInput,
  UpdateAgreementInput,
  UpdateAgreementTemplateInput,
  AgreementSchema,
  AgreementTemplateSchema,
  CreateAgreementSchema,
  CreateAgreementTemplateSchema,
  UpdateAgreementSchema,
  UpdateAgreementTemplateSchema,
  AgreementStatusHistorySchema,
  AgreementStatusType,
  TemplateVariableValue
} from '../models/agreement'
import { v4 as uuidv4 } from 'uuid'

// Generate Redis keys for agreement data
const getAgreementTemplateKey = (id: string) => `agreement_template:${id}`
const getAgreementKey = (id: string) => `agreement:${id}`
const getPropertyTemplatesKey = (propertyId: string) => `property:${propertyId}:agreement_templates`
const getPropertyAgreementsKey = (propertyId: string) => `property:${propertyId}:agreements`
const getAllTemplatesKey = () => 'agreement_templates:all'
const getAllAgreementsKey = () => 'agreements:all'
const getAgreementStatusHistoryKey = (agreementId: string) => `agreement:${agreementId}:status_history`

// ===== AGREEMENT TEMPLATE OPERATIONS =====

// Create a new agreement template
export async function createAgreementTemplate(input: CreateAgreementTemplateInput): Promise<AgreementTemplate> {
  try {
    // Validate input
    const validatedInput = CreateAgreementTemplateSchema.parse(input)
    
    // Generate ID and timestamps
    const id = uuidv4()
    const now = new Date()
    
    const template: AgreementTemplate = {
      ...validatedInput,
      id,
      createdAt: now,
      updatedAt: now
    }

    // Validate complete template object
    const validatedTemplate = AgreementTemplateSchema.parse(template)

    // Store in Redis
    const templateKey = getAgreementTemplateKey(id)
    const propertyTemplatesKey = getPropertyTemplatesKey(template.propertyId)
    const allTemplatesKey = getAllTemplatesKey()

    // Use pipeline for atomic operations
    const pipeline = db.pipeline()
    
    // Store template data as hash
    const templateData: Record<string, string> = {
      id: validatedTemplate.id,
      name: validatedTemplate.name,
      content: validatedTemplate.content,
      propertyId: validatedTemplate.propertyId,
      createdBy: validatedTemplate.createdBy,
      category: validatedTemplate.category,
      description: validatedTemplate.description || '',
      legalReviewedBy: validatedTemplate.legalReviewedBy || '',
      createdAt: validatedTemplate.createdAt.toISOString(),
      updatedAt: validatedTemplate.updatedAt.toISOString(),
      legalReviewDate: validatedTemplate.legalReviewDate?.toISOString() || '',
      deletedAt: validatedTemplate.deletedAt?.toISOString() || '',
      variables: JSON.stringify(validatedTemplate.variables),
      version: validatedTemplate.version.toString(),
      isActive: validatedTemplate.isActive.toString()
    }
    
    // Remove empty string values
    Object.keys(templateData).forEach(key => {
      if (templateData[key] === '') {
        delete templateData[key]
      }
    })
    
    pipeline.hset(templateKey, templateData)
    pipeline.sadd(propertyTemplatesKey, id)
    pipeline.sadd(allTemplatesKey, id)
    
    await pipeline.exec()

    return validatedTemplate
  } catch (error) {
    console.error('Error creating agreement template:', error)
    throw error
  }
}

// Get agreement template by ID
export async function getAgreementTemplate(id: string): Promise<AgreementTemplate | null> {
  try {
    const templateKey = getAgreementTemplateKey(id)
    const data = await db.hgetall(templateKey)
    
    if (!data || Object.keys(data).length === 0) {
      return null
    }

    // Check for soft delete
    if (data.deletedAt) {
      return null
    }

    // Parse stored data back to proper types
    const template = {
      ...data,
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
      legalReviewDate: data.legalReviewDate ? new Date(data.legalReviewDate as string) : undefined,
      variables: data.variables ? JSON.parse(data.variables as string) : [],
      version: parseInt(data.version as string),
      isActive: (data.isActive as string) === 'true'
    }

    return AgreementTemplateSchema.parse(template)
  } catch (error) {
    console.error('Error getting agreement template:', error)
    return null
  }
}

// Update agreement template
export async function updateAgreementTemplate(input: UpdateAgreementTemplateInput): Promise<AgreementTemplate | null> {
  try {
    const validatedInput = UpdateAgreementTemplateSchema.parse(input)
    const existing = await getAgreementTemplate(validatedInput.id)
    
    if (!existing) {
      return null
    }

    const updated: AgreementTemplate = {
      ...existing,
      ...validatedInput,
      updatedAt: new Date()
    }

    const validatedTemplate = AgreementTemplateSchema.parse(updated)
    const templateKey = getAgreementTemplateKey(validatedInput.id)

    // Store updated data
    const templateData: Record<string, string> = {
      id: validatedTemplate.id,
      name: validatedTemplate.name,
      content: validatedTemplate.content,
      propertyId: validatedTemplate.propertyId,
      createdBy: validatedTemplate.createdBy,
      category: validatedTemplate.category,
      description: validatedTemplate.description || '',
      legalReviewedBy: validatedTemplate.legalReviewedBy || '',
      createdAt: validatedTemplate.createdAt.toISOString(),
      updatedAt: validatedTemplate.updatedAt.toISOString(),
      legalReviewDate: validatedTemplate.legalReviewDate?.toISOString() || '',
      deletedAt: validatedTemplate.deletedAt?.toISOString() || '',
      variables: JSON.stringify(validatedTemplate.variables),
      version: validatedTemplate.version.toString(),
      isActive: validatedTemplate.isActive.toString()
    }

    Object.keys(templateData).forEach(key => {
      if (templateData[key] === '') {
        delete templateData[key]
      }
    })

    await db.hset(templateKey, templateData)
    return validatedTemplate
  } catch (error) {
    console.error('Error updating agreement template:', error)
    throw error
  }
}

// Get all templates for a property
export async function getPropertyAgreementTemplates(propertyId: string): Promise<AgreementTemplate[]> {
  try {
    const propertyTemplatesKey = getPropertyTemplatesKey(propertyId)
    const templateIds = await db.smembers(propertyTemplatesKey)
    
    if (!templateIds || templateIds.length === 0) {
      return []
    }

    const templates = await Promise.all(
      templateIds.map(id => getAgreementTemplate(id))
    )

    return templates.filter((template): template is AgreementTemplate => template !== null)
  } catch (error) {
    console.error('Error getting property agreement templates:', error)
    return []
  }
}

// Get active templates for a property
export async function getActivePropertyAgreementTemplates(propertyId: string): Promise<AgreementTemplate[]> {
  try {
    const templates = await getPropertyAgreementTemplates(propertyId)
    return templates.filter(template => template.isActive)
  } catch (error) {
    console.error('Error getting active property agreement templates:', error)
    return []
  }
}

// Soft delete agreement template
export async function deleteAgreementTemplate(id: string): Promise<boolean> {
  try {
    const template = await getAgreementTemplate(id)
    if (!template) {
      return false
    }

    const updated = await updateAgreementTemplate({
      id,
      deletedAt: new Date(),
      isActive: false
    })

    return updated !== null
  } catch (error) {
    console.error('Error deleting agreement template:', error)
    return false
  }
}

// ===== AGREEMENT OPERATIONS =====

// Create a new agreement
export async function createAgreement(input: CreateAgreementInput): Promise<Agreement> {
  try {
    const validatedInput = CreateAgreementSchema.parse(input)
    
    const id = uuidv4()
    const now = new Date()
    
    const agreement: Agreement = {
      ...validatedInput,
      id,
      createdAt: now,
      updatedAt: now
    }

    const validatedAgreement = AgreementSchema.parse(agreement)

    // Store in Redis
    const agreementKey = getAgreementKey(id)
    const propertyAgreementsKey = getPropertyAgreementsKey(agreement.propertyId)
    const allAgreementsKey = getAllAgreementsKey()

    const pipeline = db.pipeline()
    
    const agreementData: Record<string, string> = {
      id: validatedAgreement.id,
      templateId: validatedAgreement.templateId,
      tenantId: validatedAgreement.tenantId || '',
      propertyId: validatedAgreement.propertyId,
      prospectEmail: validatedAgreement.prospectEmail,
      prospectName: validatedAgreement.prospectName,
      prospectPhone: validatedAgreement.prospectPhone || '',
      status: validatedAgreement.status,
      createdBy: validatedAgreement.createdBy,
      docusignEnvelopeId: validatedAgreement.docusignEnvelopeId || '',
      documentUrl: validatedAgreement.documentUrl || '',
      signedDocumentUrl: validatedAgreement.signedDocumentUrl || '',
      createdAt: validatedAgreement.createdAt.toISOString(),
      updatedAt: validatedAgreement.updatedAt.toISOString(),
      sentDate: validatedAgreement.sentDate.toISOString(),
      viewedDate: validatedAgreement.viewedDate?.toISOString() || '',
      signedDate: validatedAgreement.signedDate?.toISOString() || '',
      completedDate: validatedAgreement.completedDate?.toISOString() || '',
      expirationDate: validatedAgreement.expirationDate.toISOString(),
      lastReminderDate: validatedAgreement.lastReminderDate?.toISOString() || '',
      nextReminderDate: validatedAgreement.nextReminderDate?.toISOString() || '',
      leaseStartDate: validatedAgreement.leaseStartDate?.toISOString() || '',
      leaseEndDate: validatedAgreement.leaseEndDate?.toISOString() || '',
      agreementData: JSON.stringify(validatedAgreement.agreementData || {}),
      remindersSent: validatedAgreement.remindersSent.toString(),
      monthlyRentCents: validatedAgreement.monthlyRentCents?.toString() || '',
      depositCents: validatedAgreement.depositCents?.toString() || '',
      tenantCreated: validatedAgreement.tenantCreated.toString()
    }

    Object.keys(agreementData).forEach(key => {
      if (agreementData[key] === '') {
        delete agreementData[key]
      }
    })
    
    pipeline.hset(agreementKey, agreementData)
    pipeline.sadd(propertyAgreementsKey, id)
    pipeline.sadd(allAgreementsKey, id)
    
    await pipeline.exec()

    // Create initial status history entry
    await addAgreementStatusHistory(id, {
      newStatus: agreement.status,
      timestamp: now,
      triggeredBy: 'system',
      notes: 'Agreement created',
      metadata: {}
    })

    return validatedAgreement
  } catch (error) {
    console.error('Error creating agreement:', error)
    throw error
  }
}

// Get agreement by ID
export async function getAgreement(id: string): Promise<Agreement | null> {
  try {
    const agreementKey = getAgreementKey(id)
    const data = await db.hgetall(agreementKey)
    
    if (!data || Object.keys(data).length === 0) {
      return null
    }

    if (data.deletedAt) {
      return null
    }

    const agreement = {
      ...data,
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
      sentDate: new Date(data.sentDate as string),
      viewedDate: data.viewedDate ? new Date(data.viewedDate as string) : undefined,
      signedDate: data.signedDate ? new Date(data.signedDate as string) : undefined,
      completedDate: data.completedDate ? new Date(data.completedDate as string) : undefined,
      expirationDate: new Date(data.expirationDate as string),
      lastReminderDate: data.lastReminderDate ? new Date(data.lastReminderDate as string) : undefined,
      nextReminderDate: data.nextReminderDate ? new Date(data.nextReminderDate as string) : undefined,
      leaseStartDate: data.leaseStartDate ? new Date(data.leaseStartDate as string) : undefined,
      leaseEndDate: data.leaseEndDate ? new Date(data.leaseEndDate as string) : undefined,
      agreementData: data.agreementData ? JSON.parse(data.agreementData as string) : {},
      remindersSent: parseInt((data.remindersSent as string) || '0'),
      monthlyRentCents: data.monthlyRentCents ? parseInt(data.monthlyRentCents as string) : undefined,
      depositCents: data.depositCents ? parseInt(data.depositCents as string) : undefined,
      tenantCreated: data.tenantCreated === 'true'
    }

    const validatedAgreement = AgreementSchema.parse(agreement)

    // Fetch and attach property details
    if (validatedAgreement.propertyId) {
      const property = await getProperty(validatedAgreement.propertyId)
      if (property) {
        validatedAgreement.property = property
      }
    }

    return validatedAgreement
  } catch (error) {
    console.error('Error getting agreement:', error)
    return null
  }
}

// Update agreement
export async function updateAgreement(input: UpdateAgreementInput): Promise<Agreement | null> {
  try {
    const validatedInput = UpdateAgreementSchema.parse(input)
    const existing = await getAgreement(validatedInput.id)
    
    if (!existing) {
      return null
    }

    const updated: Agreement = {
      ...existing,
      ...validatedInput,
      updatedAt: new Date()
    }

    const validatedAgreement = AgreementSchema.parse(updated)
    const agreementKey = getAgreementKey(validatedInput.id)

    const agreementData: Record<string, string> = {
      id: validatedAgreement.id,
      templateId: validatedAgreement.templateId,
      tenantId: validatedAgreement.tenantId || '',
      propertyId: validatedAgreement.propertyId,
      prospectEmail: validatedAgreement.prospectEmail,
      prospectName: validatedAgreement.prospectName,
      prospectPhone: validatedAgreement.prospectPhone || '',
      status: validatedAgreement.status,
      createdBy: validatedAgreement.createdBy,
      docusignEnvelopeId: validatedAgreement.docusignEnvelopeId || '',
      documentUrl: validatedAgreement.documentUrl || '',
      signedDocumentUrl: validatedAgreement.signedDocumentUrl || '',
      createdAt: validatedAgreement.createdAt.toISOString(),
      updatedAt: validatedAgreement.updatedAt.toISOString(),
      sentDate: validatedAgreement.sentDate.toISOString(),
      viewedDate: validatedAgreement.viewedDate?.toISOString() || '',
      signedDate: validatedAgreement.signedDate?.toISOString() || '',
      completedDate: validatedAgreement.completedDate?.toISOString() || '',
      expirationDate: validatedAgreement.expirationDate.toISOString(),
      lastReminderDate: validatedAgreement.lastReminderDate?.toISOString() || '',
      nextReminderDate: validatedAgreement.nextReminderDate?.toISOString() || '',
      leaseStartDate: validatedAgreement.leaseStartDate?.toISOString() || '',
      leaseEndDate: validatedAgreement.leaseEndDate?.toISOString() || '',
      agreementData: JSON.stringify(validatedAgreement.agreementData || {}),
      remindersSent: validatedAgreement.remindersSent.toString(),
      monthlyRentCents: validatedAgreement.monthlyRentCents?.toString() || '',
      depositCents: validatedAgreement.depositCents?.toString() || '',
      tenantCreated: validatedAgreement.tenantCreated.toString()
    }

    Object.keys(agreementData).forEach(key => {
      if (agreementData[key] === '') {
        delete agreementData[key]
      }
    })

    await db.hset(agreementKey, agreementData)

    // Track status changes
    if (existing.status !== updated.status) {
      await addAgreementStatusHistory(validatedInput.id, {
        previousStatus: existing.status,
        newStatus: updated.status,
        timestamp: new Date(),
        triggeredBy: 'system',
        notes: `Agreement updated from ${existing.status} to ${updated.status}`,
        metadata: {}
      })
    }

    return validatedAgreement
  } catch (error) {
    console.error('Error updating agreement:', error)
    throw error
  }
}

// Get all agreements for a property
export async function getPropertyAgreements(propertyId: string): Promise<Agreement[]> {
  try {
    const propertyAgreementsKey = getPropertyAgreementsKey(propertyId)
    const agreementIds = await db.smembers(propertyAgreementsKey)
    
    if (!agreementIds || agreementIds.length === 0) {
      return []
    }

    const agreements = await Promise.all(
      agreementIds.map(id => getAgreement(id))
    )

    return agreements.filter((agreement): agreement is Agreement => agreement !== null)
  } catch (error) {
    console.error('Error getting property agreements:', error)
    return []
  }
}

// Get agreements by status
export async function getAgreementsByStatus(status: AgreementStatusType, propertyId?: string): Promise<Agreement[]> {
  try {
    const agreements = propertyId 
      ? await getPropertyAgreements(propertyId)
      : await getAllAgreements()
    
    return agreements.filter(agreement => agreement.status === status)
  } catch (error) {
    console.error('Error getting agreements by status:', error)
    return []
  }
}

// Get all agreements
export async function getAllAgreements(): Promise<Agreement[]> {
  try {
    const allAgreementsKey = getAllAgreementsKey()
    const agreementIds = await db.smembers(allAgreementsKey)
    
    if (!agreementIds || agreementIds.length === 0) {
      return []
    }

    const agreements = await Promise.all(
      agreementIds.map(id => getAgreement(id))
    )

    return agreements.filter((agreement): agreement is Agreement => agreement !== null)
  } catch (error) {
    console.error('Error getting all agreements:', error)
    return []
  }
}

// ===== STATUS HISTORY OPERATIONS =====

// Add status history entry
export async function addAgreementStatusHistory(
  agreementId: string, 
  entry: Omit<AgreementStatusHistory, 'id' | 'agreementId'>
): Promise<AgreementStatusHistory> {
  try {
    const id = uuidv4()
    const statusHistory: AgreementStatusHistory = {
      ...entry,
      id,
      agreementId
    }

    const validatedHistory = AgreementStatusHistorySchema.parse(statusHistory)
    const historyKey = getAgreementStatusHistoryKey(agreementId)

    // Store as list item
    const historyData = {
      ...validatedHistory,
      timestamp: validatedHistory.timestamp.toISOString(),
      metadata: JSON.stringify(validatedHistory.metadata || {})
    }

    await db.lpush(historyKey, JSON.stringify(historyData))
    
    return validatedHistory
  } catch (error) {
    console.error('Error adding agreement status history:', error)
    throw error
  }
}

// Get status history for agreement
export async function getAgreementStatusHistory(agreementId: string): Promise<AgreementStatusHistory[]> {
  try {
    const historyKey = getAgreementStatusHistoryKey(agreementId)
    const historyData = await db.lrange(historyKey, 0, -1)
    
    if (!historyData || historyData.length === 0) {
      return []
    }

    const history = historyData.map(data => {
      const parsed = JSON.parse(data)
      return {
        ...parsed,
        timestamp: new Date(parsed.timestamp),
        metadata: parsed.metadata ? JSON.parse(parsed.metadata) : {}
      }
    })

    return history.map(h => AgreementStatusHistorySchema.parse(h))
  } catch (error) {
    console.error('Error getting agreement status history:', error)
    return []
  }
}

// ===== UTILITY FUNCTIONS =====

// Process template variables and populate agreement content
export async function populateTemplateContent(
  templateId: string, 
  variableValues: TemplateVariableValue[]
): Promise<string> {
  try {
    const template = await getAgreementTemplate(templateId)
    if (!template) {
      throw new Error('Template not found')
    }

    let content = template.content
    
    // Replace template variables with actual values
    variableValues.forEach(variable => {
      const placeholder = `{{${variable.name}}}`
      content = content.replace(new RegExp(placeholder, 'g'), String(variable.value))
    })

    return content
  } catch (error) {
    console.error('Error populating template content:', error)
    throw error
  }
}

// Get agreements requiring reminders
export async function getAgreementsRequiringReminders(): Promise<Agreement[]> {
  try {
    const allAgreements = await getAllAgreements()
    const now = new Date()
    
    return allAgreements.filter(agreement => {
      // Only send reminders for Sent or Viewed agreements
      if (!['Sent', 'Viewed'].includes(agreement.status)) {
        return false
      }
      
      // Check if reminder is due
      if (agreement.nextReminderDate && agreement.nextReminderDate <= now) {
        return true
      }
      
      // Check if agreement is expiring soon and no reminders sent
      if (agreement.expirationDate <= now && agreement.remindersSent === 0) {
        return true
      }
      
      return false
    })
  } catch (error) {
    console.error('Error getting agreements requiring reminders:', error)
    return []
  }
}
