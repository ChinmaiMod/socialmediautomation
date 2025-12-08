import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getPinterestCredentials } from '@/lib/platformCredentials';

export const dynamic = 'force-dynamic';

// Initiate Pinterest OAuth flow
export async function GET(request: NextRequest) {
  const { clientId } = await getPinterestCredentials();
  
  // Get app URL from env or derive from request
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
    `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;

  if (!clientId) {
    const errorUrl = new URL('/accounts/connect', request.url);
    errorUrl.searchParams.set('error', 'Pinterest is not configured. Please add credentials in Settings → Integrations.');
    return NextResponse.redirect(errorUrl.toString());
  }

  const state = uuidv4();
  const redirectUri = `${appUrl}/api/auth/callback/pinterest`;
  
  // Pinterest scopes for posting
  const scope = encodeURIComponent('user_accounts:read,pins:read,pins:write,boards:read,boards:write');
  
  const authUrl = new URL('https://www.pinterest.com/oauth/');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authUrl.toString());
  
  // Save state in cookie for CSRF protection
  response.cookies.set('pinterest_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });

  return response;
}
