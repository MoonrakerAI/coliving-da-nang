import { describe, it, expect, beforeEach, vi } from 'vitest';
import { kv } from '@vercel/kv';
import { generateTaxSummary } from '@/lib/reporting/tax';

// Mock Vercel KV
vi.mock('@vercel/kv', () => ({
  kv: {
    lrange: vi.fn(),
    get: vi.fn(),
  },
}));

const mockTaxPayments = [
  {
    id: '1',
    amount: 18000,
    date: '2024-01-15',
    type: 'rent',
    status: 'completed',
  },
  {
    id: '2',
    amount: 24000,
    date: '2024-07-15',
    type: 'rent',
    status: 'completed',
  },
  {
    id: '3',
    amount: 1000,
    date: '2024-03-20',
    type: 'deposit',
    status: 'completed',
  },
];

const mockTaxExpenses = [
  {
    id: '1',
    amount: 2000,
    date: '2024-02-10',
    category: 'maintenance',
    description: 'Major plumbing repair with invoice',
    receiptUrl: 'https://example.com/receipt1.jpg',
  },
  {
    id: '2',
    amount: 1800,
    date: '2024-05-05',
    category: 'utilities',
    description: 'Annual utility expenses',
    receiptUrl: 'https://example.com/receipt2.jpg',
  },
  {
    id: '3',
    amount: 500,
    date: '2024-08-25',
    category: 'professional',
    description: 'Property management fees',
    receiptUrl: 'https://example.com/receipt3.jpg',
  },
  {
    id: '4',
    amount: 100,
    date: '2024-09-15',
    category: 'supplies',
    description: 'Small expense without receipt',
    // No receiptUrl - should trigger recommendation
  },
];

const mockProperty = {
  id: 'property1',
  purchasePrice: 300000,
  landValue: 60000, // 20% of purchase price
};

describe('Tax Reporting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(kv.lrange).mockResolvedValue([]);
    vi.mocked(kv.get).mockResolvedValue(null);
  });

  describe('generateTaxSummary', () => {
    it('should generate a comprehensive tax summary', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockTaxPayments)
        .mockResolvedValueOnce(mockTaxExpenses);
      vi.mocked(kv.get).mockResolvedValue(mockProperty);

      const summary = await generateTaxSummary({
        userId: 'user1',
        taxYear: 2024,
        includeReceipts: true,
        format: 'detailed',
      });

      expect(summary).toBeDefined();
      expect(summary.taxYear).toBe(2024);
      expect(summary.income.totalRentalIncome).toBe(42000); // 18000 + 24000
      expect(summary.income.otherIncome).toBe(1000); // deposit
      expect(summary.income.totalIncome).toBe(43000);
    });

    it('should calculate deductions correctly', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockTaxPayments)
        .mockResolvedValueOnce(mockTaxExpenses);
      vi.mocked(kv.get).mockResolvedValue(mockProperty);

      const summary = await generateTaxSummary({
        userId: 'user1',
        taxYear: 2024,
        includeReceipts: true,
        format: 'detailed',
      });

      const totalOperatingExpenses = summary.deductions.operatingExpenses
        .reduce((sum, cat) => sum + cat.amount, 0);
      
      expect(totalOperatingExpenses).toBe(4400); // 2000 + 1800 + 500 + 100
      expect(summary.deductions.totalDeductions).toBeGreaterThanOrEqual(4400); // Includes depreciation
    });

    it('should map expenses to IRS categories correctly', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockTaxPayments)
        .mockResolvedValueOnce(mockTaxExpenses);

      const summary = await generateTaxSummary({
        userId: 'user1',
        taxYear: 2024,
        includeReceipts: true,
        format: 'detailed',
      });

      const maintenanceDeduction = summary.deductions.operatingExpenses
        .find(cat => cat.category === 'maintenance');
      const utilitiesDeduction = summary.deductions.operatingExpenses
        .find(cat => cat.category === 'utilities');
      const professionalDeduction = summary.deductions.operatingExpenses
        .find(cat => cat.category === 'professional');

      expect(maintenanceDeduction?.irsCategory).toBe('Repairs and maintenance');
      expect(utilitiesDeduction?.irsCategory).toBe('Utilities');
      expect(professionalDeduction?.irsCategory).toBe('Legal and other professional fees');
    });

    it('should calculate property depreciation', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockTaxPayments)
        .mockResolvedValueOnce(mockTaxExpenses);
      vi.mocked(kv.get).mockResolvedValue(mockProperty);

      const summary = await generateTaxSummary({
        userId: 'user1',
        propertyId: 'property1',
        taxYear: 2024,
        includeReceipts: true,
        format: 'detailed',
      });

      // Depreciation = (purchasePrice - landValue) / 27.5 years
      // (300000 - 60000) / 27.5 = 8727.27
      expect(summary.deductions.depreciation).toBeCloseTo(8727.27, 2);
    });

    it('should identify deductible vs non-deductible expenses', async () => {
      const mixedExpenses = [
        ...mockTaxExpenses,
        {
          id: '5',
          amount: 1000,
          date: '2024-06-15',
          category: 'personal',
          description: 'Personal expense',
        },
      ];

      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockTaxPayments)
        .mockResolvedValueOnce(mixedExpenses);

      const summary = await generateTaxSummary({
        userId: 'user1',
        taxYear: 2024,
        includeReceipts: true,
        format: 'detailed',
      });

      const personalExpense = summary.deductions.operatingExpenses
        .find(cat => cat.category === 'personal');
      const maintenanceExpense = summary.deductions.operatingExpenses
        .find(cat => cat.category === 'maintenance');

      expect(personalExpense?.deductible).toBe(false);
      expect(maintenanceExpense?.deductible).toBe(true);
    });

    it('should generate receipt summaries when requested', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockTaxPayments)
        .mockResolvedValueOnce(mockTaxExpenses);

      const summary = await generateTaxSummary({
        userId: 'user1',
        taxYear: 2024,
        includeReceipts: true,
        format: 'detailed',
      });

      expect(summary.receipts).toHaveLength(4); // All expenses (including one without receipt)
      
      const expenseWithReceipt = summary.receipts.find(r => r.amount === 2000);
      const expenseWithoutReceipt = summary.receipts.find(r => r.amount === 100);

      expect(expenseWithReceipt?.receiptUrl).toBeDefined();
      expect(expenseWithoutReceipt?.receiptUrl).toBeUndefined();
    });

    it('should generate tax recommendations', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockTaxPayments)
        .mockResolvedValueOnce(mockTaxExpenses);

      const summary = await generateTaxSummary({
        userId: 'user1',
        taxYear: 2024,
        includeReceipts: true,
        format: 'detailed',
      });

      expect(summary.recommendations).toBeDefined();
      expect(summary.recommendations.length).toBeGreaterThan(0);

      // Should have recommendation for missing receipt
      const missingReceiptRec = summary.recommendations
        .find(rec => rec.type === 'documentation');
      expect(missingReceiptRec).toBeDefined();
      expect(missingReceiptRec?.title).toContain('Missing Receipt');
    });

    it('should calculate net rental income correctly', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockTaxPayments)
        .mockResolvedValueOnce(mockTaxExpenses);
      vi.mocked(kv.get).mockResolvedValue(mockProperty);

      const summary = await generateTaxSummary({
        userId: 'user1',
        propertyId: 'property1',
        taxYear: 2024,
        includeReceipts: true,
        format: 'detailed',
      });

      const expectedNetIncome = summary.income.totalIncome - summary.deductions.totalDeductions;
      expect(summary.netRentalIncome).toBeCloseTo(expectedNetIncome, 2);
      expect(summary.taxableIncome).toBe(Math.max(0, expectedNetIncome));
    });

    it('should handle multiple properties', async () => {
      const multipleProperties = [mockProperty, { ...mockProperty, id: 'property2' }];
      
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockTaxPayments)
        .mockResolvedValueOnce(mockTaxExpenses)
        .mockResolvedValueOnce(multipleProperties);

      const summary = await generateTaxSummary({
        userId: 'user1',
        taxYear: 2024,
        includeReceipts: true,
        format: 'detailed',
      });

      // Depreciation should be doubled for two identical properties
      expect(summary.deductions.depreciation).toBeCloseTo(8727.27 * 2, 1);
    });

    it('should provide IRS category mappings', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockTaxPayments)
        .mockResolvedValueOnce(mockTaxExpenses);

      const summary = await generateTaxSummary({
        userId: 'user1',
        taxYear: 2024,
        includeReceipts: true,
        format: 'detailed',
      });

      expect(summary.irsCategories).toBeDefined();
      expect(summary.irsCategories.length).toBeGreaterThan(0);
      
      const maintenanceMapping = summary.irsCategories
        .find(cat => cat.businessCategory === 'maintenance');
      expect(maintenanceMapping?.irsScheduleE).toBe('Repairs and maintenance');
      expect(maintenanceMapping?.requirements).toContain('Receipts required');
    });
  });

  describe('Tax Recommendations Logic', () => {
    it('should recommend missing depreciation deduction', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockTaxPayments)
        .mockResolvedValueOnce(mockTaxExpenses);
      // No property data = no depreciation

      const summary = await generateTaxSummary({
        userId: 'user1',
        taxYear: 2024,
        includeReceipts: true,
        format: 'detailed',
      });

      const depreciationRec = summary.recommendations
        .find(rec => rec.title.includes('Depreciation'));
      expect(depreciationRec).toBeDefined();
      expect(depreciationRec?.priority).toBe('high');
    });

    it('should recommend professional consultation for high income', async () => {
      const highIncomePayments = [
        { ...mockTaxPayments[0], amount: 60000 },
      ];

      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(highIncomePayments)
        .mockResolvedValueOnce(mockTaxExpenses.filter(e => e.category !== 'professional'));

      const summary = await generateTaxSummary({
        userId: 'user1',
        taxYear: 2024,
        includeReceipts: true,
        format: 'detailed',
      });

      const professionalRec = summary.recommendations
        .find(rec => rec.title.includes('Professional'));
      expect(professionalRec).toBeDefined();
    });

    it('should recommend year-end planning', async () => {
      const earlyYearExpenses = mockTaxExpenses.map(expense => ({
        ...expense,
        date: '2024-03-15', // All expenses in Q1
      }));

      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockTaxPayments)
        .mockResolvedValueOnce(earlyYearExpenses);

      const summary = await generateTaxSummary({
        userId: 'user1',
        taxYear: 2024,
        includeReceipts: true,
        format: 'detailed',
      });

      const timingRec = summary.recommendations
        .find(rec => rec.type === 'timing');
      expect(timingRec).toBeDefined();
    });

    it('should prioritize recommendations correctly', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockTaxPayments)
        .mockResolvedValueOnce(mockTaxExpenses);

      const summary = await generateTaxSummary({
        userId: 'user1',
        taxYear: 2024,
        includeReceipts: true,
        format: 'detailed',
      });

      // Recommendations should be sorted by priority (high -> medium -> low)
      const priorities = summary.recommendations.map(rec => rec.priority);
      const highPriorityIndex = priorities.indexOf('high');
      const mediumPriorityIndex = priorities.indexOf('medium');
      const lowPriorityIndex = priorities.indexOf('low');

      if (highPriorityIndex !== -1 && mediumPriorityIndex !== -1) {
        expect(highPriorityIndex).toBeLessThan(mediumPriorityIndex);
      }
      if (mediumPriorityIndex !== -1 && lowPriorityIndex !== -1) {
        expect(mediumPriorityIndex).toBeLessThan(lowPriorityIndex);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero income gracefully', async () => {
      vi.mocked(kv.lrange)
        .mockResolvedValueOnce([]) // No payments
        .mockResolvedValueOnce(mockTaxExpenses);

      const summary = await generateTaxSummary({
        userId: 'user1',
        taxYear: 2024,
        includeReceipts: true,
        format: 'detailed',
      });

      expect(summary.income.totalIncome).toBe(0);
      expect(summary.netRentalIncome).toBeLessThan(0); // Negative due to expenses
      expect(summary.taxableIncome).toBe(0); // Cannot be negative
    });

    it('should handle expenses without categories', async () => {
      const uncategorizedExpenses = [
        {
          id: '1',
          amount: 500,
          date: '2024-06-15',
          description: 'Expense without category',
        },
      ];

      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockTaxPayments)
        .mockResolvedValueOnce(uncategorizedExpenses);

      const summary = await generateTaxSummary({
        userId: 'user1',
        taxYear: 2024,
        includeReceipts: true,
        format: 'detailed',
      });

      const uncategorizedDeduction = summary.deductions.operatingExpenses
        .find(cat => cat.category === 'uncategorized');
      expect(uncategorizedDeduction).toBeDefined();
      expect(uncategorizedDeduction?.irsCategory).toBe('Other expenses');
    });

    it('should filter expenses by tax year correctly', async () => {
      const multiYearExpenses = [
        ...mockTaxExpenses,
        { ...mockTaxExpenses[0], id: '5', date: '2023-12-15' }, // Previous year
        { ...mockTaxExpenses[1], id: '6', date: '2025-01-15' }, // Next year
      ];

      vi.mocked(kv.lrange)
        .mockResolvedValueOnce(mockTaxPayments)
        .mockResolvedValueOnce(multiYearExpenses);

      const summary = await generateTaxSummary({
        userId: 'user1',
        taxYear: 2024,
        includeReceipts: true,
        format: 'detailed',
      });

      const totalOperatingExpenses = summary.deductions.operatingExpenses
        .reduce((sum, cat) => sum + cat.amount, 0);
      
      // Should only include 2024 expenses
      expect(totalOperatingExpenses).toBe(4400);
    });
  });
});
