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

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    models: { list: async () => ({ data: [{ id: 'test' }] }) },
  })),
}));

import { GET, PUT, POST } from '@/app/api/settings/integrations/openrouter/route';
import { db } from '@/lib/db';

const mockDb = db as jest.Mocked<any>;

describe('OpenRouter integration settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJsonResponse.mockClear();
  });

  it('should return masked key in GET', async () => {
    mockDb.getSetting.mockResolvedValue('openrouter-key-1234567890');
    mockDb.getSetting.mockResolvedValueOnce('true'); // enabled
    const request = new NextRequest('http://localhost/api/settings/integrations/openrouter');
    await GET(request);
    expect(mockDb.getSetting).toHaveBeenCalledTimes(2);
    const returned = mockJsonResponse.mock.calls[0][0];
    expect(returned.success).toBe(true);
    expect(returned.data.enabled).toBe(true);
    expect(returned.data.key).toMatch(/7890|••••/);
  });

  it('should require admin token to PUT in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'adminrole';
    const request = new NextRequest('http://localhost/api/settings/integrations/openrouter', { method: 'PUT' });
    // ensure json() doesn't throw
    // @ts-ignore
    request.json = async () => ({});
    await PUT(request);
    expect(mockJsonResponse).toHaveBeenCalledWith({ success: false, error: 'Unauthorized' }, { status: 401 });
  });

  it('should update settings when provided with admin token', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'adminrole';
    const request = new NextRequest('http://localhost/api/settings/integrations/openrouter', { method: 'PUT', headers: { authorization: 'Bearer adminrole' }, body: JSON.stringify({ enabled: true, key: 'new-key-abc' }) });
    // NextRequest doesn't accept body in this way; simply create via new NextRequest(url, opts) API works for tests, but json parsing won't
    const req = new NextRequest('http://localhost/api/settings/integrations/openrouter', { method: 'PUT', headers: { authorization: 'Bearer adminrole' } });
    // Mock json() to return our body
    // @ts-ignore
    req.json = async () => ({ enabled: true, key: 'new-key-abc' });
    await PUT(req);
    expect(mockDb.updateSetting).toHaveBeenCalledWith('openrouter_enabled', 'true');
    expect(mockDb.updateSetting).toHaveBeenCalledWith('openrouter_api_key', 'new-key-abc');
    const returned = mockJsonResponse.mock.calls[0][0];
    expect(returned.success).toBe(true);
  });

  it('should test provided key via POST', async () => {
    const req = new NextRequest('http://localhost/api/settings/integrations/openrouter/test', { method: 'POST' });
    // mock json for body { key }
    // @ts-ignore
    req.json = async () => ({ key: 'openrouter-test-key' });
    await POST(req);
    const returned = mockJsonResponse.mock.calls[0][0];
    expect(returned.success).toBe(true);
    expect(returned.data.models).toBeGreaterThan(0);
  });
});
