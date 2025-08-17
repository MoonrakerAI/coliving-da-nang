import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateFinancialReport } from '@/lib/reporting/financial';
import { z } from 'zod';

const financialReportSchema = z.object({
  propertyId: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reportType: z.enum(['monthly', 'quarterly', 'yearly']).default('monthly'),
  includeComparison: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = {
      propertyId: searchParams.get('propertyId') || undefined,
      startDate: searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: searchParams.get('endDate') || new Date().toISOString(),
      reportType: (searchParams.get('reportType') as 'monthly' | 'quarterly' | 'yearly') || 'monthly',
      includeComparison: searchParams.get('includeComparison') === 'true',
    };

    const validatedParams = financialReportSchema.parse(params);
    
    const report = await generateFinancialReport({
      userId: session.user.id,
      ...validatedParams,
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('Financial report generation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate financial report' },
      { status: 500 }
    );
  }
}
