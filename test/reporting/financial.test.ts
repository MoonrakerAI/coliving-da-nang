import { describe, it, expect, beforeEach, vi } from 'vitest';
import { kv } from '@vercel/kv';
import { 
  generateFinancialReport, 
  generateProfitLossStatement, 
  generateCashFlowAnalysis 
} from '@/lib/reporting/financial';

// Mock Vercel KV
vi.mock('@vercel/kv', () => ({
  kv: {
    lrange: vi.fn(),
    get: vi.fn(),
  },
}));

const mockPayments = [
  {
    id: '1',
    amount: 1500,
    date: '2024-01-15',
    type: 'rent',
    status: 'completed',
    paymentMethod: 'bank_transfer',
  },
  {
    id: '2',
    amount: 2000,
    date: '2024-02-15',
    type: 'rent',
    status: 'completed',
    paymentMethod: 'credit_card',
  },
  {
    id: '3',
    amount: 500,
    date: '2024-01-20',
    type: 'deposit',
    status: 'completed',
    paymentMethod: 'bank_transfer',
  },
];

const mockExpenses = [
  {
    id: '1',
    amount: 200,
    date: '2024-01-10',
    category: 'maintenance',
    description: 'Plumbing repair',
    isReimbursable: false,
    receiptUrl: 'https://example.com/receipt1.jpg',
  },
  {
    id: '2',
    amount: 150,
    date: '2024-02-05',
    category: 'utilities',
    description: 'Electricity bill',
    isReimbursable: false,
    receiptUrl: 'https://example.com/receipt2.jpg',
  },
  {
    id: '3',
    amount: 100,
    date: '2024-01-25',
    category: 'supplies',
    description: 'Cleaning supplies',
    isReimbursable: true,
  },
];

describe('Financial Reporting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(kv.lrange).mockResolvedValue([]);
  });

  describe('generateFinancialReport', () => {
    it('should generate a basic financial report', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockPayments)
        .mockResolvedValueOnce(mockExpenses);

      const report = await generateFinancialReport({
        userId: 'user1',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-02-28T23:59:59.999Z',
        reportType: 'monthly',
        includeComparison: false,
      });

      expect(report).toBeDefined();
      expect(report.income.totalRevenue).toBe(4000); // 1500 + 2000 + 500
      expect(report.income.rentRevenue).toBe(3500); // 1500 + 2000
      expect(report.income.otherRevenue).toBe(500); // deposit
      expect(report.expenses.totalExpenses).toBe(450); // 200 + 150 + 100
      expect(report.netIncome).toBe(3550); // 4000 - 450
      expect(report.profitMargin).toBeCloseTo(88.75); // (3550/4000) * 100
    });

    it('should calculate payment method breakdown correctly', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockPayments)
        .mockResolvedValueOnce(mockExpenses);

      const report = await generateFinancialReport({
        userId: 'user1',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-02-28T23:59:59.999Z',
        reportType: 'monthly',
        includeComparison: false,
      });

      const bankTransfer = report.income.paymentMethodBreakdown.find(
        method => method.method === 'bank_transfer'
      );
      const creditCard = report.income.paymentMethodBreakdown.find(
        method => method.method === 'credit_card'
      );

      expect(bankTransfer).toBeDefined();
      expect(bankTransfer?.amount).toBe(2000); // 1500 + 500
      expect(bankTransfer?.count).toBe(2);
      expect(bankTransfer?.percentage).toBe(50); // 2000/4000 * 100

      expect(creditCard).toBeDefined();
      expect(creditCard?.amount).toBe(2000);
      expect(creditCard?.count).toBe(1);
      expect(creditCard?.percentage).toBe(50);
    });

    it('should calculate expense category breakdown correctly', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockPayments)
        .mockResolvedValueOnce(mockExpenses);

      const report = await generateFinancialReport({
        userId: 'user1',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-02-28T23:59:59.999Z',
        reportType: 'monthly',
        includeComparison: false,
      });

      const maintenance = report.expenses.categoryBreakdown.find(
        cat => cat.category === 'maintenance'
      );
      const utilities = report.expenses.categoryBreakdown.find(
        cat => cat.category === 'utilities'
      );
      const supplies = report.expenses.categoryBreakdown.find(
        cat => cat.category === 'supplies'
      );

      expect(maintenance).toBeDefined();
      expect(maintenance?.amount).toBe(200);
      expect(maintenance?.percentage).toBeCloseTo(44.44); // 200/450 * 100

      expect(utilities).toBeDefined();
      expect(utilities?.amount).toBe(150);
      expect(utilities?.percentage).toBeCloseTo(33.33);

      expect(supplies).toBeDefined();
      expect(supplies?.amount).toBe(100);
      expect(supplies?.percentage).toBeCloseTo(22.22);
    });

    it('should generate cash flow data correctly', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockPayments)
        .mockResolvedValueOnce(mockExpenses);

      const report = await generateFinancialReport({
        userId: 'user1',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-02-28T23:59:59.999Z',
        reportType: 'monthly',
        includeComparison: false,
      });

      expect(report.cashFlow).toHaveLength(2); // January and February

      const january = report.cashFlow.find(flow => flow.date === '2024-01');
      const february = report.cashFlow.find(flow => flow.date === '2024-02');

      expect(january).toBeDefined();
      expect(january?.income).toBe(2000); // 1500 rent + 500 deposit
      expect(january?.expenses).toBe(300); // 200 maintenance + 100 supplies
      expect(january?.netFlow).toBe(1700);
      expect(january?.cumulativeFlow).toBe(1700);

      expect(february).toBeDefined();
      expect(february?.income).toBe(2000); // 2000 rent
      expect(february?.expenses).toBe(150); // 150 utilities
      expect(february?.netFlow).toBe(1850);
      expect(february?.cumulativeFlow).toBe(3550); // 1700 + 1850
    });

    it('should handle empty data gracefully', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const report = await generateFinancialReport({
        userId: 'user1',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z',
        reportType: 'monthly',
        includeComparison: false,
      });

      expect(report.income.totalRevenue).toBe(0);
      expect(report.expenses.totalExpenses).toBe(0);
      expect(report.netIncome).toBe(0);
      expect(report.profitMargin).toBe(0);
      expect(report.income.paymentMethodBreakdown).toHaveLength(0);
      expect(report.expenses.categoryBreakdown).toHaveLength(0);
    });

    it('should include comparison data when requested', async () => {
      // Mock current period data
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockPayments)
        .mockResolvedValueOnce(mockExpenses)
        // Mock previous period data (for comparison)
        .mockResolvedValueOnce([
          { ...mockPayments[0], amount: 1000, date: '2023-12-15' },
        ])
        .mockResolvedValueOnce([
          { ...mockExpenses[0], amount: 300, date: '2023-12-10' },
        ]);

      const report = await generateFinancialReport({
        userId: 'user1',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-02-28T23:59:59.999Z',
        reportType: 'monthly',
        includeComparison: true,
      });

      expect(report.comparison).toBeDefined();
      expect(report.comparison?.previousPeriod).toBeDefined();
      expect(report.comparison?.growth).toBeDefined();
      expect(report.comparison?.growth.revenue).toBeGreaterThan(0); // Should show growth
    });
  });

  describe('generateProfitLossStatement', () => {
    it('should generate a profit and loss statement', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockPayments)
        .mockResolvedValueOnce(mockExpenses);

      const statement = await generateProfitLossStatement({
        userId: 'user1',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-02-28T23:59:59.999Z',
        includeDetails: true,
        groupBy: 'month',
      });

      expect(statement).toBeDefined();
      expect(statement.revenue.rentIncome).toBe(3500);
      expect(statement.revenue.otherIncome).toBe(500);
      expect(statement.revenue.totalRevenue).toBe(4000);
      expect(statement.expenses.totalOperatingExpenses).toBe(450);
      expect(statement.grossProfit).toBe(3550);
      expect(statement.operatingIncome).toBe(3550); // No depreciation in mock
      expect(statement.netIncome).toBe(3550);
    });

    it('should calculate margins correctly', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockPayments)
        .mockResolvedValueOnce(mockExpenses);

      const statement = await generateProfitLossStatement({
        userId: 'user1',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-02-28T23:59:59.999Z',
        includeDetails: true,
        groupBy: 'month',
      });

      expect(statement.margins.gross).toBeCloseTo(88.75); // (3550/4000) * 100
      expect(statement.margins.operating).toBeCloseTo(88.75);
      expect(statement.margins.net).toBeCloseTo(88.75);
    });
  });

  describe('generateCashFlowAnalysis', () => {
    it('should generate cash flow analysis', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockPayments)
        .mockResolvedValueOnce(mockExpenses);

      const analysis = await generateCashFlowAnalysis({
        userId: 'user1',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-02-28T23:59:59.999Z',
        granularity: 'monthly',
        includeForecast: false,
      });

      expect(analysis).toBeDefined();
      expect(analysis.summary.totalInflow).toBe(4000);
      expect(analysis.summary.totalOutflow).toBe(450);
      expect(analysis.summary.netCashFlow).toBe(3550);
      expect(analysis.summary.averageMonthlyFlow).toBe(1775); // 3550 / 2 months
      expect(analysis.monthlyData).toHaveLength(2);
    });

    it('should calculate trends correctly', async () => {
      const trendPayments = [
        ...mockPayments,
        { ...mockPayments[0], id: '4', date: '2024-03-15', amount: 2500 },
        { ...mockPayments[1], id: '5', date: '2024-04-15', amount: 2500 },
      ];

      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(trendPayments)
        .mockResolvedValueOnce(mockExpenses);

      const analysis = await generateCashFlowAnalysis({
        userId: 'user1',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-04-30T23:59:59.999Z',
        granularity: 'monthly',
        includeForecast: false,
      });

      expect(analysis.trends).toBeDefined();
      expect(['increasing', 'decreasing', 'stable']).toContain(analysis.trends.inflowTrend);
      expect(['increasing', 'decreasing', 'stable']).toContain(analysis.trends.outflowTrend);
      expect(['improving', 'declining', 'stable']).toContain(analysis.trends.netFlowTrend);
    });

    it('should include forecast when requested', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockPayments)
        .mockResolvedValueOnce(mockExpenses);

      const analysis = await generateCashFlowAnalysis({
        userId: 'user1',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-02-28T23:59:59.999Z',
        granularity: 'monthly',
        includeForecast: true,
      });

      expect(analysis.forecast).toBeDefined();
      expect(analysis.forecast).toHaveLength(6); // 6 months forecast
      expect(analysis.forecast?.[0].date).toBe('2024-03');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle negative cash flow correctly', async () => {
      const highExpenses = [
        { ...mockExpenses[0], amount: 5000 }, // Very high expense
      ];

      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockPayments)
        .mockResolvedValueOnce(highExpenses);

      const report = await generateFinancialReport({
        userId: 'user1',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-02-28T23:59:59.999Z',
        reportType: 'monthly',
        includeComparison: false,
      });

      expect(report.netIncome).toBeLessThan(0);
      expect(report.profitMargin).toBeLessThan(0);
    });

    it('should filter out incomplete payments', async () => {
      const paymentsWithPending = [
        ...mockPayments,
        { ...mockPayments[0], id: '4', status: 'pending', amount: 1000 },
      ];

      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(paymentsWithPending)
        .mockResolvedValueOnce(mockExpenses);

      const report = await generateFinancialReport({
        userId: 'user1',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-02-28T23:59:59.999Z',
        reportType: 'monthly',
        includeComparison: false,
      });

      // Should not include the pending payment
      expect(report.income.totalRevenue).toBe(4000);
    });

    it('should handle date filtering correctly', async () => {
      const paymentsOutsideRange = [
        { ...mockPayments[0], date: '2023-12-15' }, // Before range
        { ...mockPayments[1], date: '2024-03-15' }, // After range
      ];

      vi.mocked(kv.lrange)
        .mockResolvedValueOnce([...mockPayments, ...paymentsOutsideRange])
        .mockResolvedValueOnce(mockExpenses);

      const report = await generateFinancialReport({
        userId: 'user1',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-02-28T23:59:59.999Z',
        reportType: 'monthly',
        includeComparison: false,
      });

      // Should only include payments within the date range
      expect(report.income.totalRevenue).toBe(4000);
    });

    it('should handle property-specific filtering', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockPayments)
        .mockResolvedValueOnce(mockExpenses);

      const report = await generateFinancialReport({
        userId: 'user1',
        propertyId: 'property1',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-02-28T23:59:59.999Z',
        reportType: 'monthly',
        includeComparison: false,
      });

      // Should call kv.lrange with property-specific keys
      expect(vi.mocked(kv.lrange)).toHaveBeenCalledWith('payments:property1', 0, -1);
      expect(vi.mocked(kv.lrange)).toHaveBeenCalledWith('expenses:property1', 0, -1);
    });
  });

  describe('Financial Calculations Precision', () => {
    it('should handle decimal amounts correctly', async () => {
      const decimalPayments = [
        { ...mockPayments[0], amount: 1500.50 },
        { ...mockPayments[1], amount: 2000.75 },
      ];
      const decimalExpenses = [
        { ...mockExpenses[0], amount: 200.25 },
        { ...mockExpenses[1], amount: 150.33 },
      ];

      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(decimalPayments)
        .mockResolvedValueOnce(decimalExpenses);

      const report = await generateFinancialReport({
        userId: 'user1',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-02-28T23:59:59.999Z',
        reportType: 'monthly',
        includeComparison: false,
      });

      expect(report.income.totalRevenue).toBeCloseTo(3501.25);
      expect(report.expenses.totalExpenses).toBeCloseTo(350.58);
      expect(report.netIncome).toBeCloseTo(3150.67);
    });

    it('should calculate percentages with proper precision', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockPayments)
        .mockResolvedValueOnce(mockExpenses);

      const report = await generateFinancialReport({
        userId: 'user1',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-02-28T23:59:59.999Z',
        reportType: 'monthly',
        includeComparison: false,
      });

      // Check that percentages add up to 100% (within floating point precision)
      const totalPaymentPercentage = report.income.paymentMethodBreakdown
        .reduce((sum, method) => sum + method.percentage, 0);
      expect(totalPaymentPercentage).toBeCloseTo(100, 1);

      const totalExpensePercentage = report.expenses.categoryBreakdown
        .reduce((sum, category) => sum + category.percentage, 0);
      expect(totalExpensePercentage).toBeCloseTo(100, 1);
    });
  });
});
