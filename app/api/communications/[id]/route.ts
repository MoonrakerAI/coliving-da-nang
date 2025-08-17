import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CommunicationOperations } from '@/lib/db/operations/communications';
import { UpdateCommunicationSchema } from '@/lib/db/models/communication';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const communication = await CommunicationOperations.getById(params.id);
    if (!communication) {
      return NextResponse.json({ error: 'Communication not found' }, { status: 404 });
    }

    return NextResponse.json(communication);
  } catch (error) {
    console.error('Error fetching communication:', error);
    return NextResponse.json(
      { error: 'Failed to fetch communication' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedInput = UpdateCommunicationSchema.parse(body);

    const communication = await CommunicationOperations.update(params.id, validatedInput);
    if (!communication) {
      return NextResponse.json({ error: 'Communication not found' }, { status: 404 });
    }

    return NextResponse.json(communication);
  } catch (error) {
    console.error('Error updating communication:', error);
    return NextResponse.json(
      { error: 'Failed to update communication' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const success = await CommunicationOperations.delete(params.id);
    if (!success) {
      return NextResponse.json({ error: 'Communication not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting communication:', error);
    return NextResponse.json(
      { error: 'Failed to delete communication' },
      { status: 500 }
    );
  }
}
