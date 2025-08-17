import { Suspense } from 'react';
import { Metadata } from 'next';
import ProfitLossStatement from '@/components/reports/ProfitLossStatement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Income Statement | Financial Reports',
  description: 'Profit and loss statement with detailed income and expense analysis',
};

function IncomeStatementLoading() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function IncomeStatementPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Income Statement</h1>
        <p className="text-muted-foreground">
          Detailed profit and loss analysis for your properties
        </p>
      </div>

      <Suspense fallback={<IncomeStatementLoading />}>
        <ProfitLossStatement />
      </Suspense>
    </div>
  );
}
