import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, PATCH } from '@/app/api/admin/settings/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { kv } from '@vercel/kv';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
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

const mockSettings = {
  id: 'system_settings',
  propertyId: 'default',
  general: {
    timezone: 'Asia/Bangkok',
    currency: 'VND',
    dateFormat: 'DD/MM/YYYY',
    language: 'en',
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    reminderSchedule: [7, 3, 1],
  },
  payment: {
    dueDate: 1,
    lateFeeAmount: 50000,
    lateFeeGracePeriod: 3,
    autoReminders: true,
  },
  property: {
    name: 'Test Property',
    address: '123 Test St',
    description: 'A test property',
    houseRules: 'No smoking',
    amenities: ['WiFi', 'Kitchen'],
    maxOccupancy: 10,
  },
};

describe('System Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/settings', () => {
    it('should return unauthorized for non-property owners', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/settings');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return settings for property owners', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(kv.get).mockResolvedValue(mockSettings);

      const request = new NextRequest('http://localhost/api/admin/settings');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.settings).toEqual(mockSettings);
    });

    it('should return 404 when settings not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(kv.get).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/settings');
      const response = await GET(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Settings not found');
    });
  });

  describe('PATCH /api/admin/settings', () => {
    it('should update settings successfully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(kv.get).mockResolvedValue(mockSettings);
      vi.mocked(kv.set).mockResolvedValue('OK');

      const updateData = {
        general: {
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'MM/DD/YYYY',
          language: 'en',
        },
        notifications: mockSettings.notifications,
        payment: mockSettings.payment,
        property: mockSettings.property,
      };

      const request = new NextRequest('http://localhost/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.settings.general.timezone).toBe('UTC');
      expect(data.settings.general.currency).toBe('USD');
    });

    it('should validate settings data', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const invalidData = {
        general: {
          timezone: '', // Invalid empty timezone
          currency: 'INVALID',
          dateFormat: 'INVALID',
          language: '',
        },
        notifications: {
          emailEnabled: 'not_boolean', // Invalid type
          smsEnabled: false,
          pushEnabled: true,
          reminderSchedule: ['not_number'], // Invalid array type
        },
        payment: {
          dueDate: 0, // Invalid date (must be 1-28)
          lateFeeAmount: -100, // Invalid negative amount
          lateFeeGracePeriod: -1, // Invalid negative period
          autoReminders: true,
        },
        property: {
          name: '',
          address: '',
          description: '',
          houseRules: '',
          amenities: 'not_array', // Invalid type
          maxOccupancy: 0, // Invalid occupancy
        },
      };

      const request = new NextRequest('http://localhost/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(invalidData),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
    });

    it('should handle payment due date validation', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(kv.get).mockResolvedValue(mockSettings);

      const updateData = {
        ...mockSettings,
        payment: {
          ...mockSettings.payment,
          dueDate: 29, // Invalid date (must be 1-28)
        },
      };

      const request = new NextRequest('http://localhost/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
    });
  });
});
