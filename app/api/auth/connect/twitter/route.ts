import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getTwitterCredentials } from '@/lib/platformCredentials';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Twitter/X uses OAuth 2.0 with PKCE
// Initiate Twitter OAuth flow
export async function GET(request: NextRequest) {
  const { clientId } = await getTwitterCredentials();
  
  // Get app URL from env or derive from request
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
    `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;

  if (!clientId) {
    const errorUrl = new URL('/accounts/connect', request.url);
    errorUrl.searchParams.set('error', 'Twitter/X is not configured. Please add credentials in Settings → Social Platforms.');
    return NextResponse.redirect(errorUrl.toString());
  }

  const state = uuidv4();
  
  // Generate PKCE code verifier and challenge
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  const redirectUri = `${appUrl}/api/auth/callback/twitter`;
  
  // Twitter OAuth 2.0 scopes
  const scopes = [
    'tweet.read',
    'tweet.write',
    'users.read',
    'offline.access',
  ].join(' ');
  
  const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const response = NextResponse.redirect(authUrl.toString());
  
  // Save state and code verifier in cookies for CSRF protection and PKCE
  response.cookies.set('twitter_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });

  response.cookies.set('twitter_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });

  return response;
}
