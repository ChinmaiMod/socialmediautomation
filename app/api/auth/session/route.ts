import { NextResponse } from 'next/server';

interface SessionPayload {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

function buildBaseResponse() {
  return NextResponse.json({ success: true });
}

export async function POST(request: Request) {
  const body: SessionPayload = await request.json();
  const accessToken = body.access_token;
  const refreshToken = body.refresh_token;
  const expiresAt = body.expires_at ?? 0;

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: 'Missing session tokens' }, { status: 400 });
  }

  const response = buildBaseResponse();
  const maxAge = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
  const secure = process.env.NODE_ENV === 'production';

  response.cookies.set('sb-access-token', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge,
  });

  response.cookies.set('sb-refresh-token', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

export async function DELETE() {
  const response = buildBaseResponse();
  response.cookies.delete('sb-access-token');
  response.cookies.delete('sb-refresh-token');
  return response;
}
