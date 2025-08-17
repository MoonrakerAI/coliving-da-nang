import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { kv } from '@vercel/kv';
import { z } from 'zod';
import { createAuditLog } from '@/lib/admin/audit';

const createBackupSchema = z.object({
  type: z.enum(['full', 'incremental', 'selective']),
  dataTypes: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'PROPERTY_OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backupKeys = await kv.keys('backup:*');
    const backups = await Promise.all(
      backupKeys.map(async (key) => {
        const backup = await kv.get(key);
        return backup;
      })
    );

    // Sort by creation date, newest first
    const sortedBackups = backups
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ backups: sortedBackups });
  } catch (error) {
    console.error('Error fetching backups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backups' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'PROPERTY_OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createBackupSchema.parse(body);

    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const backup = {
      id: backupId,
      type: validatedData.type,
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdBy: session.user.id,
      dataTypes: validatedData.dataTypes,
    };

    // Store backup job
    await kv.set(`backup:${backupId}`, backup);

    // Create audit log
    await createAuditLog({
      userId: session.user.id!,
      action: 'CREATE_BACKUP',
      resource: 'backup',
      resourceId: backupId,
      changes: { type: validatedData.type },
    });

    // Start backup process (simulate async processing)
    processBackup(backupId);

    return NextResponse.json({ backup }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating backup:', error);
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}

async function processBackup(backupId: string) {
  try {
    // Update status to running
    const backup = await kv.get(`backup:${backupId}`) as any;
    if (!backup) return;

    await kv.set(`backup:${backupId}`, {
      ...backup,
      status: 'running',
      startedAt: new Date().toISOString(),
    });

    // Simulate backup process
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get all data for backup
    const allKeys = await kv.keys('*');
    const backupData: Record<string, any> = {};
    
    for (const key of allKeys) {
      if (!key.startsWith('backup:')) {
        const data = await kv.get(key);
        backupData[key] = data;
      }
    }

    // Calculate size (rough estimate)
    const dataString = JSON.stringify(backupData);
    const size = new Blob([dataString]).size;

    // Update backup as completed
    await kv.set(`backup:${backupId}`, {
      ...backup,
      status: 'completed',
      completedAt: new Date().toISOString(),
      size,
      downloadUrl: `/api/admin/backup/${backupId}/download`,
    });

    // Store backup data
    await kv.set(`backup:data:${backupId}`, backupData);

  } catch (error) {
    console.error('Backup process failed:', error);
    
    const backup = await kv.get(`backup:${backupId}`) as any;
    if (backup) {
      await kv.set(`backup:${backupId}`, {
        ...backup,
        status: 'failed',
        error: 'Backup process failed',
        completedAt: new Date().toISOString(),
      });
    }
  }
}
