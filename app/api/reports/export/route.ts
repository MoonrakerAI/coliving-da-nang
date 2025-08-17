import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { exportReport } from '@/lib/reporting/exports';
import { z } from 'zod';

const exportSchema = z.object({
  reportType: z.enum(['financial', 'profit-loss', 'cash-flow', 'tax-summary']),
  format: z.enum(['excel', 'csv', 'pdf']),
  propertyId: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  includeCharts: z.boolean().default(true),
  fileName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedParams = exportSchema.parse(body);
    
    const exportResult = await exportReport({
      userId: session.user.id,
      ...validatedParams,
    });

    // Set appropriate headers for file download
    const headers = new Headers();
    headers.set('Content-Type', exportResult.mimeType);
    headers.set('Content-Disposition', `attachment; filename="${exportResult.fileName}"`);
    
    if (exportResult.buffer) {
      return new NextResponse(exportResult.buffer, {
        status: 200,
        headers,
      });
    }

    // For URL-based exports (like cloud storage links)
    return NextResponse.json({
      downloadUrl: exportResult.downloadUrl,
      fileName: exportResult.fileName,
      expiresAt: exportResult.expiresAt,
    });

  } catch (error) {
    console.error('Report export error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to export report' },
      { status: 500 }
    );
  }
}
