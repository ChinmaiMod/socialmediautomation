import { NextResponse } from 'next/server';

interface SessionPayload {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

function getProjectRefFromSupabaseUrl(supabaseUrl: string | undefined): string | null {
  if (!supabaseUrl) return null;
  try {
    const { hostname } = new URL(supabaseUrl);
    // Typical format: <project-ref>.supabase.co
    const projectRef = hostname.split('.')[0];
    return projectRef || null;
  } catch {
    return null;
  }
}

function buildSupabaseAuthCookieName(): string | null {
  const projectRef = getProjectRefFromSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!projectRef) return null;
  return `sb-${projectRef}-auth-token`;
}

function buildSupabaseAuthCookieValue(accessToken: string, refreshToken: string) {
  // Matches @supabase/auth-helpers-shared stringifySupabaseSession()
  return JSON.stringify([accessToken, refreshToken, null, null, null]);
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

  // Also write the cookie format expected by @supabase/auth-helpers-nextjs.
  // This fixes API routes that use createServerComponentClient().
  const supabaseAuthCookieName = buildSupabaseAuthCookieName();
  if (supabaseAuthCookieName) {
    response.cookies.set(supabaseAuthCookieName, buildSupabaseAuthCookieValue(accessToken, refreshToken), {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      // Keep it long-lived so refresh_token can be used.
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}

export async function DELETE() {
  const response = buildBaseResponse();
  response.cookies.delete('sb-access-token');
  response.cookies.delete('sb-refresh-token');

  const supabaseAuthCookieName = buildSupabaseAuthCookieName();
  if (supabaseAuthCookieName) {
    response.cookies.delete(supabaseAuthCookieName);
  }
  return response;
}
