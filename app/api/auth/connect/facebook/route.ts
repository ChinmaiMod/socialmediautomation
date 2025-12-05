import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getFacebookCredentials } from '@/lib/platformCredentials';

export const dynamic = 'force-dynamic';

// Initiate Facebook OAuth flow
export async function GET(request: NextRequest) {
  const { clientId } = await getFacebookCredentials();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId) {
    const errorUrl = new URL('/accounts/connect', request.url);
    errorUrl.searchParams.set('error', 'Facebook is not configured. Please add credentials in Settings → Integrations.');
    return NextResponse.redirect(errorUrl.toString());
  }

  if (!appUrl) {
    const errorUrl = new URL('/accounts/connect', request.url);
    errorUrl.searchParams.set('error', 'App URL not configured.');
    return NextResponse.redirect(errorUrl.toString());
  }

  const state = uuidv4();
  const redirectUri = `${appUrl}/api/auth/callback/facebook`;
  
  // Permissions for posting to pages
  const scope = encodeURIComponent('public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts');
  
  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', scope);

  const response = NextResponse.redirect(authUrl.toString());
  
  // Save state in cookie for CSRF protection
  response.cookies.set('facebook_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });

  return response;
}
