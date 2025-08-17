// ML Engine for expense categorization
export interface CategoryPrediction {
  category: string
  confidence: number
  reasoning: string
}

export interface MLCategorySuggestion {
  category: string
  confidence: number
  source: 'ml' | 'rule' | 'history'
  reasoning: string
}

// Mock ML engine for development
export async function predictExpenseCategory(
  description: string,
  merchantName: string,
  amount: number,
  receiptText?: string
): Promise<CategoryPrediction[]> {
  // Simple rule-based categorization for development
  const predictions: CategoryPrediction[] = []
  
  const text = `${description} ${merchantName} ${receiptText || ''}`.toLowerCase()
  
  // Utilities
  if (text.includes('electric') || text.includes('water') || text.includes('gas') || text.includes('internet')) {
    predictions.push({
      category: 'Utilities',
      confidence: 0.9,
      reasoning: 'Contains utility-related keywords'
    })
  }
  
  // Repairs
  if (text.includes('repair') || text.includes('fix') || text.includes('maintenance') || text.includes('plumber')) {
    predictions.push({
      category: 'Repairs',
      confidence: 0.85,
      reasoning: 'Contains repair/maintenance keywords'
    })
  }
  
  // Supplies
  if (text.includes('supplies') || text.includes('office') || text.includes('cleaning') || text.includes('toilet paper')) {
    predictions.push({
      category: 'Supplies',
      confidence: 0.8,
      reasoning: 'Contains supply-related keywords'
    })
  }
  
  // Default to Other if no matches
  if (predictions.length === 0) {
    predictions.push({
      category: 'Other',
      confidence: 0.5,
      reasoning: 'No specific category patterns detected'
    })
  }
  
  return predictions.sort((a, b) => b.confidence - a.confidence)
}

export async function trainModel(expenses: Array<{ description: string, category: string }>): Promise<void> {
  // Mock training function for development
  console.log(`Training ML model with ${expenses.length} expenses`)
}
