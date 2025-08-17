'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { ProfitLossStatement } from '@/lib/reporting/financial';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface ProfitLossStatementProps {
  propertyId?: string;
}

export default function ProfitLossStatement({ propertyId }: ProfitLossStatementProps) {
  const [statement, setStatement] = useState<ProfitLossStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  const [groupBy, setGroupBy] = useState<'month' | 'quarter' | 'year'>('month');
  const [includeDetails, setIncludeDetails] = useState(true);

  useEffect(() => {
    fetchProfitLossStatement();
  }, [dateRange, groupBy, includeDetails, propertyId]);

  const fetchProfitLossStatement = async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        groupBy,
        includeDetails: includeDetails.toString(),
        ...(propertyId && { propertyId }),
      });

      const response = await fetch(`/api/reports/profit-loss?${params}`);
      if (!response.ok) throw new Error('Failed to fetch profit & loss statement');
      
      const data = await response.json();
      setStatement(data);
    } catch (error) {
      console.error('Error fetching profit & loss statement:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return <div>Loading profit & loss statement...</div>;
  }

  if (!statement) {
    return <div>No data available for the selected period.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
          <DatePickerWithRange
            date={dateRange}
            onDateChange={setDateRange}
            className="w-full sm:w-auto"
          />
          <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="quarter">Quarterly</SelectItem>
              <SelectItem value="year">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant={includeDetails ? "default" : "outline"}
            size="sm"
            onClick={() => setIncludeDetails(!includeDetails)}
          >
            Show Details
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(statement.grossProfit)}</div>
            <div className="flex items-center mt-1">
              <Badge variant={statement.margins.gross >= 50 ? "default" : "secondary"}>
                {formatPercentage(statement.margins.gross)} margin
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Operating Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(statement.operatingIncome)}</div>
            <div className="flex items-center mt-1">
              <Badge variant={statement.margins.operating >= 30 ? "default" : "secondary"}>
                {formatPercentage(statement.margins.operating)} margin
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${statement.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(statement.netIncome)}
            </div>
            <div className="flex items-center mt-1">
              <Badge variant={statement.margins.net >= 20 ? "default" : statement.margins.net >= 10 ? "secondary" : "destructive"}>
                {formatPercentage(statement.margins.net)} margin
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statement */}
      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss Statement</CardTitle>
          <p className="text-sm text-muted-foreground">
            {format(statement.period.start, 'MMM dd, yyyy')} - {format(statement.period.end, 'MMM dd, yyyy')}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Revenue Section */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Revenue</h3>
              <div className="space-y-2 pl-4">
                <div className="flex justify-between items-center">
                  <span>Rent Income</span>
                  <span className="font-medium">{formatCurrency(statement.revenue.rentIncome)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Other Income</span>
                  <span className="font-medium">{formatCurrency(statement.revenue.otherIncome)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between items-center font-semibold">
                  <span>Total Revenue</span>
                  <span>{formatCurrency(statement.revenue.totalRevenue)}</span>
                </div>
              </div>
            </div>

            {/* Expenses Section */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Operating Expenses</h3>
              <div className="space-y-2 pl-4">
                {statement.expenses.operatingExpenses.map((expense) => (
                  <div key={expense.category} className="flex justify-between items-center">
                    <span className="capitalize">{expense.category}</span>
                    <div className="text-right">
                      <span className="font-medium">{formatCurrency(expense.amount)}</span>
                      {includeDetails && (
                        <div className="text-xs text-muted-foreground">
                          {expense.count} items • {formatPercentage(expense.percentage)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <hr className="my-2" />
                <div className="flex justify-between items-center font-semibold">
                  <span>Total Operating Expenses</span>
                  <span>{formatCurrency(statement.expenses.totalOperatingExpenses)}</span>
                </div>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex justify-between items-center font-semibold text-lg">
                <span>Gross Profit</span>
                <span className={statement.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(statement.grossProfit)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {formatPercentage(statement.margins.gross)} gross margin
              </div>
            </div>

            {/* Other Expenses */}
            {statement.expenses.depreciation > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Other Expenses</h3>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between items-center">
                    <span>Depreciation</span>
                    <span className="font-medium">{formatCurrency(statement.expenses.depreciation)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total Other Expenses</span>
                    <span>{formatCurrency(statement.expenses.depreciation)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Net Income */}
            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="flex justify-between items-center font-bold text-xl">
                <span>Net Income</span>
                <span className={statement.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(statement.netIncome)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {formatPercentage(statement.margins.net)} net margin
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Breakdown */}
      {statement.breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Period Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statement.breakdown.map((period, index) => (
                <div key={period.period} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{period.period}</div>
                    <div className="text-sm text-muted-foreground">
                      Revenue: {formatCurrency(period.revenue)} | Expenses: {formatCurrency(period.expenses)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${period.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(period.netIncome)}
                    </div>
                    {index > 0 && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        {period.netIncome > statement.breakdown[index - 1].netIncome ? (
                          <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
                        )}
                        vs previous
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
