import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/db';
import { getTwitterCredentials } from '@/lib/platformCredentials';

export const dynamic = 'force-dynamic';

// Twitter OAuth 2.0 callback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(
        new URL(`/accounts?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/accounts?error=No+authorization+code+received', request.url)
      );
    }

    // Verify state to prevent CSRF
    const cookieStore = cookies();
    const savedState = cookieStore.get('twitter_oauth_state')?.value;
    const codeVerifier = cookieStore.get('twitter_code_verifier')?.value;
    
    if (!savedState || savedState !== state) {
      return NextResponse.redirect(
        new URL('/accounts?error=Invalid+state+parameter', request.url)
      );
    }

    if (!codeVerifier) {
      return NextResponse.redirect(
        new URL('/accounts?error=Missing+PKCE+code+verifier', request.url)
      );
    }

    // Get authenticated user
    const authClient = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await authClient.auth.getUser();
    
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Get credentials from database
    const { clientId, clientSecret } = await getTwitterCredentials();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
      `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;
    const redirectUri = `${appUrl}/api/auth/callback/twitter`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL('/accounts?error=Twitter+credentials+not+configured', request.url)
      );
    }

    // Exchange code for access token using PKCE
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Twitter token error:', tokenData);
      return NextResponse.redirect(
        new URL('/accounts?error=Failed+to+exchange+authorization+code', request.url)
      );
    }

    // Get user profile
    const profileResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=name,username,profile_image_url', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const profileData = await profileResponse.json();

    if (!profileResponse.ok) {
      console.error('Twitter profile error:', profileData);
      return NextResponse.redirect(
        new URL('/accounts?error=Failed+to+fetch+profile', request.url)
      );
    }

    // Calculate token expiration
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + (tokenData.expires_in || 7200));

    // Save account to database
    const { error: dbError } = await supabase
      .from('accounts')
      .upsert({
        user_id: user.id,
        platform: 'twitter',
        name: profileData.data?.name || 'Twitter Account',
        username: profileData.data?.username,
        profile_url: `https://twitter.com/${profileData.data?.username}`,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: tokenExpiresAt.toISOString(),
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform,username',
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.redirect(
        new URL('/accounts?error=Failed+to+save+account', request.url)
      );
    }

    // Clear OAuth cookies
    const response = NextResponse.redirect(new URL('/accounts?success=Twitter+connected+successfully', request.url));
    response.cookies.delete('twitter_oauth_state');
    response.cookies.delete('twitter_code_verifier');
    
    return response;
  } catch (error) {
    console.error('Twitter callback error:', error);
    return NextResponse.redirect(
      new URL('/accounts?error=An+unexpected+error+occurred', request.url)
    );
  }
}
