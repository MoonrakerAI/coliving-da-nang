import { getExpenses } from '../db/operations/expenses'
import { getCategorySuggestions } from '../db/operations/expense-categories'

// Machine Learning categorization engine
export interface CategorySuggestion {
  categoryId: string
  subcategoryId?: string
  confidence: number
  reason: 'merchant' | 'ocr' | 'pattern' | 'manual' | 'ml'
  suggestions: string[]
}

export interface MLTrainingData {
  text: string
  categoryId: string
  subcategoryId?: string
  confidence: number
}

// Enhanced merchant pattern recognition
const MERCHANT_PATTERNS = {
  // Utilities
  utilities: {
    electricity: [
      'electric', 'power', 'energy', 'pge', 'edison', 'duke energy', 'xcel energy',
      'dominion', 'entergy', 'firstenergy', 'nextera', 'american electric'
    ],
    water: [
      'water', 'sewer', 'waste management', 'republic services', 'waste connections',
      'water district', 'municipal water', 'city water'
    ],
    gas: [
      'gas', 'natural gas', 'propane', 'centerpoint', 'national grid', 'peoples gas',
      'southern company gas', 'atmos energy'
    ],
    internet: [
      'internet', 'wifi', 'broadband', 'comcast', 'xfinity', 'verizon', 'att',
      'spectrum', 'cox', 'optimum', 'frontier', 'centurylink'
    ],
    cable: [
      'cable', 'tv', 'directv', 'dish', 'satellite', 'streaming', 'netflix',
      'hulu', 'amazon prime'
    ]
  },
  
  // Repairs
  repairs: {
    plumbing: [
      'plumber', 'plumbing', 'pipe', 'leak', 'drain', 'faucet', 'toilet',
      'water heater', 'sewer', 'rooter', 'roto-rooter'
    ],
    electrical: [
      'electrician', 'electrical', 'wiring', 'outlet', 'breaker', 'panel',
      'light fixture', 'switch', 'electrical repair'
    ],
    hvac: [
      'hvac', 'heating', 'cooling', 'air conditioning', 'furnace', 'ac repair',
      'duct', 'ventilation', 'thermostat', 'carrier', 'trane', 'lennox'
    ],
    appliance: [
      'appliance', 'refrigerator', 'washer', 'dryer', 'dishwasher', 'oven',
      'stove', 'microwave', 'repair service'
    ]
  },
  
  // Supplies
  supplies: {
    hardware: [
      'home depot', 'lowes', 'menards', 'ace hardware', 'hardware store',
      'lumber', 'screws', 'nails', 'tools'
    ],
    office: [
      'office depot', 'staples', 'best buy', 'amazon', 'office supplies',
      'paper', 'ink', 'printer'
    ],
    cleaning: [
      'cleaning supplies', 'detergent', 'bleach', 'disinfectant', 'paper towels',
      'toilet paper', 'costco', 'sams club', 'walmart'
    ]
  },
  
  // Cleaning Services
  cleaning: {
    'regular-cleaning': [
      'maid', 'cleaning service', 'housekeeping', 'molly maid', 'merry maids',
      'cleaning lady', 'janitorial'
    ],
    'deep-cleaning': [
      'deep clean', 'move out clean', 'post construction', 'carpet clean',
      'steam clean'
    ],
    'pest-control': [
      'pest control', 'exterminator', 'termite', 'ant', 'roach', 'orkin',
      'terminix', 'pest management'
    ]
  },
  
  // Maintenance
  maintenance: {
    landscaping: [
      'landscaping', 'lawn care', 'mowing', 'gardening', 'tree service',
      'irrigation', 'sprinkler', 'fertilizer'
    ],
    painting: [
      'paint', 'painting', 'painter', 'sherwin williams', 'benjamin moore',
      'home depot paint'
    ],
    security: [
      'security', 'alarm', 'camera', 'adt', 'vivint', 'ring', 'nest',
      'surveillance'
    ]
  }
}

// OCR text analysis patterns
const OCR_PATTERNS = {
  // Common receipt text patterns
  utilities: [
    'electric bill', 'power bill', 'utility bill', 'water bill', 'gas bill',
    'internet service', 'cable service'
  ],
  repairs: [
    'repair service', 'service call', 'labor charge', 'parts and labor',
    'emergency repair', 'maintenance fee'
  ],
  supplies: [
    'hardware store', 'building supplies', 'office supplies', 'cleaning supplies',
    'tools and equipment'
  ],
  cleaning: [
    'cleaning service', 'housekeeping', 'janitorial service', 'maid service'
  ],
  maintenance: [
    'lawn service', 'landscaping', 'painting service', 'maintenance contract'
  ]
}

// Get ML training data from historical expenses
export async function getTrainingData(propertyId: string): Promise<MLTrainingData[]> {
  try {
    const expenses = await getExpenses({ propertyId })
    const trainingData: MLTrainingData[] = []
    
    for (const expense of expenses) {
      if (expense.categorySelection && !expense.categorySelection.isAutoSuggested) {
        // Only use manually categorized expenses for training
        const text = `${expense.description} ${expense.receiptPhotos.join(' ')}`.toLowerCase()
        
        trainingData.push({
          text,
          categoryId: expense.categorySelection.categoryId,
          subcategoryId: expense.categorySelection.subcategoryId,
          confidence: expense.categorySelection.confidence || 1.0
        })
      }
    }
    
    return trainingData
  } catch (error) {
    console.error('Error getting training data:', error)
    return []
  }
}

// Enhanced pattern matching with confidence scoring
export function analyzeTextPatterns(text: string): CategorySuggestion[] {
  const suggestions: CategorySuggestion[] = []
  const lowerText = text.toLowerCase()
  
  // Check merchant patterns
  for (const [categoryId, subcategories] of Object.entries(MERCHANT_PATTERNS)) {
    for (const [subcategoryId, keywords] of Object.entries(subcategories)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          const confidence = calculatePatternConfidence(keyword, lowerText)
          suggestions.push({
            categoryId,
            subcategoryId,
            confidence,
            reason: 'merchant',
            suggestions: [keyword]
          })
        }
      }
    }
  }
  
  // Check OCR patterns
  for (const [categoryId, patterns] of Object.entries(OCR_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerText.includes(pattern)) {
        const confidence = calculatePatternConfidence(pattern, lowerText)
        suggestions.push({
          categoryId,
          confidence,
          reason: 'ocr',
          suggestions: [pattern]
        })
      }
    }
  }
  
  // Remove duplicates and sort by confidence
  const uniqueSuggestions = suggestions.reduce((acc, current) => {
    const existing = acc.find(s => 
      s.categoryId === current.categoryId && 
      s.subcategoryId === current.subcategoryId
    )
    
    if (!existing || current.confidence > existing.confidence) {
      return [
        ...acc.filter(s => !(s.categoryId === current.categoryId && s.subcategoryId === current.subcategoryId)),
        current
      ]
    }
    return acc
  }, [] as CategorySuggestion[])
  
  return uniqueSuggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5)
}

// Calculate confidence based on pattern matching
function calculatePatternConfidence(keyword: string, text: string): number {
  const keywordLength = keyword.length
  const textLength = text.length
  
  // Base confidence based on keyword specificity
  let confidence = Math.min(0.9, keywordLength / 20)
  
  // Boost confidence for exact matches
  if (text === keyword) {
    confidence = 0.95
  }
  
  // Boost confidence for words at the beginning
  if (text.startsWith(keyword)) {
    confidence += 0.1
  }
  
  // Reduce confidence for very long text (less specific)
  if (textLength > 100) {
    confidence *= 0.8
  }
  
  return Math.max(0.1, Math.min(0.95, confidence))
}

// Historical pattern learning
export async function learnFromHistoricalPatterns(propertyId: string): Promise<Map<string, CategorySuggestion>> {
  try {
    const trainingData = await getTrainingData(propertyId)
    const patterns = new Map<string, CategorySuggestion>()
    
    // Group by similar text patterns
    const textGroups = new Map<string, MLTrainingData[]>()
    
    for (const data of trainingData) {
      // Extract key words from text
      const keywords = extractKeywords(data.text)
      const keywordKey = keywords.join(' ')
      
      if (!textGroups.has(keywordKey)) {
        textGroups.set(keywordKey, [])
      }
      textGroups.get(keywordKey)!.push(data)
    }
    
    // Create patterns from groups
    for (const [keywords, group] of Array.from(textGroups)) {
      if (group.length >= 2) { // Need at least 2 examples to create a pattern
        const categoryCount = new Map<string, number>()
        
        for (const item of group) {
          const key = `${item.categoryId}:${item.subcategoryId || ''}`
          categoryCount.set(key, (categoryCount.get(key) || 0) + 1)
        }
        
        // Find most common category for this pattern
        const mostCommon = Array.from(categoryCount.entries())
          .sort((a, b) => b[1] - a[1])[0]
        
        if (mostCommon) {
          const [categoryKey, count] = mostCommon
          const [categoryId, subcategoryId] = categoryKey.split(':')
          const confidence = Math.min(0.9, count / group.length)
          
          patterns.set(keywords, {
            categoryId,
            subcategoryId: subcategoryId || undefined,
            confidence,
            reason: 'pattern',
            suggestions: keywords.split(' ')
          })
        }
      }
    }
    
    return patterns
  } catch (error) {
    console.error('Error learning from historical patterns:', error)
    return new Map()
  }
}

// Extract meaningful keywords from text
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'among', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
    'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can'
  ])
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10) // Limit to top 10 keywords
}

// Main ML categorization function
export async function getMLCategorySuggestions(
  merchantName: string,
  description: string,
  receiptText: string,
  propertyId: string
): Promise<CategorySuggestion[]> {
  try {
    const combinedText = `${merchantName} ${description} ${receiptText}`.trim()
    
    // Get pattern-based suggestions
    const patternSuggestions = analyzeTextPatterns(combinedText)
    
    // Get historical pattern suggestions
    const historicalPatterns = await learnFromHistoricalPatterns(propertyId)
    const keywords = extractKeywords(combinedText)
    const historicalSuggestions: CategorySuggestion[] = []
    
    for (const [patternKeywords, suggestion] of Array.from(historicalPatterns)) {
      const overlap = keywords.filter(k => patternKeywords.includes(k)).length
      if (overlap > 0) {
        const confidence = Math.min(0.8, (overlap / keywords.length) * suggestion.confidence)
        historicalSuggestions.push({
          ...suggestion,
          confidence,
          reason: 'pattern'
        })
      }
    }
    
    // Combine and deduplicate suggestions
    const allSuggestions = [...patternSuggestions, ...historicalSuggestions]
    const uniqueSuggestions = allSuggestions.reduce((acc, current) => {
      const existing = acc.find(s => 
        s.categoryId === current.categoryId && 
        s.subcategoryId === current.subcategoryId
      )
      
      if (!existing || current.confidence > existing.confidence) {
        return [
          ...acc.filter(s => !(s.categoryId === current.categoryId && s.subcategoryId === current.subcategoryId)),
          current
        ]
      }
      return acc
    }, [] as CategorySuggestion[])
    
    return uniqueSuggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3) // Return top 3 suggestions
  } catch (error) {
    console.error('Error getting ML category suggestions:', error)
    return []
  }
}

// User feedback learning
export async function learnFromUserFeedback(
  originalSuggestions: CategorySuggestion[],
  userSelection: { categoryId: string; subcategoryId?: string },
  text: string,
  propertyId: string
): Promise<void> {
  try {
    const feedbackKey = `ml-feedback:${propertyId}`
    const feedbackId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const feedback = {
      id: feedbackId,
      text: text.toLowerCase(),
      originalSuggestions,
      userSelection,
      timestamp: new Date().toISOString(),
      keywords: extractKeywords(text)
    }
    
    // Store feedback for future learning (placeholder - implement with actual database)
    console.log(`Storing feedback: ${feedbackId}`, feedback)
    
    // Update pattern confidence based on feedback
    const wasCorrect = originalSuggestions.some(s => 
      s.categoryId === userSelection.categoryId && 
      s.subcategoryId === userSelection.subcategoryId
    )
    
    if (wasCorrect) {
      // Boost confidence for correct patterns
      console.log('ML suggestion was correct, boosting pattern confidence')
    } else {
      // Learn from incorrect suggestions
      console.log('ML suggestion was incorrect, learning from user correction')
    }
  } catch (error) {
    console.error('Error learning from user feedback:', error)
  }
}

// Get categorization accuracy metrics
export async function getCategorationAccuracy(propertyId: string): Promise<{
  totalSuggestions: number
  correctSuggestions: number
  accuracy: number
  confidence: number
}> {
  try {
    // Placeholder - implement with actual database
    console.log(`Getting ML performance metrics for property: ${propertyId}`)
    
    return {
      totalSuggestions: 0,
      correctSuggestions: 0,
      accuracy: 0,
      confidence: 0.5
    }
  } catch (error) {
    console.error('Error calculating categorization accuracy:', error)
    return {
      totalSuggestions: 0,
      correctSuggestions: 0,
      accuracy: 0,
      confidence: 0.5
    }
  }
}
