# Story 2.4: Expense Categorization and Reporting

## Story Overview
**Epic:** Epic 2: Mobile Expense System  
**Priority:** Medium  
**Estimated Effort:** Medium  
**Dependencies:** Story 2.3 (Reimbursement Workflow)  
**Story Type:** Analytics/Reporting  

## User Story
**As a** property owner  
**I want** expenses automatically categorized with reporting capabilities  
**So that** I can understand spending patterns and prepare financial reports  

## Acceptance Criteria

### AC1: Predefined Category System
- [ ] Standard categories: Utilities, Repairs, Supplies, Cleaning, Maintenance, Other
- [ ] Custom category creation with property-specific options
- [ ] Category icons and color coding for visual identification
- [ ] Category hierarchy support (main category → subcategory)
- [ ] Category usage analytics and recommendations

### AC2: Automatic Categorization
- [ ] Machine learning suggestions based on merchant names
- [ ] OCR-based categorization from receipt text
- [ ] Historical pattern recognition for repeat expenses
- [ ] User feedback loop to improve suggestions
- [ ] Confidence scoring for automatic categorizations

### AC3: Monthly and Yearly Reporting
- [ ] Monthly expense breakdown by category
- [ ] Year-over-year comparison reports
- [ ] Quarterly financial summaries
- [ ] Custom date range reporting
- [ ] Visual charts and graphs for expense trends

### AC4: Expense Trend Analysis
- [ ] Spending pattern identification over time
- [ ] Seasonal expense trend analysis
- [ ] Budget variance reporting
- [ ] Cost per category trending
- [ ] Anomaly detection for unusual expenses

### AC5: Export Capabilities
- [ ] CSV export for accounting software integration
- [ ] PDF report generation with charts
- [ ] Excel export with formatted data
- [ ] QuickBooks integration preparation
- [ ] Tax-ready expense categorization

### AC6: Tax-Relevant Expense Flagging
- [ ] Tax-deductible expense identification
- [ ] IRS category mapping for business expenses
- [ ] Tax year reporting with proper categorization
- [ ] Receipt organization for tax preparation
- [ ] Depreciation tracking for major purchases

### AC7: Multi-Property Allocation
- [ ] Expense allocation across multiple properties
- [ ] Shared expense distribution calculations
- [ ] Property-specific expense reporting
- [ ] Consolidated multi-property reports
- [ ] Cost center allocation for accounting

## Technical Implementation Details

### Reporting System Structure
```
/app/reports/
├── expenses/
│   ├── page.tsx (Main expense reports)
│   ├── categories/
│   │   └── page.tsx (Category analysis)
│   └── trends/
│       └── page.tsx (Trend analysis)
/lib/
├── reporting/
│   ├── categorization.ts (Auto-categorization logic)
│   ├── analytics.ts (Trend analysis)
│   └── exports.ts (Export functionality)
/components/reports/
├── ExpenseChart.tsx
├── CategoryBreakdown.tsx
└── TrendAnalysis.tsx
```

### Categorization Engine
```typescript
interface CategorySuggestion {
  category: ExpenseCategory;
  confidence: number;
  reason: 'merchant' | 'ocr' | 'pattern' | 'manual';
  suggestions: string[];
}

interface ExpenseReport {
  period: {
    start: Date;
    end: Date;
  };
  totalAmount: number;
  categoryBreakdown: CategoryTotal[];
  trends: TrendData[];
  comparisons: ComparisonData[];
}
```

### Machine Learning Features
- Merchant name pattern recognition
- Historical categorization learning
- User correction feedback integration
- Confidence scoring algorithms

### Export Formats
- CSV with proper headers and formatting
- PDF with charts and visual summaries
- Excel with multiple sheets and formulas
- JSON for API integrations

## Definition of Done
- [ ] Category system works with predefined and custom categories
- [ ] Automatic categorization provides useful suggestions
- [ ] Monthly and yearly reports generate accurately
- [ ] Trend analysis identifies meaningful patterns
- [ ] Export functionality works for all supported formats
- [ ] Tax-relevant flagging helps with tax preparation
- [ ] Multi-property allocation calculates correctly
- [ ] All reports load within performance requirements

## Notes for Developer
- Use Chart.js or similar for visual reporting
- Implement proper caching for report generation
- Consider using web workers for heavy calculations
- Test export functionality with large datasets
- Implement proper error handling for report failures
- Use date-fns v3.0.6 for date calculations
- Consider implementing report scheduling/automation
- Test categorization accuracy with real expense data

## Related Documents
- PRD Epic 2: `/docs/prd-shards/04-epic2-mobile-expense.md`
- Expense Data Model: `/docs/architecture-shards/02-data-models.md`
- Requirements: `/docs/prd-shards/01-requirements.md`

---
**Story Status:** Ready for Review  
**Created:** 2025-08-14  
**Scrum Master:** Bob 🏃

## Dev Agent Record

### Tasks
- [x] Task 1: Implement predefined category system with custom category support
- [x] Task 2: Build automatic categorization engine with ML suggestions
- [x] Task 3: Create monthly and yearly reporting system
- [x] Task 4: Implement expense trend analysis features
- [x] Task 5: Add export capabilities (CSV, PDF, Excel)
- [x] Task 6: Implement tax-relevant expense flagging
- [x] Task 7: Build multi-property allocation system

### Agent Model Used
Cascade

### Debug Log References
- Implementation started: 2025-08-16T13:26:23+07:00

### Completion Notes
- Starting implementation of expense categorization and reporting system
- Task 1 Complete: Enhanced category system with hierarchy, custom categories, icons, colors, and usage analytics
- Task 2 Complete: ML/AI categorization engine with OCR receipt analysis, pattern recognition, and user feedback learning
- Task 3 Complete: Comprehensive reporting system with monthly/yearly reports, trends, and caching
- Task 4 Complete: Advanced trend analysis with pattern detection, anomaly detection, and insights
- Task 5 Complete: Multi-format export system (CSV, PDF, Excel) with QuickBooks integration and scheduling
- Task 6 Complete: Tax categorization system with IRS compliance and documentation validation
- Task 7 Complete: Multi-property allocation system with rule-based distribution and audit trails

### File List
- `/lib/db/models/expense-category.ts` - Enhanced category model with hierarchy and analytics
- `/lib/db/operations/expense-categories.ts` - Category CRUD operations and usage tracking
- `/lib/db/models/expense.ts` - Updated expense model for new category system
- `/lib/db/operations/expenses.ts` - Updated expense operations with ML/OCR integration
- `/lib/categorization/ml-engine.ts` - Machine learning categorization engine
- `/lib/categorization/ocr-analyzer.ts` - OCR receipt text analysis module
- `/lib/reporting/expense-reports.ts` - Comprehensive reporting system with caching
- `/lib/analytics/trend-analysis.ts` - Advanced trend analysis and anomaly detection
- `/lib/exports/expense-exports.ts` - Multi-format export system with scheduling
- `/lib/tax/tax-categorization.ts` - IRS-compliant tax categorization system
- `/lib/allocation/multi-property-allocation.ts` - Multi-property expense allocation system

### Change Log
- 2025-08-16: Added Dev Agent Record section and started implementation
- 2025-08-16: Task 1 completed - Enhanced category system implemented
- 2025-08-16: Task 2 completed - ML/AI categorization engine with OCR analysis
- 2025-08-16: Task 3 completed - Comprehensive reporting system with caching
- 2025-08-16: Task 4 completed - Advanced trend analysis and anomaly detection
- 2025-08-16: Task 5 completed - Multi-format export system with scheduling
- 2025-08-16: Task 6 completed - IRS-compliant tax categorization system
- 2025-08-16: Task 7 completed - Multi-property allocation system
