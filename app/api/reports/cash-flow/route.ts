import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { generateCashFlowAnalysis } from '@/lib/reporting/financial';
import { z } from 'zod';

const cashFlowSchema = z.object({
  propertyId: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('monthly'),
  includeForecast: z.boolean().default(false),
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
      startDate: searchParams.get('startDate') || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: searchParams.get('endDate') || new Date().toISOString(),
      granularity: (searchParams.get('granularity') as 'daily' | 'weekly' | 'monthly') || 'monthly',
      includeForecast: searchParams.get('includeForecast') === 'true',
    };

    const validatedParams = cashFlowSchema.parse(params);
    
    const analysis = await generateCashFlowAnalysis({
      userId: session.user.id,
      ...validatedParams,
    });

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Cash flow analysis generation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate cash flow analysis' },
      { status: 500 }
    );
  }
}
