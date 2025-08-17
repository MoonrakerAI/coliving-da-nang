import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { 
  uploadPhoto, 
  generatePhotoPath, 
  validatePhotoFile, 
  type PhotoMetadata 
} from '@/lib/storage/blob';
import { 
  processReceiptImage, 
  validateImage 
} from '@/lib/storage/processor';
import { 
  extractTextFromReceipt, 
  validateExtractedText 
} from '@/lib/storage/ocr';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const expenseId = formData.get('expenseId') as string;
    const propertyId = formData.get('propertyId') as string;
    const processOCR = formData.get('processOCR') === 'true';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    if (!expenseId || !propertyId) {
      return NextResponse.json({ 
        error: 'Missing required parameters: expenseId and propertyId' 
      }, { status: 400 });
    }
    
    // Validate file
    const fileValidation = validatePhotoFile(file);
    if (!fileValidation.valid) {
      return NextResponse.json({ error: fileValidation.error }, { status: 400 });
    }
    
    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Validate image buffer
    const imageValidation = await validateImage(buffer);
    if (!imageValidation.valid) {
      return NextResponse.json({ error: imageValidation.error }, { status: 400 });
    }
    
    // Process image (compression, thumbnails)
    const processedImages = await processReceiptImage(buffer);
    
    // Prepare metadata
    const metadata: PhotoMetadata = {
      expenseId,
      propertyId,
      originalName: file.name,
      size: file.size,
      contentType: file.type,
      uploadedAt: new Date(),
    };
    
    // Generate file paths
    const originalPath = generatePhotoPath(propertyId, expenseId, 'original', file.name);
    const compressedPath = generatePhotoPath(propertyId, expenseId, 'compressed', file.name);
    const thumbPath = generatePhotoPath(propertyId, expenseId, 'thumb', file.name);
    
    // Upload all versions
    const [originalUpload, compressedUpload, thumbUpload] = await Promise.all([
      uploadPhoto(processedImages.original.buffer, originalPath, metadata),
      uploadPhoto(processedImages.compressed.buffer, compressedPath, {
        ...metadata,
        contentType: 'image/jpeg',
      }),
      uploadPhoto(processedImages.thumbnails.large.buffer, thumbPath, {
        ...metadata,
        contentType: 'image/jpeg',
      }),
    ]);
    
    // Process OCR if requested
    let ocrResult = null;
    if (processOCR) {
      try {
        const ocr = await extractTextFromReceipt(processedImages.compressed.buffer);
        if (ocr.success && ocr.extractedText) {
          const validation = validateExtractedText(ocr.extractedText);
          ocrResult = {
            ...ocr.extractedText,
            validation,
          };
        }
      } catch (error) {
        console.warn('OCR processing failed:', error);
        // OCR failure shouldn't fail the upload
      }
    }
    
    // Calculate compression stats
    const originalSize = processedImages.original.metadata.size;
    const compressedSize = processedImages.compressed.metadata.size;
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    return NextResponse.json({
      success: true,
      data: {
        urls: {
          original: originalUpload.url,
          compressed: compressedUpload.url,
          thumbnail: thumbUpload.url,
        },
        metadata: {
          original: processedImages.original.metadata,
          compressed: processedImages.compressed.metadata,
          thumbnails: {
            small: processedImages.thumbnails.small.metadata,
            medium: processedImages.thumbnails.medium.metadata,
            large: processedImages.thumbnails.large.metadata,
          },
        },
        compression: {
          originalSize,
          compressedSize,
          ratio: `${compressionRatio}%`,
          savings: originalSize - compressedSize,
        },
        ocr: ocrResult,
      },
      message: 'Receipt uploaded and processed successfully',
    });
    
  } catch (error) {
    console.error('Error uploading receipt:', error);
    
    return NextResponse.json({
      error: 'Failed to upload receipt',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
