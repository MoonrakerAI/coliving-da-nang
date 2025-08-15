import { 
  createProperty, 
  createTenant, 
  createPayment, 
  createExpense,
  clearAllData,
  checkDatabaseConnection
} from './index'
import { 
  CreatePropertyInput,
  CreateTenantInput,
  CreatePaymentInput,
  CreateExpenseInput
} from './index'

// Sample data for development testing
export const sampleProperties: CreatePropertyInput[] = [
  {
    name: "Sunset Villa Coliving",
    address: {
      street: "123 Beach Road",
      city: "Da Nang",
      state: "Da Nang",
      postalCode: "550000",
      country: "Vietnam"
    },
    roomCount: 8,
    settings: {
      allowPets: true,
      smokingAllowed: false,
      maxOccupancy: 12,
      checkInTime: "15:00",
      checkOutTime: "11:00",
      wifiPassword: "sunset2024",
      parkingAvailable: true
    },
    houseRules: [
      "No smoking inside the property",
      "Quiet hours from 10 PM to 8 AM",
      "Clean up after yourself in common areas",
      "Guests must be registered with management",
      "No parties without prior approval"
    ],
    ownerId: "owner-001",
    isActive: true
  },
  {
    name: "Downtown Loft Spaces",
    address: {
      street: "456 Han River Street",
      city: "Da Nang",
      state: "Da Nang", 
      postalCode: "550000",
      country: "Vietnam"
    },
    roomCount: 6,
    settings: {
      allowPets: false,
      smokingAllowed: false,
      maxOccupancy: 8,
      checkInTime: "14:00",
      checkOutTime: "12:00",
      wifiPassword: "downtown123",
      parkingAvailable: false
    },
    houseRules: [
      "No pets allowed",
      "Quiet hours from 11 PM to 7 AM",
      "Keep common areas clean",
      "No overnight guests without permission"
    ],
    ownerId: "owner-002",
    isActive: true
  }
]

export const sampleTenants: CreateTenantInput[] = [
  {
    email: "john.doe@email.com",
    firstName: "John",
    lastName: "Doe",
    phone: "+84 123 456 789",
    emergencyContact: {
      name: "Jane Doe",
      phone: "+1 555 123 4567",
      relationship: "Sister"
    },
    propertyId: "", // Will be set during seeding
    roomNumber: "101",
    leaseStart: new Date('2024-01-01'),
    leaseEnd: new Date('2024-12-31'),
    monthlyRentCents: 50000000, // $500 in cents
    depositCents: 100000000, // $1000 in cents
    status: 'Active'
  },
  {
    email: "sarah.wilson@email.com",
    firstName: "Sarah",
    lastName: "Wilson",
    phone: "+84 987 654 321",
    emergencyContact: {
      name: "Mike Wilson",
      phone: "+1 555 987 6543",
      relationship: "Brother"
    },
    propertyId: "", // Will be set during seeding
    roomNumber: "102",
    leaseStart: new Date('2024-02-01'),
    leaseEnd: new Date('2025-01-31'),
    monthlyRentCents: 52000000, // $520 in cents
    depositCents: 104000000, // $1040 in cents
    status: 'Active'
  },
  {
    email: "mike.chen@email.com",
    firstName: "Mike",
    lastName: "Chen",
    phone: "+84 555 123 456",
    emergencyContact: {
      name: "Lisa Chen",
      phone: "+1 555 456 7890",
      relationship: "Wife"
    },
    propertyId: "", // Will be set during seeding
    roomNumber: "201",
    leaseStart: new Date('2024-03-01'),
    leaseEnd: new Date('2024-11-30'),
    monthlyRentCents: 48000000, // $480 in cents
    depositCents: 96000000, // $960 in cents
    status: 'Active'
  }
]

export const samplePayments: CreatePaymentInput[] = [
  {
    tenantId: "", // Will be set during seeding
    propertyId: "", // Will be set during seeding
    amountCents: 50000000, // $500 in cents
    currency: "USD",
    paymentMethod: "Stripe",
    status: "Paid",
    dueDate: new Date('2024-08-01'),
    paidDate: new Date('2024-07-28'),
    description: "Monthly rent - August 2024",
    reference: "RENT-AUG-2024-001"
  },
  {
    tenantId: "", // Will be set during seeding
    propertyId: "", // Will be set during seeding
    amountCents: 52000000, // $520 in cents
    currency: "USD",
    paymentMethod: "Wire",
    status: "Pending",
    dueDate: new Date('2024-09-01'),
    description: "Monthly rent - September 2024",
    reference: "RENT-SEP-2024-002"
  },
  {
    tenantId: "", // Will be set during seeding
    propertyId: "", // Will be set during seeding
    amountCents: 48000000, // $480 in cents
    currency: "USD",
    paymentMethod: "PayPal",
    status: "Overdue",
    dueDate: new Date('2024-07-15'),
    description: "Monthly rent - July 2024",
    reference: "RENT-JUL-2024-003"
  }
]

export const sampleExpenses: CreateExpenseInput[] = [
  {
    propertyId: "", // Will be set during seeding
    userId: "owner-001",
    amountCents: 15000000, // $150 in cents
    currency: "USD",
    category: "Utilities",
    description: "Electricity bill for July 2024",
    receiptPhotos: ["https://example.com/receipt1.jpg"],
    needsReimbursement: false,
    isReimbursed: false,
    expenseDate: new Date('2024-07-15'),
    createdBy: "owner-001"
  },
  {
    propertyId: "", // Will be set during seeding
    userId: "owner-001",
    amountCents: 8500000, // $85 in cents
    currency: "USD",
    category: "Cleaning",
    description: "Professional cleaning service",
    receiptPhotos: ["https://example.com/receipt2.jpg"],
    needsReimbursement: true,
    isReimbursed: false,
    expenseDate: new Date('2024-08-01'),
    createdBy: "owner-001",
    location: {
      latitude: 16.0544,
      longitude: 108.2022,
      address: "123 Beach Road, Da Nang",
      placeName: "Sunset Villa Coliving"
    }
  },
  {
    propertyId: "", // Will be set during seeding
    userId: "owner-002",
    amountCents: 12000000, // $120 in cents
    currency: "USD",
    category: "Repairs",
    description: "Plumbing repair in room 201",
    receiptPhotos: ["https://example.com/receipt3.jpg", "https://example.com/receipt4.jpg"],
    needsReimbursement: false,
    isReimbursed: false,
    expenseDate: new Date('2024-08-05'),
    createdBy: "owner-002"
  }
]

// Seed the database with sample data
export async function seedDatabase(): Promise<void> {
  try {
    console.log('🌱 Starting database seeding...')

    // Check database connection
    const isConnected = await checkDatabaseConnection()
    if (!isConnected) {
      throw new Error('Database connection failed')
    }

    // Create properties first
    console.log('Creating sample properties...')
    const createdProperties = []
    for (const propertyData of sampleProperties) {
      const property = await createProperty(propertyData)
      createdProperties.push(property)
      console.log(`✅ Created property: ${property.name}`)
    }

    // Create tenants
    console.log('Creating sample tenants...')
    const createdTenants = []
    for (let i = 0; i < sampleTenants.length; i++) {
      const tenantData = {
        ...sampleTenants[i],
        propertyId: createdProperties[i % createdProperties.length].id
      }
      const tenant = await createTenant(tenantData)
      createdTenants.push(tenant)
      console.log(`✅ Created tenant: ${tenant.firstName} ${tenant.lastName}`)
    }

    // Create payments
    console.log('Creating sample payments...')
    for (let i = 0; i < samplePayments.length; i++) {
      const tenant = createdTenants[i % createdTenants.length]
      const paymentData = {
        ...samplePayments[i],
        tenantId: tenant.id,
        propertyId: tenant.propertyId
      }
      const payment = await createPayment(paymentData)
      console.log(`✅ Created payment: ${payment.description}`)
    }

    // Create expenses
    console.log('Creating sample expenses...')
    for (let i = 0; i < sampleExpenses.length; i++) {
      const property = createdProperties[i % createdProperties.length]
      const expenseData = {
        ...sampleExpenses[i],
        propertyId: property.id
      }
      const expense = await createExpense(expenseData)
      console.log(`✅ Created expense: ${expense.description}`)
    }

    console.log('🎉 Database seeding completed successfully!')
    console.log(`Created ${createdProperties.length} properties, ${createdTenants.length} tenants, ${samplePayments.length} payments, and ${sampleExpenses.length} expenses`)

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  }
}

// Reset database (clear all data and reseed)
export async function resetDatabase(): Promise<void> {
  try {
    console.log('🔄 Resetting database...')
    
    // Clear all existing data
    await clearAllData()
    console.log('✅ Cleared all existing data')
    
    // Reseed with sample data
    await seedDatabase()
    
    console.log('🎉 Database reset completed!')
  } catch (error) {
    console.error('❌ Error resetting database:', error)
    throw error
  }
}

// Quick data summary for development
export async function getDataSummary(): Promise<void> {
  try {
    const { getAllProperties } = await import('./operations/properties')
    const { getPayments } = await import('./operations/payments')
    const { getExpenses } = await import('./operations/expenses')
    
    const properties = await getAllProperties()
    const payments = await getPayments()
    const expenses = await getExpenses()
    
    console.log('📊 Database Summary:')
    console.log(`Properties: ${properties.length}`)
    console.log(`Payments: ${payments.length}`)
    console.log(`Expenses: ${expenses.length}`)
    
    properties.forEach(property => {
      console.log(`  🏠 ${property.name} (${property.roomCount} rooms)`)
    })
    
  } catch (error) {
    console.error('❌ Error getting data summary:', error)
  }
}
