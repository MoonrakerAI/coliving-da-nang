# Story 2.3: Admin Reimbursement Workflow

## Story Overview
**Epic:** Epic 2: Mobile Expense System  
**Priority:** Medium  
**Estimated Effort:** Medium  
**Dependencies:** Story 2.2 (Receipt Photo Management)  
**Story Type:** Core Feature/Workflow  

## User Story
**As a** community manager or property owner  
**I want** to request reimbursement for out-of-pocket expenses  
**So that** I'm not financially impacted by property purchases  

## Acceptance Criteria

### AC1: Reimbursement Request Flag
- [ ] Checkbox during expense entry to mark as reimbursement request
- [ ] Clear indication when expense requires reimbursement
- [ ] Automatic flagging based on user role (community manager)
- [ ] Reimbursement amount calculation and display
- [ ] Request submission with proper validation

### AC2: Reimbursement Status Tracking
- [ ] Status enum: Requested, Approved, Paid, Denied
- [ ] Status history tracking with timestamps
- [ ] Visual status indicators in expense lists
- [ ] Status change notifications to requestor
- [ ] Bulk status updates for multiple requests

### AC3: Approval Workflow
- [ ] Property owner approval interface
- [ ] Approval/denial with required comments
- [ ] Batch approval for multiple requests
- [ ] Approval delegation to other managers
- [ ] Approval notification emails

### AC4: Reimbursement Payment Recording
- [ ] Payment method selection for reimbursements
- [ ] Payment date and reference tracking
- [ ] Integration with main payment recording system
- [ ] Reimbursement receipt generation
- [ ] Payment confirmation to requestor

### AC5: Reimbursement Reporting
- [ ] Monthly reimbursement reports by user
- [ ] Outstanding reimbursement tracking
- [ ] Reimbursement history and trends
- [ ] Export capabilities for accounting
- [ ] Tax documentation preparation

### AC6: Email Notification System
- [ ] Request submission notifications to approvers
- [ ] Status change notifications to requestors
- [ ] Reminder emails for pending approvals
- [ ] Payment confirmation emails
- [ ] Escalation notifications for overdue approvals

### AC7: Integration with Payment System
- [ ] Link reimbursement payments to original expenses
- [ ] Automatic expense status updates after payment
- [ ] Payment method tracking for reimbursements
- [ ] Integration with existing payment recording workflow
- [ ] Reimbursement payment history

## Technical Implementation Details

### Reimbursement Workflow Structure
```
/app/reimbursements/
├── requests/
│   ├── page.tsx (Reimbursement requests list)
│   └── [id]/
│       └── page.tsx (Request details)
├── approve/
│   └── page.tsx (Approval interface)
/lib/
├── reimbursements/
│   ├── workflow.ts (Status management)
│   ├── notifications.ts (Email notifications)
│   └── payments.ts (Payment integration)
```

### Reimbursement Data Model
```typescript
interface ReimbursementRequest {
  id: string;
  expenseId: string;
  requestorId: string;
  propertyId: string;
  amount: number;
  status: ReimbursementStatus;
  requestDate: Date;
  approvedBy?: string;
  approvedDate?: Date;
  paidDate?: Date;
  paymentMethod?: string;
  paymentReference?: string;
  comments: string[];
  statusHistory: StatusChange[];
}

enum ReimbursementStatus {
  REQUESTED = 'Requested',
  APPROVED = 'Approved', 
  PAID = 'Paid',
  DENIED = 'Denied'
}
```

### Workflow State Machine
- Requested → Approved/Denied (by property owner)
- Approved → Paid (when payment recorded)
- Any status → Denied (with proper authorization)

### API Endpoints
- `POST /api/reimbursements` - Create reimbursement request
- `PATCH /api/reimbursements/{id}/approve` - Approve/deny request
- `POST /api/reimbursements/{id}/payment` - Record payment
- `GET /api/reimbursements/pending` - Get pending approvals
- `GET /api/reimbursements/reports` - Generate reports

## Definition of Done
- [ ] Reimbursement requests can be created during expense entry
- [ ] Status tracking works correctly through all states
- [ ] Approval workflow functional for property owners
- [ ] Payment recording integrates with main payment system
- [ ] Reporting generates accurate reimbursement data
- [ ] Email notifications sent at appropriate workflow stages
- [ ] Integration with payment system works seamlessly
- [ ] All reimbursement data properly audited and tracked

## Notes for Developer
- Implement proper state machine for status transitions
- Use email templates consistent with payment reminders
- Ensure proper authorization for approval actions
- Link reimbursement payments to original expenses
- Implement proper audit trail for all status changes
- Consider approval delegation for multi-property owners
- Test workflow with various user roles
- Implement proper error handling for payment failures

## Related Documents
- PRD Epic 2: `/docs/prd-shards/04-epic2-mobile-expense.md`
- Payment Data Model: `/docs/architecture-shards/02-data-models.md`
- Email Integration: `/docs/architecture-shards/01-tech-stack.md`

## Dev Agent Record

### Tasks
- [x] Task 1: Create reimbursement data models and database schema
- [x] Task 2: Implement reimbursement request creation during expense entry
- [x] Task 3: Build reimbursement status tracking system
- [x] Task 4: Create approval workflow interface for property owners
- [x] Task 5: Implement payment recording integration
- [x] Task 6: Build reimbursement reporting system
- [x] Task 7: Implement email notification system
- [x] Task 8: Create API endpoints for reimbursement workflow

### Agent Model Used
Cascade

### Debug Log References
- Initial setup: 2025-08-16T12:44:26+07:00

### Completion Notes
- Story implementation started

### File List
- lib/db/models/reimbursement.ts (created)
- lib/db/operations/reimbursements.ts (created)
- lib/db/__tests__/reimbursements.test.ts (created)
- app/expenses/new/components/ExpenseForm.tsx (modified)
- app/api/reimbursements/route.ts (created)
- app/api/reimbursements/[id]/approve/route.ts (created)
- app/api/reimbursements/[id]/payment/route.ts (created)
- app/api/reimbursements/batch-approve/route.ts (created)
- app/api/reimbursements/__tests__/route.test.ts (created)
- app/reimbursements/components/ReimbursementStatusBadge.tsx (created)
- app/reimbursements/components/ReimbursementStatusHistory.tsx (created)
- app/reimbursements/components/ReimbursementList.tsx (created)
- app/reimbursements/requests/page.tsx (created)
- app/reimbursements/requests/[id]/page.tsx (created)
- app/reimbursements/components/__tests__/ReimbursementStatusBadge.test.tsx (created)
- app/reimbursements/approve/components/ApprovalForm.tsx (created)
- app/reimbursements/approve/components/BatchApprovalForm.tsx (created)
- app/reimbursements/approve/page.tsx (created)
- app/reimbursements/payment/components/PaymentRecordingForm.tsx (created)
- app/reimbursements/payment/page.tsx (created)
- lib/services/reimbursement-payment-integration.ts (created)
- lib/services/__tests__/reimbursement-payment-integration.test.ts (created)
- app/api/reimbursements/[id]/payment/route.ts (modified)
- app/reimbursements/reports/components/ReimbursementReportFilters.tsx (created)
- app/reimbursements/reports/components/ReimbursementReportDashboard.tsx (created)
- app/reimbursements/reports/page.tsx (created)
- lib/utils/reimbursement-export.ts (created)
- lib/utils/__tests__/reimbursement-export.test.ts (created)
- lib/services/email-notification.ts (created)
- lib/services/__tests__/email-notification.test.ts (created)
- lib/db/operations/reimbursements.ts (modified - added email notifications)

### Change Log
- 2025-08-16T12:44:26+07:00: Added Dev Agent Record section and began story implementation
- 2025-08-16T12:48:06+07:00: Completed Task 1 - Created reimbursement data models, operations, and tests
- 2025-08-16T12:50:19+07:00: Completed Task 2 - Enhanced expense form with reimbursement checkbox and created API endpoints
- 2025-08-16T13:01:21+07:00: Completed Task 3 - Built reimbursement status tracking components and pages
- 2025-08-16T13:05:00+07:00: Completed Task 4 - Created approval workflow interface with individual and batch approval forms
- 2025-08-16T13:09:28+07:00: Completed Task 5 - Implemented payment recording integration with validation and expense linking
- 2025-08-16T13:18:54+07:00: Completed Task 6 - Built comprehensive reimbursement reporting system with dashboard, filters, and export functionality
- 2025-08-16T13:22:44+07:00: Completed Task 7 - Implemented comprehensive email notification system with HTML/text templates and automatic status change notifications
- 2025-08-16T13:25:00+07:00: Completed Task 8 - All API endpoints for reimbursement workflow were already created in previous tasks
- 2025-08-16T13:25:00+07:00: **STORY COMPLETE** - All 8 tasks completed successfully with comprehensive reimbursement workflow implementation

---
**Story Status:** Approved  
**Created:** 2025-08-14  
**Scrum Master:** Bob 🏃
