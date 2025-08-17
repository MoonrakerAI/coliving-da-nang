import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateTaxSummary } from '@/lib/reporting/tax';
import { z } from 'zod';

const taxSummarySchema = z.object({
  propertyId: z.string().optional(),
  taxYear: z.number().int().min(2020).max(new Date().getFullYear()),
  includeReceipts: z.boolean().default(true),
  format: z.enum(['summary', 'detailed', 'irs-ready']).default('summary'),
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
      taxYear: parseInt(searchParams.get('taxYear') || new Date().getFullYear().toString()),
      includeReceipts: searchParams.get('includeReceipts') !== 'false',
      format: (searchParams.get('format') as 'summary' | 'detailed' | 'irs-ready') || 'summary',
    };

    const validatedParams = taxSummarySchema.parse(params);
    
    const summary = await generateTaxSummary({
      userId: session.user.id,
      ...validatedParams,
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Tax summary generation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate tax summary' },
      { status: 500 }
    );
  }
}
