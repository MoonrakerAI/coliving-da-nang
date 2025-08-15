# Data Models - Coliving Management System

## Core Data Models

### Tenant
**Purpose:** Represents individuals living in coliving spaces with lease and contact information

**Key Attributes:**
- id: string - Unique identifier
- email: string - Primary contact and login
- firstName: string - Given name
- lastName: string - Family name
- phone: string - Mobile contact number
- emergencyContact: object - Emergency contact details
- profilePhoto: string - Blob storage URL
- status: enum - Active, Moving Out, Moved Out
- createdAt: Date - Record creation timestamp
- updatedAt: Date - Last modification timestamp

#### TypeScript Interface
```typescript
interface Tenant {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  profilePhoto?: string;
  status: 'Active' | 'Moving Out' | 'Moved Out';
  createdAt: Date;
  updatedAt: Date;
}
```

**Relationships:**
- One-to-many with Lease (tenant can have multiple lease periods)
- One-to-many with Payment (payment history)
- Many-to-one with Property (current residence)

### Property
**Purpose:** Represents coliving locations with rooms and operational settings

**Key Attributes:**
- id: string - Unique identifier
- name: string - Property display name
- address: object - Complete address information
- roomCount: number - Total available rooms
- settings: object - Property-specific configuration
- rules: string[] - House rules and policies
- ownerId: string - Reference to property owner
- createdAt: Date - Property registration date
- isActive: boolean - Operational status

#### TypeScript Interface
```typescript
interface Property {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  roomCount: number;
  settings: {
    currency: string;
    timezone: string;
    paymentDueDay: number;
    reminderDays: number[];
  };
  rules: string[];
  ownerId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Relationships:**
- One-to-many with Room (property contains multiple rooms)
- One-to-many with Expense (property-specific expenses)
- One-to-many with User (property access permissions)

### Payment
**Purpose:** Tracks rent and fee payments from tenants with multiple payment methods

**Key Attributes:**
- id: string - Unique payment identifier
- tenantId: string - Reference to paying tenant
- amount: number - Payment amount in cents
- currency: string - Payment currency (USD, EUR, etc.)
- dueDate: Date - When payment is due
- paidDate: Date - When payment was received
- status: enum - Pending, Paid, Overdue, Refunded
- method: enum - Payment method used
- reference: string - External payment reference
- notes: string - Additional payment notes

#### TypeScript Interface
```typescript
interface Payment {
  id: string;
  tenantId: string;
  propertyId: string;
  amount: number;
  currency: string;
  dueDate: Date;
  paidDate?: Date;
  status: 'Pending' | 'Paid' | 'Overdue' | 'Refunded';
  method: 'Stripe' | 'PayPal' | 'Venmo' | 'Wise' | 'Revolut' | 'Wire' | 'Cash';
  reference?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Relationships:**
- Many-to-one with Tenant (payment belongs to tenant)
- Many-to-one with Property (payment for specific property)
- One-to-one with PaymentReminder (automated reminder tracking)

### Expense
**Purpose:** Tracks property-related expenses with receipt photos and reimbursement requests

**Key Attributes:**
- id: string - Unique expense identifier
- propertyId: string - Property where expense occurred
- userId: string - User who logged the expense
- amount: number - Expense amount in cents
- currency: string - Expense currency
- category: enum - Expense categorization
- description: string - Expense description
- receiptPhotos: string[] - Blob storage URLs for receipts
- isReimbursement: boolean - Whether reimbursement is requested
- reimbursementStatus: enum - Reimbursement processing status
- date: Date - When expense occurred

#### TypeScript Interface
```typescript
interface Expense {
  id: string;
  propertyId: string;
  userId: string;
  amount: number;
  currency: string;
  category: 'Utilities' | 'Repairs' | 'Supplies' | 'Cleaning' | 'Maintenance' | 'Other';
  description: string;
  receiptPhotos: string[];
  isReimbursement: boolean;
  reimbursementStatus?: 'Requested' | 'Approved' | 'Paid' | 'Denied';
  merchantName?: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Relationships:**
- Many-to-one with Property (expense belongs to property)
- Many-to-one with User (expense logged by user)
