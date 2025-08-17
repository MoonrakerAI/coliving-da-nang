'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, FileText } from 'lucide-react';
import { FinancialReport } from '@/lib/reporting/financial';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface FinancialDashboardProps {
  propertyId?: string;
}

export default function FinancialDashboard({ propertyId }: FinancialDashboardProps) {
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  const [reportType, setReportType] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [includeComparison, setIncludeComparison] = useState(true);

  useEffect(() => {
    fetchFinancialReport();
  }, [dateRange, reportType, includeComparison, propertyId]);

  const fetchFinancialReport = async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        reportType,
        includeComparison: includeComparison.toString(),
        ...(propertyId && { propertyId }),
      });

      const response = await fetch(`/api/reports/financial?${params}`);
      if (!response.ok) throw new Error('Failed to fetch financial report');
      
      const data = await response.json();
      setReport(data);
    } catch (error) {
      console.error('Error fetching financial report:', error);
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
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (loading) {
    return <div>Loading financial report...</div>;
  }

  if (!report) {
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
          <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant={includeComparison ? "default" : "outline"}
            size="sm"
            onClick={() => setIncludeComparison(!includeComparison)}
          >
            Compare Periods
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.income.totalRevenue)}</div>
            {report.comparison && (
              <div className="flex items-center text-xs text-muted-foreground">
                {report.comparison.growth.revenue >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
                )}
                {formatPercentage(report.comparison.growth.revenue)} from last period
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.expenses.totalExpenses)}</div>
            {report.comparison && (
              <div className="flex items-center text-xs text-muted-foreground">
                {report.comparison.growth.expenses >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1 text-red-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1 text-green-500" />
                )}
                {formatPercentage(report.comparison.growth.expenses)} from last period
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${report.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(report.netIncome)}
            </div>
            {report.comparison && (
              <div className="flex items-center text-xs text-muted-foreground">
                {report.comparison.growth.netIncome >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
                )}
                {formatPercentage(report.comparison.growth.netIncome)} from last period
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <Badge variant={report.profitMargin >= 20 ? "default" : report.profitMargin >= 10 ? "secondary" : "destructive"}>
              {report.profitMargin.toFixed(1)}%
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.profitMargin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {report.profitMargin >= 20 ? 'Excellent' : report.profitMargin >= 10 ? 'Good' : 'Needs Improvement'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="breakdown" className="space-y-4">
        <TabsList>
          <TabsTrigger value="breakdown">Income & Expenses</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Income Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Income Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Rent Revenue</span>
                    <span className="font-medium">{formatCurrency(report.income.rentRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Other Revenue</span>
                    <span className="font-medium">{formatCurrency(report.income.otherRevenue)}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total Revenue</span>
                    <span>{formatCurrency(report.income.totalRevenue)}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-3">Payment Methods</h4>
                  <div className="space-y-2">
                    {report.income.paymentMethodBreakdown.map((method) => (
                      <div key={method.method} className="flex justify-between items-center text-sm">
                        <span className="capitalize">{method.method}</span>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(method.amount)}</div>
                          <div className="text-xs text-muted-foreground">
                            {method.percentage.toFixed(1)}% ({method.count} payments)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expense Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Operating Expenses</span>
                    <span className="font-medium">{formatCurrency(report.expenses.operatingExpenses)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Reimbursements</span>
                    <span className="font-medium">{formatCurrency(report.expenses.reimbursements)}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total Expenses</span>
                    <span>{formatCurrency(report.expenses.totalExpenses)}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-3">By Category</h4>
                  <div className="space-y-2">
                    {report.expenses.categoryBreakdown.map((category) => (
                      <div key={category.category} className="flex justify-between items-center text-sm">
                        <span className="capitalize">{category.category}</span>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(category.amount)}</div>
                          <div className="text-xs text-muted-foreground">
                            {category.percentage.toFixed(1)}% ({category.count} expenses)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Cash Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.cashFlow.map((data) => (
                  <div key={data.date} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{format(new Date(data.date + '-01'), 'MMM yyyy')}</div>
                      <div className="text-sm text-muted-foreground">
                        In: {formatCurrency(data.income)} | Out: {formatCurrency(data.expenses)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${data.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(data.netFlow)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Cumulative: {formatCurrency(data.cumulativeFlow)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-4" />
                <p>Trend analysis charts will be implemented here</p>
                <p className="text-sm">Including revenue trends, expense patterns, and forecasting</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
