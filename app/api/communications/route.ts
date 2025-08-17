import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { CommunicationOperations } from '@/lib/db/operations/communications';
import { CreateCommunicationSchema, CommunicationFilterSchema } from '@/lib/db/models/communication';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedInput = CreateCommunicationSchema.parse({
      ...body,
      createdBy: session.user.id
    });

    const communication = await CommunicationOperations.create(validatedInput);
    return NextResponse.json(communication, { status: 201 });
  } catch (error) {
    console.error('Error creating communication:', error);
    return NextResponse.json(
      { error: 'Failed to create communication' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterParams = {
      tenantId: searchParams.get('tenantId') || undefined,
      propertyId: searchParams.get('propertyId') || undefined,
      type: searchParams.get('type') || undefined,
      priority: searchParams.get('priority') || undefined,
      status: searchParams.get('status') || undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      search: searchParams.get('search') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
    };

    const validatedFilter = CommunicationFilterSchema.parse(filterParams);

    let communications;
    if (validatedFilter.tenantId) {
      communications = await CommunicationOperations.getByTenant(validatedFilter.tenantId, validatedFilter);
    } else if (validatedFilter.propertyId) {
      communications = await CommunicationOperations.getByProperty(validatedFilter.propertyId, validatedFilter);
    } else {
      return NextResponse.json({ error: 'Either tenantId or propertyId is required' }, { status: 400 });
    }

    return NextResponse.json(communications);
  } catch (error) {
    console.error('Error fetching communications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch communications' },
      { status: 500 }
    );
  }
}
