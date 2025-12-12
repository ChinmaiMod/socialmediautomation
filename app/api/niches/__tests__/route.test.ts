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

jest.mock('next/headers', () => ({
  cookies: () => ({}),
}));

const fromMock = jest.fn();
const authGetUserMock = jest.fn();

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createServerComponentClient: () => ({
    auth: {
      getUser: authGetUserMock,
    },
    from: fromMock,
  }),
}));

import { GET } from '@/app/api/niches/route';

describe('/api/niches GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    authGetUserMock.mockResolvedValue({ data: { user: null } });
    const req = new NextRequest('http://localhost/api/niches');
    await GET(req);
    expect(mockJsonResponse).toHaveBeenCalledWith({ success: false, error: 'Unauthorized' }, { status: 401 });
  });

  it('auto-creates a default niche when none exist', async () => {
    authGetUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const selectChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    const insertChain: any = {
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'n1', user_id: 'user-1', name: 'General' },
        error: null,
      }),
    };

    fromMock.mockImplementation((table: string) => {
      if (table !== 'niches') throw new Error('unexpected table');

      const base: any = {
        select: selectChain.select,
        eq: selectChain.eq,
        order: selectChain.order,
        insert: jest.fn(() => insertChain),
      };

      // make insertChain.select() chainable
      insertChain.select.mockImplementation(() => insertChain);
      return base;
    });

    const req = new NextRequest('http://localhost/api/niches');
    await GET(req);

    const returned = mockJsonResponse.mock.calls[0][0];
    expect(returned.success).toBe(true);
    expect(returned.data[0].name).toBe('General');
  });
});
