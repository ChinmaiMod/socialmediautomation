/**
 * @jest-environment node
 */

const cookieSet = jest.fn();
const cookieDelete = jest.fn();

const mockResponse = {
  cookies: {
    set: cookieSet,
    delete: cookieDelete,
  },
};

jest.mock('next/server', () => ({
  NextResponse: {
    json: () => mockResponse,
  },
}));

import { POST, DELETE } from '@/app/api/auth/session/route';

describe('/api/auth/session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://myproj.supabase.co';
    process.env.NODE_ENV = 'test';
  });

  it('POST sets sb-access-token, sb-refresh-token and sb-<project>-auth-token', async () => {
    const req = new Request('http://localhost/api/auth/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        access_token: 'access.jwt',
        refresh_token: 'refresh.jwt',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }),
    });

    await POST(req);

    expect(cookieSet).toHaveBeenCalledWith(
      'sb-access-token',
      'access.jwt',
      expect.objectContaining({ httpOnly: true, path: '/', sameSite: 'lax' })
    );

    expect(cookieSet).toHaveBeenCalledWith(
      'sb-refresh-token',
      'refresh.jwt',
      expect.objectContaining({ httpOnly: true, path: '/', sameSite: 'lax' })
    );

    expect(cookieSet).toHaveBeenCalledWith(
      'sb-myproj-auth-token',
      JSON.stringify(['access.jwt', 'refresh.jwt', null, null, null]),
      expect.objectContaining({ httpOnly: true, path: '/', sameSite: 'lax' })
    );
  });

  it('DELETE clears sb-access-token, sb-refresh-token and sb-<project>-auth-token', async () => {
    await DELETE();

    expect(cookieDelete).toHaveBeenCalledWith('sb-access-token');
    expect(cookieDelete).toHaveBeenCalledWith('sb-refresh-token');
    expect(cookieDelete).toHaveBeenCalledWith('sb-myproj-auth-token');
  });
});
