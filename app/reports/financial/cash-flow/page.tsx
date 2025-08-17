import { Suspense } from 'react';
import { Metadata } from 'next';
import CashFlowChart from '@/components/reports/CashFlowChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Cash Flow Analysis | Financial Reports',
  description: 'Monthly cash flow trends and analysis',
};

function CashFlowLoading() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function CashFlowPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Cash Flow Analysis</h1>
        <p className="text-muted-foreground">
          Monthly cash flow trends and financial performance metrics
        </p>
      </div>

      <Suspense fallback={<CashFlowLoading />}>
        <CashFlowChart />
      </Suspense>
    </div>
  );
}
