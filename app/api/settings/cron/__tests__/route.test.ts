/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

const mockJsonResponse = jest.fn((data: any, init?: { status?: number }) => ({
  json: async () => data,
  status: init?.status || 200,
}));

jest.mock('next/server', () => ({
  NextRequest: jest.requireActual('next/server').NextRequest,
  NextResponse: {
    json: (data: any, init?: { status?: number }) => mockJsonResponse(data, init),
  },
}));

jest.mock('@/lib/db', () => ({
  db: {
    getSetting: jest.fn(),
    updateSetting: jest.fn(),
  },
}));

import { POST, GET } from '@/app/api/settings/cron/route';
import { db } from '@/lib/db';

const mockDb = db as jest.Mocked<typeof db>;

describe('Settings Cron API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJsonResponse.mockClear();
  });

  it('should fail POST without service role token', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-role';
    const request = new NextRequest('http://localhost/api/settings/cron', { method: 'POST' });
    await POST(request);
    expect(mockJsonResponse).toHaveBeenCalledWith({ success: false, error: 'Unauthorized' }, { status: 401 });
  });

  it('should rotate cron secret when authorized by service role', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-role';
    mockDb.updateSetting.mockResolvedValue(undefined as unknown as void);
    const request = new NextRequest('http://localhost/api/settings/cron', { method: 'POST', headers: { authorization: 'Bearer test-role' } });
    await POST(request);
    expect(mockDb.updateSetting).toHaveBeenCalledWith('cron_secret', expect.any(String));
    const returned = mockJsonResponse.mock.calls[0][0];
    expect(returned.success).toBe(true);
    expect(returned.data).toHaveProperty('secret');
    expect(typeof returned.data.secret).toBe('string');
  });

  it('should return masked cron secret on GET', async () => {
    mockDb.getSetting.mockResolvedValue('abcd1234secretvalue5678');
    const request = new NextRequest('http://localhost/api/settings/cron');
    await GET(request);
    expect(mockDb.getSetting).toHaveBeenCalledWith('cron_secret');
    const returned = mockJsonResponse.mock.calls[0][0];
    expect(returned.success).toBe(true);
    expect(returned.data.secret).toMatch(/^abcd\.+5678$/);
  });
});
