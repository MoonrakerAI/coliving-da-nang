import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateProfitLossStatement } from '@/lib/reporting/financial';
import { z } from 'zod';

const profitLossSchema = z.object({
  propertyId: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  includeDetails: z.boolean().default(true),
  groupBy: z.enum(['month', 'quarter', 'year']).default('month'),
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
      includeDetails: searchParams.get('includeDetails') !== 'false',
      groupBy: (searchParams.get('groupBy') as 'month' | 'quarter' | 'year') || 'month',
    };

    const validatedParams = profitLossSchema.parse(params);
    
    const statement = await generateProfitLossStatement({
      userId: session.user.id,
      ...validatedParams,
    });

    return NextResponse.json(statement);
  } catch (error) {
    console.error('Profit & Loss statement generation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate profit & loss statement' },
      { status: 500 }
    );
  }
}
