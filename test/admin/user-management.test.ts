import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from '@/app/api/admin/users/route';
import { GET as getUserById, PATCH, DELETE } from '@/app/api/admin/users/[id]/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { kv } from '@vercel/kv';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@vercel/kv', () => ({
  kv: {
    keys: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('@/lib/admin/audit', () => ({
  createAuditLog: vi.fn(),
}));

const mockSession = {
  user: {
    id: 'user_123',
    role: 'PROPERTY_OWNER',
    email: 'owner@test.com',
  },
};

const mockUser = {
  id: 'user_456',
  name: 'Test User',
  email: 'test@example.com',
  role: 'TENANT',
  status: 'active',
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('Admin User Management API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/users', () => {
    it('should return unauthorized for non-property owners', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/users');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return users list for property owners', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(kv.keys).mockResolvedValue(['user:user_456']);
      vi.mocked(kv.get).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost/api/admin/users');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.users).toHaveLength(1);
      expect(data.users[0]).toMatchObject({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        status: mockUser.status,
      });
    });

    it('should filter users by role', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(kv.keys).mockResolvedValue(['user:user_456']);
      vi.mocked(kv.get).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost/api/admin/users?role=TENANT');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.users).toHaveLength(1);
    });

    it('should search users by name and email', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(kv.keys).mockResolvedValue(['user:user_456']);
      vi.mocked(kv.get).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost/api/admin/users?search=test');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.users).toHaveLength(1);
    });
  });

  describe('POST /api/admin/users', () => {
    it('should create a new user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(kv.get).mockResolvedValue(null); // User doesn't exist
      vi.mocked(kv.set).mockResolvedValue('OK');

      const userData = {
        name: 'New User',
        email: 'new@example.com',
        role: 'TENANT',
      };

      const request = new NextRequest('http://localhost/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.user.name).toBe(userData.name);
      expect(data.user.email).toBe(userData.email);
      expect(data.user.role).toBe(userData.role);
      expect(data.user.status).toBe('pending_activation');
    });

    it('should reject duplicate email addresses', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(kv.get).mockResolvedValue('existing_user_id'); // User exists

      const userData = {
        name: 'New User',
        email: 'existing@example.com',
        role: 'TENANT',
      };

      const request = new NextRequest('http://localhost/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('User with this email already exists');
    });

    it('should validate required fields', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const invalidData = {
        name: '',
        email: 'invalid-email',
        role: 'INVALID_ROLE',
      };

      const request = new NextRequest('http://localhost/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
    });
  });

  describe('PATCH /api/admin/users/[id]', () => {
    it('should update user details', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(kv.get).mockResolvedValue(mockUser);
      vi.mocked(kv.set).mockResolvedValue('OK');

      const updateData = {
        name: 'Updated Name',
        status: 'inactive',
      };

      const request = new NextRequest('http://localhost/api/admin/users/user_456', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request, { params: { id: 'user_456' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user.name).toBe(updateData.name);
      expect(data.user.status).toBe(updateData.status);
    });

    it('should handle email updates with uniqueness check', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(kv.get)
        .mockResolvedValueOnce(mockUser) // Existing user
        .mockResolvedValueOnce(null); // Email not taken
      vi.mocked(kv.set).mockResolvedValue('OK');
      vi.mocked(kv.del).mockResolvedValue(1);

      const updateData = {
        email: 'newemail@example.com',
      };

      const request = new NextRequest('http://localhost/api/admin/users/user_456', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request, { params: { id: 'user_456' } });

      expect(response.status).toBe(200);
      expect(vi.mocked(kv.del)).toHaveBeenCalledWith(`user:email:${mockUser.email}`);
      expect(vi.mocked(kv.set)).toHaveBeenCalledWith(`user:email:${updateData.email}`, 'user_456');
    });
  });

  describe('DELETE /api/admin/users/[id]', () => {
    it('should soft delete a user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(kv.get).mockResolvedValue(mockUser);
      vi.mocked(kv.set).mockResolvedValue('OK');

      const request = new NextRequest('http://localhost/api/admin/users/user_456', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'user_456' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('User deactivated successfully');
    });

    it('should prevent self-deletion', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(kv.get).mockResolvedValue({ ...mockUser, id: 'user_123' });

      const request = new NextRequest('http://localhost/api/admin/users/user_123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'user_123' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Cannot delete your own account');
    });
  });
});
