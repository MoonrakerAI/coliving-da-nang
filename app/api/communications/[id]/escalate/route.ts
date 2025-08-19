import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { CommunicationOperations } from '@/lib/db/operations/communications';
import { z } from 'zod';

const EscalateSchema = z.object({
  escalatedTo: z.string().min(1, 'Escalated to user ID is required'),
  reason: z.string().min(1, 'Escalation reason is required'),
  notes: z.string().optional()
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if communication exists
    const communication = await CommunicationOperations.getById(params.id);
    if (!communication) {
      return NextResponse.json({ error: 'Communication not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedInput = EscalateSchema.parse(body);

    const escalation = await CommunicationOperations.escalateIssue(params.id, {
      communicationId: params.id,
      escalatedFrom: session.user.id,
      escalatedTo: validatedInput.escalatedTo,
      reason: validatedInput.reason,
      notes: validatedInput.notes,
      resolved: false,
    });

    return NextResponse.json(escalation, { status: 201 });
  } catch (error) {
    console.error('Error escalating communication:', error);
    return NextResponse.json(
      { error: 'Failed to escalate communication' },
      { status: 500 }
    );
  }
}
