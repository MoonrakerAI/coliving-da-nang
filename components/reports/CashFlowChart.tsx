'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { FileText, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { CashFlowAnalysis } from '@/lib/reporting/financial';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface CashFlowChartProps {
  propertyId?: string;
}

export default function CashFlowChart({ propertyId }: CashFlowChartProps) {
  const [analysis, setAnalysis] = useState<CashFlowAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [includeForecast, setIncludeForecast] = useState(false);

  useEffect(() => {
    fetchCashFlowAnalysis();
  }, [dateRange, granularity, includeForecast, propertyId]);

  const fetchCashFlowAnalysis = async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        granularity,
        includeForecast: includeForecast.toString(),
        ...(propertyId && { propertyId }),
      });

      const response = await fetch(`/api/reports/cash-flow?${params}`);
      if (!response.ok) throw new Error('Failed to fetch cash flow analysis');
      
      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Error fetching cash flow analysis:', error);
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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'decreasing':
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <BarChart3 className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
      case 'improving':
        return 'text-green-600';
      case 'decreasing':
      case 'declining':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return <div>Loading cash flow analysis...</div>;
  }

  if (!analysis) {
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
          <Select value={granularity} onValueChange={(value: any) => setGranularity(value)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant={includeForecast ? "default" : "outline"}
            size="sm"
            onClick={() => setIncludeForecast(!includeForecast)}
          >
            Show Forecast
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Inflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(analysis.summary.totalInflow)}
            </div>
            <div className="flex items-center mt-1 text-sm">
              {getTrendIcon(analysis.trends.inflowTrend)}
              <span className={`ml-1 ${getTrendColor(analysis.trends.inflowTrend)}`}>
                {analysis.trends.inflowTrend}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Outflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(analysis.summary.totalOutflow)}
            </div>
            <div className="flex items-center mt-1 text-sm">
              {getTrendIcon(analysis.trends.outflowTrend)}
              <span className={`ml-1 ${getTrendColor(analysis.trends.outflowTrend)}`}>
                {analysis.trends.outflowTrend}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${analysis.summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(analysis.summary.netCashFlow)}
            </div>
            <div className="flex items-center mt-1 text-sm">
              {getTrendIcon(analysis.trends.netFlowTrend)}
              <span className={`ml-1 ${getTrendColor(analysis.trends.netFlowTrend)}`}>
                {analysis.trends.netFlowTrend}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Monthly Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${analysis.summary.averageMonthlyFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(analysis.summary.averageMonthlyFlow)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Per month average
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Visualization</CardTitle>
          <p className="text-sm text-muted-foreground">
            {format(analysis.period.start, 'MMM dd, yyyy')} - {format(analysis.period.end, 'MMM dd, yyyy')}
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="w-16 h-16 mx-auto mb-4" />
              <p className="text-lg font-medium">Interactive Cash Flow Chart</p>
              <p className="text-sm">Chart visualization will be implemented here</p>
              <p className="text-xs mt-2">
                Showing income vs expenses over time with trend lines
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Cash Flow Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis.monthlyData.map((data, index) => (
              <div key={data.date} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">
                    {format(new Date(data.date + '-01'), 'MMMM yyyy')}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    <span className="text-green-600">↗ {formatCurrency(data.income)}</span>
                    {' • '}
                    <span className="text-red-600">↘ {formatCurrency(data.expenses)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={`font-semibold ${data.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(data.netFlow)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Net flow
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrency(data.cumulativeFlow)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Cumulative
                    </div>
                  </div>
                  
                  {index > 0 && (
                    <div className="text-right">
                      {data.netFlow > analysis.monthlyData[index - 1].netFlow ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : data.netFlow < analysis.monthlyData[index - 1].netFlow ? (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      ) : (
                        <BarChart3 className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Forecast Section */}
      {includeForecast && analysis.forecast && analysis.forecast.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Cash Flow Forecast
              <Badge variant="secondary">Projected</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Based on historical trends and patterns
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.forecast.map((data) => (
                <div key={data.date} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div className="flex-1">
                    <div className="font-medium">
                      {format(new Date(data.date + '-01'), 'MMMM yyyy')}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <span className="text-green-600">↗ {formatCurrency(data.income)}</span>
                      {' • '}
                      <span className="text-red-600">↘ {formatCurrency(data.expenses)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`font-semibold ${data.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(data.netFlow)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Projected net
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(data.cumulativeFlow)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Projected total
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Forecasts are based on historical data and trends. 
                Actual results may vary due to market conditions and business changes.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
