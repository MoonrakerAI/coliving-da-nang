# Story 2.1: Mobile Expense Entry Form

## Story Overview
**Epic:** Epic 2: Mobile Expense System  
**Priority:** High  
**Estimated Effort:** Large  
**Dependencies:** Story 1.2 (Database Models), Story 1.3 (Authentication)  
**Story Type:** Core Feature/Mobile UI  

## User Story
**As a** property owner or community manager  
**I want** to quickly log expenses on my mobile device with photo receipts  
**So that** all property expenses are captured immediately when they occur  

## Acceptance Criteria

### AC1: Mobile-Optimized Expense Form
- [ ] Mobile-first responsive design optimized for phone screens
- [ ] Minimal required fields: amount, category, description
- [ ] Large touch targets for easy mobile interaction
- [ ] Auto-focus on amount field when form opens
- [ ] Swipe gestures for quick category selection

### AC2: Photo Capture Integration
- [ ] Camera integration for direct photo capture
- [ ] Photo library access for existing images
- [ ] Multiple photo support (front/back of receipt)
- [ ] Photo preview before submission
- [ ] Image compression for faster upload

### AC3: Expense Categorization
- [ ] Predefined categories: Utilities, Repairs, Supplies, Cleaning, Maintenance, Other
- [ ] Visual category icons for quick selection
- [ ] Recently used categories shown first
- [ ] Custom category creation capability
- [ ] Category-based expense templates

### AC4: Geolocation Integration
- [ ] Automatic location tagging when permission granted
- [ ] Manual location entry option
- [ ] Location-based merchant suggestions
- [ ] Privacy controls for location sharing
- [ ] Location accuracy indicators

### AC5: Quick Entry Templates
- [ ] Pre-filled templates for common expenses
- [ ] Template creation from previous expenses
- [ ] One-tap expense entry for frequent purchases
- [ ] Template management and editing
- [ ] Property-specific expense templates

### AC6: Offline Capability
- [ ] Form works without internet connection
- [ ] Local storage of pending expenses
- [ ] Automatic sync when connection restored
- [ ] Offline indicator and sync status
- [ ] Conflict resolution for offline edits

### AC7: Form Validation and UX
- [ ] Real-time validation with helpful error messages
- [ ] Auto-save draft functionality
- [ ] Confirmation before form submission
- [ ] Loading states during photo upload
- [ ] Success feedback after submission

## Technical Implementation Details

### Mobile Form Structure
```
/app/expenses/
├── new/
│   ├── page.tsx (Mobile expense form)
│   └── components/
│       ├── ExpenseForm.tsx
│       ├── PhotoCapture.tsx
│       ├── CategorySelector.tsx
│       └── LocationPicker.tsx
/components/mobile/
├── CameraButton.tsx
├── TouchKeypad.tsx
└── SwipeSelector.tsx
```

### Form Schema and Validation
```typescript
interface ExpenseFormData {
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string;
  receiptPhotos: File[];
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  date: Date;
  isReimbursement: boolean;
}

enum ExpenseCategory {
  UTILITIES = 'Utilities',
  REPAIRS = 'Repairs', 
  SUPPLIES = 'Supplies',
  CLEANING = 'Cleaning',
  MAINTENANCE = 'Maintenance',
  OTHER = 'Other'
}
```

### Mobile-Specific Features
- Touch-optimized number input
- Swipe gestures for category selection
- Pull-to-refresh for form reset
- Haptic feedback for interactions
- Progressive Web App (PWA) capabilities

### API Endpoints
- `POST /api/expenses` - Create new expense with photos
- `POST /api/expenses/draft` - Save expense draft
- `GET /api/expenses/templates` - Get expense templates
- `POST /api/upload/receipt` - Upload receipt photos

## Definition of Done
- [ ] Mobile form works flawlessly on iOS and Android
- [ ] Photo capture and upload functionality working
- [ ] All expense categories selectable and functional
- [ ] Geolocation integration working with privacy controls
- [ ] Quick entry templates functional
- [ ] Offline capability tested and working
- [ ] Form validation prevents invalid submissions
- [ ] Performance meets mobile requirements (< 2s load)

## Notes for Developer
- Use React Hook Form v7.48.2 for form management
- Implement proper mobile touch interactions
- Test on actual mobile devices, not just browser dev tools
- Use Vercel Blob storage for receipt photo uploads
- Implement proper error handling for camera permissions
- Consider PWA installation prompts for frequent users
- Use sharp v0.33.1 for image compression
- Test offline functionality thoroughly

## Related Documents
- UX Design Goals: `/docs/prd-shards/02-ux-design.md`
- PRD Epic 2: `/docs/prd-shards/04-epic2-mobile-expense.md`
- Tech Stack: `/docs/architecture-shards/01-tech-stack.md`

---
**Story Status:** Approved  
**Created:** 2025-08-14  
**Scrum Master:** Bob 🏃
