import { kv } from '@vercel/kv';
import { startOfYear, endOfYear, format, parseISO } from 'date-fns';

export interface TaxSummary {
  taxYear: number;
  period: {
    start: Date;
    end: Date;
  };
  income: {
    totalRentalIncome: number;
    otherIncome: number;
    totalIncome: number;
  };
  deductions: {
    operatingExpenses: TaxDeductionCategory[];
    depreciation: number;
    totalDeductions: number;
  };
  netRentalIncome: number;
  taxableIncome: number;
  receipts: ReceiptSummary[];
  recommendations: TaxRecommendation[];
  irsCategories: IRSCategoryMapping[];
}

export interface TaxDeductionCategory {
  category: string;
  irsCategory: string;
  amount: number;
  count: number;
  receiptsCount: number;
  deductible: boolean;
  description: string;
}

export interface ReceiptSummary {
  expenseId: string;
  date: Date;
  amount: number;
  category: string;
  description: string;
  receiptUrl?: string;
  deductible: boolean;
}

export interface TaxRecommendation {
  type: 'deduction' | 'documentation' | 'timing' | 'strategy';
  title: string;
  description: string;
  potentialSavings?: number;
  priority: 'high' | 'medium' | 'low';
}

export interface IRSCategoryMapping {
  businessCategory: string;
  irsScheduleE: string;
  description: string;
  requirements: string[];
}

// IRS Schedule E category mappings for rental property
const IRS_CATEGORY_MAPPINGS: IRSCategoryMapping[] = [
  {
    businessCategory: 'maintenance',
    irsScheduleE: 'Repairs and maintenance',
    description: 'Ordinary repairs that keep property in good operating condition',
    requirements: ['Must be ordinary and necessary', 'Cannot add value or extend life', 'Receipts required'],
  },
  {
    businessCategory: 'utilities',
    irsScheduleE: 'Utilities',
    description: 'Gas, electricity, water, trash, internet for rental property',
    requirements: ['Property-related only', 'Receipts or statements required'],
  },
  {
    businessCategory: 'insurance',
    irsScheduleE: 'Insurance',
    description: 'Property insurance, liability insurance',
    requirements: ['Property-related coverage', 'Policy documents required'],
  },
  {
    businessCategory: 'supplies',
    irsScheduleE: 'Other expenses',
    description: 'Cleaning supplies, small tools, office supplies',
    requirements: ['Business use only', 'Receipts required'],
  },
  {
    businessCategory: 'professional',
    irsScheduleE: 'Legal and other professional fees',
    description: 'Attorney fees, accounting fees, property management',
    requirements: ['Business-related services', 'Invoices required'],
  },
  {
    businessCategory: 'advertising',
    irsScheduleE: 'Advertising',
    description: 'Marketing costs to find tenants',
    requirements: ['Rental-related advertising', 'Receipts required'],
  },
  {
    businessCategory: 'travel',
    irsScheduleE: 'Travel',
    description: 'Travel expenses for property management',
    requirements: ['Business purpose', 'Mileage logs', 'Receipts for expenses'],
  },
];

export async function generateTaxSummary(params: {
  userId: string;
  propertyId?: string;
  taxYear: number;
  includeReceipts: boolean;
  format: 'summary' | 'detailed' | 'irs-ready';
}): Promise<TaxSummary> {
  const { userId, propertyId, taxYear, includeReceipts, format } = params;
  
  const start = startOfYear(new Date(taxYear, 0, 1));
  const end = endOfYear(new Date(taxYear, 11, 31));

  // Fetch financial data for the tax year
  const [payments, expenses] = await Promise.all([
    fetchTaxYearPayments(userId, propertyId, start, end),
    fetchTaxYearExpenses(userId, propertyId, start, end),
  ]);

  // Calculate income
  const income = {
    totalRentalIncome: payments.filter(p => p.type === 'rent').reduce((sum, p) => sum + p.amount, 0),
    otherIncome: payments.filter(p => p.type !== 'rent').reduce((sum, p) => sum + p.amount, 0),
    totalIncome: payments.reduce((sum, p) => sum + p.amount, 0),
  };

  // Calculate deductions
  const operatingExpenses = calculateTaxDeductions(expenses);
  const depreciation = await calculatePropertyDepreciation(userId, propertyId, taxYear);
  const totalDeductions = operatingExpenses.reduce((sum, cat) => sum + cat.amount, 0) + depreciation;

  const netRentalIncome = income.totalIncome - totalDeductions;
  const taxableIncome = Math.max(0, netRentalIncome); // Cannot have negative taxable income from rentals

  // Generate receipts summary if requested
  let receipts: ReceiptSummary[] = [];
  if (includeReceipts) {
    receipts = await generateReceiptsSummary(expenses);
  }

  // Generate tax recommendations
  const recommendations = generateTaxRecommendations(income, operatingExpenses, depreciation, expenses);

  return {
    taxYear,
    period: { start, end },
    income,
    deductions: {
      operatingExpenses,
      depreciation,
      totalDeductions,
    },
    netRentalIncome,
    taxableIncome,
    receipts,
    recommendations,
    irsCategories: IRS_CATEGORY_MAPPINGS,
  };
}

async function fetchTaxYearPayments(userId: string, propertyId: string | undefined, start: Date, end: Date) {
  const key = propertyId ? `payments:${propertyId}` : `user:${userId}:payments`;
  const payments = await kv.lrange(key, 0, -1) as any[];
  
  return payments.filter(payment => {
    const paymentDate = new Date(payment.date);
    return paymentDate >= start && paymentDate <= end && payment.status === 'completed';
  });
}

async function fetchTaxYearExpenses(userId: string, propertyId: string | undefined, start: Date, end: Date) {
  const key = propertyId ? `expenses:${propertyId}` : `user:${userId}:expenses`;
  const expenses = await kv.lrange(key, 0, -1) as any[];
  
  return expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return expenseDate >= start && expenseDate <= end;
  });
}

function calculateTaxDeductions(expenses: any[]): TaxDeductionCategory[] {
  const categoryTotals = expenses.reduce((acc, expense) => {
    const category = expense.category || 'uncategorized';
    if (!acc[category]) {
      acc[category] = {
        amount: 0,
        count: 0,
        receiptsCount: 0,
        expenses: [],
      };
    }
    acc[category].amount += expense.amount;
    acc[category].count += 1;
    if (expense.receiptUrl) {
      acc[category].receiptsCount += 1;
    }
    acc[category].expenses.push(expense);
    return acc;
  }, {} as Record<string, any>);

  return Object.entries(categoryTotals).map(([category, data]) => {
    const irsMapping = IRS_CATEGORY_MAPPINGS.find(m => m.businessCategory === category);
    const isDeductible = isExpenseDeductible(category, data.expenses);
    
    return {
      category,
      irsCategory: irsMapping?.irsScheduleE || 'Other expenses',
      amount: data.amount,
      count: data.count,
      receiptsCount: data.receiptsCount,
      deductible: isDeductible,
      description: irsMapping?.description || `${category} expenses`,
    };
  });
}

function isExpenseDeductible(category: string, expenses: any[]): boolean {
  // Business logic to determine if expenses in this category are tax deductible
  const nonDeductibleCategories = ['personal', 'capital_improvement', 'loan_principal'];
  
  if (nonDeductibleCategories.includes(category)) {
    return false;
  }

  // Check if expenses have proper documentation
  const hasReceipts = expenses.some(e => e.receiptUrl);
  const hasBusinessPurpose = expenses.every(e => e.description && e.description.length > 5);
  
  return hasReceipts && hasBusinessPurpose;
}

async function calculatePropertyDepreciation(userId: string, propertyId: string | undefined, taxYear: number): Promise<number> {
  // Fetch property information for depreciation calculation
  const key = propertyId ? `property:${propertyId}` : `user:${userId}:properties`;
  
  try {
    const properties = propertyId 
      ? [await kv.get(key)]
      : await kv.lrange(key, 0, -1);
    
    let totalDepreciation = 0;
    
    for (const property of properties) {
      if (!property) continue;
      
      // Standard residential rental property depreciation: 27.5 years
      const depreciationPeriod = 27.5;
      const purchasePrice = property.purchasePrice || 0;
      const landValue = property.landValue || purchasePrice * 0.2; // Estimate 20% for land
      const depreciableBasis = purchasePrice - landValue;
      
      if (depreciableBasis > 0) {
        const annualDepreciation = depreciableBasis / depreciationPeriod;
        totalDepreciation += annualDepreciation;
      }
    }
    
    return totalDepreciation;
  } catch (error) {
    console.error('Error calculating depreciation:', error);
    return 0;
  }
}

async function generateReceiptsSummary(expenses: any[]): Promise<ReceiptSummary[]> {
  return expenses
    .filter(expense => expense.receiptUrl || expense.amount > 75) // IRS requires receipts for expenses over $75
    .map(expense => ({
      expenseId: expense.id,
      date: new Date(expense.date),
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      receiptUrl: expense.receiptUrl,
      deductible: isExpenseDeductible(expense.category, [expense]),
    }))
    .sort((a, b) => b.amount - a.amount); // Sort by amount descending
}

function generateTaxRecommendations(
  income: any,
  deductions: TaxDeductionCategory[],
  depreciation: number,
  expenses: any[]
): TaxRecommendation[] {
  const recommendations: TaxRecommendation[] = [];

  // Check for missing receipts
  const expensesWithoutReceipts = expenses.filter(e => !e.receiptUrl && e.amount > 75);
  if (expensesWithoutReceipts.length > 0) {
    const totalAtRisk = expensesWithoutReceipts.reduce((sum, e) => sum + e.amount, 0);
    recommendations.push({
      type: 'documentation',
      title: 'Missing Receipt Documentation',
      description: `${expensesWithoutReceipts.length} expenses over $75 lack receipt documentation. IRS requires receipts for audit protection.`,
      potentialSavings: totalAtRisk * 0.25, // Estimate 25% tax rate
      priority: 'high',
    });
  }

  // Check for potential deduction opportunities
  const maintenanceExpenses = deductions.find(d => d.category === 'maintenance');
  if (maintenanceExpenses && maintenanceExpenses.amount < income.totalRentalIncome * 0.05) {
    recommendations.push({
      type: 'deduction',
      title: 'Low Maintenance Deductions',
      description: 'Your maintenance expenses are unusually low. Consider if you\'re missing deductible repairs and maintenance.',
      priority: 'medium',
    });
  }

  // Depreciation optimization
  if (depreciation === 0 && income.totalRentalIncome > 0) {
    recommendations.push({
      type: 'deduction',
      title: 'Missing Depreciation Deduction',
      description: 'You may be eligible for depreciation deductions on your rental property. This is often the largest tax benefit for rental property owners.',
      potentialSavings: 5000, // Rough estimate
      priority: 'high',
    });
  }

  // Timing recommendations
  const q4Expenses = expenses.filter(e => {
    const month = new Date(e.date).getMonth();
    return month >= 9; // October, November, December
  });
  
  if (q4Expenses.length === 0 && income.totalRentalIncome > 20000) {
    recommendations.push({
      type: 'timing',
      title: 'Year-End Tax Planning',
      description: 'Consider accelerating deductible expenses before year-end to maximize current year deductions.',
      priority: 'medium',
    });
  }

  // Professional services recommendation
  const professionalExpenses = deductions.find(d => d.category === 'professional');
  if (!professionalExpenses && income.totalRentalIncome > 50000) {
    recommendations.push({
      type: 'strategy',
      title: 'Professional Tax Consultation',
      description: 'With significant rental income, professional tax advice could identify additional deductions and strategies.',
      potentialSavings: 2000,
      priority: 'medium',
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}
