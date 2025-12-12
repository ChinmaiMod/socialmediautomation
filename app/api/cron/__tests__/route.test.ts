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
    getEnabledAutomationProfiles: jest.fn().mockResolvedValue([]),
  },
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

import { GET } from '@/app/api/cron/route';
import { db } from '@/lib/db';

const mockDb = db as jest.Mocked<typeof db>;

describe('Cron API Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJsonResponse.mockClear();
    delete process.env.CRON_SECRET;
  });

  it('accepts DB stored secret via Authorization header when env secret missing', async () => {
    mockDb.getSetting.mockResolvedValue('dbsecret');
    const request = new NextRequest('http://localhost/api/cron', { method: 'GET', headers: { authorization: 'Bearer dbsecret' } });
    await GET(request);
    expect(mockDb.getSetting).toHaveBeenCalledWith('cron_secret');
    expect(mockJsonResponse.mock.calls[0][0]).toMatchObject({ message: 'No enabled automation profiles found' });
  });
});
