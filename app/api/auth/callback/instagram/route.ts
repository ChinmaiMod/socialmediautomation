import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/db';

// Instagram OAuth callback (via Facebook Graph API)
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
    const savedState = cookieStore.get('instagram_oauth_state')?.value;
    
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
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/instagram`;

    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', clientId!);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('client_secret', clientSecret!);
    tokenUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('Instagram token error:', tokenData);
      return NextResponse.redirect(
        new URL('/accounts?error=Failed+to+exchange+authorization+code', request.url)
      );
    }

    // Get Instagram Business Account
    // First, get Facebook Pages the user has access to
    const pagesUrl = new URL('https://graph.facebook.com/v18.0/me/accounts');
    pagesUrl.searchParams.set('access_token', tokenData.access_token);
    pagesUrl.searchParams.set('fields', 'id,name,instagram_business_account');

    const pagesResponse = await fetch(pagesUrl.toString());
    const pagesData = await pagesResponse.json();

    if (!pagesResponse.ok || pagesData.error) {
      console.error('Instagram pages error:', pagesData);
      return NextResponse.redirect(
        new URL('/accounts?error=Failed+to+fetch+Instagram+account', request.url)
      );
    }

    // Find a page with an Instagram Business Account
    const pageWithInstagram = pagesData.data?.find((page: any) => page.instagram_business_account);
    
    if (!pageWithInstagram) {
      return NextResponse.redirect(
        new URL('/accounts?error=No+Instagram+Business+Account+found', request.url)
      );
    }

    // Get Instagram account details
    const instagramUrl = new URL(`https://graph.facebook.com/v18.0/${pageWithInstagram.instagram_business_account.id}`);
    instagramUrl.searchParams.set('access_token', tokenData.access_token);
    instagramUrl.searchParams.set('fields', 'id,username,profile_picture_url');

    const instagramResponse = await fetch(instagramUrl.toString());
    const instagramData = await instagramResponse.json();

    // Calculate token expiration (60 days for long-lived token)
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 60);

    // Save account to database
    const { error: dbError } = await supabase
      .from('accounts')
      .upsert({
        user_id: user.id,
        platform: 'instagram',
        username: instagramData.username || 'Instagram Business',
        profile_url: `https://www.instagram.com/${instagramData.username}`,
        access_token: tokenData.access_token,
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
    const response = NextResponse.redirect(new URL('/accounts?success=instagram', request.url));
    response.cookies.delete('instagram_oauth_state');
    
    return response;
  } catch (error) {
    console.error('Instagram OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/accounts?error=Authentication+failed', request.url)
    );
  }
}
