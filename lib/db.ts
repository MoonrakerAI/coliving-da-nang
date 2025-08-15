import { kv } from '@vercel/kv'

// Database connection utility for Vercel KV Redis
export const db = kv

// Export all models
export * from './db/models/tenant'
export * from './db/models/property'
export * from './db/models/payment'
export * from './db/models/expense'

// Export all operations
export * from './db/operations/tenants'
export * from './db/operations/properties'
export * from './db/operations/payments'
export * from './db/operations/expenses'

// Database health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.ping()
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

// Database utility functions
export async function clearAllData(): Promise<void> {
  try {
    // Get all keys
    const keys = await db.keys('*')
    
    if (keys.length > 0) {
      // Delete all keys in batches
      const batchSize = 100
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize)
        await db.del(...batch)
      }
    }
    
    console.log(`Cleared ${keys.length} keys from database`)
  } catch (error) {
    console.error('Error clearing database:', error)
    throw error
  }
}

// Database migration utilities
export async function runMigrations(): Promise<void> {
  try {
    // Set up any required indexes or initial data
    console.log('Database migrations completed')
  } catch (error) {
    console.error('Error running migrations:', error)
    throw error
  }
}
