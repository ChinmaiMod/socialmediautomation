import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/db';

// Facebook/Instagram OAuth callback (uses same endpoint, Meta Graph API)
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
    const savedState = cookieStore.get('facebook_oauth_state')?.value;
    
    if (!savedState || savedState !== state) {
      return NextResponse.redirect(
        new URL('/accounts?error=Invalid+state+parameter', request.url)
      );
    }

    // Get authenticated user
    const authClient = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await authClient.auth.getUser();
    
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Exchange code for access token
    const clientId = process.env.FACEBOOK_APP_ID;
    const clientSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/facebook`;

    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', clientId!);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('client_secret', clientSecret!);
    tokenUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('Facebook token error:', tokenData);
      return NextResponse.redirect(
        new URL('/accounts?error=Failed+to+exchange+authorization+code', request.url)
      );
    }

    // Get long-lived token
    const longLivedUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longLivedUrl.searchParams.set('client_id', clientId!);
    longLivedUrl.searchParams.set('client_secret', clientSecret!);
    longLivedUrl.searchParams.set('fb_exchange_token', tokenData.access_token);

    const longLivedResponse = await fetch(longLivedUrl.toString());
    const longLivedData = await longLivedResponse.json();

    const accessToken = longLivedData.access_token || tokenData.access_token;
    const expiresIn = longLivedData.expires_in || tokenData.expires_in || 5184000; // 60 days default

    // Get user profile and pages
    const profileUrl = new URL('https://graph.facebook.com/v18.0/me');
    profileUrl.searchParams.set('fields', 'id,name,email');
    profileUrl.searchParams.set('access_token', accessToken);

    const profileResponse = await fetch(profileUrl.toString());
    const profileData = await profileResponse.json();

    if (!profileResponse.ok || profileData.error) {
      console.error('Facebook profile error:', profileData);
      return NextResponse.redirect(
        new URL('/accounts?error=Failed+to+fetch+profile', request.url)
      );
    }

    // Calculate token expiration
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + expiresIn);

    // Save account to database
    const { error: dbError } = await supabase
      .from('accounts')
      .upsert({
        user_id: user.id,
        platform: 'facebook',
        username: profileData.name,
        profile_url: `https://www.facebook.com/${profileData.id}`,
        access_token: accessToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        is_active: true,
      }, {
        onConflict: 'user_id,platform,username',
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.redirect(
        new URL('/accounts?error=Failed+to+save+account', request.url)
      );
    }

    // Clear the state cookie
    const response = NextResponse.redirect(new URL('/accounts?success=facebook', request.url));
    response.cookies.delete('facebook_oauth_state');
    
    return response;
  } catch (error) {
    console.error('Facebook OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/accounts?error=Authentication+failed', request.url)
    );
  }
}
