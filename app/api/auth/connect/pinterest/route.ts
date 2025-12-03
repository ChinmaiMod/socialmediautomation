import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Initiate Pinterest OAuth flow
export async function GET(request: NextRequest) {
  const state = uuidv4();
  
  const clientId = process.env.PINTEREST_APP_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/pinterest`;
  
  // Pinterest scopes for posting
  const scope = encodeURIComponent('user_accounts:read,pins:read,pins:write,boards:read,boards:write');
  
  const authUrl = new URL('https://www.pinterest.com/oauth/');
  authUrl.searchParams.set('client_id', clientId!);
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
