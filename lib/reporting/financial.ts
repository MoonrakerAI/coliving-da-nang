import { kv } from '@vercel/kv';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format, parseISO, differenceInDays } from 'date-fns';

export interface FinancialReport {
  period: {
    start: Date;
    end: Date;
    type: 'monthly' | 'quarterly' | 'yearly';
  };
  income: {
    totalRevenue: number;
    rentRevenue: number;
    otherRevenue: number;
    paymentMethodBreakdown: PaymentMethodTotal[];
  };
  expenses: {
    totalExpenses: number;
    categoryBreakdown: ExpenseCategoryTotal[];
    reimbursements: number;
    operatingExpenses: number;
  };
  netIncome: number;
  profitMargin: number;
  cashFlow: CashFlowData[];
  comparison?: {
    previousPeriod: FinancialReport;
    growth: {
      revenue: number;
      expenses: number;
      netIncome: number;
    };
  };
}

export interface PaymentMethodTotal {
  method: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface ExpenseCategoryTotal {
  category: string;
  amount: number;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CashFlowData {
  date: string;
  income: number;
  expenses: number;
  netFlow: number;
  cumulativeFlow: number;
}

export interface ProfitLossStatement {
  period: {
    start: Date;
    end: Date;
  };
  revenue: {
    rentIncome: number;
    otherIncome: number;
    totalRevenue: number;
  };
  expenses: {
    operatingExpenses: ExpenseCategoryTotal[];
    totalOperatingExpenses: number;
    depreciation: number;
    totalExpenses: number;
  };
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  margins: {
    gross: number;
    operating: number;
    net: number;
  };
  breakdown: Array<{
    period: string;
    revenue: number;
    expenses: number;
    netIncome: number;
  }>;
}

export interface CashFlowAnalysis {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalInflow: number;
    totalOutflow: number;
    netCashFlow: number;
    averageMonthlyFlow: number;
  };
  monthlyData: CashFlowData[];
  trends: {
    inflowTrend: 'increasing' | 'decreasing' | 'stable';
    outflowTrend: 'increasing' | 'decreasing' | 'stable';
    netFlowTrend: 'improving' | 'declining' | 'stable';
  };
  forecast?: CashFlowData[];
}

export async function generateFinancialReport(params: {
  userId: string;
  propertyId?: string;
  startDate: string;
  endDate: string;
  reportType: 'monthly' | 'quarterly' | 'yearly';
  includeComparison: boolean;
}): Promise<FinancialReport> {
  const { userId, propertyId, startDate, endDate, reportType, includeComparison } = params;
  
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  // Fetch payments and expenses data
  const [payments, expenses] = await Promise.all([
    fetchPaymentsData(userId, propertyId, start, end),
    fetchExpensesData(userId, propertyId, start, end),
  ]);

  // Calculate income metrics
  const income = calculateIncomeMetrics(payments);
  
  // Calculate expense metrics
  const expenseMetrics = calculateExpenseMetrics(expenses);
  
  // Calculate net income and profit margin
  const netIncome = income.totalRevenue - expenseMetrics.totalExpenses;
  const profitMargin = income.totalRevenue > 0 ? (netIncome / income.totalRevenue) * 100 : 0;
  
  // Generate cash flow data
  const cashFlow = generateCashFlowData(payments, expenses, start, end);

  let comparison;
  if (includeComparison) {
    const previousPeriod = getPreviousPeriod(start, end, reportType);
    const previousReport = await generateFinancialReport({
      ...params,
      startDate: previousPeriod.start.toISOString(),
      endDate: previousPeriod.end.toISOString(),
      includeComparison: false,
    });

    comparison = {
      previousPeriod: previousReport,
      growth: {
        revenue: calculateGrowthRate(previousReport.income.totalRevenue, income.totalRevenue),
        expenses: calculateGrowthRate(previousReport.expenses.totalExpenses, expenseMetrics.totalExpenses),
        netIncome: calculateGrowthRate(previousReport.netIncome, netIncome),
      },
    };
  }

  return {
    period: {
      start,
      end,
      type: reportType,
    },
    income,
    expenses: expenseMetrics,
    netIncome,
    profitMargin,
    cashFlow,
    comparison,
  };
}

export async function generateProfitLossStatement(params: {
  userId: string;
  propertyId?: string;
  startDate: string;
  endDate: string;
  includeDetails: boolean;
  groupBy: 'month' | 'quarter' | 'year';
}): Promise<ProfitLossStatement> {
  const { userId, propertyId, startDate, endDate, includeDetails, groupBy } = params;
  
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  const [payments, expenses] = await Promise.all([
    fetchPaymentsData(userId, propertyId, start, end),
    fetchExpensesData(userId, propertyId, start, end),
  ]);

  const revenue = {
    rentIncome: payments.filter(p => p.type === 'rent').reduce((sum, p) => sum + p.amount, 0),
    otherIncome: payments.filter(p => p.type !== 'rent').reduce((sum, p) => sum + p.amount, 0),
    totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
  };

  const operatingExpenses = calculateExpenseCategories(expenses);
  const totalOperatingExpenses = operatingExpenses.reduce((sum, cat) => sum + cat.amount, 0);
  const depreciation = calculateDepreciation(userId, propertyId, start, end);
  const totalExpenses = totalOperatingExpenses + depreciation;

  const grossProfit = revenue.totalRevenue - totalOperatingExpenses;
  const operatingIncome = grossProfit - depreciation;
  const netIncome = operatingIncome;

  const margins = {
    gross: revenue.totalRevenue > 0 ? (grossProfit / revenue.totalRevenue) * 100 : 0,
    operating: revenue.totalRevenue > 0 ? (operatingIncome / revenue.totalRevenue) * 100 : 0,
    net: revenue.totalRevenue > 0 ? (netIncome / revenue.totalRevenue) * 100 : 0,
  };

  const breakdown = generatePeriodBreakdown(payments, expenses, start, end, groupBy);

  return {
    period: { start, end },
    revenue,
    expenses: {
      operatingExpenses,
      totalOperatingExpenses,
      depreciation,
      totalExpenses,
    },
    grossProfit,
    operatingIncome,
    netIncome,
    margins,
    breakdown,
  };
}

export async function generateCashFlowAnalysis(params: {
  userId: string;
  propertyId?: string;
  startDate: string;
  endDate: string;
  granularity: 'daily' | 'weekly' | 'monthly';
  includeForecast: boolean;
}): Promise<CashFlowAnalysis> {
  const { userId, propertyId, startDate, endDate, granularity, includeForecast } = params;
  
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  const [payments, expenses] = await Promise.all([
    fetchPaymentsData(userId, propertyId, start, end),
    fetchExpensesData(userId, propertyId, start, end),
  ]);

  const monthlyData = generateCashFlowData(payments, expenses, start, end);
  
  const summary = {
    totalInflow: monthlyData.reduce((sum, data) => sum + data.income, 0),
    totalOutflow: monthlyData.reduce((sum, data) => sum + data.expenses, 0),
    netCashFlow: monthlyData.reduce((sum, data) => sum + data.netFlow, 0),
    averageMonthlyFlow: monthlyData.length > 0 ? monthlyData.reduce((sum, data) => sum + data.netFlow, 0) / monthlyData.length : 0,
  };

  const trends = calculateCashFlowTrends(monthlyData);

  let forecast;
  if (includeForecast) {
    forecast = generateCashFlowForecast(monthlyData, 6); // 6 months forecast
  }

  return {
    period: { start, end },
    summary,
    monthlyData,
    trends,
    forecast,
  };
}

// Helper functions
async function fetchPaymentsData(userId: string, propertyId: string | undefined, start: Date, end: Date) {
  const key = propertyId ? `payments:${propertyId}` : `user:${userId}:payments`;
  const payments = await kv.lrange(key, 0, -1) as any[];
  
  return payments.filter(payment => {
    const paymentDate = new Date(payment.date);
    return paymentDate >= start && paymentDate <= end && payment.status === 'completed';
  });
}

async function fetchExpensesData(userId: string, propertyId: string | undefined, start: Date, end: Date) {
  const key = propertyId ? `expenses:${propertyId}` : `user:${userId}:expenses`;
  const expenses = await kv.lrange(key, 0, -1) as any[];
  
  return expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return expenseDate >= start && expenseDate <= end;
  });
}

function calculateIncomeMetrics(payments: any[]): FinancialReport['income'] {
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const rentRevenue = payments.filter(p => p.type === 'rent').reduce((sum, p) => sum + p.amount, 0);
  const otherRevenue = totalRevenue - rentRevenue;

  const paymentMethodBreakdown = calculatePaymentMethodBreakdown(payments, totalRevenue);

  return {
    totalRevenue,
    rentRevenue,
    otherRevenue,
    paymentMethodBreakdown,
  };
}

function calculateExpenseMetrics(expenses: any[]): FinancialReport['expenses'] {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const reimbursements = expenses.filter(e => e.isReimbursable).reduce((sum, e) => sum + e.amount, 0);
  const operatingExpenses = totalExpenses - reimbursements;

  const categoryBreakdown = calculateExpenseCategories(expenses);

  return {
    totalExpenses,
    categoryBreakdown,
    reimbursements,
    operatingExpenses,
  };
}

function calculatePaymentMethodBreakdown(payments: any[], totalRevenue: number): PaymentMethodTotal[] {
  const methodTotals = payments.reduce((acc, payment) => {
    const method = payment.paymentMethod || 'unknown';
    if (!acc[method]) {
      acc[method] = { amount: 0, count: 0 };
    }
    acc[method].amount += payment.amount;
    acc[method].count += 1;
    return acc;
  }, {} as Record<string, { amount: number; count: number }>);

  return Object.entries(methodTotals).map(([method, data]) => ({
    method,
    amount: data.amount,
    count: data.count,
    percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0,
  }));
}

function calculateExpenseCategories(expenses: any[]): ExpenseCategoryTotal[] {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  const categoryTotals = expenses.reduce((acc, expense) => {
    const category = expense.category || 'uncategorized';
    if (!acc[category]) {
      acc[category] = { amount: 0, count: 0 };
    }
    acc[category].amount += expense.amount;
    acc[category].count += 1;
    return acc;
  }, {} as Record<string, { amount: number; count: number }>);

  return Object.entries(categoryTotals).map(([category, data]) => ({
    category,
    amount: data.amount,
    count: data.count,
    percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
    trend: 'stable' as const, // TODO: Calculate actual trend
  }));
}

function generateCashFlowData(payments: any[], expenses: any[], start: Date, end: Date): CashFlowData[] {
  const monthlyData: CashFlowData[] = [];
  let cumulativeFlow = 0;
  
  let current = startOfMonth(start);
  const endDate = endOfMonth(end);

  while (current <= endDate) {
    const monthStart = startOfMonth(current);
    const monthEnd = endOfMonth(current);
    
    const monthPayments = payments.filter(p => {
      const date = new Date(p.date);
      return date >= monthStart && date <= monthEnd;
    });
    
    const monthExpenses = expenses.filter(e => {
      const date = new Date(e.date);
      return date >= monthStart && date <= monthEnd;
    });
    
    const income = monthPayments.reduce((sum, p) => sum + p.amount, 0);
    const expenseAmount = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netFlow = income - expenseAmount;
    cumulativeFlow += netFlow;
    
    monthlyData.push({
      date: format(current, 'yyyy-MM'),
      income,
      expenses: expenseAmount,
      netFlow,
      cumulativeFlow,
    });
    
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }
  
  return monthlyData;
}

function getPreviousPeriod(start: Date, end: Date, reportType: 'monthly' | 'quarterly' | 'yearly') {
  const diffDays = differenceInDays(end, start);
  
  return {
    start: new Date(start.getTime() - (diffDays + 1) * 24 * 60 * 60 * 1000),
    end: new Date(start.getTime() - 24 * 60 * 60 * 1000),
  };
}

function calculateGrowthRate(previous: number, current: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function calculateDepreciation(userId: string, propertyId: string | undefined, start: Date, end: Date): number {
  // TODO: Implement actual depreciation calculation based on property assets
  return 0;
}

function generatePeriodBreakdown(payments: any[], expenses: any[], start: Date, end: Date, groupBy: 'month' | 'quarter' | 'year') {
  // TODO: Implement period breakdown logic
  return [];
}

function calculateCashFlowTrends(monthlyData: CashFlowData[]) {
  if (monthlyData.length < 2) {
    return {
      inflowTrend: 'stable' as const,
      outflowTrend: 'stable' as const,
      netFlowTrend: 'stable' as const,
    };
  }

  const recentData = monthlyData.slice(-3);
  const earlierData = monthlyData.slice(0, 3);

  const avgRecentInflow = recentData.reduce((sum, d) => sum + d.income, 0) / recentData.length;
  const avgEarlierInflow = earlierData.reduce((sum, d) => sum + d.income, 0) / earlierData.length;
  
  const avgRecentOutflow = recentData.reduce((sum, d) => sum + d.expenses, 0) / recentData.length;
  const avgEarlierOutflow = earlierData.reduce((sum, d) => sum + d.expenses, 0) / earlierData.length;
  
  const avgRecentNetFlow = recentData.reduce((sum, d) => sum + d.netFlow, 0) / recentData.length;
  const avgEarlierNetFlow = earlierData.reduce((sum, d) => sum + d.netFlow, 0) / earlierData.length;

  return {
    inflowTrend: avgRecentInflow > avgEarlierInflow * 1.05 ? 'increasing' : 
                 avgRecentInflow < avgEarlierInflow * 0.95 ? 'decreasing' : 'stable',
    outflowTrend: avgRecentOutflow > avgEarlierOutflow * 1.05 ? 'increasing' : 
                  avgRecentOutflow < avgEarlierOutflow * 0.95 ? 'decreasing' : 'stable',
    netFlowTrend: avgRecentNetFlow > avgEarlierNetFlow * 1.05 ? 'improving' : 
                  avgRecentNetFlow < avgEarlierNetFlow * 0.95 ? 'declining' : 'stable',
  } as const;
}

function generateCashFlowForecast(historicalData: CashFlowData[], months: number): CashFlowData[] {
  if (historicalData.length < 2) return [];

  const forecast: CashFlowData[] = [];
  const recentData = historicalData.slice(-Math.min(6, historicalData.length));
  
  const avgIncome = recentData.reduce((sum, d) => sum + d.income, 0) / recentData.length;
  const avgExpenses = recentData.reduce((sum, d) => sum + d.expenses, 0) / recentData.length;
  
  let lastCumulativeFlow = historicalData[historicalData.length - 1].cumulativeFlow;
  const lastDate = new Date(historicalData[historicalData.length - 1].date + '-01');

  for (let i = 1; i <= months; i++) {
    const forecastDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + i, 1);
    const netFlow = avgIncome - avgExpenses;
    lastCumulativeFlow += netFlow;
    
    forecast.push({
      date: format(forecastDate, 'yyyy-MM'),
      income: avgIncome,
      expenses: avgExpenses,
      netFlow,
      cumulativeFlow: lastCumulativeFlow,
    });
  }

  return forecast;
}
