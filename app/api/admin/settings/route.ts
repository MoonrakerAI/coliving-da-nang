import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { kv } from '@vercel/kv';
import { z } from 'zod';
import { createAuditLog } from '@/lib/admin/audit';

const settingsSchema = z.object({
  general: z.object({
    timezone: z.string(),
    currency: z.string(),
    dateFormat: z.string(),
    language: z.string(),
  }),
  notifications: z.object({
    emailEnabled: z.boolean(),
    smsEnabled: z.boolean(),
    pushEnabled: z.boolean(),
    reminderSchedule: z.array(z.number()),
  }),
  payment: z.object({
    dueDate: z.number().min(1).max(28),
    lateFeeAmount: z.number().min(0),
    lateFeeGracePeriod: z.number().min(0),
    autoReminders: z.boolean(),
  }),
  property: z.object({
    name: z.string(),
    address: z.string(),
    description: z.string(),
    houseRules: z.string(),
    amenities: z.array(z.string()),
    maxOccupancy: z.number().min(1),
  }),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'PROPERTY_OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await kv.get('system:settings');
    
    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'PROPERTY_OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = settingsSchema.parse(body);

    const existingSettings = await kv.get('system:settings') as any;
    
    const updatedSettings = {
      id: existingSettings?.id || 'system_settings',
      propertyId: existingSettings?.propertyId || 'default',
      ...validatedData,
      updatedAt: new Date().toISOString(),
      updatedBy: session.user.id,
    };

    await kv.set('system:settings', updatedSettings);

    // Create audit log
    await createAuditLog({
      userId: session.user.id!,
      action: 'UPDATE_SETTINGS',
      resource: 'system_settings',
      resourceId: 'system_settings',
      changes: validatedData,
    });

    return NextResponse.json({ settings: updatedSettings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
