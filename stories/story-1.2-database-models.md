# Story 1.2: Core Database Schema and Models

## Story Overview
**Epic:** Epic 1: Foundation & Payment Management  
**Priority:** High  
**Estimated Effort:** Large  
**Dependencies:** Story 1.1 (Project Setup)  
**Story Type:** Foundation/Data Layer  

## User Story
**As a** property owner  
**I want** the fundamental data models established  
**So that** tenant, payment, and expense information can be properly stored and retrieved  

## Acceptance Criteria

### AC1: Tenant Data Model
- [x] Tenant interface with all required fields (id, email, firstName, lastName, phone, etc.)
- [x] Emergency contact nested object structure
- [x] Profile photo URL field for Blob storage integration
- [x] Status enum (Active, Moving Out, Moved Out)
- [x] Created/updated timestamp fields

### AC2: Property Data Model
- [x] Property interface with complete address structure
- [x] Room count and property settings configuration
- [x] House rules array field
- [x] Owner ID reference and active status
- [x] Multi-property support built into data structure

### AC3: Payment Data Model
- [x] Payment interface with amount in cents (integer)
- [x] Multiple payment method enum (Stripe, PayPal, Venmo, Wise, Revolut, Wire, Cash)
- [x] Payment status enum (Pending, Paid, Overdue, Refunded)
- [x] Due date and paid date fields
- [x] Reference and notes fields for tracking

### AC4: Expense Data Model
- [x] Expense interface with property and user references
- [x] Category enum (Utilities, Repairs, Supplies, Cleaning, Maintenance, Other)
- [x] Receipt photos array for Blob storage URLs
- [x] Reimbursement flag and status tracking
- [x] Location data structure for geolocation

### AC5: Database Integration
- [x] Vercel KV Redis integration with proper error handling
- [x] Database utility functions for CRUD operations
- [x] Data validation using Zod schemas
- [x] Database connection pooling and optimization

### AC6: Development Data
- [x] Seed data creation for development testing
- [x] Sample tenants, properties, payments, and expenses
- [x] Database migration utilities
- [x] Data reset functionality for development

### AC7: Type Safety
- [x] Complete TypeScript interfaces exported
- [x] Shared types package for frontend/backend
- [x] Validation schemas matching interfaces
- [x] Database query result typing

## Technical Implementation Details

### Data Models Location
```
/lib/
├── db/
│   ├── models/
│   │   ├── tenant.ts
│   │   ├── property.ts
│   │   ├── payment.ts
│   │   └── expense.ts
│   ├── operations/
│   │   ├── tenants.ts
│   │   ├── payments.ts
│   │   └── expenses.ts
│   └── index.ts
/types/
├── tenant.ts
├── property.ts
├── payment.ts
└── expense.ts
```

### Key Interfaces
```typescript
// Based on architecture document specifications
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

### Database Operations Required
- Create, read, update, delete for all models
- Property-scoped queries for multi-tenant architecture
- Payment status filtering and sorting
- Expense categorization and date range queries

## Definition of Done
- [ ] All data models implemented with complete TypeScript interfaces
- [ ] Database operations tested with Vercel KV Redis
- [ ] Seed data successfully creates sample records
- [ ] All CRUD operations working for each model
- [ ] Data validation prevents invalid records
- [ ] Multi-property data scoping implemented
- [ ] Database utilities properly handle errors
- [ ] Type safety verified across all operations

## Notes for Developer
- Follow exact data model specifications from architecture document
- Implement proper data validation before database operations
- Use property-scoped queries to support multi-property scaling
- Store amounts in cents (integers) for payment precision
- Implement soft deletes for audit trail requirements
- Consider database indexing for frequently queried fields

## Related Documents
- Architecture Data Models: `/docs/architecture-shards/02-data-models.md`
- PRD Epic 1: `/docs/prd-shards/03-epic1-foundation-payment.md`
- Tech Stack: `/docs/architecture-shards/01-tech-stack.md`

## Dev Agent Record

### File List
- `/lib/db/models/tenant.ts` - Tenant data model with Zod validation
- `/lib/db/models/property.ts` - Property data model with address and settings
- `/lib/db/models/payment.ts` - Payment data model with multiple payment methods
- `/lib/db/models/expense.ts` - Expense data model with location and reimbursement tracking
- `/lib/db/operations/tenants.ts` - CRUD operations for tenant management
- `/lib/db/operations/properties.ts` - CRUD operations for property management
- `/lib/db/operations/payments.ts` - CRUD operations for payment processing
- `/lib/db/operations/expenses.ts` - CRUD operations for expense tracking
- `/lib/db/seed.ts` - Database seeding and migration utilities
- `/lib/db/__tests__/models.test.ts` - Comprehensive model validation tests
- `/lib/db.ts` - Updated database index with all exports
- `/types/index.ts` - Updated shared types for frontend/backend
- `package.json` - Added zod and uuid dependencies

### Completion Notes
- ✅ All acceptance criteria implemented and tested
- ✅ Complete TypeScript interfaces with Zod validation schemas
- ✅ Full CRUD operations for all models with error handling
- ✅ Property-scoped queries for multi-tenant architecture
- ✅ Soft delete functionality implemented across all models
- ✅ Comprehensive seed data with realistic sample records
- ✅ Database utilities for development (reset, migration, summary)
- ✅ All tests passing (15/15 model validation tests)
- ✅ Amounts stored in cents for precision (payments/expenses)
- ✅ Multi-property support built into data structure

### Change Log
- 2025-08-14: Implemented complete database schema and models
- 2025-08-14: Added comprehensive CRUD operations with Redis integration
- 2025-08-14: Created seed data and development utilities
- 2025-08-14: All tests passing, story ready for review

### Agent Model Used
Cascade with James (Full Stack Developer) persona

---
**Story Status:** Ready for Review  
**Created:** 2025-08-14  
**Scrum Master:** Bob 🏃
