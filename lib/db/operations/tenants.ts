import { db } from '../index'
import { 
  Tenant, 
  CreateTenantInput, 
  UpdateTenantInput,
  TenantSchema,
  CreateTenantSchema,
  UpdateTenantSchema,
  EmergencyContact,
  TenantDocument,
  Communication,
  RoomAssignment,
  TenantStatusType
} from '../models/tenant'
import { v4 as uuidv4 } from 'uuid'

// Generate Redis keys for tenant data
const getTenantKey = (id: string) => `tenant:${id}`
const getPropertyTenantsKey = (propertyId: string) => `property:${propertyId}:tenants`
const getAllTenantsKey = () => 'tenants:all'

// Create a new tenant
export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  try {
    // Validate input
    const validatedInput = CreateTenantSchema.parse(input)
    
    // Generate ID and timestamps
    const id = uuidv4()
    const now = new Date()
    
    const tenant: Tenant = {
      ...validatedInput,
      id,
      createdAt: now,
      updatedAt: now
    }

    // Validate complete tenant object
    const validatedTenant = TenantSchema.parse(tenant)

    // Store in Redis
    const tenantKey = getTenantKey(id)
    const propertyTenantsKey = getPropertyTenantsKey(tenant.propertyId)
    const allTenantsKey = getAllTenantsKey()

    // Use pipeline for atomic operations
    const pipeline = db.pipeline()
    
    // Store tenant data as hash
    const tenantData: Record<string, string> = {
      ...validatedTenant,
      createdAt: validatedTenant.createdAt.toISOString(),
      updatedAt: validatedTenant.updatedAt.toISOString(),
      // Handle legacy fields
      leaseStart: validatedTenant.leaseStart?.toISOString() || '',
      leaseEnd: validatedTenant.leaseEnd?.toISOString() || '',
      monthlyRentCents: validatedTenant.monthlyRentCents?.toString() || '',
      depositCents: validatedTenant.depositCents?.toString() || '',
      emergencyContact: validatedTenant.emergencyContact ? JSON.stringify(validatedTenant.emergencyContact) : '',
      // Handle enhanced fields
      emergencyContacts: JSON.stringify(validatedTenant.emergencyContacts || []),
      documents: JSON.stringify(validatedTenant.documents || []),
      communicationHistory: JSON.stringify(validatedTenant.communicationHistory || []),
      leaseHistory: JSON.stringify(validatedTenant.leaseHistory || []),
      roomAssignment: validatedTenant.roomAssignment ? JSON.stringify(validatedTenant.roomAssignment) : ''
    }
    
    // Remove empty string values to avoid storing unnecessary data
    Object.keys(tenantData).forEach(key => {
      if (tenantData[key] === '') {
        delete tenantData[key]
      }
    })
    
    pipeline.hset(tenantKey, tenantData)
    
    // Add to property tenants set
    pipeline.sadd(propertyTenantsKey, id)
    
    // Add to all tenants set
    pipeline.sadd(allTenantsKey, id)
    
    await pipeline.exec()

    return validatedTenant
  } catch (error) {
    console.error('Error creating tenant:', error)
    throw error
  }
}

// Get tenant by ID
export async function getTenant(id: string): Promise<Tenant | null> {
  try {
    const tenantKey = getTenantKey(id)
    const data = await db.hgetall(tenantKey)
    
    if (!data || Object.keys(data).length === 0) {
      return null
    }

    // Check for soft delete
    if (data.deletedAt) {
      return null
    }

    // Parse stored data back to proper types
    const tenant = {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      // Handle legacy fields
      leaseStart: data.leaseStart ? new Date(data.leaseStart) : undefined,
      leaseEnd: data.leaseEnd ? new Date(data.leaseEnd) : undefined,
      monthlyRentCents: data.monthlyRentCents ? parseInt(data.monthlyRentCents) : undefined,
      depositCents: data.depositCents ? parseInt(data.depositCents) : undefined,
      emergencyContact: data.emergencyContact ? JSON.parse(data.emergencyContact) : undefined,
      // Handle enhanced fields
      emergencyContacts: data.emergencyContacts ? JSON.parse(data.emergencyContacts) : [],
      documents: data.documents ? JSON.parse(data.documents) : [],
      communicationHistory: data.communicationHistory ? JSON.parse(data.communicationHistory) : [],
      leaseHistory: data.leaseHistory ? JSON.parse(data.leaseHistory) : [],
      roomAssignment: data.roomAssignment ? JSON.parse(data.roomAssignment) : undefined
    }

    return TenantSchema.parse(tenant)
  } catch (error) {
    console.error('Error fetching tenant:', error)
    return null
  }
}

// Update tenant
export async function updateTenant(input: UpdateTenantInput): Promise<Tenant | null> {
  try {
    const validatedInput = UpdateTenantSchema.parse(input)
    const { id, ...updates } = validatedInput

    // Get existing tenant
    const existingTenant = await getTenant(id)
    if (!existingTenant) {
      throw new Error('Tenant not found')
    }

    // Merge updates with existing data
    const updatedTenant: Tenant = {
      ...existingTenant,
      ...updates,
      updatedAt: new Date()
    }

    // Validate updated tenant
    const validatedTenant = TenantSchema.parse(updatedTenant)

    // Update in Redis
    const tenantKey = getTenantKey(id)
    const tenantData: Record<string, string> = {
      ...validatedTenant,
      createdAt: validatedTenant.createdAt.toISOString(),
      updatedAt: validatedTenant.updatedAt.toISOString(),
      // Handle legacy fields
      leaseStart: validatedTenant.leaseStart?.toISOString() || '',
      leaseEnd: validatedTenant.leaseEnd?.toISOString() || '',
      monthlyRentCents: validatedTenant.monthlyRentCents?.toString() || '',
      depositCents: validatedTenant.depositCents?.toString() || '',
      emergencyContact: validatedTenant.emergencyContact ? JSON.stringify(validatedTenant.emergencyContact) : '',
      // Handle enhanced fields
      emergencyContacts: JSON.stringify(validatedTenant.emergencyContacts || []),
      documents: JSON.stringify(validatedTenant.documents || []),
      communicationHistory: JSON.stringify(validatedTenant.communicationHistory || []),
      leaseHistory: JSON.stringify(validatedTenant.leaseHistory || []),
      roomAssignment: validatedTenant.roomAssignment ? JSON.stringify(validatedTenant.roomAssignment) : ''
    }
    
    // Remove empty string values
    Object.keys(tenantData).forEach(key => {
      if (tenantData[key] === '') {
        delete tenantData[key]
      }
    })
    
    await db.hset(tenantKey, tenantData)

    return validatedTenant
  } catch (error) {
    console.error('Error updating tenant:', error)
    throw error
  }
}

// Soft delete tenant
export async function deleteTenant(id: string): Promise<boolean> {
  try {
    const existingTenant = await getTenant(id)
    if (!existingTenant) {
      return false
    }

    // Soft delete by setting deletedAt
    const tenantKey = getTenantKey(id)
    await db.hset(tenantKey, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    return true
  } catch (error) {
    console.error('Error deleting tenant:', error)
    return false
  }
}

// Get all tenants for a property
export async function getPropertyTenants(propertyId: string): Promise<Tenant[]> {
  try {
    const propertyTenantsKey = getPropertyTenantsKey(propertyId)
    const tenantIds = await db.smembers(propertyTenantsKey)
    
    if (!tenantIds || tenantIds.length === 0) {
      return []
    }

    // Get all tenants in parallel
    const tenants = await Promise.all(
      tenantIds.map(id => getTenant(id))
    )

    // Filter out null values (deleted or not found tenants)
    return tenants.filter((tenant): tenant is Tenant => tenant !== null)
  } catch (error) {
    console.error('Error fetching property tenants:', error)
    return []
  }
}

// Get all active tenants for a property
export async function getActivePropertyTenants(propertyId: string): Promise<Tenant[]> {
  try {
    const allTenants = await getPropertyTenants(propertyId)
    return allTenants.filter(tenant => tenant.status === 'Active')
  } catch (error) {
    console.error('Error fetching active property tenants:', error)
    return []
  }
}

// Get tenant by email
export async function getTenantByEmail(email: string): Promise<Tenant | null> {
  try {
    const allTenantsKey = getAllTenantsKey()
    const tenantIds = await db.smembers(allTenantsKey)
    
    if (!tenantIds || tenantIds.length === 0) {
      return null
    }

    // Search through all tenants for matching email
    for (const id of tenantIds) {
      const tenant = await getTenant(id)
      if (tenant && tenant.email === email) {
        return tenant
      }
    }

    return null
  } catch (error) {
    console.error('Error fetching tenant by email:', error)
    return null
  }
}

// Get tenant by ID (alias for compatibility)
export async function getTenantById(id: string): Promise<Tenant | null> {
  return getTenant(id)
}

// Enhanced tenant management functions for Story 3.1

// Add emergency contact to tenant
export async function addEmergencyContact(tenantId: string, contact: Omit<EmergencyContact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant | null> {
  try {
    const tenant = await getTenant(tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    const newContact: EmergencyContact = {
      ...contact,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const updatedContacts = [...(tenant.emergencyContacts || []), newContact]
    
    return await updateTenant({
      id: tenantId,
      emergencyContacts: updatedContacts
    })
  } catch (error) {
    console.error('Error adding emergency contact:', error)
    throw error
  }
}

// Update emergency contact
export async function updateEmergencyContact(tenantId: string, contactId: string, updates: Partial<Omit<EmergencyContact, 'id' | 'createdAt'>>): Promise<Tenant | null> {
  try {
    const tenant = await getTenant(tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    const updatedContacts = (tenant.emergencyContacts || []).map(contact => 
      contact.id === contactId 
        ? { ...contact, ...updates, updatedAt: new Date() }
        : contact
    )
    
    return await updateTenant({
      id: tenantId,
      emergencyContacts: updatedContacts
    })
  } catch (error) {
    console.error('Error updating emergency contact:', error)
    throw error
  }
}

// Remove emergency contact
export async function removeEmergencyContact(tenantId: string, contactId: string): Promise<Tenant | null> {
  try {
    const tenant = await getTenant(tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    const updatedContacts = (tenant.emergencyContacts || []).filter(contact => contact.id !== contactId)
    
    return await updateTenant({
      id: tenantId,
      emergencyContacts: updatedContacts
    })
  } catch (error) {
    console.error('Error removing emergency contact:', error)
    throw error
  }
}

// Add document to tenant
export async function addTenantDocument(tenantId: string, document: Omit<TenantDocument, 'id' | 'uploadDate'>): Promise<Tenant | null> {
  try {
    const tenant = await getTenant(tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    const newDocument: TenantDocument = {
      ...document,
      id: uuidv4(),
      uploadDate: new Date()
    }

    const updatedDocuments = [...(tenant.documents || []), newDocument]
    
    return await updateTenant({
      id: tenantId,
      documents: updatedDocuments
    })
  } catch (error) {
    console.error('Error adding tenant document:', error)
    throw error
  }
}

// Remove document from tenant
export async function removeTenantDocument(tenantId: string, documentId: string): Promise<Tenant | null> {
  try {
    const tenant = await getTenant(tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    const updatedDocuments = (tenant.documents || []).filter(doc => doc.id !== documentId)
    
    return await updateTenant({
      id: tenantId,
      documents: updatedDocuments
    })
  } catch (error) {
    console.error('Error removing tenant document:', error)
    throw error
  }
}

// Add communication record
export async function addCommunicationRecord(tenantId: string, communication: Omit<Communication, 'id' | 'timestamp'>): Promise<Tenant | null> {
  try {
    const tenant = await getTenant(tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    const newCommunication: Communication = {
      ...communication,
      id: uuidv4(),
      timestamp: new Date()
    }

    const updatedHistory = [...(tenant.communicationHistory || []), newCommunication]
    
    return await updateTenant({
      id: tenantId,
      communicationHistory: updatedHistory
    })
  } catch (error) {
    console.error('Error adding communication record:', error)
    throw error
  }
}

// Update room assignment
export async function updateRoomAssignment(tenantId: string, roomAssignment: RoomAssignment): Promise<Tenant | null> {
  try {
    return await updateTenant({
      id: tenantId,
      roomAssignment
    })
  } catch (error) {
    console.error('Error updating room assignment:', error)
    throw error
  }
}

// Search tenants with filters
export async function searchTenants(filters: {
  query?: string;
  status?: TenantStatusType;
  propertyId?: string;
  roomNumber?: string;
  leaseStatus?: 'active' | 'expiring' | 'expired';
}): Promise<Tenant[]> {
  try {
    const allTenantsKey = getAllTenantsKey()
    const tenantIds = await db.smembers(allTenantsKey)
    
    if (!tenantIds || tenantIds.length === 0) {
      return []
    }

    // Get all tenants
    const tenants = await Promise.all(
      tenantIds.map(id => getTenant(id))
    )

    // Filter out null values
    const validTenants = tenants.filter((tenant): tenant is Tenant => tenant !== null)

    // Apply filters
    return validTenants.filter(tenant => {
      // Text search filter
      if (filters.query) {
        const query = filters.query.toLowerCase()
        const searchText = `${tenant.firstName} ${tenant.lastName} ${tenant.email} ${tenant.phone}`.toLowerCase()
        if (!searchText.includes(query)) {
          return false
        }
      }

      // Status filter
      if (filters.status && tenant.status !== filters.status) {
        return false
      }

      // Property filter
      if (filters.propertyId && tenant.propertyId !== filters.propertyId) {
        return false
      }

      // Room number filter
      if (filters.roomNumber) {
        const roomNumber = tenant.roomAssignment?.roomNumber || tenant.roomNumber
        if (roomNumber !== filters.roomNumber) {
          return false
        }
      }

      // Lease status filter
      if (filters.leaseStatus) {
        const currentLease = tenant.leaseHistory?.find(lease => lease.isActive) ||
          (tenant.leaseStart && tenant.leaseEnd ? {
            startDate: tenant.leaseStart,
            endDate: tenant.leaseEnd,
            isActive: true
          } : null)

        if (!currentLease) {
          return filters.leaseStatus === 'expired'
        }

        const now = new Date()
        const leaseEnd = currentLease.endDate
        const daysUntilExpiry = Math.ceil((leaseEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        switch (filters.leaseStatus) {
          case 'active':
            return daysUntilExpiry > 30
          case 'expiring':
            return daysUntilExpiry <= 30 && daysUntilExpiry > 0
          case 'expired':
            return daysUntilExpiry <= 0
          default:
            return true
        }
      }

      return true
    })
  } catch (error) {
    console.error('Error searching tenants:', error)
    return []
  }
}

// Get tenants with expiring leases
export async function getTenantsWithExpiringLeases(daysAhead: number = 30): Promise<Tenant[]> {
  try {
    return await searchTenants({ leaseStatus: 'expiring' })
  } catch (error) {
    console.error('Error getting tenants with expiring leases:', error)
    return []
  }
}
