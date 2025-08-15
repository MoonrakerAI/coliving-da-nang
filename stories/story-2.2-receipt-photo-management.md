# Story 2.2: Receipt Photo Management

## Story Overview
**Epic:** Epic 2: Mobile Expense System  
**Priority:** High  
**Estimated Effort:** Medium  
**Dependencies:** Story 2.1 (Mobile Expense Entry)  
**Story Type:** Core Feature/File Management  

## User Story
**As a** property owner  
**I want** receipt photos automatically processed and stored securely  
**So that** I have visual proof of all expenses for accounting and tax purposes  

## Acceptance Criteria

### AC1: Vercel Blob Storage Integration
- [ ] Secure photo upload to Vercel Blob storage
- [ ] Unique file naming with expense ID and timestamp
- [ ] Proper file organization by property and date
- [ ] Storage quota monitoring and management
- [ ] CDN optimization for fast photo access

### AC2: Image Processing and Optimization
- [ ] Automatic image compression using Sharp v0.33.1
- [ ] Multiple format support (JPEG, PNG, HEIC)
- [ ] Image resizing for storage efficiency
- [ ] Quality optimization while maintaining readability
- [ ] Progressive JPEG generation for faster loading

### AC3: OCR Text Extraction
- [ ] OCR processing to extract text from receipt images
- [ ] Automatic amount detection and validation
- [ ] Merchant name extraction and suggestion
- [ ] Date extraction from receipt timestamps
- [ ] Confidence scoring for OCR accuracy

### AC4: Photo Thumbnail Generation
- [ ] Automatic thumbnail creation for quick preview
- [ ] Multiple thumbnail sizes (small, medium, large)
- [ ] Lazy loading for photo galleries
- [ ] Thumbnail optimization for mobile viewing
- [ ] Fallback handling for failed thumbnail generation

### AC5: Multiple Photo Support
- [ ] Support for multiple photos per expense
- [ ] Front and back of receipt capture
- [ ] Photo ordering and organization
- [ ] Batch photo upload capability
- [ ] Photo deletion and replacement functionality

### AC6: Secure Access Control
- [ ] Authentication required for photo access
- [ ] Property-scoped photo access permissions
- [ ] Secure URL generation with expiration
- [ ] Role-based photo viewing permissions
- [ ] Audit logging for photo access

### AC7: Photo Management Interface
- [ ] Photo gallery view for expense receipts
- [ ] Full-screen photo viewing with zoom
- [ ] Photo rotation and basic editing
- [ ] Download original photo functionality
- [ ] Photo metadata display (size, date, location)

## Technical Implementation Details

### Photo Storage Structure
```
/lib/
├── storage/
│   ├── blob.ts (Vercel Blob integration)
│   ├── processor.ts (Image processing)
│   └── ocr.ts (Text extraction)
/app/api/
├── upload/
│   └── receipt/
│       └── route.ts (Photo upload endpoint)
/components/
├── PhotoGallery.tsx
├── PhotoViewer.tsx
└── PhotoUpload.tsx
```

### Image Processing Pipeline
```typescript
interface PhotoProcessingResult {
  originalUrl: string;
  thumbnailUrl: string;
  compressedUrl: string;
  extractedText?: {
    amount?: number;
    merchant?: string;
    date?: Date;
    confidence: number;
  };
  metadata: {
    size: number;
    dimensions: { width: number; height: number };
    format: string;
  };
}
```

### Blob Storage Organization
```
/receipts/
├── {propertyId}/
│   └── {year}/
│       └── {month}/
│           ├── {expenseId}-original.jpg
│           ├── {expenseId}-compressed.jpg
│           └── {expenseId}-thumb.jpg
```

### OCR Integration Options
- Consider Tesseract.js for client-side OCR
- Google Vision API for server-side processing
- AWS Textract for advanced receipt parsing
- Fallback to manual entry if OCR fails

## Definition of Done
- [ ] Photos upload successfully to Vercel Blob storage
- [ ] Image compression reduces file sizes appropriately
- [ ] OCR extraction provides useful text data
- [ ] Thumbnails generate correctly for all image formats
- [ ] Multiple photos per expense work seamlessly
- [ ] Photo access control properly enforced
- [ ] Photo management interface functional and intuitive
- [ ] Performance meets requirements (fast upload/viewing)

## Notes for Developer
- Use Sharp v0.33.1 for image processing as per tech stack
- Implement proper error handling for upload failures
- Consider progressive upload for large images
- Test with various image formats and sizes
- Implement proper cleanup for failed uploads
- Use environment variables for Blob storage configuration
- Consider implementing image watermarking for security
- Test OCR accuracy with various receipt types

## Related Documents
- Tech Stack File Storage: `/docs/architecture-shards/01-tech-stack.md`
- PRD Epic 2: `/docs/prd-shards/04-epic2-mobile-expense.md`
- Expense Data Model: `/docs/architecture-shards/02-data-models.md`

---
**Story Status:** Approved  
**Created:** 2025-08-14  
**Scrum Master:** Bob 🏃
