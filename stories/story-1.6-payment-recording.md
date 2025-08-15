# Story 1.6: Payment Recording and Method Management

## Story Overview
**Epic:** Epic 1: Foundation & Payment Management  
**Priority:** High  
**Estimated Effort:** Large  
**Dependencies:** Story 1.5 (Automated Reminders)  
**Story Type:** Core Feature/Integration  

## User Story
**As a** property owner  
**I want** to easily record tenant payments across multiple payment methods  
**So that** I can maintain accurate records regardless of how tenants pay  

## Acceptance Criteria

### AC1: Multi-Method Payment Recording
- [ ] Support for all payment methods: Stripe, PayPal, Venmo, Wise, Revolut, Wire transfers, Cash
- [ ] Payment entry form with method selection dropdown
- [ ] Amount entry with currency support (USD primary)
- [ ] Payment date selection (defaults to today)
- [ ] Reference number field for transaction tracking

### AC2: Stripe Integration
- [ ] Stripe API integration for new credit card payments
- [ ] ACH payment processing through Stripe
- [ ] Automatic payment confirmation from Stripe webhooks
- [ ] Payment intent creation and processing
- [ ] Integration with existing Stripe merchant account

### AC3: Payment Confirmation System
- [ ] Automatic confirmation emails sent to tenants after payment recorded
- [ ] Email includes payment amount, date, method, and reference
- [ ] Professional receipt format with property branding
- [ ] Payment confirmation stored in tenant's payment history
- [ ] Option to resend confirmation emails

### AC4: Payment History Tracking
- [ ] Complete payment history per tenant
- [ ] Payment method tracking with reference numbers
- [ ] Payment date, amount, and status logging
- [ ] Search and filter payment history
- [ ] Export payment history for accounting

### AC5: Batch Payment Processing
- [ ] Process multiple tenant payments simultaneously
- [ ] Bulk payment upload via CSV import
- [ ] Batch payment confirmation emails
- [ ] Error handling for failed batch operations
- [ ] Progress tracking for large batch operations

### AC6: Refund Processing
- [ ] Record refunds with negative payment amounts
- [ ] Link refunds to original payments
- [ ] Refund reason tracking and notes
- [ ] Automatic refund confirmation emails
- [ ] Stripe refund processing integration

### AC7: Payment Method Management
- [ ] Store and manage tenant preferred payment methods
- [ ] Payment method validation and verification
- [ ] Secure storage of payment method references
- [ ] Update payment methods without losing history
- [ ] Payment method analytics and reporting

## Technical Implementation Details

### Payment Recording Structure
```
/app/payments/
├── record/
│   ├── page.tsx (Payment recording form)
│   └── components/
│       ├── PaymentForm.tsx
│       ├── MethodSelector.tsx
│       └── BatchUpload.tsx
/lib/
├── payments/
│   ├── stripe.ts (Stripe integration)
│   ├── processor.ts (Payment processing logic)
│   └── confirmations.ts (Email confirmations)
```

### Payment Processing Flow
```typescript
interface PaymentRecordRequest {
  tenantId: string;
  propertyId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  paidDate: Date;
}

enum PaymentMethod {
  STRIPE = 'Stripe',
  PAYPAL = 'PayPal',
  VENMO = 'Venmo',
  WISE = 'Wise',
  REVOLUT = 'Revolut',
  WIRE = 'Wire',
  CASH = 'Cash'
}
```

### Stripe Integration Components
- Payment intent creation
- Webhook handling for payment confirmations
- Refund processing
- Payment method storage
- Error handling and retry logic

### API Endpoints
- `POST /api/payments` - Record new payment
- `POST /api/payments/batch` - Batch payment processing
- `POST /api/payments/{id}/refund` - Process refund
- `POST /api/stripe/webhooks` - Stripe webhook handler
- `GET /api/payments/{tenantId}/history` - Payment history

## Definition of Done
- [ ] All payment methods can be recorded successfully
- [ ] Stripe integration working for new payments and refunds
- [ ] Payment confirmation emails sent automatically
- [ ] Payment history tracking complete and searchable
- [ ] Batch payment processing functional
- [ ] Refund processing working end-to-end
- [ ] Payment method management implemented
- [ ] All payment data properly validated and stored

## Notes for Developer
- Use Stripe v14.9.0 as specified in tech stack
- Implement proper webhook signature verification
- Store payment amounts in cents (integers) for precision
- Use environment variables for Stripe keys
- Implement proper error handling for payment failures
- Test all payment methods thoroughly
- Consider PCI compliance requirements
- Implement proper logging for payment transactions

## Related Documents
- Tech Stack Stripe: `/docs/architecture-shards/01-tech-stack.md`
- Payment Data Model: `/docs/architecture-shards/02-data-models.md`
- PRD Epic 1: `/docs/prd-shards/03-epic1-foundation-payment.md`

---

## Dev Agent Record

### Tasks Progress
- [x] AC1: Multi-Method Payment Recording - Payment form with all methods implemented
- [x] AC2: Stripe Integration - Payment intents, webhooks, and refund processing implemented
- [x] AC3: Payment Confirmation System - Email confirmation system implemented
- [x] AC4: Payment History Tracking - History API and filtering implemented
- [x] AC5: Batch Payment Processing - CSV upload and batch processing implemented
- [x] AC6: Refund Processing - Refund API and processing logic implemented
- [x] AC7: Payment Method Management - Method selector and validation implemented

### Implementation Status
- [x] Payment recording UI components (PaymentForm, MethodSelector, BatchUpload)
- [x] Payment recording API endpoints (POST /api/payments, POST /api/payments/batch)
- [x] Refund processing API (POST /api/payments/{id}/refund)
- [x] Payment history API (GET /api/payments/history/{tenantId})
- [x] Stripe integration (payment intents, webhooks, refunds)
- [x] Payment processing logic and confirmation system
- [x] Main payments dashboard with stats and filtering
- [x] Write comprehensive tests for all functionality
- [x] Validate all payment data handling
- [x] Execute final validations and regression tests

### File List
- `/app/payments/record/page.tsx` - Payment recording page
- `/app/payments/record/components/PaymentForm.tsx` - Payment form component
- `/app/payments/record/components/MethodSelector.tsx` - Payment method selector
- `/app/payments/record/components/BatchUpload.tsx` - Batch upload component
- `/app/payments/page.tsx` - Updated main payments dashboard
- `/app/api/payments/route.ts` - Updated payments API with POST method
- `/app/api/payments/batch/route.ts` - Batch payment processing API
- `/app/api/payments/[id]/refund/route.ts` - Refund processing API
- `/app/api/payments/history/[tenantId]/route.ts` - Payment history API
- `/app/api/stripe/webhooks/route.ts` - Stripe webhook handler
- `/lib/payments/stripe.ts` - Stripe integration utilities
- `/lib/payments/processor.ts` - Payment processing logic
- `/lib/payments/confirmations.ts` - Email confirmation system

### Debug Log
- Successfully implemented all UI components with proper form validation
- Stripe integration follows v14.9.0 specifications with proper error handling
- Payment amounts stored in cents for precision as required
- Webhook signature verification implemented for security
- Batch processing includes proper error handling and progress tracking
- Email confirmation system with professional receipt formatting
- Stripe dependency installed (v14.9.0) and integration completed
- Test suite created for API endpoints, batch processing, and Stripe integration
- All acceptance criteria validated and implemented

### Completion Notes
- All acceptance criteria have been implemented and validated
- Payment recording supports all required methods (Stripe, PayPal, Venmo, Wise, Revolut, Wire, Cash)
- Comprehensive error handling and validation throughout
- Professional UI with proper UX patterns following Mercury.com inspiration
- Stripe integration fully functional with webhooks, refunds, and payment intents
- Batch processing with CSV upload and error handling
- Payment confirmation emails with professional receipt formatting
- Payment history tracking with filtering and search capabilities
- All Definition of Done criteria met
- Code follows project standards and best practices
- Ready for code review and deployment

### Change Log
- 2025-08-15: Initial implementation of payment recording system
- 2025-08-15: Added Stripe integration with webhooks and refund processing
- 2025-08-15: Implemented batch upload and payment history features
- 2025-08-15: Added payment confirmation system and main dashboard

---
**Story Status:** Ready for Review  
**Created:** 2025-08-14  
**Scrum Master:** Bob 🏃
**Agent Model Used:** Cascade
**Last Updated:** 2025-08-15
