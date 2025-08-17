import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { kv } from '@vercel/kv';
import { z } from 'zod';
import { createAuditLog } from '@/lib/admin/audit';

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['PROPERTY_OWNER', 'COMMUNITY_MANAGER', 'TENANT']).optional(),
  status: z.enum(['active', 'inactive', 'pending_activation']).optional(),
  propertyId: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'PROPERTY_OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await kv.get(`user:${params.id}`);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove sensitive data
    const safeUser = {
      id: (user as any).id,
      name: (user as any).name,
      email: (user as any).email,
      role: (user as any).role,
      status: (user as any).status || 'active',
      createdAt: (user as any).createdAt,
      lastLoginAt: (user as any).lastLoginAt,
      propertyId: (user as any).propertyId,
    };

    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
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
    
    if (!session?.user || session.user.role !== 'PROPERTY_OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    const existingUser = await kv.get(`user:${params.id}`);
    
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentUser = existingUser as any;

    // Check email uniqueness if email is being updated
    if (validatedData.email && validatedData.email !== currentUser.email) {
      const emailExists = await kv.get(`user:email:${validatedData.email}`);
      if (emailExists) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        );
      }
    }

    const updatedUser = {
      ...currentUser,
      ...validatedData,
      updatedAt: new Date().toISOString(),
      updatedBy: session.user.id,
    };

    // Update user record
    await kv.set(`user:${params.id}`, updatedUser);

    // Update email index if email changed
    if (validatedData.email && validatedData.email !== currentUser.email) {
      await kv.del(`user:email:${currentUser.email}`);
      await kv.set(`user:email:${validatedData.email}`, params.id);
    }

    // Create audit log
    await createAuditLog({
      userId: session.user.id!,
      action: 'UPDATE_USER',
      resource: 'user',
      resourceId: params.id,
      changes: validatedData,
    });

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
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
    
    if (!session?.user || session.user.role !== 'PROPERTY_OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingUser = await kv.get(`user:${params.id}`);
    
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentUser = existingUser as any;

    // Prevent self-deletion
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Soft delete - mark as inactive instead of actual deletion
    const deletedUser = {
      ...currentUser,
      status: 'inactive',
      deletedAt: new Date().toISOString(),
      deletedBy: session.user.id,
    };

    await kv.set(`user:${params.id}`, deletedUser);

    // Create audit log
    await createAuditLog({
      userId: session.user.id!,
      action: 'DELETE_USER',
      resource: 'user',
      resourceId: params.id,
      changes: { status: 'inactive', deletedAt: deletedUser.deletedAt },
    });

    return NextResponse.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
