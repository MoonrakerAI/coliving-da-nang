import { db } from '../index'
import { 
  Tenant, 
  CreateTenantInput, 
  UpdateTenantInput,
  TenantSchema,
  CreateTenantSchema,
  UpdateTenantSchema
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
    pipeline.hset(tenantKey, {
      ...validatedTenant,
      createdAt: validatedTenant.createdAt.toISOString(),
      updatedAt: validatedTenant.updatedAt.toISOString(),
      leaseStart: validatedTenant.leaseStart.toISOString(),
      leaseEnd: validatedTenant.leaseEnd.toISOString(),
      emergencyContact: JSON.stringify(validatedTenant.emergencyContact)
    })
    
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
      leaseStart: new Date(data.leaseStart),
      leaseEnd: new Date(data.leaseEnd),
      monthlyRentCents: parseInt(data.monthlyRentCents),
      depositCents: parseInt(data.depositCents),
      emergencyContact: JSON.parse(data.emergencyContact)
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
    await db.hset(tenantKey, {
      ...validatedTenant,
      createdAt: validatedTenant.createdAt.toISOString(),
      updatedAt: validatedTenant.updatedAt.toISOString(),
      leaseStart: validatedTenant.leaseStart.toISOString(),
      leaseEnd: validatedTenant.leaseEnd.toISOString(),
      emergencyContact: JSON.stringify(validatedTenant.emergencyContact)
    })

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
