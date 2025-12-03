import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabase, handleSupabaseError } from '@/lib/db';

// LinkedIn OAuth callback
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
    const savedState = cookieStore.get('linkedin_oauth_state')?.value;
    
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
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/linkedin`;

    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId!,
        client_secret: clientSecret!,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('LinkedIn token error:', tokenData);
      return NextResponse.redirect(
        new URL('/accounts?error=Failed+to+exchange+authorization+code', request.url)
      );
    }

    // Get user profile
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const profileData = await profileResponse.json();

    if (!profileResponse.ok) {
      console.error('LinkedIn profile error:', profileData);
      return NextResponse.redirect(
        new URL('/accounts?error=Failed+to+fetch+profile', request.url)
      );
    }

    // Calculate token expiration
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + tokenData.expires_in);

    // Save account to database
    const { error: dbError } = await supabase
      .from('accounts')
      .upsert({
        user_id: user.id,
        platform: 'linkedin',
        username: profileData.name || profileData.email,
        profile_url: `https://www.linkedin.com/in/${profileData.sub}`,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
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
    const response = NextResponse.redirect(new URL('/accounts?success=linkedin', request.url));
    response.cookies.delete('linkedin_oauth_state');
    
    return response;
  } catch (error) {
    console.error('LinkedIn OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/accounts?error=Authentication+failed', request.url)
    );
  }
}
