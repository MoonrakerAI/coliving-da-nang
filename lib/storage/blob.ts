import { put, del, head } from '@vercel/blob';
import { nanoid } from 'nanoid';

export interface BlobUploadResult {
  url: string;
  pathname: string;
  contentType: string;
  contentDisposition: string;
}

export interface PhotoMetadata {
  expenseId: string;
  propertyId: string;
  originalName: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
}

/**
 * Generate a unique file path for receipt photos
 * Format: /receipts/{propertyId}/{year}/{month}/{expenseId}-{type}-{uniqueId}.{ext}
 */
export function generatePhotoPath(
  propertyId: string,
  expenseId: string,
  type: 'original' | 'compressed' | 'thumb',
  originalName: string
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const uniqueId = nanoid(8);
  
  return `receipts/${propertyId}/${year}/${month}/${expenseId}-${type}-${uniqueId}.${extension}`;
}

/**
 * Upload a photo to Vercel Blob storage
 */
export async function uploadPhoto(
  file: File | Buffer,
  pathname: string,
  metadata: PhotoMetadata
): Promise<BlobUploadResult> {
  try {
    const blob = await put(pathname, file, {
      access: 'public',
      contentType: metadata.contentType,
      addRandomSuffix: false,
    });

    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: metadata.contentType,
      contentDisposition: `inline; filename="${metadata.originalName}"`,
    };
  } catch (error) {
    console.error('Failed to upload photo to Vercel Blob:', error);
    throw new Error(`Photo upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a photo from Vercel Blob storage
 */
export async function deletePhoto(url: string): Promise<void> {
  try {
    await del(url);
  } catch (error) {
    console.error('Failed to delete photo from Vercel Blob:', error);
    throw new Error(`Photo deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if a photo exists in Vercel Blob storage
 */
export async function photoExists(url: string): Promise<boolean> {
  try {
    await head(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get storage quota information
 */
export async function getStorageQuota(): Promise<{
  used: number;
  limit: number;
  available: number;
}> {
  // Note: Vercel Blob doesn't provide direct quota API
  // This would need to be tracked separately in the database
  // For now, return placeholder values
  const limit = 100 * 1024 * 1024 * 1024; // 100GB default limit
  const used = 0; // Would be calculated from database records
  
  return {
    used,
    limit,
    available: limit - used,
  };
}

/**
 * Validate file type for receipt photos
 */
export function validatePhotoFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`,
    };
  }
  
  return { valid: true };
}
