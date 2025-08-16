// OCR-based categorization from receipt text analysis
export interface OCRAnalysisResult {
  extractedText: string
  merchantName?: string
  amount?: number
  date?: Date
  categoryHints: string[]
  confidence: number
}

export interface ReceiptField {
  field: 'merchant' | 'amount' | 'date' | 'category' | 'item'
  value: string
  confidence: number
  position?: { x: number; y: number; width: number; height: number }
}

// Common merchant name patterns and their categories
const MERCHANT_CATEGORY_MAP = {
  // Utilities
  'electric': 'utilities',
  'power': 'utilities', 
  'energy': 'utilities',
  'water': 'utilities',
  'gas': 'utilities',
  'internet': 'utilities',
  'cable': 'utilities',
  'telecom': 'utilities',
  
  // Hardware stores
  'home depot': 'supplies',
  'lowes': 'supplies',
  'menards': 'supplies',
  'ace hardware': 'supplies',
  'harbor freight': 'supplies',
  
  // Cleaning services
  'cleaning': 'cleaning',
  'maid': 'cleaning',
  'janitorial': 'cleaning',
  'housekeeping': 'cleaning',
  
  // Repair services
  'plumbing': 'repairs',
  'electrical': 'repairs',
  'hvac': 'repairs',
  'appliance': 'repairs',
  'repair': 'repairs',
  
  // Maintenance
  'lawn': 'maintenance',
  'landscaping': 'maintenance',
  'painting': 'maintenance',
  'pest control': 'maintenance'
}

// Receipt text patterns that indicate specific categories
const RECEIPT_PATTERNS = {
  utilities: [
    /electric(?:al|ity)?\s+(?:bill|service|company)/i,
    /water\s+(?:bill|service|utility)/i,
    /gas\s+(?:bill|service|utility)/i,
    /internet\s+service/i,
    /cable\s+(?:tv|service)/i,
    /utility\s+bill/i
  ],
  
  repairs: [
    /repair\s+service/i,
    /service\s+call/i,
    /labor\s+(?:charge|cost)/i,
    /parts\s+(?:and\s+)?labor/i,
    /emergency\s+repair/i,
    /maintenance\s+fee/i,
    /diagnostic\s+fee/i
  ],
  
  supplies: [
    /building\s+supplies/i,
    /hardware\s+store/i,
    /office\s+supplies/i,
    /cleaning\s+supplies/i,
    /tools?\s+(?:and\s+)?equipment/i,
    /lumber/i,
    /paint\s+(?:and\s+)?supplies/i
  ],
  
  cleaning: [
    /cleaning\s+service/i,
    /housekeeping/i,
    /janitorial\s+service/i,
    /maid\s+service/i,
    /carpet\s+cleaning/i,
    /window\s+cleaning/i,
    /deep\s+clean(?:ing)?/i
  ],
  
  maintenance: [
    /lawn\s+(?:care|service|maintenance)/i,
    /landscaping/i,
    /tree\s+service/i,
    /painting\s+service/i,
    /maintenance\s+contract/i,
    /pest\s+control/i,
    /exterminator/i,
    /security\s+service/i
  ]
}

// Extract structured data from receipt text
export function analyzeReceiptText(ocrText: string): OCRAnalysisResult {
  const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  const result: OCRAnalysisResult = {
    extractedText: ocrText,
    categoryHints: [],
    confidence: 0
  }
  
  // Extract merchant name (usually first few lines)
  result.merchantName = extractMerchantName(lines)
  
  // Extract amount
  result.amount = extractAmount(ocrText)
  
  // Extract date
  result.date = extractDate(ocrText)
  
  // Analyze category hints
  result.categoryHints = extractCategoryHints(ocrText)
  
  // Calculate overall confidence
  result.confidence = calculateOCRConfidence(result)
  
  return result
}

// Extract merchant name from receipt
function extractMerchantName(lines: string[]): string | undefined {
  // Look for merchant name in first 3 lines
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i]
    
    // Skip lines that look like addresses or phone numbers
    if (line.match(/^\d+\s+\w+\s+(st|ave|rd|blvd|dr|ln)/i)) continue
    if (line.match(/^\(\d{3}\)\s*\d{3}-\d{4}/)) continue
    if (line.match(/^\d{3}-\d{3}-\d{4}/)) continue
    
    // Look for company-like names
    if (line.length > 3 && line.length < 50) {
      // Remove common receipt header words
      const cleaned = line.replace(/\b(receipt|invoice|bill|statement)\b/gi, '').trim()
      if (cleaned.length > 2) {
        return cleaned
      }
    }
  }
  
  return undefined
}

// Extract monetary amount from receipt
function extractAmount(text: string): number | undefined {
  // Look for total amount patterns
  const totalPatterns = [
    /total[:\s]*\$?(\d+\.?\d*)/i,
    /amount[:\s]*\$?(\d+\.?\d*)/i,
    /balance[:\s]*\$?(\d+\.?\d*)/i,
    /\$(\d+\.\d{2})/g
  ]
  
  for (const pattern of totalPatterns) {
    const match = text.match(pattern)
    if (match) {
      const amount = parseFloat(match[1])
      if (amount > 0 && amount < 100000) { // Reasonable range
        return Math.round(amount * 100) // Convert to cents
      }
    }
  }
  
  return undefined
}

// Extract date from receipt
function extractDate(text: string): Date | undefined {
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(\d{1,2}-\d{1,2}-\d{2,4})/,
    /(\w{3}\s+\d{1,2},?\s+\d{4})/i,
    /(\d{4}-\d{2}-\d{2})/
  ]
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      const date = new Date(match[1])
      if (!isNaN(date.getTime()) && date.getFullYear() > 2000) {
        return date
      }
    }
  }
  
  return undefined
}

// Extract category hints from receipt text
function extractCategoryHints(text: string): string[] {
  const hints: string[] = []
  const lowerText = text.toLowerCase()
  
  // Check merchant patterns
  for (const [merchant, category] of Object.entries(MERCHANT_CATEGORY_MAP)) {
    if (lowerText.includes(merchant)) {
      hints.push(category)
    }
  }
  
  // Check receipt patterns
  for (const [category, patterns] of Object.entries(RECEIPT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        hints.push(category)
        break // Only add category once per pattern group
      }
    }
  }
  
  // Remove duplicates
  return Array.from(new Set(hints))
}

// Calculate confidence score for OCR analysis
function calculateOCRConfidence(result: OCRAnalysisResult): number {
  let confidence = 0.1 // Base confidence
  
  // Boost confidence based on extracted data
  if (result.merchantName) confidence += 0.3
  if (result.amount) confidence += 0.2
  if (result.date) confidence += 0.2
  if (result.categoryHints.length > 0) confidence += 0.3
  
  // Boost confidence based on text quality
  const textLength = result.extractedText.length
  if (textLength > 50) confidence += 0.1
  if (textLength > 200) confidence += 0.1
  
  // Check for clear structure (lines, formatting)
  const lines = result.extractedText.split('\n').filter(line => line.trim().length > 0)
  if (lines.length > 3) confidence += 0.1
  
  return Math.min(0.95, confidence)
}

// Extract line items from receipt for detailed categorization
export function extractLineItems(ocrText: string): ReceiptField[] {
  const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  const fields: ReceiptField[] = []
  
  for (const line of lines) {
    // Look for item lines with prices
    const itemMatch = line.match(/^(.+?)\s+\$?(\d+\.?\d*)$/i)
    if (itemMatch) {
      const [, itemName, price] = itemMatch
      
      fields.push({
        field: 'item',
        value: itemName.trim(),
        confidence: 0.8
      })
      
      fields.push({
        field: 'amount',
        value: price,
        confidence: 0.9
      })
    }
    
    // Look for category-specific keywords in items
    const categoryHints = extractCategoryHints(line)
    if (categoryHints.length > 0) {
      fields.push({
        field: 'category',
        value: categoryHints[0],
        confidence: 0.7
      })
    }
  }
  
  return fields
}

// Process receipt image (placeholder for actual OCR integration)
export async function processReceiptImage(imageUrl: string): Promise<OCRAnalysisResult> {
  try {
    // This would integrate with an OCR service like Google Vision API, AWS Textract, etc.
    // For now, return a mock result
    console.log(`Processing receipt image: ${imageUrl}`)
    
    // Placeholder implementation
    return {
      extractedText: 'Mock OCR text from receipt',
      merchantName: 'Sample Merchant',
      amount: 2500, // $25.00 in cents
      date: new Date(),
      categoryHints: ['supplies'],
      confidence: 0.8
    }
  } catch (error) {
    console.error('Error processing receipt image:', error)
    return {
      extractedText: '',
      categoryHints: [],
      confidence: 0
    }
  }
}

// Validate OCR results against known patterns
export function validateOCRResults(result: OCRAnalysisResult): {
  isValid: boolean
  issues: string[]
  suggestions: string[]
} {
  const issues: string[] = []
  const suggestions: string[] = []
  
  // Validate merchant name
  if (!result.merchantName || result.merchantName.length < 2) {
    issues.push('Merchant name not detected or too short')
    suggestions.push('Check if receipt image is clear and merchant name is visible')
  }
  
  // Validate amount
  if (!result.amount || result.amount <= 0) {
    issues.push('Amount not detected or invalid')
    suggestions.push('Ensure total amount is clearly visible in the receipt')
  } else if (result.amount > 1000000) { // $10,000
    issues.push('Amount seems unusually high')
    suggestions.push('Verify the amount is correct')
  }
  
  // Validate date
  if (!result.date) {
    issues.push('Date not detected')
    suggestions.push('Check if receipt date is clearly visible')
  } else {
    const daysDiff = Math.abs(Date.now() - result.date.getTime()) / (1000 * 60 * 60 * 24)
    if (daysDiff > 365) {
      issues.push('Receipt date is more than a year old')
      suggestions.push('Verify the receipt date is correct')
    }
  }
  
  // Validate category hints
  if (result.categoryHints.length === 0) {
    issues.push('No category hints detected')
    suggestions.push('Receipt content may not match common expense categories')
  }
  
  // Validate confidence
  if (result.confidence < 0.5) {
    issues.push('Low confidence in OCR results')
    suggestions.push('Consider retaking the receipt photo with better lighting and focus')
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  }
}
