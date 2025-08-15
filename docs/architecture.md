# Coliving Management System Fullstack Architecture Document

## Introduction

This document outlines the complete fullstack architecture for the Coliving Management System, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

This unified approach combines backend and frontend architecture concerns, streamlined for modern fullstack applications where these concerns are increasingly intertwined, particularly with Vercel's edge computing capabilities.

### Starter Template or Existing Project

**Decision:** Using Next.js 14 App Router template with TypeScript
**Rationale:** Provides optimal integration with Vercel platform, built-in API routes, and excellent TypeScript support for type safety across the fullstack.

**Template Setup:**
```bash
npx create-next-app@latest coliving-management --typescript --tailwind --eslint --app
```

### Change Log
| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2024-12-19 | 1.0 | Initial fullstack architecture | Architect |

## High Level Architecture

### Technical Summary

The system employs a modern serverless fullstack architecture optimized for Vercel deployment. Built on Next.js 14 with App Router, it leverages Vercel's edge functions for API endpoints, KV Redis for data persistence, and Blob storage for receipt photos. The architecture prioritizes mobile-first expense entry and automated payment management while maintaining multi-property scalability. Stripe integration handles payment processing, with email automation for tenant reminders and e-signature integration for digital agreements.

### Platform and Infrastructure Choice

**Platform:** Vercel
**Key Services:** 
- Vercel Edge Functions for API endpoints
- Vercel KV (Redis) for primary data storage
- Vercel Blob for receipt photos and document storage
- Vercel Analytics for performance monitoring

**Deployment Host and Regions:** Global edge deployment with automatic regional optimization

**Rationale:** Vercel provides seamless Next.js integration, global performance optimization, and cost-effective scaling. The serverless architecture eliminates infrastructure management while providing excellent performance for the mobile-first requirements.

### Repository Structure

**Structure:** Monorepo with Next.js App Router
**Monorepo Tool:** Native Next.js workspace (no additional tooling needed)
**Package Organization:** Single application with clear internal organization

**Rationale:** Next.js App Router provides excellent organization for fullstack applications without the complexity of multi-package monorepos. The co-location of frontend and backend code simplifies development and deployment.

### High Level Architecture Diagram

```mermaid
graph TD
    A[Mobile Devices] --> B[Vercel CDN/Edge]
    C[Desktop/Tablet] --> B
    B --> D[Next.js App Router]
    
    D --> E[API Routes /api/*]
    D --> F[App Routes /app/*]
    
    E --> G[Vercel KV Redis]
    E --> H[Vercel Blob Storage]
    E --> I[Stripe API]
    E --> J[Email Service]
    E --> K[E-signature API]
    
    F --> L[Dashboard Pages]
    F --> M[Mobile Expense Entry]
    F --> N[Payment Management]
    F --> O[Tenant Management]
    
    G --> P[(Tenant Data)]
    G --> Q[(Payment Records)]
    G --> R[(Expense Data)]
    G --> S[(Task Management)]
    
    H --> T[Receipt Photos]
    H --> U[Signed Documents]
    H --> V[Profile Images]
```

### Architectural Patterns

- **Jamstack Architecture:** Static site generation with serverless APIs - _Rationale:_ Optimal performance and cost efficiency for coliving management workflows
- **API-First Design:** All business logic exposed through well-defined APIs - _Rationale:_ Enables future mobile app development and third-party integrations
- **Mobile-First Progressive Enhancement:** Core functionality optimized for mobile, enhanced for desktop - _Rationale:_ Expense entry happens on-the-go, primary use case is mobile
- **Event-Driven Notifications:** Email and task reminders triggered by data changes - _Rationale:_ Automates manual payment follow-up workflows
- **Multi-Tenant Data Architecture:** Property-scoped data access with role-based permissions - _Rationale:_ Supports multi-property scaling from day one

## Tech Stack

This is the DEFINITIVE technology selection for the entire project. All development must use these exact versions.

### Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| **Frontend Language** | TypeScript | 5.3.3 | Type safety across fullstack | Prevents runtime errors, excellent IDE support, shared types |
| **Frontend Framework** | Next.js | 14.0.4 | Fullstack React framework | Optimal Vercel integration, App Router, built-in API routes |
| **UI Component Library** | Radix UI Primitives | 1.0.4 | Headless accessible components | Accessibility-first, customizable with Tailwind |
| **State Management** | Zustand | 4.4.7 | Lightweight client state | Simple API, TypeScript-first, no boilerplate |
| **Backend Language** | TypeScript | 5.3.3 | Unified language across stack | Code sharing, type safety, single language maintenance |
| **Backend Framework** | Next.js API Routes | 14.0.4 | Serverless API endpoints | Vercel optimization, edge functions, zero config |
| **API Style** | REST | - | HTTP API design | Simple, cacheable, works well with forms and mobile |
| **Database** | Vercel KV (Redis) | Latest | Primary data storage | Fast queries, Vercel integration, JSON document storage |
| **Cache** | Vercel KV | Latest | Application caching | Same as database, reduces complexity |
| **File Storage** | Vercel Blob | Latest | Receipt photos, documents | Vercel integration, CDN optimization, cost-effective |
| **Authentication** | NextAuth.js | 4.24.5 | Session management | Next.js integration, multiple providers, secure sessions |
| **Frontend Testing** | Vitest | 1.0.4 | Unit and component testing | Fast, TypeScript-first, React Testing Library integration |
| **Backend Testing** | Vitest | 1.0.4 | API and logic testing | Same testing framework, unified approach |
| **E2E Testing** | Playwright | 1.40.1 | Critical user journeys | Mobile browser testing, reliable automation |
| **Build Tool** | Next.js | 14.0.4 | Build and bundling | Built-in optimization, Vercel deployment |
| **Bundler** | Turbopack | Built-in | Development bundling | Next.js default, fast refresh, optimized for development |
| **IaC Tool** | Vercel CLI | 32.5.6 | Deployment automation | Environment management, preview deployments |
| **CI/CD** | GitHub Actions | Latest | Automated testing/deployment | Free tier, Vercel integration, parallel job execution |
| **Monitoring** | Vercel Analytics | Built-in | Performance monitoring | Zero-config, Core Web Vitals, real user metrics |
| **Logging** | Vercel Logs | Built-in | Application logging | Serverless-optimized, real-time log streaming |
| **CSS Framework** | Tailwind CSS | 3.3.6 | Utility-first styling | Fast development, mobile-first, design system consistency |
| **Payment Processing** | Stripe | 14.9.0 | Payment and subscription handling | Robust API, global support, PCI compliance |
| **Email Service** | Resend | 2.1.0 | Transactional emails | Developer-friendly, Vercel integration, delivery optimization |
| **E-signature** | DocuSign eSignature REST API | 2.1.0 | Digital contract signing | Industry standard, legal compliance, API integration |
| **Form Handling** | React Hook Form | 7.48.2 | Form validation and management | Performance optimized, TypeScript support, minimal re-renders |
| **Date/Time** | date-fns | 3.0.6 | Date manipulation | Modular, TypeScript support, immutable |
| **Image Processing** | sharp | 0.33.1 | Receipt photo optimization | Fast processing, multiple formats, Vercel compatibility |

## Data Models

### Core Data Models

#### Tenant
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

#### Property
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

#### Payment
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

#### Expense
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

## API Specification

### REST API Specification

```yaml
openapi: 3.0.0
info:
  title: Coliving Management System API
  version: 1.0.0
  description: RESTful API for coliving property management operations
servers:
  - url: https://your-app.vercel.app/api
    description: Production API

paths:
  /payments:
    get:
      summary: List payments with filtering
      parameters:
        - name: propertyId
          in: query
          schema:
            type: string
        - name: status
          in: query
          schema:
            type: string
            enum: [Pending, Paid, Overdue, Refunded]
        - name: tenantId
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Payment list retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  payments:
                    type: array
                    items:
                      $ref: '#/components/schemas/Payment'
                  total:
                    type: integer
    post:
      summary: Record a new payment
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PaymentCreate'
      responses:
        '201':
          description: Payment recorded successfully

  /expenses:
    get:
      summary: List expenses with filtering
      parameters:
        - name: propertyId
          in: query
          required: true
          schema:
            type: string
        - name: category
          in: query
          schema:
            type: string
        - name: startDate
          in: query
          schema:
            type: string
            format: date
        - name: endDate
          in: query
          schema:
            type: string
            format: date
      responses:
        '200':
          description: Expense list retrieved successfully
    post:
      summary: Create new expense with photo upload
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                propertyId:
                  type: string
                amount:
                  type: number
                category:
                  type: string
                description:
                  type: string
                receiptPhotos:
                  type: array
                  items:
                    type: string
                    format: binary
                isReimbursement:
                  type: boolean
      responses:
        '201':
          description: Expense created successfully

  /tenants:
    get:
      summary: List tenants for property
      parameters:
        - name: propertyId
          in: query
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Tenant list retrieved successfully
    post:
      summary: Create new tenant
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TenantCreate'
      responses:
        '201':
          description: Tenant created successfully

  /properties/{propertyId}/dashboard:
    get:
      summary: Get dashboard data for property
      parameters:
        - name: propertyId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Dashboard data retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  tenants:
                    type: array
                    items:
                      $ref: '#/components/schemas/Tenant'
                  paymentSummary:
                    type: object
                    properties:
                      totalPending:
                        type: number
                      totalOverdue:
                        type: number
                      recentPayments:
                        type: array
                        items:
                          $ref: '#/components/schemas/Payment'
                  recentExpenses:
                    type: array
                    items:
                      $ref: '#/components/schemas/Expense'
                  dailyTasks:
                    type: array
                    items:
                      $ref: '#/components/schemas/Task'

components:
  schemas:
    Payment:
      type: object
      properties:
        id:
          type: string
        tenantId:
          type: string
        amount:
          type: number
        currency:
          type: string
        dueDate:
          type: string
          format: date
        status:
          type: string
          enum: [Pending, Paid, Overdue, Refunded]
        method:
          type: string
          enum: [Stripe, PayPal, Venmo, Wise, Revolut, Wire, Cash]
    
    Expense:
      type: object
      properties:
        id:
          type: string
        propertyId:
          type: string
        amount:
          type: number
        category:
          type: string
        description:
          type: string
        receiptPhotos:
          type: array
          items:
            type: string
        isReimbursement:
          type: boolean
        date:
          type: string
          format: date-time
```

## Components

### Frontend Components

#### Dashboard Component
**Responsibility:** Main overview screen displaying tenant status, payments, expenses, and tasks

**Key Interfaces:**
- PropertySelector: Switch between multiple properties
- PaymentStatusCards: Visual payment status indicators
- ExpenseTimeline: Recent expense activity feed
- TaskList: Daily task assignments and completion

**Dependencies:** 
- Payment API for status data
- Expense API for recent activities
- Task API for daily assignments

**Technology Stack:** Next.js App Router page component, Zustand for state, Radix UI for primitives

#### Mobile Expense Entry
**Responsibility:** Mobile-optimized expense logging with photo capture and categorization

**Key Interfaces:**
- CameraCapture: Native camera integration for receipt photos
- ExpenseForm: Quick entry form with minimal fields
- CategorySelector: Predefined and custom expense categories
- LocationDetection: Automatic location tagging

**Dependencies:**
- Expense API for data submission
- Blob storage for photo uploads
- Device camera APIs

**Technology Stack:** React Hook Form for validation, native device APIs, image compression

#### Payment Management Console
**Responsibility:** Comprehensive payment tracking and reminder management

**Key Interfaces:**
- PaymentGrid: Tabular view of all tenant payments
- ReminderScheduler: Automated reminder configuration
- PaymentProcessor: Manual payment recording
- StatusFilters: Payment status filtering and sorting

**Dependencies:**
- Payment API for all payment operations
- Email service for reminder delivery
- Stripe API for payment processing

**Technology Stack:** Tanstack Table for data display, date-fns for date handling

### Backend Components

#### Payment Service
**Responsibility:** All payment-related business logic and Stripe integration

**Key Interfaces:**
- `/api/payments` - CRUD operations for payment records
- `/api/payments/reminders` - Automated reminder system
- `/api/payments/stripe` - Stripe webhook handlers

**Dependencies:**
- Vercel KV for payment data storage
- Stripe API for payment processing
- Email service for reminders

**Technology Stack:** Next.js API routes, Stripe SDK, type-safe database operations

#### Expense Service
**Responsibility:** Expense tracking, photo processing, and reimbursement workflows

**Key Interfaces:**
- `/api/expenses` - Expense CRUD operations
- `/api/expenses/upload` - Receipt photo processing
- `/api/expenses/reimbursements` - Reimbursement workflow

**Dependencies:**
- Vercel KV for expense data
- Vercel Blob for photo storage
- Sharp for image processing

**Technology Stack:** Next.js API routes, Sharp for image optimization, Blob storage client

#### Authentication Service
**Responsibility:** User authentication, session management, and role-based access control

**Key Interfaces:**
- `/api/auth/*` - NextAuth.js authentication endpoints
- `/api/users` - User management operations
- Middleware for route protection

**Dependencies:**
- NextAuth.js for session management
- Vercel KV for user data
- Email service for authentication emails

**Technology Stack:** NextAuth.js, secure session handling, role-based middleware

## Components Interaction Diagram

```mermaid
graph TD
    A[Mobile App] --> B[Next.js Frontend]
    C[Desktop Browser] --> B
    
    B --> D[Authentication Service]
    B --> E[Payment Service]
    B --> F[Expense Service]
    B --> G[Tenant Service]
    
    D --> H[Vercel KV - Users]
    E --> H
    E --> I[Stripe API]
    E --> J[Email Service]
    
    F --> K[Vercel KV - Expenses]
    F --> L[Vercel Blob - Photos]
    F --> M[Image Processing]
    
    G --> N[Vercel KV - Tenants]
    G --> O[DocuSign API]
    
    J --> P[Email Delivery]
    O --> Q[Document Signing]
    
    B --> R[Dashboard Component]
    B --> S[Mobile Expense Entry]
    B --> T[Payment Management]
    B --> U[Tenant Management]
```

## External APIs

### Stripe API
- **Purpose:** Payment processing, subscription management, and financial reporting
- **Documentation:** https://stripe.com/docs/api
- **Base URL:** https://api.stripe.com/v1
- **Authentication:** Secret key-based authentication
- **Rate Limits:** 100 requests per second per account

**Key Endpoints Used:**
- `POST /v1/payment_intents` - Create payment intents for new payment methods
- `GET /v1/charges` - Retrieve payment history and status
- `POST /v1/webhooks` - Handle payment status updates

**Integration Notes:** Use webhook endpoints for real-time payment status updates, implement retry logic for API failures

### Resend Email API
- **Purpose:** Transactional email delivery for payment reminders and notifications
- **Documentation:** https://resend.com/docs
- **Base URL:** https://api.resend.com
- **Authentication:** API key-based authentication
- **Rate Limits:** 10,000 emails per month on free tier

**Key Endpoints Used:**
- `POST /emails` - Send transactional emails (payment reminders, confirmations)
- `GET /emails/{id}` - Check email delivery status

**Integration Notes:** Use template system for consistent email formatting, implement bounce handling

### DocuSign eSignature API
- **Purpose:** Digital contract signing for tenant agreements
- **Documentation:** https://developers.docusign.com/docs/esign-rest-api
- **Base URL:** https://demo.docusign.net/restapi (demo) / https://na1.docusign.net/restapi (production)
- **Authentication:** OAuth 2.0 with JWT
- **Rate Limits:** 1000 API calls per hour

**Key Endpoints Used:**
- `POST /v2.1/accounts/{accountId}/envelopes` - Create signing envelopes
- `GET /v2.1/accounts/{accountId}/envelopes/{envelopeId}` - Check signing status

**Integration Notes:** Implement OAuth flow for secure authentication, webhook integration for status updates

## Core Workflows

```mermaid
sequenceDiagram
    participant M as Mobile User
    participant F as Frontend
    participant A as API Routes
    participant K as Vercel KV
    participant B as Blob Storage
    participant S as Stripe
    participant E as Email Service

    Note over M,E: Mobile Expense Entry Workflow
    M->>F: Open expense entry form
    F->>M: Camera interface
    M->>F: Capture receipt photo + expense details
    F->>A: POST /api/expenses (multipart)
    A->>B: Upload receipt photo
    B-->>A: Photo URL
    A->>K: Store expense record
    K-->>A: Expense ID
    A-->>F: Success response
    F-->>M: Confirmation + expense logged

    Note over M,E: Payment Reminder Workflow
    A->>K: Check due payments (daily cron)
    K-->>A: Overdue payments list
    A->>E: Send reminder emails
    E-->>A: Email sent confirmation
    A->>K: Update reminder status
    
    Note over M,E: Payment Recording Workflow
    M->>F: Record payment
    F->>A: POST /api/payments
    A->>S: Verify payment (if Stripe)
    S-->>A: Payment confirmation
    A->>K: Update payment status
    A->>E: Send confirmation email
    A-->>F: Payment recorded
    F-->>M: Success confirmation
```

## Database Schema

### Vercel KV (Redis) Schema Design

Since Vercel KV is Redis-based, we'll use JSON documents with strategic key patterns for efficient queries:

```typescript
// Key Patterns for Efficient Queries
// Properties
"property:{propertyId}" → Property object
"properties:owner:{ownerId}" → Array of property IDs

// Tenants
"tenant:{tenantId}" → Tenant object
"tenants:property:{propertyId}" → Array of tenant IDs
"tenants:active:property:{propertyId}" → Array of active tenant IDs

// Payments
"payment:{paymentId}" → Payment object
"payments:tenant:{tenantId}" → Array of payment IDs (sorted by due date)
"payments:property:{propertyId}" → Array of payment IDs
"payments:overdue:property:{propertyId}" → Array of overdue payment IDs
"payments:due:date:{YYYY-MM-DD}" → Array of payment IDs due on date

// Expenses
"expense:{expenseId}" → Expense object
"expenses:property:{propertyId}" → Array of expense IDs (sorted by date)
"expenses:category:{category}:property:{propertyId}" → Category-filtered expenses
"expenses:reimbursement:pending" → Array of pending reimbursement expense IDs

// Users and Authentication
"user:{userId}" → User object
"user:email:{email}" → User ID (for email lookup)
"session:{sessionId}" → Session data

// Tasks
"task:{taskId}" → Task object
"tasks:property:{propertyId}" → Array of task IDs
"tasks:assignee:{userId}" → Array of assigned task IDs
"tasks:due:date:{YYYY-MM-DD}" → Array of task IDs due on date
```

### Sample Data Structures

```typescript
// Property Document
{
  id: "prop_123",
  name: "Downtown Coliving",
  address: {
    street: "123 Main St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94105",
    country: "US"
  },
  roomCount: 7,
  settings: {
    currency: "USD",
    timezone: "America/Los_Angeles",
    paymentDueDay: 1,
    reminderDays: [7, 3, 0]
  },
  rules: ["No smoking", "Quiet hours 10PM-8AM"],
  ownerId: "user_456",
  isActive: true,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-12-19T12:00:00Z"
}

// Tenant Document
{
  id: "tenant_789",
  email: "john@example.com",
  firstName: "John",
  lastName: "Doe",
  phone: "+1-555-0123",
  emergencyContact: {
    name: "Jane Doe",
    phone: "+1-555-0124",
    relationship: "Sister"
  },
  profilePhoto: "https://blob.vercel-storage.com/photos/tenant_789.jpg",
  status: "Active",
  createdAt: "2024-06-01T00:00:00Z",
  updatedAt: "2024-12-19T12:00:00Z"
}

// Payment Document
{
  id: "payment_001",
  tenantId: "tenant_789",
  propertyId: "prop_123",
  amount: 150000, // $1500.00 in cents
  currency: "USD",
  dueDate: "2024-12-01T00:00:00Z",
  paidDate: "2024-11-30T15:30:00Z",
  status: "Paid",
  method: "Stripe",
  reference: "pi_1ABC123def456",
  notes: "December rent payment",
  createdAt: "2024-11-01T00:00:00Z",
  updatedAt: "2024-11-30T15:30:00Z"
}

// Expense Document
{
  id: "expense_001",
  propertyId: "prop_123",
  userId: "user_456",
  amount: 4500, // $45.00 in cents
  currency: "USD",
  category: "Supplies",
  description: "Kitchen cleaning supplies",
  receiptPhotos: [
    "https://blob.vercel-storage.com/receipts/expense_001_1.jpg"
  ],
  isReimbursement: false,
  merchantName: "Target",
  location: {
    lat: 37.7749,
    lng: -122.4194,
    address: "123 Market St, San Francisco, CA"
  },
  date: "2024-12-19T14:30:00Z",
  createdAt: "2024-12-19T14:35:00Z",
  updatedAt: "2024-12-19T14:35:00Z"
}
```

### Indexing Strategy

```typescript
// Compound Keys for Common Queries
"payments:property:{propertyId}:status:{status}" → Filtered payment arrays
"expenses:property:{propertyId}:month:{YYYY-MM}" → Monthly expense reports
"tasks:property:{propertyId}:status:{status}" → Task status filtering

// Sorted Sets for Time-based Queries
"payments:due:sorted" → ZADD with due date as score
"expenses:recent:sorted" → ZADD with creation date as score
```

## Frontend Architecture

### Component Architecture

#### Component Organization
```text
src/
├── app/                          # Next.js App Router pages
│   ├── (dashboard)/             # Route group for authenticated pages
│   │   ├── dashboard/           # Main dashboard page
│   │   ├── payments/            # Payment management pages
│   │   ├── expenses/            # Expense management pages
│   │   └── tenants/            # Tenant management pages
│   ├── auth/                    # Authentication pages
│   ├── api/                     # API route handlers
│   └── layout.tsx              # Root layout with auth
├── components/                  # Reusable UI components
│   ├── ui/                     # Base UI primitives (Radix + Tailwind)
│   ├── forms/                  # Form components
│   ├── dashboard/              # Dashboard-specific components
│   ├── mobile/                 # Mobile-optimized components
│   └── shared/                 # Cross-page shared components
├── lib/                        # Utilities and configurations
│   ├── auth.ts                 # NextAuth configuration
│   ├── db.ts                   # Database client
│   ├── stripe.ts               # Stripe configuration
│   └── utils.ts                # Helper functions
└── types/                      # TypeScript type definitions
    ├── database.ts             # Database schema types
    ├── api.ts                  # API request/response types
    └── global.ts               # Global type definitions
```

#### Component Template
```typescript
'use client';

import { useState } from 'react';
import { usePropertyStore } from '@/lib/stores/property-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ExpenseEntryProps {
  propertyId: string;
  onSuccess?: (expenseId: string) => void;
}

export function ExpenseEntry({ propertyId, onSuccess }: ExpenseEntryProps) {
  const [loading, setLoading] = useState(false);
  const { currentProperty } = usePropertyStore();

  const handleSubmit = async (data: ExpenseFormData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        body: createFormData(data)
      });
      
      if (!response.ok) throw new Error('Failed to create expense');
      
      const expense = await response.json();
      onSuccess?.(expense.id);
    } catch (error) {
      console.error('Expense creation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Add Expense</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Form implementation */}
      </CardContent>
    </Card>
  );
}
```

### State Management Architecture

#### State Structure
```typescript
// Property Store (Global State)
interface PropertyState {
  currentProperty: Property | null;
  properties: Property[];
  setCurrentProperty: (property: Property) => void;
  loadProperties: () => Promise<void>;
}

// Payment Store (Feature State)
interface PaymentState {
  payments: Payment[];
  loading: boolean;
  filters: PaymentFilters;
  setFilters: (filters: PaymentFilters) => void;
  loadPayments: (propertyId: string) => Promise<void>;
  recordPayment: (payment: PaymentCreateData) => Promise<void>;
}

// Expense Store (Feature State)
interface ExpenseState {
  expenses: Expense[];
  recentExpenses: Expense[];
  loading: boolean;
  createExpense: (expense: ExpenseCreateData) => Promise<string>;
  loadExpenses: (propertyId: string, filters?: ExpenseFilters) => Promise<void>;
}
```

#### State Management Patterns
- **Global State**: Property selection, user authentication, app configuration
- **Feature State**: Payment management, expense tracking, tenant management
- **Component State**: Form inputs, modal visibility, loading states
- **Server State**: React Query for API data fetching and caching

### Routing Architecture

#### Route Organization
```text
app/
├── page.tsx                     # Landing/welcome page
├── dashboard/
│   ├── page.tsx                # Main dashboard
│   └── loading.tsx             # Dashboard loading state
├── payments/
│   ├── page.tsx                # Payment list/management
│   ├── [id]/
│   │   └── page.tsx           # Individual payment details
│   └── new/
│       └── page.tsx           # Record new payment
├── expenses/
│   ├── page.tsx                # Expense list
│   ├── new/
│   │   └── page.tsx           # Mobile expense entry
│   └── [id]/
│       └── page.tsx           # Expense details
├── tenants/
│   ├── page.tsx                # Tenant management
│   ├── [id]/
│   │   └── page.tsx           # Tenant profile
│   └── new/
│       └── page.tsx           # Add new tenant
└── auth/
    ├── signin/
    │   └── page.tsx            # Sign in page
    └── signup/
        └── page.tsx            # User registration
```

#### Protected Route Pattern
```typescript
// middleware.ts
import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(req) {
    // Additional middleware logic
    const { pathname } = req.nextUrl;
    const { token } = req.nextauth;

    // Role-based route protection
    if (pathname.startsWith('/admin') && token?.role !== 'owner') {
      return new Response('Unauthorized', { status: 401 });
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/payments/:path*', '/expenses/:path*', '/tenants/:path*']
};
```

### Frontend Services Layer

#### API Client Setup
```typescript
// lib/api-client.ts
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }

    return response.json();
  }

  // Payment methods
  async getPayments(propertyId: string, filters?: PaymentFilters) {
    const searchParams = new URLSearchParams({
      propertyId,
      ...filters
    });
    return this.request<PaymentListResponse>(`/payments?${searchParams}`);
  }

  async createPayment(payment: PaymentCreateData) {
    return this.request<Payment>('/payments', {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  // Expense methods
  async createExpense(expense: ExpenseCreateData) {
    const formData = new FormData();
    
    // Handle file uploads for receipts
    expense.receiptPhotos?.forEach((photo, index) => {
      formData.append(`receiptPhoto_${index}`, photo);
    });
    
    // Add other expense data
    Object.entries(expense).forEach(([key, value]) => {
      if (key !== 'receiptPhotos') {
        formData.append(key, String(value));
      }
    });

    return this.request<Expense>('/expenses', {
      method: 'POST',
      body: formData,
      headers: {}, // Remove Content-Type to let browser set it for FormData
    });
  }
}

export const apiClient = new ApiClient();
```

#### Service Example
```typescript
// lib/services/payment-service.ts
export class PaymentService {
  static async recordPayment(paymentData: PaymentCreateData): Promise<Payment> {
    // Validate payment data
    const validatedData = await paymentSchema.parseAsync(paymentData);
    
    // Create payment record
    const payment = await apiClient.createPayment(validatedData);
    
    // Send confirmation email
    await emailService.sendPaymentConfirmation(payment);
    
    // Update local state
    paymentStore.getState().addPayment(payment);
    
    return payment;
  }

  static async sendReminders(propertyId: string): Promise<void> {
    return apiClient.request(`/payments/reminders`, {
      method: 'POST',
      body: JSON.stringify({ propertyId }),
    });
  }
}
```

## Backend Architecture

### Service Architecture

#### Function Organization (Serverless)
```text
app/api/
├── auth/
│   └── [...nextauth]/
│       └── route.ts           # NextAuth.js configuration
├── payments/
│   ├── route.ts              # GET /api/payments, POST /api/payments
│   ├── [id]/
│   │   └── route.ts          # GET/PUT/DELETE /api/payments/[id]
│   ├── reminders/
│   │   └── route.ts          # POST /api/payments/reminders
│   └── stripe/
│       └── webhooks/
│           └── route.ts      # Stripe webhook handler
├── expenses/
│   ├── route.ts              # GET /api/expenses, POST /api/expenses
│   ├── [id]/
│   │   └── route.ts          # GET/PUT/DELETE /api/expenses/[id]
│   ├── upload/
│   │   └── route.ts          # Receipt photo upload handler
│   └── reimbursements/
│       └── route.ts          # Reimbursement workflow
├── tenants/
│   ├── route.ts              # Tenant CRUD operations
│   ├── [id]/
│   │   └── route.ts          # Individual tenant operations
│   └── agreements/
│       └── route.ts          # Digital agreement handling
├── properties/
│   ├── route.ts              # Property management
│   ├── [id]/
│   │   ├── route.ts          # Property details
│   │   └── dashboard/
│   │       └── route.ts      # Dashboard data aggregation
│   └── rooms/
│       └── route.ts          # Room management
└── tasks/
    ├── route.ts              # Task CRUD operations
    └── [id]/
        └── route.ts          # Task updates and completion
```

#### Function Template
```typescript
// app/api/expenses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { uploadToBlob } from '@/lib/blob-storage';

const expenseCreateSchema = z.object({
  propertyId: z.string(),
  amount: z.number().positive(),
  category: z.enum(['Utilities', 'Repairs', 'Supplies', 'Cleaning', 'Maintenance', 'Other']),
  description: z.string().min(1),
  isReimbursement: z.boolean().default(false),
  date: z.string().datetime(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get('propertyId');
  
  if (!propertyId) {
    return NextResponse.json({ error: 'Property ID required' }, { status: 400 });
  }

  try {
    const expenses = await db.getExpensesByProperty(propertyId);
    return NextResponse.json({ expenses });
  } catch (error) {
    console.error('Failed to fetch expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    
    // Extract expense data
    const expenseData = {
      propertyId: formData.get('propertyId') as string,
      amount: Number(formData.get('amount')),
      category: formData.get('category') as string,
      description: formData.get('description') as string,
      isReimbursement: formData.get('isReimbursement') === 'true',
      date: formData.get('date') as string,
    };

    // Validate expense data
    const validatedData = expenseCreateSchema.parse(expenseData);

    // Handle receipt photo uploads
    const receiptPhotos: string[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('receiptPhoto_') && value instanceof File) {
        const photoUrl = await uploadToBlob(value, `receipts/${Date.now()}_${value.name}`);
        receiptPhotos.push(photoUrl);
      }
    }

    // Create expense record
    const expense = await db.createExpense({
      ...validatedData,
      userId: session.user.id,
      receiptPhotos,
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Failed to create expense:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
```

### Database Architecture

#### Data Access Layer
```typescript
// lib/db.ts
import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

export class DatabaseClient {
  // Payment operations
  async createPayment(paymentData: PaymentCreateData): Promise<Payment> {
    const payment: Payment = {
      id: `payment_${uuidv4()}`,
      ...paymentData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store payment record
    await kv.set(`payment:${payment.id}`, payment);
    
    // Add to property payment list
    await kv.zadd(`payments:property:${payment.propertyId}`, {
      score: payment.dueDate.getTime(),
      member: payment.id,
    });
    
    // Add to tenant payment list
    await kv.zadd(`payments:tenant:${payment.tenantId}`, {
      score: payment.dueDate.getTime(),
      member: payment.id,
    });

    // Add to status-specific lists
    await kv.sadd(`payments:${payment.status.toLowerCase()}:property:${payment.propertyId}`, payment.id);

    return payment;
  }

  async getPaymentsByProperty(
    propertyId: string,
    filters?: PaymentFilters
  ): Promise<Payment[]> {
    let paymentIds: string[];

    if (filters?.status) {
      // Get filtered payment IDs
      paymentIds = await kv.smembers(`payments:${filters.status.toLowerCase()}:property:${propertyId}`);
    } else {
      // Get all payment IDs for property
      paymentIds = await kv.zrange(`payments:property:${propertyId}`, 0, -1);
    }

    // Batch fetch payment details
    const payments = await Promise.all(
      paymentIds.map(id => kv.get<Payment>(`payment:${id}`))
    );

    return payments.filter(Boolean) as Payment[];
  }

  // Expense operations
  async createExpense(expenseData: ExpenseCreateData): Promise<Expense> {
    const expense: Expense = {
      id: `expense_${uuidv4()}`,
      ...expenseData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store expense record
    await kv.set(`expense:${expense.id}`, expense);
    
    // Add to property expense list (sorted by date)
    await kv.zadd(`expenses:property:${expense.propertyId}`, {
      score: expense.date.getTime(),
      member: expense.id,
    });
    
    // Add to category-specific list
    await kv.sadd(`expenses:category:${expense.category}:property:${expense.propertyId}`, expense.id);

    // Add to reimbursement list if applicable
    if (expense.isReimbursement) {
      await kv.sadd('expenses:reimbursement:pending', expense.id);
    }

    return expense;
  }

  async getExpensesByProperty(
    propertyId: string,
    filters?: ExpenseFilters
  ): Promise<Expense[]> {
    let expenseIds: string[];

    if (filters?.category) {
      expenseIds = await kv.smembers(`expenses:category:${filters.category}:property:${propertyId}`);
    } else {
      // Get recent expenses (last 100)
      expenseIds = await kv.zrange(`expenses:property:${propertyId}`, -100, -1);
    }

    const expenses = await Promise.all(
      expenseIds.map(id => kv.get<Expense>(`expense:${id}`))
    );

    return expenses.filter(Boolean) as Expense[];
  }

  // Dashboard aggregation
  async getDashboardData(propertyId: string): Promise<DashboardData> {
    const [tenants, recentPayments, recentExpenses, pendingTasks] = await Promise.all([
      this.getTenantsByProperty(propertyId),
      this.getRecentPayments(propertyId, 5),
      this.getRecentExpenses(propertyId, 10),
      this.getPendingTasks(propertyId),
    ]);

    return {
      tenants,
      paymentSummary: {
        totalPending: recentPayments.filter(p => p.status === 'Pending').length,
        totalOverdue: recentPayments.filter(p => p.status === 'Overdue').length,
        recentPayments,
      },
      recentExpenses,
      dailyTasks: pendingTasks,
    };
  }
}

export const db = new DatabaseClient();
```

### Authentication and Authorization

#### Auth Flow
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as NextAuth
    participant K as Vercel KV
    participant E as Email Service

    U->>F: Access protected route
    F->>A: Check session
    A->>K: Verify session token
    K-->>A: Session data
    A-->>F: User authenticated
    F->>A: Role-based route access
    A->>K: Check user permissions
    K-->>A: User role & property access
    A-->>F: Access granted/denied
    F-->>U: Page content or redirect
```

#### Middleware/Guards
```typescript
// lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import { Adapter } from 'next-auth/adapters';
import EmailProvider from 'next-auth/providers/email';
import { createKVAdapter } from './auth-adapter';

export const authOptions: NextAuthOptions = {
  adapter: createKVAdapter(),
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.properties = token.properties as string[];
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.properties = user.properties;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
  },
};

// Role-based access control
export function requireRole(roles: string[]) {
  return async (request: NextRequest) => {
    const session = await getServerSession(authOptions);
    
    if (!session || !roles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return null; // Allow access
  };
}

export function requirePropertyAccess(propertyId: string) {
  return async (request: NextRequest) => {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user.properties.includes(propertyId)) {
      return NextResponse.json({ error: 'Property access denied' }, { status: 403 });
    }
    
    return null; // Allow access
  };
}
```

## Unified Project Structure

```text
coliving-management/
├── .github/                    # CI/CD workflows
│   └── workflows/
│       ├── ci.yaml            # Test and lint on PR
│       └── deploy.yaml        # Deploy to Vercel
├── app/                       # Next.js App Router
│   ├── (dashboard)/           # Protected route group
│   │   ├── dashboard/         # Main dashboard page
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   ├── payments/          # Payment management
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── new/
│   │   │       └── page.tsx
│   │   ├── expenses/          # Expense tracking
│   │   │   ├── page.tsx
│   │   │   ├── new/           # Mobile expense entry
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   └── tenants/           # Tenant management
│   │       ├── page.tsx
│   │       ├── [id]/
│   │       │   └── page.tsx
│   │       └── new/
│   │           └── page.tsx
│   ├── auth/                  # Authentication pages
│   │   ├── signin/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── api/                   # API endpoints
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   ├── payments/
│   │   │   ├── route.ts
│   │   │   ├── [id]/
│   │   │   │   └── route.ts
│   │   │   ├── reminders/
│   │   │   │   └── route.ts
│   │   │   └── stripe/
│   │   │       └── webhooks/
│   │   │           └── route.ts
│   │   ├── expenses/
│   │   │   ├── route.ts
│   │   │   ├── [id]/
│   │   │   │   └── route.ts
│   │   │   └── upload/
│   │   │       └── route.ts
│   │   ├── tenants/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   └── properties/
│   │       ├── route.ts
│   │       └── [id]/
│   │           ├── route.ts
│   │           └── dashboard/
│   │               └── route.ts
│   ├── globals.css            # Global Tailwind styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Landing page
├── components/                # React components
│   ├── ui/                    # Base UI components (Radix + Tailwind)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── form.tsx
│   │   └── dialog.tsx
│   ├── forms/                 # Form components
│   │   ├── expense-form.tsx
│   │   ├── payment-form.tsx
│   │   └── tenant-form.tsx
│   ├── dashboard/             # Dashboard components
│   │   ├── payment-status-card.tsx
│   │   ├── expense-timeline.tsx
│   │   ├── tenant-overview.tsx
│   │   └── task-list.tsx
│   ├── mobile/                # Mobile-optimized components
│   │   ├── expense-entry.tsx
│   │   ├── camera-capture.tsx
│   │   └── mobile-nav.tsx
│   └── shared/                # Shared components
│       ├── property-selector.tsx
│       ├── user-avatar.tsx
│       └── loading-spinner.tsx
├── lib/                       # Utilities and configuration
│   ├── auth.ts                # NextAuth configuration
│   ├── db.ts                  # Database client (Vercel KV)
│   ├── stripe.ts              # Stripe configuration
│   ├── email.ts               # Email service setup
│   ├── blob-storage.ts        # Vercel Blob client
│   ├── utils.ts               # Helper functions
│   ├── validations.ts         # Zod schemas
│   └── stores/                # Zustand stores
│       ├── property-store.ts
│       ├── payment-store.ts
│       └── expense-store.ts
├── types/                     # TypeScript definitions
│   ├── database.ts            # Database model types
│   ├── api.ts                 # API request/response types
│   ├── auth.ts                # Authentication types
│   └── global.ts              # Global type definitions
├── public/                    # Static assets
│   ├── icons/
│   ├── images/
│   └── favicon.ico
├── tests/                     # Test files
│   ├── __mocks__/             # Test mocks
│   ├── components/            # Component tests
│   ├── pages/                 # Page tests
│   ├── api/                   # API route tests
│   └── utils/                 # Utility function tests
├── docs/                      # Project documentation
│   ├── prd.md                 # Product Requirements
│   ├── front-end-spec.md      # UI/UX specification
│   └── fullstack-architecture.md  # This document
├── .env.example               # Environment variables template
├── .env.local                 # Local environment variables
├── .gitignore                 # Git ignore rules
├── next.config.js             # Next.js configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
├── package.json               # Dependencies and scripts
├── vitest.config.ts           # Test configuration
├── playwright.config.ts       # E2E test configuration
└── README.md                  # Project setup instructions
```

## Development Workflow

### Local Development Setup

#### Prerequisites
```bash
# Node.js 18+ and npm
node --version  # Should be 18.0.0 or higher
npm --version   # Should be 9.0.0 or higher

# Git for version control
git --version
```

#### Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd coliving-management

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your actual values

# Set up Vercel CLI (for KV and Blob access)
npm install -g vercel
vercel login
vercel link

# Pull Vercel environment variables
vercel env pull .env.local

# Run database migrations (if any)
npm run db:migrate

# Start development server
npm run dev
```

#### Development Commands
```bash
# Start all services
npm run dev              # Next.js dev server on http://localhost:3000

# Database operations
npm run db:reset         # Reset KV database (development only)
npm run db:seed          # Seed test data

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:e2e         # Run Playwright E2E tests
npm run test:coverage    # Generate test coverage report

# Code quality
npm run lint             # ESLint checks
npm run lint:fix         # Fix linting issues
npm run type-check       # TypeScript checks
npm run format           # Prettier formatting

# Build and deployment
npm run build            # Production build
npm run start            # Start production server locally
npm run deploy           # Deploy to Vercel
```

### Environment Configuration

#### Required Environment Variables

```bash
# Frontend (.env.local)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Backend (.env)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Database (Vercel KV)
KV_URL=redis://...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...

# File Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# Payment Processing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email Service
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# E-signature
DOCUSIGN_INTEGRATION_KEY=your-integration-key
DOCUSIGN_USER_ID=your-user-id
DOCUSIGN_ACCOUNT_ID=your-account-id
DOCUSIGN_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----...

# Development Tools
VERCEL_TOKEN=your-vercel-token
```

## Deployment Architecture

### Deployment Strategy

**Frontend Deployment:**
- **Platform:** Vercel (native Next.js deployment)
- **Build Command:** `npm run build`
- **Output Directory:** `.next` (automatically detected)
- **CDN/Edge:** Vercel Edge Network with global distribution

**Backend Deployment:**
- **Platform:** Vercel Edge Functions (serverless)
- **Build Command:** Automatic API route compilation
- **Deployment Method:** Git-based continuous deployment

**Database:**
- **Platform:** Vercel KV (managed Redis)
- **Backup Strategy:** Automatic Vercel backups
- **Scaling:** Automatic based on usage

**File Storage:**
- **Platform:** Vercel Blob
- **CDN:** Global edge distribution
- **Backup:** Automatic replication

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run linting
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test
      
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_APP_URL: https://test.yourdomain.com
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:3000

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Environments

| Environment | Frontend URL | Backend URL | Purpose |
|-------------|--------------|-------------|---------|
| Development | http://localhost:3000 | http://localhost:3000/api | Local development |
| Preview | https://preview-*.vercel.app | https://preview-*.vercel.app/api | PR previews and testing |
| Production | https://yourdomain.com | https://yourdomain.com/api | Live environment |

## Security and Performance

### Security Requirements

**Frontend Security:**
- CSP Headers: `default-src 'self'; img-src 'self' blob: https://vercel-storage.com; script-src 'self' 'unsafe-inline'`
- XSS Prevention: React's built-in protection + input sanitization
- Secure Storage: HTTPOnly cookies for sessions, no sensitive data in localStorage

**Backend Security:**
- Input Validation: Zod schemas for all API inputs
- Rate Limiting: 100 requests per minute per IP for API endpoints
- CORS Policy: Restricted to app domain and preview domains

**Authentication Security:**
- Token Storage: Secure HTTPOnly cookies managed by NextAuth.js
- Session Management: JWT tokens with 7-day expiry and automatic refresh
- Password Policy: Email-based passwordless authentication (more secure than passwords)

### Performance Optimization

**Frontend Performance:**
- Bundle Size Target: < 250KB initial bundle size
- Loading Strategy: Lazy loading for non-critical components, priority loading for expense entry
- Caching Strategy: SWR for API data, aggressive caching for static assets

**Backend Performance:**
- Response Time Target: < 200ms for API responses from edge locations
- Database Optimization: Redis key patterns optimized for common queries
- Caching Strategy: Vercel KV used for both data storage and application caching

## Testing Strategy

### Testing Pyramid

```text
                  E2E Tests (Playwright)
                 /                    \
           Integration Tests (API Routes)
              /                        \
        Component Tests          Unit Tests
           (React)                (Utils)
```

### Test Organization

#### Frontend Tests
```text
tests/
├── components/              # Component testing
│   ├── dashboard/
│   │   ├── payment-status-card.test.tsx
│   │   └── expense-timeline.test.tsx
│   ├── forms/
│   │   ├── expense-form.test.tsx
│   │   └── payment-form.test.tsx
│   └── mobile/
│       ├── expense-entry.test.tsx
│       └── camera-capture.test.tsx
├── pages/                   # Page testing
│   ├── dashboard.test.tsx
│   ├── payments.test.tsx
│   └── expenses.test.tsx
└── utils/                   # Utility testing
    ├── api-client.test.ts
    ├── date-helpers.test.ts
    └── validators.test.ts
```

#### Backend Tests
```text
tests/
├── api/                     # API route testing
│   ├── payments/
│   │   ├── route.test.ts
│   │   └── reminders.test.ts
│   ├── expenses/
│   │   ├── route.test.ts
│   │   └── upload.test.ts
│   └── auth/
│       └── nextauth.test.ts
├── lib/                     # Service testing
│   ├── db.test.ts
│   ├── email.test.ts
│   └── stripe.test.ts
└── integration/             # Integration testing
    ├── payment-flow.test.ts
    ├── expense-workflow.test.ts
    └── auth-flow.test.ts
```

#### E2E Tests
```text
e2e/
├── auth/
│   ├── login.spec.ts
│   └── permissions.spec.ts
├── payments/
│   ├── record-payment.spec.ts
│   └── payment-reminders.spec.ts
├── expenses/
│   ├── mobile-entry.spec.ts
│   ├── photo-upload.spec.ts
│   └── reimbursement.spec.ts
└── dashboard/
    ├── overview.spec.ts
    └── property-switching.spec.ts
```

### Test Examples

#### Frontend Component Test
```typescript
// tests/components/mobile/expense-entry.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ExpenseEntry } from '@/components/mobile/expense-entry';

const mockCreateExpense = vi.fn();
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    createExpense: mockCreateExpense,
  },
}));

describe('ExpenseEntry', () => {
  beforeEach(() => {
    mockCreateExpense.mockClear();
  });

  it('submits expense with photo upload', async () => {
    const onSuccess = vi.fn();
    
    render(
      <ExpenseEntry 
        propertyId="prop_123" 
        onSuccess={onSuccess} 
      />
    );

    // Fill form
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: '45.50' }
    });
    
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Kitchen cleaning supplies' }
    });

    // Mock file upload
    const file = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/receipt photo/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /save expense/i }));

    await waitFor(() => {
      expect(mockCreateExpense).toHaveBeenCalledWith({
        propertyId: 'prop_123',
        amount: 4550, // Converted to cents
        description: 'Kitchen cleaning supplies',
        receiptPhotos: [file],
        category: 'Supplies',
        isReimbursement: false,
      });
    });

    expect(onSuccess).toHaveBeenCalledWith('expense_123');
  });
});
```

#### Backend API Test
```typescript
// tests/api/expenses/route.test.ts
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/expenses/route';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';

vi.mock('next-auth');
vi.mock('@/lib/db');

const mockSession = {
  user: { id: 'user_123', role: 'owner' }
};

describe('/api/expenses', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
  });

  it('creates expense successfully', async () => {
    const mockExpense = {
      id: 'expense_123',
      propertyId: 'prop_123',
      amount: 4550,
      description: 'Kitchen supplies',
    };

    vi.mocked(db.createExpense).mockResolvedValue(mockExpense);

    const formData = new FormData();
    formData.append('propertyId', 'prop_123');
    formData.append('amount', '4550');
    formData.append('description', 'Kitchen supplies');
    formData.append('category', 'Supplies');

    const request = new NextRequest('http://localhost:3000/api/expenses', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(result).toEqual(mockExpense);
  });

  it('returns 401 for unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/expenses', {
      method: 'POST',
      body: new FormData(),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });
});
```

#### E2E Test
```typescript
// e2e/expenses/mobile-entry.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Mobile Expense Entry', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to expense entry
    await page.goto('/auth/signin');
    await page.fill('[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    
    // Mock email verification (in test environment)
    await page.goto('/expenses/new');
  });

  test('should create expense with photo upload on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Fill expense form
    await page.fill('[data-testid="expense-amount"]', '45.50');
    await page.selectOption('[data-testid="expense-category"]', 'Supplies');
    await page.fill('[data-testid="expense-description"]', 'Kitchen cleaning supplies');

    // Upload receipt photo
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="photo-upload-button"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/fixtures/receipt.jpg');

    // Submit expense
    await page.click('[data-testid="submit-expense"]');

    // Verify success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Expense saved successfully');

    // Verify redirect to expense list
    await expect(page).toHaveURL('/expenses');
    
    // Verify expense appears in list
    await expect(page.locator('[data-testid="expense-item"]').first()).toContainText('Kitchen cleaning supplies');
    await expect(page.locator('[data-testid="expense-item"]').first()).toContainText('$45.50');
  });

  test('should handle photo upload failure gracefully', async ({ page }) => {
    // Mock blob storage failure
    await page.route('**/api/expenses', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Photo upload failed' }),
      });
    });

    await page.fill('[data-testid="expense-amount"]', '25.00');
    await page.click('[data-testid="submit-expense"]');

    // Verify error handling
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to save expense');
  });
});
```

## Coding Standards

### Critical Fullstack Rules

- **Type Sharing:** Always define shared types in `types/` directory and import consistently across frontend and backend
- **API Calls:** Never make direct HTTP calls - use the service layer pattern with proper error handling and type safety
- **Environment Variables:** Access only through validated config objects, never `process.env` directly in components
- **Error Handling:** All API routes must use consistent error response format with proper HTTP status codes
- **Database Operations:** Always use the database client abstraction, never direct KV operations outside of `lib/db.ts`
- **File Uploads:** Handle multipart form data properly, validate file types, and use secure blob storage URLs
- **Authentication:** Check authentication and permissions in all API routes, use middleware for route protection

### Naming Conventions

| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| Components | PascalCase | - | `ExpenseEntry.tsx` |
| Hooks | camelCase with 'use' | - | `usePropertyStore.ts` |
| API Routes | - | kebab-case | `/api/payment-reminders` |
| Database Keys | - | colon-separated | `payment:tenant:123` |
| Types | PascalCase | PascalCase | `PaymentCreateData` |
| Functions | camelCase | camelCase | `createPayment` |
| Constants | UPPER_SNAKE_CASE | UPPER_SNAKE_CASE | `MAX_UPLOAD_SIZE` |

## Error Handling Strategy

### Error Flow

```mermaid
sequenceDiagram
    participant F as Frontend
    participant A as API Route
    participant D as Database
    participant E as External Service
    participant L as Logger

    F->>A: API Request
    A->>D: Database Operation
    D-->>A: Database Error
    A->>L: Log Error with Context
    A->>A: Transform to API Error
    A-->>F: Structured Error Response
    F->>F: Display User-Friendly Message
    F->>L: Log Client Error (if needed)
```

### Error Response Format

```typescript
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId: string;
  };
}

// Example API error responses
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid expense data provided",
    "details": {
      "amount": "Amount must be greater than 0",
      "category": "Category is required"
    },
    "timestamp": "2024-12-19T12:00:00Z",
    "requestId": "req_abc123"
  }
}

{
  "error": {
    "code": "PAYMENT_PROCESSING_ERROR",
    "message": "Payment could not be processed",
    "details": {
      "stripeError": "Your card was declined",
      "paymentIntentId": "pi_1ABC123"
    },
    "timestamp": "2024-12-19T12:00:00Z",
    "requestId": "req_def456"
  }
}
```

### Frontend Error Handling

```typescript
// lib/api-client.ts
export class ApiClient {
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`/api${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(response.status, errorData.error);
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network or parsing error
      throw new ApiError(0, {
        code: 'NETWORK_ERROR',
        message: 'Failed to connect to server',
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
      });
    }
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public errorInfo: ApiError['error']
  ) {
    super(errorInfo.message);
    this.name = 'ApiError';
  }
}

// Component error handling
export function ExpenseEntry({ propertyId }: ExpenseEntryProps) {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: ExpenseFormData) => {
    try {
      setError(null);
      await apiClient.createExpense(data);
      // Success handling...
    } catch (err) {
      if (err instanceof ApiError) {
        // Display user-friendly error message
        setError(getErrorMessage(err.errorInfo.code));
        
        // Log technical details for debugging
        console.error('Expense creation failed:', err.errorInfo);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {/* Form fields... */}
    </form>
  );
}
```

### Backend Error Handling

```typescript
// lib/api-error-handler.ts
export class ApiErrorHandler {
  static handle(error: unknown, context: string): NextResponse {
    const requestId = generateRequestId();
    
    if (error instanceof ValidationError) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.details,
          timestamp: new Date().toISOString(),
          requestId,
        }
      }, { status: 400 });
    }

    if (error instanceof AuthenticationError) {
      return NextResponse.json({
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId,
        }
      }, { status: 401 });
    }

    if (error instanceof StripeError) {
      return NextResponse.json({
        error: {
          code: 'PAYMENT_PROCESSING_ERROR',
          message: 'Payment processing failed',
          details: { stripeError: error.message },
          timestamp: new Date().toISOString(),
          requestId,
        }
      }, { status: 402 });
    }

    // Log unexpected errors
    console.error(`[${context}] Unexpected error:`, error, { requestId });

    return NextResponse.json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An internal error occurred',
        timestamp: new Date().toISOString(),
        requestId,
      }
    }, { status: 500 });
  }
}

// API route usage
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new AuthenticationError('Login required');
    }

    const body = await request.json();
    const validatedData = expenseSchema.parse(body);
    
    const expense = await db.createExpense(validatedData);
    return NextResponse.json(expense, { status: 201 });
    
  } catch (error) {
    return ApiErrorHandler.handle(error, 'POST /api/expenses');
  }
}
```

## Monitoring and Observability

### Monitoring Stack

- **Frontend Monitoring:** Vercel Analytics (Core Web Vitals, user interactions)
- **Backend Monitoring:** Vercel Functions (execution time, memory usage, errors)
- **Error Tracking:** Console logging with structured data for Vercel log aggregation
- **Performance Monitoring:** Built-in Vercel metrics and custom timing

### Key Metrics

**Frontend Metrics:**
- Largest Contentful Paint (LCP) < 2.5s
- First Input Delay (FID) < 100ms
- Cumulative Layout Shift (CLS) < 0.1
- Time to Interactive (TTI) < 3.5s

**Backend Metrics:**
- API response time p95 < 500ms
- Error rate < 1%
- Function cold start time < 200ms
- Database query time p95 < 50ms

**Business Metrics:**
- Payment processing success rate > 99%
- Expense entry completion rate > 95%
- Mobile app engagement (time spent on expense entry)
- Email reminder delivery rate > 98%

### Logging Strategy

```typescript
// lib/logger.ts
interface LogContext {
  userId?: string;
  propertyId?: string;
  requestId?: string;
  action?: string;
}

export class Logger {
  static info(message: string, context?: LogContext) {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...context,
    }));
  }

  static error(message: string, error: Error, context?: LogContext) {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      timestamp: new Date().toISOString(),
      ...context,
    }));
  }

  static payment(action: string, paymentId: string, context?: LogContext) {
    this.info(`Payment ${action}`, {
      ...context,
      action: `payment.${action}`,
      paymentId,
    });
  }

  static expense(action: string, expenseId: string, context?: LogContext) {
    this.info(`Expense ${action}`, {
      ...context,
      action: `expense.${action}`,
      expenseId,
    });
  }
}

// Usage in API routes
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  
  try {
    Logger.info('Creating expense', { 
      requestId, 
      action: 'expense.create.start' 
    });

    const expense = await db.createExpense(data);
    
    Logger.expense('created', expense.id, { 
      requestId, 
      userId: session.user.id,
      propertyId: expense.propertyId 
    });

    return NextResponse.json(expense);
  } catch (error) {
    Logger.error('Failed to create expense', error, { 
      requestId,
      action: 'expense.create.error' 
    });
    
    throw error;
  }
}
```

## Checklist Results Report

*To be executed using architect-checklist after architecture completion*

## Next Steps

### Implementation Readiness

This architecture document provides comprehensive guidance for building your coliving management system. Key implementation priorities:

1. **Start with Payment Management** (Epic 1) - Your highest priority feature with automated reminders
2. **Mobile Expense Entry** (Epic 2) - Critical mobile-first functionality with photo uploads  
3. **Multi-property scaling** - Built into the foundation with property-scoped data patterns

### Technology Validation

The chosen tech stack (Next.js + Vercel + KV Redis + Blob storage + Stripe) provides:
- **Cost optimization** for your 7-bedroom operation with room to scale
- **Mobile performance** for real-time expense entry
- **Payment flexibility** supporting your global tenant base
- **Developer productivity** with TypeScript safety across the fullstack

### Development Approach

**Recommended Sequence:**
1. Set up project foundation with authentication and basic UI
2. Implement payment tracking and automated reminders (immediate value)
3. Build mobile expense entry with photo uploads (second priority)
4. Add tenant management and digital agreements
5. Complete with task management and reporting

**SAVE THIS ARCHITECTURE:** Copy this complete document and save it as `docs/fullstack-architecture.md` in your project folder.

This architecture addresses all your brainstorming insights while providing the technical foundation for scaling to multiple properties. The mobile-first design ensures excellent expense entry experience, and the automated payment reminders will immediately reduce your administrative overhead.

Ready to begin implementation with your development team!