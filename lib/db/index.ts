// Database index file - exports all database operations and models
export * from './models'
export * from './operations'

// Re-export commonly used types
export type { 
  Tenant, 
  CreateTenant, 
  UpdateTenant 
} from './models/tenant'

export type { 
  Payment, 
  CreatePayment, 
  UpdatePayment 
} from './models/payment'

export type { 
  Expense, 
  CreateExpense, 
  UpdateExpense 
} from './models/expense'

export type { 
  Property, 
  CreateProperty, 
  UpdateProperty 
} from './models/property'

export type { 
  User, 
  CreateUser, 
  UpdateUser 
} from './models/user'
