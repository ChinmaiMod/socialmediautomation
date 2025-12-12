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

jest.mock('@/lib/ai/trends', () => ({
  researchTrendingTopics: jest.fn(async () => []),
  validateManualTopic: jest.fn(async () => ({ isValid: true, issues: [], suggestions: [] })),
}));

import { GET } from '@/app/api/trends/route';

describe('/api/trends GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    authGetUserMock.mockResolvedValue({ data: { user: null } });
    const req = new NextRequest('http://localhost/api/trends?niche_id=n1');
    await GET(req);
    expect(mockJsonResponse).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 });
  });

  it('returns 404 when niche is not owned by user', async () => {
    authGetUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const nichesQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    fromMock.mockImplementation((table: string) => {
      if (table === 'niches') return nichesQuery;
      throw new Error('unexpected table');
    });

    const req = new NextRequest('http://localhost/api/trends?niche_id=n1');
    await GET(req);
    expect(mockJsonResponse).toHaveBeenCalledWith({ error: 'Niche not found' }, { status: 404 });
  });
});
