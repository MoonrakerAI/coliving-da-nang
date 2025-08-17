import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { kv } from '@vercel/kv';
import { z } from 'zod';
import { createAuditLog } from '@/lib/admin/audit';

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  role: z.enum(['PROPERTY_OWNER', 'COMMUNITY_MANAGER', 'TENANT']),
  propertyId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'PROPERTY_OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    // Get all users
    const userKeys = await kv.keys('user:*');
    const users = await Promise.all(
      userKeys.map(async (key) => {
        const user = await kv.get(key);
        return user;
      })
    );

    let filteredUsers = users.filter(Boolean);

    // Apply filters
    if (role) {
      filteredUsers = filteredUsers.filter((user: any) => user.role === role);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter((user: any) => 
        user.name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Remove sensitive data
    const safeUsers = paginatedUsers.map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status || 'active',
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      propertyId: user.propertyId,
    }));

    return NextResponse.json({
      users: safeUsers,
      pagination: {
        page,
        limit,
        total: filteredUsers.length,
        totalPages: Math.ceil(filteredUsers.length / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
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
    const validatedData = createUserSchema.parse(body);

    // Check if user already exists
    const existingUser = await kv.get(`user:email:${validatedData.email}`);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Generate user ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newUser = {
      id: userId,
      ...validatedData,
      status: 'pending_activation',
      createdAt: new Date().toISOString(),
      createdBy: session.user.id,
    };

    // Store user
    await kv.set(`user:${userId}`, newUser);
    await kv.set(`user:email:${validatedData.email}`, userId);

    // Create audit log
    await createAuditLog({
      userId: session.user.id!,
      action: 'CREATE_USER',
      resource: 'user',
      resourceId: userId,
      changes: { created: newUser },
    });

    // TODO: Send invitation email
    
    return NextResponse.json({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        createdAt: newUser.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
