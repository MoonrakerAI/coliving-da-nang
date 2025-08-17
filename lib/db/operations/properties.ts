import { db } from '../../db'
import { 
  Property, 
  CreatePropertyInput, 
  UpdatePropertyInput,
  PropertySchema,
  CreatePropertySchema,
  UpdatePropertySchema
} from '../models/property'
import { v4 as uuidv4 } from 'uuid'

// Generate Redis keys for property data
const getPropertyKey = (id: string) => `property:${id}`
const getOwnerPropertiesKey = (ownerId: string) => `owner:${ownerId}:properties`
const getAllPropertiesKey = () => 'properties:all'
const getActivePropertiesKey = () => 'properties:active'

// Create a new property
export async function createProperty(input: CreatePropertyInput): Promise<Property> {
  try {
    // Validate input
    const validatedInput = CreatePropertySchema.parse(input)
    
    // Generate ID and timestamps
    const id = uuidv4()
    const now = new Date()
    
    const property: Property = {
      ...validatedInput,
      id,
      createdAt: now,
      updatedAt: now
    }

    // Validate complete property object
    const validatedProperty = PropertySchema.parse(property)

    // Store in Redis
    const propertyKey = getPropertyKey(id)
    const ownerPropertiesKey = getOwnerPropertiesKey(property.ownerId)
    const allPropertiesKey = getAllPropertiesKey()
    const activePropertiesKey = getActivePropertiesKey()

    // Use pipeline for atomic operations
    const pipeline = db.pipeline()
    
    // Store property data as hash
    pipeline.hset(propertyKey, {
      ...validatedProperty,
      createdAt: validatedProperty.createdAt.toISOString(),
      updatedAt: validatedProperty.updatedAt.toISOString(),
      address: JSON.stringify(validatedProperty.address),
      settings: JSON.stringify(validatedProperty.settings),
      houseRules: JSON.stringify(validatedProperty.houseRules),
      isActive: validatedProperty.isActive.toString()
    })
    
    // Add to various indexes
    pipeline.sadd(ownerPropertiesKey, id)
    pipeline.sadd(allPropertiesKey, id)
    
    if (property.isActive) {
      pipeline.sadd(activePropertiesKey, id)
    }
    
    await pipeline.exec()

    return validatedProperty
  } catch (error) {
    console.error('Error creating property:', error)
    throw error
  }
}

// Get property by ID
export async function getProperty(id: string): Promise<Property | null> {
  try {
    const propertyKey = getPropertyKey(id)
    const data = await db.hgetall(propertyKey)
    
    if (!data || Object.keys(data).length === 0) {
      return null
    }

    // Check for soft delete
    if (data.deletedAt) {
      return null
    }

    // Parse stored data back to proper types
    const property = {
      ...data,
      roomCount: parseInt(data.roomCount),
      isActive: data.isActive === 'true',
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      address: JSON.parse(data.address),
      settings: JSON.parse(data.settings),
      houseRules: JSON.parse(data.houseRules)
    }

    return PropertySchema.parse(property)
  } catch (error) {
    console.error('Error fetching property:', error)
    return null
  }
}

// Update property
export async function updateProperty(input: UpdatePropertyInput): Promise<Property | null> {
  try {
    const validatedInput = UpdatePropertySchema.parse(input)
    const { id, ...updates } = validatedInput

    // Get existing property
    const existingProperty = await getProperty(id)
    if (!existingProperty) {
      throw new Error('Property not found')
    }

    // Merge updates with existing data
    const updatedProperty: Property = {
      ...existingProperty,
      ...updates,
      updatedAt: new Date()
    }

    // Validate updated property
    const validatedProperty = PropertySchema.parse(updatedProperty)

    // Update in Redis
    const propertyKey = getPropertyKey(id)
    
    // Handle active status changes
    if (updates.isActive !== undefined && updates.isActive !== existingProperty.isActive) {
      const activePropertiesKey = getActivePropertiesKey()
      
      if (updates.isActive) {
        await db.sadd(activePropertiesKey, id)
      } else {
        await db.srem(activePropertiesKey, id)
      }
    }

    await db.hset(propertyKey, {
      ...validatedProperty,
      createdAt: validatedProperty.createdAt.toISOString(),
      updatedAt: validatedProperty.updatedAt.toISOString(),
      address: JSON.stringify(validatedProperty.address),
      settings: JSON.stringify(validatedProperty.settings),
      houseRules: JSON.stringify(validatedProperty.houseRules),
      isActive: validatedProperty.isActive.toString()
    })

    return validatedProperty
  } catch (error) {
    console.error('Error updating property:', error)
    throw error
  }
}

// Soft delete property
export async function deleteProperty(id: string): Promise<boolean> {
  try {
    const existingProperty = await getProperty(id)
    if (!existingProperty) {
      return false
    }

    // Soft delete by setting deletedAt
    const propertyKey = getPropertyKey(id)
    await db.hset(propertyKey, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Remove from active properties if it was active
    if (existingProperty.isActive) {
      const activePropertiesKey = getActivePropertiesKey()
      await db.srem(activePropertiesKey, id)
    }

    return true
  } catch (error) {
    console.error('Error deleting property:', error)
    return false
  }
}

// Get all properties for an owner
export async function getOwnerProperties(ownerId: string): Promise<Property[]> {
  try {
    const ownerPropertiesKey = getOwnerPropertiesKey(ownerId)
    const propertyIds = await db.smembers(ownerPropertiesKey)
    
    if (!propertyIds || propertyIds.length === 0) {
      return []
    }

    // Get all properties in parallel
    const properties = await Promise.all(
      propertyIds.map(id => getProperty(id))
    )

    // Filter out null values (deleted or not found properties)
    return properties.filter((property): property is Property => property !== null)
  } catch (error) {
    console.error('Error fetching owner properties:', error)
    return []
  }
}

// Get all active properties
export async function getActiveProperties(): Promise<Property[]> {
  try {
    const activePropertiesKey = getActivePropertiesKey()
    const propertyIds = await db.smembers(activePropertiesKey)
    
    if (!propertyIds || propertyIds.length === 0) {
      return []
    }

    // Get all properties in parallel
    const properties = await Promise.all(
      propertyIds.map(id => getProperty(id))
    )

    // Filter out null values and ensure they're still active
    return properties.filter((property): property is Property => 
      property !== null && property.isActive
    )
  } catch (error) {
    console.error('Error fetching active properties:', error)
    return []
  }
}

// Get all properties
export async function getAllProperties(): Promise<Property[]> {
  try {
    const allPropertiesKey = getAllPropertiesKey()
    const propertyIds = await db.smembers(allPropertiesKey)
    
    if (!propertyIds || propertyIds.length === 0) {
      return []
    }

    // Get all properties in parallel
    const properties = await Promise.all(
      propertyIds.map(id => getProperty(id))
    )

    // Filter out null values (deleted or not found properties)
    return properties.filter((property): property is Property => property !== null)
  } catch (error) {
    console.error('Error fetching all properties:', error)
    return []
  }
}

// Deactivate property (soft disable)
export async function deactivateProperty(id: string): Promise<Property | null> {
  try {
    return await updateProperty({
      id,
      isActive: false
    })
  } catch (error) {
    console.error('Error deactivating property:', error)
    throw error
  }
}

// Activate property
export async function activateProperty(id: string): Promise<Property | null> {
  try {
    return await updateProperty({
      id,
      isActive: true
    })
  } catch (error) {
    console.error('Error activating property:', error)
    throw error
  }
}

// Get property by ID (alias for compatibility)
export async function getPropertyById(id: string): Promise<Property | null> {
  return getProperty(id)
}
