import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAuditLog, getAuditLogs, getUserAuditTrail } from '@/lib/admin/audit';
import { kv } from '@vercel/kv';

// Mock Vercel KV
vi.mock('@vercel/kv', () => ({
  kv: {
    set: vi.fn(),
    get: vi.fn(),
  },
}));

describe('Audit System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAuditLog', () => {
    it('should create audit log entry successfully', async () => {
      vi.mocked(kv.set).mockResolvedValue('OK');
      vi.mocked(kv.get).mockResolvedValue([]);

      const auditParams = {
        userId: 'user_123',
        action: 'CREATE_USER',
        resource: 'user',
        resourceId: 'user_456',
        changes: { name: 'New User', role: 'TENANT' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      await createAuditLog(auditParams);

      expect(vi.mocked(kv.set)).toHaveBeenCalledTimes(4); // audit entry + 3 indexes
    });

    it('should handle audit log creation errors gracefully', async () => {
      vi.mocked(kv.set).mockRejectedValue(new Error('KV error'));

      const auditParams = {
        userId: 'user_123',
        action: 'CREATE_USER',
        resource: 'user',
        resourceId: 'user_456',
        changes: { name: 'New User' },
      };

      // Should not throw error
      await expect(createAuditLog(auditParams)).resolves.toBeUndefined();
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs with pagination', async () => {
      const mockAuditIds = ['audit_1', 'audit_2', 'audit_3'];
      const mockAuditEntry = {
        id: 'audit_1',
        userId: 'user_123',
        action: 'CREATE_USER',
        resource: 'user',
        resourceId: 'user_456',
        changes: { name: 'Test User' },
        timestamp: new Date(),
      };

      vi.mocked(kv.get)
        .mockResolvedValueOnce(mockAuditIds) // Global audit list
        .mockResolvedValueOnce(mockAuditEntry) // First audit entry
        .mockResolvedValueOnce(null) // Second audit entry (null)
        .mockResolvedValueOnce(null); // Third audit entry (null)

      const result = await getAuditLogs({ limit: 3, offset: 0 });

      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(3);
      expect(result.logs[0]).toEqual(mockAuditEntry);
    });

    it('should filter audit logs by action', async () => {
      const mockAuditIds = ['audit_1', 'audit_2'];
      const mockAuditEntry1 = {
        id: 'audit_1',
        action: 'CREATE_USER',
        userId: 'user_123',
        resource: 'user',
        resourceId: 'user_456',
        changes: {},
        timestamp: new Date(),
      };
      const mockAuditEntry2 = {
        id: 'audit_2',
        action: 'UPDATE_USER',
        userId: 'user_123',
        resource: 'user',
        resourceId: 'user_456',
        changes: {},
        timestamp: new Date(),
      };

      vi.mocked(kv.get)
        .mockResolvedValueOnce(mockAuditIds)
        .mockResolvedValueOnce(mockAuditEntry1)
        .mockResolvedValueOnce(mockAuditEntry2);

      const result = await getAuditLogs({ action: 'CREATE_USER' });

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].action).toBe('CREATE_USER');
    });
  });

  describe('getUserAuditTrail', () => {
    it('should retrieve user-specific audit trail', async () => {
      const mockAuditIds = ['audit_1'];
      const mockAuditEntry = {
        id: 'audit_1',
        userId: 'user_123',
        action: 'LOGIN',
        resource: 'session',
        resourceId: 'session_456',
        changes: {},
        timestamp: new Date(),
      };

      vi.mocked(kv.get)
        .mockResolvedValueOnce(mockAuditIds) // User audit list
        .mockResolvedValueOnce(mockAuditEntry); // Audit entry

      const result = await getUserAuditTrail('user_123', 10);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user_123');
    });
  });
});
