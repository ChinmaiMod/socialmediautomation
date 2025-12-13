import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const publicRoutes = ['/login', '/register'];

function getProjectRefFromSupabaseUrl(supabaseUrl: string): string | null {
  try {
    const { hostname } = new URL(supabaseUrl);
    const projectRef = hostname.split('.')[0];
    return projectRef || null;
  } catch {
    return null;
  }
}

function getSupabaseAuthCookieName(supabaseUrl: string): string | null {
  const projectRef = getProjectRefFromSupabaseUrl(supabaseUrl);
  if (!projectRef) return null;
  return `sb-${projectRef}-auth-token`;
}

function tryReadAccessTokenFromAuthCookie(value: string | undefined): { accessToken?: string; refreshToken?: string } {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return { accessToken: parsed[0], refreshToken: parsed[1] };
    }
    if (parsed && typeof parsed === 'object') {
      return { accessToken: parsed.access_token, refreshToken: parsed.refresh_token };
    }
    return {};
  } catch {
    return {};
  }
}

function buildSupabaseAuthCookieValue(accessToken: string, refreshToken: string) {
  return JSON.stringify([accessToken, refreshToken, null, null, null]);
}

function redirectToLogin(request: NextRequest, pathname: string) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Canonical domain redirect (prevents OAuth redirect_uri + cookie domain mismatches
  // when the site is accessed via multiple Vercel aliases).
  const canonicalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (canonicalAppUrl && (request.method === 'GET' || request.method === 'HEAD')) {
    try {
      const canonical = new URL(canonicalAppUrl);
      const canonicalHost = canonical.host;
      const canonicalProto = canonical.protocol;
      const currentHost = request.headers.get('host') ?? request.nextUrl.host;

      if (canonicalHost && currentHost && canonicalHost !== currentHost) {
        const redirectUrl = new URL(request.url);
        redirectUrl.protocol = canonicalProto;
        redirectUrl.host = canonicalHost;
        return NextResponse.redirect(redirectUrl);
      }
    } catch {
      // Ignore invalid NEXT_PUBLIC_APP_URL
    }
  }

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  if (isPublicRoute || pathname.startsWith('/_next') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured.');
  }

  const authCookieName = getSupabaseAuthCookieName(supabaseUrl);
  const authCookieValue = authCookieName ? request.cookies.get(authCookieName)?.value : undefined;
  const fromAuthCookie = tryReadAccessTokenFromAuthCookie(authCookieValue);

  const accessToken = request.cookies.get('sb-access-token')?.value ?? fromAuthCookie.accessToken;
  const refreshToken = request.cookies.get('sb-refresh-token')?.value ?? fromAuthCookie.refreshToken;

  if (!accessToken) {
    return redirectToLogin(request, pathname);
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return redirectToLogin(request, pathname);
  }

  const response = NextResponse.next();

  // Backfill the cookie format expected by @supabase/auth-helpers-nextjs.
  // This prevents UI pages from loading while API routes return 401.
  if (authCookieName && !authCookieValue && accessToken && refreshToken) {
    response.cookies.set(authCookieName, buildSupabaseAuthCookieValue(accessToken, refreshToken), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - login and register pages
     */
    '/((?!_next/static|_next/image|favicon.ico|login|register).*)',
  ],
};
