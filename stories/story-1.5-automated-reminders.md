# Story 1.5: Automated Payment Reminder System

## Story Overview
**Epic:** Epic 1: Foundation & Payment Management  
**Priority:** High  
**Estimated Effort:** Medium  
**Dependencies:** Story 1.4 (Payment Dashboard)  
**Story Type:** Core Feature/Automation  

## User Story
**As a** property owner  
**I want** automated email reminders sent to tenants about upcoming and overdue payments  
**So that** I don't have to manually track and chase payments  

## Acceptance Criteria

### AC1: Automated Reminder Schedule
- [ ] Email reminders sent 7 days before payment due date
- [ ] Follow-up reminders sent on due date
- [ ] Final reminders sent 3 days after due date
- [ ] Configurable reminder schedule per property or globally
- [ ] Stop reminders once payment is marked as paid

### AC2: Email Template System
- [ ] Professional email templates with property branding
- [ ] Personalized emails with tenant name and payment details
- [ ] Payment amount, due date, and payment methods included
- [ ] Property-specific contact information and instructions
- [ ] Mobile-friendly email design

### AC3: Email Delivery Integration
- [ ] Resend email service integration as per tech stack
- [ ] Email delivery tracking and status monitoring
- [ ] Bounce handling and failed delivery notifications
- [ ] Email delivery logs for audit purposes
- [ ] Rate limiting to prevent spam issues

### AC4: Reminder Configuration
- [ ] Global reminder settings for all properties
- [ ] Property-specific reminder customization
- [ ] Individual tenant reminder preferences
- [ ] Disable reminders for specific tenants if needed
- [ ] Holiday and weekend scheduling considerations

### AC5: Manual Reminder Override
- [ ] Send immediate reminder from dashboard
- [ ] Skip scheduled reminder for specific payment
- [ ] Custom reminder message capability
- [ ] Bulk reminder sending for multiple tenants
- [ ] Emergency reminder for urgent situations

### AC6: Reminder Tracking
- [ ] Track which reminders have been sent
- [ ] Reminder delivery status (sent, delivered, opened, bounced)
- [ ] Tenant response tracking (payment made after reminder)
- [ ] Reminder effectiveness analytics
- [ ] History of all reminders sent per tenant

### AC7: Professional Email Format
- [ ] Clean, professional email design
- [ ] Property logo and branding integration
- [ ] Clear payment instructions and methods
- [ ] Contact information for questions
- [ ] Unsubscribe option for compliance

## Technical Implementation Details

### Email System Structure
```
/lib/
├── email/
│   ├── templates/
│   │   ├── payment-reminder-7days.tsx
│   │   ├── payment-reminder-due.tsx
│   │   └── payment-reminder-overdue.tsx
│   ├── sender.ts (Resend integration)
│   └── scheduler.ts (Cron job logic)
/app/api/
├── cron/
│   └── payment-reminders/
│       └── route.ts
```

### Email Templates
```typescript
interface ReminderEmailProps {
  tenantName: string;
  paymentAmount: number;
  dueDate: string;
  propertyName: string;
  paymentMethods: string[];
  contactEmail: string;
  paymentReference: string;
}
```

### Cron Job Configuration
- Use Vercel Cron Jobs for automated scheduling
- Daily check at 9 AM for due reminders
- Proper error handling and retry logic
- Logging for monitoring and debugging

### API Endpoints
- `POST /api/cron/payment-reminders` - Automated reminder processing
- `POST /api/payments/{id}/send-reminder` - Manual reminder sending
- `GET /api/reminders/{tenantId}` - Reminder history
- `PATCH /api/reminders/settings` - Update reminder preferences

## Definition of Done
- [ ] Automated reminders send on correct schedule
- [ ] Email templates render correctly across email clients
- [ ] Resend integration working with delivery tracking
- [ ] Manual reminder functionality works from dashboard
- [ ] Reminder configuration settings functional
- [ ] Email delivery tracking and logging implemented
- [ ] Professional email design matches property branding
- [ ] Cron job reliability tested and monitored

## Notes for Developer
- Use Resend v2.1.0 as specified in tech stack
- Implement proper error handling for email failures
- Test email templates across major email clients
- Set up proper logging for debugging email issues
- Consider timezone handling for international properties
- Implement email rate limiting to avoid spam issues
- Use environment variables for email service configuration

## Related Documents
- Tech Stack Email Service: `/docs/architecture-shards/01-tech-stack.md`
- PRD Epic 1: `/docs/prd-shards/03-epic1-foundation-payment.md`
- Requirements: `/docs/prd-shards/01-requirements.md`

---
**Story Status:** Approved  
**Created:** 2025-08-14  
**Scrum Master:** Bob 🏃
