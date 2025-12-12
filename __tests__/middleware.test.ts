/**
 * @jest-environment node
 */

import type { NextRequest } from 'next/server';

const nextMock = jest.fn();
const redirectMock = jest.fn();

jest.mock('next/server', () => {
  return {
    NextResponse: {
      next: (...args: any[]) => nextMock(...args),
      redirect: (...args: any[]) => redirectMock(...args),
    },
  };
});

jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: jest.fn(() => ({
      auth: {
        getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
    })),
  };
});

import { middleware } from '@/middleware';

describe('middleware auth cookie backfill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://myproj.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.NODE_ENV = 'test';

    nextMock.mockImplementation(() => {
      return {
        cookies: { set: jest.fn() },
      };
    });
  });

  function makeRequest(opts: {
    pathname: string;
    cookies?: Record<string, string>;
  }): NextRequest {
    const cookieMap = new Map(Object.entries(opts.cookies ?? {}));

    return {
      nextUrl: { pathname: opts.pathname } as any,
      url: `http://localhost${opts.pathname}`,
      cookies: {
        get: (name: string) => {
          const value = cookieMap.get(name);
          return value ? ({ value } as any) : undefined;
        },
      } as any,
    } as any;
  }

  it('backfills sb-<project>-auth-token when missing', async () => {
    const req = makeRequest({
      pathname: '/content',
      cookies: {
        'sb-access-token': 'access.jwt',
        'sb-refresh-token': 'refresh.jwt',
        // sb-myproj-auth-token is intentionally missing
      },
    });

    const res: any = await middleware(req);

    expect(nextMock).toHaveBeenCalled();
    expect(res.cookies.set).toHaveBeenCalledWith(
      'sb-myproj-auth-token',
      JSON.stringify(['access.jwt', 'refresh.jwt', null, null, null]),
      expect.objectContaining({ httpOnly: true, path: '/', sameSite: 'lax' })
    );
  });

  it('uses access token from sb-<project>-auth-token if sb-access-token missing', async () => {
    const req = makeRequest({
      pathname: '/content',
      cookies: {
        'sb-myproj-auth-token': JSON.stringify(['access.jwt', 'refresh.jwt', null, null, null]),
      },
    });

    await middleware(req);

    expect(nextMock).toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
