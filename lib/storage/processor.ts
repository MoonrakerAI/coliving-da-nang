import sharp from 'sharp';

export interface ImageProcessingOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png' | 'webp';
  progressive?: boolean;
}

export interface ThumbnailSizes {
  small: { width: number; height: number };
  medium: { width: number; height: number };
  large: { width: number; height: number };
}

export interface ProcessedImage {
  buffer: Buffer;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

export interface ImageProcessingResult {
  original: ProcessedImage;
  compressed: ProcessedImage;
  thumbnails: {
    small: ProcessedImage;
    medium: ProcessedImage;
    large: ProcessedImage;
  };
}

// Default thumbnail sizes optimized for mobile viewing
export const DEFAULT_THUMBNAIL_SIZES: ThumbnailSizes = {
  small: { width: 150, height: 150 },
  medium: { width: 300, height: 300 },
  large: { width: 600, height: 600 },
};

/**
 * Process a single image with compression and optimization
 */
export async function processImage(
  inputBuffer: Buffer,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> {
  const {
    quality = 85,
    maxWidth = 2048,
    maxHeight = 2048,
    format = 'jpeg',
    progressive = true,
  } = options;

  try {
    let processor = sharp(inputBuffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });

    // Apply format-specific optimizations
    switch (format) {
      case 'jpeg':
        processor = processor.jpeg({
          quality,
          progressive,
          mozjpeg: true, // Use mozjpeg encoder for better compression
        });
        break;
      case 'png':
        processor = processor.png({
          quality,
          progressive,
          compressionLevel: 9,
        });
        break;
      case 'webp':
        processor = processor.webp({
          quality,
          effort: 6, // Higher effort for better compression
        });
        break;
    }

    const buffer = await processor.toBuffer();
    const metadata = await sharp(buffer).metadata();

    return {
      buffer,
      metadata: {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || format,
        size: buffer.length,
      },
    };
  } catch (error) {
    console.error('Image processing failed:', error);
    throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate thumbnails in multiple sizes
 */
export async function generateThumbnails(
  inputBuffer: Buffer,
  sizes: ThumbnailSizes = DEFAULT_THUMBNAIL_SIZES
): Promise<{ small: ProcessedImage; medium: ProcessedImage; large: ProcessedImage }> {
  try {
    const thumbnails = await Promise.all([
      // Small thumbnail
      sharp(inputBuffer)
        .resize(sizes.small.width, sizes.small.height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer(),
      
      // Medium thumbnail
      sharp(inputBuffer)
        .resize(sizes.medium.width, sizes.medium.height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer(),
      
      // Large thumbnail
      sharp(inputBuffer)
        .resize(sizes.large.width, sizes.large.height, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 90, progressive: true })
        .toBuffer(),
    ]);

    const results = await Promise.all(
      thumbnails.map(async (buffer, index) => {
        const metadata = await sharp(buffer).metadata();
        return {
          buffer,
          metadata: {
            width: metadata.width || 0,
            height: metadata.height || 0,
            format: metadata.format || 'jpeg',
            size: buffer.length,
          },
        };
      })
    );

    return {
      small: results[0],
      medium: results[1],
      large: results[2],
    };
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    throw new Error(`Thumbnail generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Complete image processing pipeline
 */
export async function processReceiptImage(
  inputBuffer: Buffer,
  options: ImageProcessingOptions = {}
): Promise<ImageProcessingResult> {
  try {
    // Process original image (minimal processing to preserve quality)
    const original = await processImage(inputBuffer, {
      ...options,
      quality: 95,
      maxWidth: 4096,
      maxHeight: 4096,
    });

    // Create compressed version for storage efficiency
    const compressed = await processImage(inputBuffer, {
      ...options,
      quality: 85,
      maxWidth: 2048,
      maxHeight: 2048,
    });

    // Generate thumbnails
    const thumbnails = await generateThumbnails(inputBuffer);

    return {
      original,
      compressed,
      thumbnails,
    };
  } catch (error) {
    console.error('Receipt image processing failed:', error);
    throw new Error(`Receipt image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate image format and basic properties
 */
export async function validateImage(inputBuffer: Buffer): Promise<{
  valid: boolean;
  error?: string;
  metadata?: sharp.Metadata;
}> {
  try {
    const metadata = await sharp(inputBuffer).metadata();
    
    if (!metadata.format) {
      return { valid: false, error: 'Unable to determine image format' };
    }

    const supportedFormats = ['jpeg', 'png', 'webp', 'heif'];
    if (!supportedFormats.includes(metadata.format)) {
      return {
        valid: false,
        error: `Unsupported format: ${metadata.format}. Supported formats: ${supportedFormats.join(', ')}`,
      };
    }

    if (!metadata.width || !metadata.height) {
      return { valid: false, error: 'Unable to determine image dimensions' };
    }

    if (metadata.width < 100 || metadata.height < 100) {
      return { valid: false, error: 'Image too small (minimum 100x100 pixels)' };
    }

    if (metadata.width > 8192 || metadata.height > 8192) {
      return { valid: false, error: 'Image too large (maximum 8192x8192 pixels)' };
    }

    return { valid: true, metadata };
  } catch (error) {
    return {
      valid: false,
      error: `Image validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Calculate optimal compression settings based on image characteristics
 */
export async function getOptimalCompressionSettings(
  inputBuffer: Buffer
): Promise<ImageProcessingOptions> {
  try {
    const metadata = await sharp(inputBuffer).metadata();
    const stats = await sharp(inputBuffer).stats();
    
    // Base settings
    let quality = 85;
    let format: 'jpeg' | 'png' | 'webp' = 'jpeg';
    
    // Adjust quality based on image characteristics
    if (stats.isOpaque === false) {
      // Image has transparency, use PNG
      format = 'png';
      quality = 90;
    } else if (metadata.channels && metadata.channels <= 2) {
      // Grayscale image, can use higher compression
      quality = 80;
    } else {
      // Color image, standard compression
      quality = 85;
    }
    
    // Adjust for image size
    const pixelCount = (metadata.width || 0) * (metadata.height || 0);
    if (pixelCount > 4000000) { // > 4MP
      quality = Math.max(quality - 5, 75);
    }
    
    return {
      quality,
      format,
      progressive: true,
      maxWidth: 2048,
      maxHeight: 2048,
    };
  } catch (error) {
    console.error('Failed to calculate optimal compression settings:', error);
    // Return safe defaults
    return {
      quality: 85,
      format: 'jpeg',
      progressive: true,
      maxWidth: 2048,
      maxHeight: 2048,
    };
  }
}
