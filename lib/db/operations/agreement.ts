import { kv } from '@vercel/kv'
import { 
  Agreement, 
  AgreementTemplate, 
  CreateAgreementInput, 
  CreateAgreementTemplateInput,
  UpdateAgreementInput,
  UpdateAgreementTemplateInput,
  AgreementStatusHistory,
  TemplateVariable
} from '../models/agreement'

// Agreement Template Operations
export async function createAgreementTemplate(data: CreateAgreementTemplateInput): Promise<AgreementTemplate> {
  const id = crypto.randomUUID()
  const now = new Date()
  
  const template: AgreementTemplate = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now
  }
  
  await kv.hset(`agreement_template:${id}`, template)
  await kv.sadd('agreement_templates', id)
  await kv.sadd(`property:${data.propertyId}:agreement_templates`, id)
  
  return template
}

export async function getAgreementTemplate(id: string): Promise<AgreementTemplate | null> {
  const template = await kv.hgetall(`agreement_template:${id}`)
  if (!template || Object.keys(template).length === 0) return null
  
  return template as AgreementTemplate
}

export async function updateAgreementTemplate(data: UpdateAgreementTemplateInput): Promise<AgreementTemplate | null> {
  const existing = await getAgreementTemplate(data.id)
  if (!existing) return null
  
  const updated: AgreementTemplate = {
    ...existing,
    ...data,
    updatedAt: new Date()
  }
  
  await kv.hset(`agreement_template:${data.id}`, updated)
  return updated
}

export async function deleteAgreementTemplate(id: string): Promise<boolean> {
  const existing = await getAgreementTemplate(id)
  if (!existing) return false
  
  // Soft delete
  const updated: AgreementTemplate = {
    ...existing,
    deletedAt: new Date(),
    updatedAt: new Date()
  }
  
  await kv.hset(`agreement_template:${id}`, updated)
  return true
}

export async function getAgreementTemplatesByProperty(propertyId: string): Promise<AgreementTemplate[]> {
  const templateIds = await kv.smembers(`property:${propertyId}:agreement_templates`)
  const templates: AgreementTemplate[] = []
  
  for (const id of templateIds) {
    const template = await getAgreementTemplate(id)
    if (template && !template.deletedAt && template.isActive) {
      templates.push(template)
    }
  }
  
  return templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
}

// Agreement Operations
export async function createAgreement(data: CreateAgreementInput): Promise<Agreement> {
  const id = crypto.randomUUID()
  const now = new Date()
  
  const agreement: Agreement = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now
  }
  
  await kv.hset(`agreement:${id}`, agreement)
  await kv.sadd('agreements', id)
  await kv.sadd(`property:${data.propertyId}:agreements`, id)
  await kv.sadd(`template:${data.templateId}:agreements`, id)
  
  // Track status history
  await createStatusHistory(id, undefined, data.status, 'Agreement created')
  
  return agreement
}

export async function getAgreement(id: string): Promise<Agreement | null> {
  const agreement = await kv.hgetall(`agreement:${id}`)
  if (!agreement || Object.keys(agreement).length === 0) return null
  
  return agreement as Agreement
}

export async function updateAgreement(data: UpdateAgreementInput): Promise<Agreement | null> {
  const existing = await getAgreement(data.id)
  if (!existing) return null
  
  const updated: Agreement = {
    ...existing,
    ...data,
    updatedAt: new Date()
  }
  
  // Track status change if status updated
  if (data.status && data.status !== existing.status) {
    await createStatusHistory(data.id, existing.status, data.status, 'Status updated')
  }
  
  await kv.hset(`agreement:${data.id}`, updated)
  return updated
}

export async function deleteAgreement(id: string): Promise<boolean> {
  const existing = await getAgreement(id)
  if (!existing) return false
  
  // Soft delete
  const updated: Agreement = {
    ...existing,
    deletedAt: new Date(),
    updatedAt: new Date()
  }
  
  await kv.hset(`agreement:${id}`, updated)
  return true
}

export async function getAgreementsByProperty(propertyId: string): Promise<Agreement[]> {
  const agreementIds = await kv.smembers(`property:${propertyId}:agreements`)
  const agreements: Agreement[] = []
  
  for (const id of agreementIds) {
    const agreement = await getAgreement(id)
    if (agreement && !agreement.deletedAt) {
      agreements.push(agreement)
    }
  }
  
  return agreements.sort((a, b) => b.sentDate.getTime() - a.sentDate.getTime())
}

export async function getAgreementsByTemplate(templateId: string): Promise<Agreement[]> {
  const agreementIds = await kv.smembers(`template:${templateId}:agreements`)
  const agreements: Agreement[] = []
  
  for (const id of agreementIds) {
    const agreement = await getAgreement(id)
    if (agreement && !agreement.deletedAt) {
      agreements.push(agreement)
    }
  }
  
  return agreements.sort((a, b) => b.sentDate.getTime() - a.sentDate.getTime())
}

export async function getAgreementsByStatus(status: string): Promise<Agreement[]> {
  const allAgreementIds = await kv.smembers('agreements')
  const agreements: Agreement[] = []
  
  for (const id of allAgreementIds) {
    const agreement = await getAgreement(id)
    if (agreement && !agreement.deletedAt && agreement.status === status) {
      agreements.push(agreement)
    }
  }
  
  return agreements.sort((a, b) => b.sentDate.getTime() - a.sentDate.getTime())
}

// Status History Operations
async function createStatusHistory(
  agreementId: string, 
  previousStatus: string | undefined, 
  newStatus: string, 
  notes?: string
): Promise<void> {
  const id = crypto.randomUUID()
  const history: AgreementStatusHistory = {
    id,
    agreementId,
    previousStatus: previousStatus as any,
    newStatus: newStatus as any,
    timestamp: new Date(),
    notes,
    triggeredBy: 'system',
    metadata: {}
  }
  
  await kv.hset(`agreement_status_history:${id}`, history)
  await kv.sadd(`agreement:${agreementId}:status_history`, id)
}

export async function getAgreementStatusHistory(agreementId: string): Promise<AgreementStatusHistory[]> {
  const historyIds = await kv.smembers(`agreement:${agreementId}:status_history`)
  const history: AgreementStatusHistory[] = []
  
  for (const id of historyIds) {
    const record = await kv.hgetall(`agreement_status_history:${id}`)
    if (record && Object.keys(record).length > 0) {
      history.push(record as AgreementStatusHistory)
    }
  }
  
  return history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

// Utility functions for template processing
export function extractVariablesFromContent(content: string): string[] {
  const variableRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g
  const matches = []
  let match
  
  while ((match = variableRegex.exec(content)) !== null) {
    matches.push(match[1])
  }
  
  return Array.from(new Set(matches))
}

export function populateTemplateContent(content: string, variables: Record<string, any>): string {
  let populatedContent = content
  
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    populatedContent = populatedContent.replace(placeholder, String(value))
  })
  
  return populatedContent
}

export function validateTemplateVariables(template: AgreementTemplate): string[] {
  const errors: string[] = []
  
  if (!template.content?.trim()) {
    errors.push('Template content is required')
    return errors
  }
  
  const contentVariables = extractVariablesFromContent(template.content)
  const definedVariables = template.variables?.map(v => v.name) || []
  
  // Check for undefined variables in content
  const undefinedVars = contentVariables.filter(name => !definedVariables.includes(name))
  if (undefinedVars.length > 0) {
    errors.push(`Undefined variables in content: ${undefinedVars.join(', ')}`)
  }
  
  // Check for duplicate variable names
  const duplicates = definedVariables.filter((name, index) => definedVariables.indexOf(name) !== index)
  if (duplicates.length > 0) {
    errors.push(`Duplicate variable names: ${duplicates.join(', ')}`)
  }
  
  return errors
}
