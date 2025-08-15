// OCR functionality for receipt text extraction
// Note: This implementation provides a framework for OCR integration
// Actual OCR service (Tesseract.js, Google Vision API, etc.) would be integrated here

export interface ExtractedText {
  amount?: number;
  merchant?: string;
  date?: Date;
  confidence: number;
  rawText: string;
  items?: string[];
}

export interface OCRResult {
  success: boolean;
  extractedText?: ExtractedText;
  error?: string;
  processingTimeMs: number;
}

/**
 * Extract text from receipt image using OCR
 * This is a placeholder implementation - actual OCR service integration needed
 */
export async function extractTextFromReceipt(
  imageBuffer: Buffer,
  options: {
    language?: string;
    enhanceImage?: boolean;
  } = {}
): Promise<OCRResult> {
  const startTime = Date.now();
  
  try {
    // TODO: Integrate with actual OCR service
    // Options:
    // 1. Tesseract.js for client-side OCR
    // 2. Google Vision API for server-side processing
    // 3. AWS Textract for advanced receipt parsing
    
    // Placeholder implementation
    const mockExtractedText: ExtractedText = {
      rawText: "SAMPLE RECEIPT\nTotal: $25.99\nDate: 2025-08-15\nMerchant: Sample Store",
      confidence: 0.85,
    };
    
    // Parse the extracted text
    const parsedText = parseReceiptText(mockExtractedText.rawText);
    
    return {
      success: true,
      extractedText: {
        ...mockExtractedText,
        ...parsedText,
      },
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: `OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Parse extracted text to identify key receipt information
 */
export function parseReceiptText(rawText: string): Partial<ExtractedText> {
  const result: Partial<ExtractedText> = {};
  
  // Extract amount using various patterns
  const amountPatterns = [
    /total[:\s]*\$?(\d+\.?\d*)/i,
    /amount[:\s]*\$?(\d+\.?\d*)/i,
    /\$(\d+\.\d{2})/g,
    /(\d+\.\d{2})\s*$/, // Amount at end of line
  ];
  
  for (const pattern of amountPatterns) {
    const match = rawText.match(pattern);
    if (match) {
      const amount = parseFloat(match[1]);
      if (amount > 0 && amount < 10000) { // Reasonable range
        result.amount = amount;
        break;
      }
    }
  }
  
  // Extract merchant name
  const merchantPatterns = [
    /^([A-Z][A-Z\s&'-]+[A-Z])/m, // All caps business name
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:store|shop|market|restaurant|cafe)/i,
  ];
  
  for (const pattern of merchantPatterns) {
    const match = rawText.match(pattern);
    if (match) {
      result.merchant = match[1].trim();
      break;
    }
  }
  
  // Extract date
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/, // MM/DD/YYYY or MM/DD/YY
    /(\d{1,2}-\d{1,2}-\d{2,4})/, // MM-DD-YYYY or MM-DD-YY
    /(\d{4}-\d{1,2}-\d{1,2})/, // YYYY-MM-DD
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2},?\s+\d{4}/i,
  ];
  
  for (const pattern of datePatterns) {
    const match = rawText.match(pattern);
    if (match) {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) {
        result.date = date;
        break;
      }
    }
  }
  
  // Extract line items (basic implementation)
  const lines = rawText.split('\n').filter(line => line.trim().length > 0);
  const items: string[] = [];
  
  for (const line of lines) {
    // Look for lines that might be items (contain price and description)
    if (/\$\d+\.\d{2}/.test(line) && line.length > 10) {
      items.push(line.trim());
    }
  }
  
  if (items.length > 0) {
    result.items = items;
  }
  
  return result;
}

/**
 * Validate extracted text confidence and completeness
 */
export function validateExtractedText(extractedText: ExtractedText): {
  isValid: boolean;
  confidence: number;
  issues: string[];
} {
  const issues: string[] = [];
  let confidence = extractedText.confidence;
  
  // Check for required fields
  if (!extractedText.amount) {
    issues.push('No amount detected');
    confidence *= 0.7;
  }
  
  if (!extractedText.merchant) {
    issues.push('No merchant name detected');
    confidence *= 0.8;
  }
  
  if (!extractedText.date) {
    issues.push('No date detected');
    confidence *= 0.9;
  }
  
  // Validate amount reasonableness
  if (extractedText.amount) {
    if (extractedText.amount < 0.01 || extractedText.amount > 50000) {
      issues.push('Amount seems unreasonable');
      confidence *= 0.6;
    }
  }
  
  // Validate date reasonableness
  if (extractedText.date) {
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    if (extractedText.date < oneYearAgo || extractedText.date > oneWeekFromNow) {
      issues.push('Date seems unreasonable');
      confidence *= 0.8;
    }
  }
  
  return {
    isValid: confidence > 0.5 && issues.length < 3,
    confidence,
    issues,
  };
}

/**
 * Enhance image for better OCR results
 */
export async function enhanceImageForOCR(imageBuffer: Buffer): Promise<Buffer> {
  // This would use Sharp to enhance the image for better OCR
  // - Convert to grayscale
  // - Increase contrast
  // - Reduce noise
  // - Sharpen text
  
  const sharp = require('sharp');
  
  try {
    return await sharp(imageBuffer)
      .grayscale()
      .normalize()
      .sharpen()
      .toBuffer();
  } catch (error) {
    console.error('Image enhancement failed:', error);
    return imageBuffer; // Return original if enhancement fails
  }
}

/**
 * Get OCR confidence score based on image quality
 */
export async function assessImageQuality(imageBuffer: Buffer): Promise<{
  score: number;
  issues: string[];
  recommendations: string[];
}> {
  const sharp = require('sharp');
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 1.0;
  
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const stats = await sharp(imageBuffer).stats();
    
    // Check resolution
    if (metadata.width && metadata.height) {
      const pixelCount = metadata.width * metadata.height;
      if (pixelCount < 500000) { // Less than 0.5MP
        issues.push('Low resolution');
        recommendations.push('Use higher resolution camera');
        score *= 0.7;
      }
    }
    
    // Check if image is too dark or too bright
    if (stats.channels) {
      const avgBrightness = stats.channels.reduce((sum, channel) => sum + channel.mean, 0) / stats.channels.length;
      
      if (avgBrightness < 50) {
        issues.push('Image too dark');
        recommendations.push('Improve lighting');
        score *= 0.6;
      } else if (avgBrightness > 200) {
        issues.push('Image too bright');
        recommendations.push('Reduce lighting or avoid flash');
        score *= 0.7;
      }
    }
    
    return { score, issues, recommendations };
  } catch (error) {
    return {
      score: 0.5,
      issues: ['Unable to assess image quality'],
      recommendations: ['Ensure image is valid and readable'],
    };
  }
}
