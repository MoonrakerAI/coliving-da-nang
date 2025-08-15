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

---
**Story Status:** Approved  
**Created:** 2025-08-14  
**Scrum Master:** Bob 🏃
