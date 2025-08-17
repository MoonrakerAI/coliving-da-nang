// OCR Analysis for receipt processing
export interface OCRAnalysisResult {
  extractedText: string
  merchantName?: string
  totalAmount?: number
  items: Array<{
    description: string
    amount: number
    category?: string
  }>
  confidence: number
  metadata: {
    imageUrl: string
    processedAt: Date
    ocrEngine: string
  }
}

export interface ReceiptData {
  merchantName: string
  totalAmount: number
  date?: Date
  items: Array<{
    name: string
    price: number
    quantity?: number
  }>
  taxAmount?: number
  paymentMethod?: string
}

// Mock OCR analyzer for development
export async function processReceiptImage(imageUrl: string): Promise<OCRAnalysisResult> {
  // Simulate OCR processing delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Mock OCR results based on common receipt patterns
  const mockResults: OCRAnalysisResult = {
    extractedText: `
      Big C Supermarket
      Receipt #12345
      Date: ${new Date().toLocaleDateString()}
      
      Toilet Paper       $5.99
      Cleaning Supplies  $12.50
      Light Bulbs        $8.25
      
      Subtotal:         $26.74
      Tax:              $2.67
      Total:            $29.41
      
      Thank you for shopping!
    `,
    merchantName: 'Big C Supermarket',
    totalAmount: 29.41,
    items: [
      { description: 'Toilet Paper', amount: 5.99, category: 'Supplies' },
      { description: 'Cleaning Supplies', amount: 12.50, category: 'Cleaning' },
      { description: 'Light Bulbs', amount: 8.25, category: 'Maintenance' }
    ],
    confidence: 0.85,
    metadata: {
      imageUrl,
      processedAt: new Date(),
      ocrEngine: 'mock-ocr-v1'
    }
  }
  
  return mockResults
}

export async function extractReceiptData(imageUrl: string): Promise<ReceiptData> {
  const ocrResult = await processReceiptImage(imageUrl)
  
  return {
    merchantName: ocrResult.merchantName || 'Unknown Merchant',
    totalAmount: ocrResult.totalAmount || 0,
    date: new Date(),
    items: ocrResult.items.map(item => ({
      name: item.description,
      price: item.amount,
      quantity: 1
    })),
    taxAmount: ocrResult.totalAmount ? ocrResult.totalAmount * 0.1 : 0,
    paymentMethod: 'Cash'
  }
}

export async function validateReceiptData(data: ReceiptData): Promise<{
  isValid: boolean
  errors: string[]
  suggestions: string[]
}> {
  const errors: string[] = []
  const suggestions: string[] = []
  
  if (!data.merchantName || data.merchantName === 'Unknown Merchant') {
    errors.push('Merchant name could not be detected')
    suggestions.push('Please verify the merchant name manually')
  }
  
  if (data.totalAmount <= 0) {
    errors.push('Total amount is invalid')
    suggestions.push('Please check the receipt total')
  }
  
  if (data.items.length === 0) {
    errors.push('No items detected on receipt')
    suggestions.push('Please add items manually or try a clearer image')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    suggestions
  }
}
