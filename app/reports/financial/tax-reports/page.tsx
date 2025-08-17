import { Suspense } from 'react';
import { Metadata } from 'next';
import TaxSummary from '@/components/reports/TaxSummary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Tax Reports | Financial Reports',
  description: 'Tax-compliant documentation and deduction analysis',
};

function TaxReportsLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function TaxReportsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Tax Reports</h1>
        <p className="text-muted-foreground">
          Tax-compliant documentation and deduction optimization
        </p>
      </div>

      <Suspense fallback={<TaxReportsLoading />}>
        <TaxSummary />
      </Suspense>
    </div>
  );
}
