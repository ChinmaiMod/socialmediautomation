import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Initiate LinkedIn OAuth flow
export async function GET(request: NextRequest) {
  const state = uuidv4();
  
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/linkedin`;
  
  const scope = encodeURIComponent('openid profile email w_member_social');
  
  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId!);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', scope);

  const response = NextResponse.redirect(authUrl.toString());
  
  // Save state in cookie for CSRF protection
  response.cookies.set('linkedin_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });

  return response;
}
