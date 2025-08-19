// Database index file - exports all database operations and models
export * from './models'
export * from './operations'

// Re-export commonly used types
export type { 
  Tenant, 
  CreateTenantInput, 
  UpdateTenantInput 
} from './models/tenant'

export type { 
  Payment, 
  CreatePayment, 
  UpdatePayment 
} from './models/payment'

export type { 
  Expense, 
  CreateExpenseInput, 
  UpdateExpenseInput 
} from './models/expense'

export type { 
  Property, 
  CreatePropertyInput, 
  UpdatePropertyInput 
} from './models/property'

export type { 
  User, 
  CreateUser, 
  UpdateUser 
} from './models/user'
