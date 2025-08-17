'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, AlertTriangle, CheckCircle, DollarSign, Receipt, BookOpen } from 'lucide-react';
import { TaxSummary } from '@/lib/reporting/tax';

interface TaxSummaryProps {
  propertyId?: string;
}

export default function TaxSummary({ propertyId }: TaxSummaryProps) {
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [includeReceipts, setIncludeReceipts] = useState(true);
  const [format, setFormat] = useState<'summary' | 'detailed' | 'irs-ready'>('summary');

  useEffect(() => {
    fetchTaxSummary();
  }, [taxYear, includeReceipts, format, propertyId]);

  const fetchTaxSummary = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        taxYear: taxYear.toString(),
        includeReceipts: includeReceipts.toString(),
        format,
        ...(propertyId && { propertyId }),
      });

      const response = await fetch(`/api/reports/tax-summary?${params}`);
      if (!response.ok) throw new Error('Failed to fetch tax summary');
      
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Error fetching tax summary:', error);
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'deduction': return <DollarSign className="w-4 h-4" />;
      case 'documentation': return <Receipt className="w-4 h-4" />;
      case 'timing': return <AlertTriangle className="w-4 h-4" />;
      case 'strategy': return <BookOpen className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return <div>Loading tax summary...</div>;
  }

  if (!summary) {
    return <div>No tax data available for the selected year.</div>;
  }

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={taxYear.toString()} onValueChange={(value) => setTaxYear(parseInt(value))}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={format} onValueChange={(value: any) => setFormat(value)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">Summary</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
              <SelectItem value="irs-ready">IRS Ready</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={includeReceipts ? "default" : "outline"}
            size="sm"
            onClick={() => setIncludeReceipts(!includeReceipts)}
          >
            <Receipt className="w-4 h-4 mr-2" />
            Include Receipts
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Tax Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Rental Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.income.totalRentalIncome)}
            </div>
            <div className="text-sm text-muted-foreground">
              Rent: {formatCurrency(summary.income.totalRentalIncome)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.deductions.totalDeductions)}
            </div>
            <div className="text-sm text-muted-foreground">
              Depreciation: {formatCurrency(summary.deductions.depreciation)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Rental Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.netRentalIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.netRentalIncome)}
            </div>
            <div className="text-sm text-muted-foreground">
              Before taxes
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxable Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.taxableIncome)}
            </div>
            <div className="text-sm text-muted-foreground">
              Schedule E
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tax Recommendations Alert */}
      {summary.recommendations.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {summary.recommendations.length} tax optimization recommendations. 
            Review the recommendations tab for potential savings.
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Analysis */}
      <Tabs defaultValue="deductions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deductions">Deductions</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="irs-categories">IRS Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="deductions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax Deductions by Category</CardTitle>
              <p className="text-sm text-muted-foreground">
                Operating expenses and depreciation for tax year {summary.taxYear}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary.deductions.operatingExpenses.map((deduction) => (
                  <div key={deduction.category} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{deduction.category}</span>
                        <Badge variant={deduction.deductible ? "default" : "destructive"}>
                          {deduction.deductible ? 'Deductible' : 'Not Deductible'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {deduction.description}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        IRS Category: {deduction.irsCategory}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        {formatCurrency(deduction.amount)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {deduction.count} expenses • {deduction.receiptsCount} receipts
                      </div>
                    </div>
                  </div>
                ))}
                
                {summary.deductions.depreciation > 0 && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Property Depreciation</span>
                        <Badge variant="default">Deductible</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Annual depreciation deduction (27.5 year schedule)
                      </div>
                      <div className="text-sm text-muted-foreground">
                        IRS Category: Depreciation expense
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        {formatCurrency(summary.deductions.depreciation)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Calculated annually
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Receipt Documentation</CardTitle>
              <p className="text-sm text-muted-foreground">
                Expenses requiring receipt documentation for IRS compliance
              </p>
            </CardHeader>
            <CardContent>
              {summary.receipts.length > 0 ? (
                <div className="space-y-3">
                  {summary.receipts.map((receipt) => (
                    <div key={receipt.expenseId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{receipt.description}</span>
                          <Badge variant={receipt.deductible ? "default" : "secondary"}>
                            {receipt.category}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {receipt.date.toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatCurrency(receipt.amount)}
                          </div>
                        </div>
                        
                        <div>
                          {receipt.receiptUrl ? (
                            <Badge variant="default">
                              <Receipt className="w-3 h-3 mr-1" />
                              Receipt
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Missing
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-4" />
                  <p>No receipts found for the selected period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="space-y-4">
            {summary.recommendations.map((rec, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getRecommendationIcon(rec.type)}
                      <CardTitle className="text-lg">{rec.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getPriorityColor(rec.priority)}>
                        {rec.priority} priority
                      </Badge>
                      {rec.potentialSavings && (
                        <Badge variant="outline">
                          Save ~{formatCurrency(rec.potentialSavings)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{rec.description}</p>
                </CardContent>
              </Card>
            ))}
            
            {summary.recommendations.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium">Great job!</p>
                  <p className="text-muted-foreground">
                    No immediate tax optimization recommendations found.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="irs-categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>IRS Schedule E Categories</CardTitle>
              <p className="text-sm text-muted-foreground">
                Standard IRS categories for rental property expenses
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary.irsCategories.map((category) => (
                  <div key={category.businessCategory} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium capitalize">{category.businessCategory}</span>
                      <Badge variant="outline">{category.irsScheduleE}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {category.description}
                    </p>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Requirements:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {category.requirements.map((req, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-xs mt-1">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
