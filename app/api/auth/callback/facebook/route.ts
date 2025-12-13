import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getFacebookCredentials } from '@/lib/platformCredentials';

export const dynamic = 'force-dynamic';

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
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Exchange code for access token
    const { clientId, clientSecret } = await getFacebookCredentials();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
      `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;
    const redirectUri = `${appUrl}/api/auth/callback/facebook`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL('/accounts?error=Facebook+is+not+configured', request.url)
      );
    }

    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', clientId);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('client_secret', clientSecret);
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
    longLivedUrl.searchParams.set('client_id', clientId);
    longLivedUrl.searchParams.set('client_secret', clientSecret);
    longLivedUrl.searchParams.set('fb_exchange_token', tokenData.access_token);

    const longLivedResponse = await fetch(longLivedUrl.toString());
    const longLivedData = await longLivedResponse.json();

    const accessToken = longLivedData.access_token || tokenData.access_token;
    const expiresIn = longLivedData.expires_in || tokenData.expires_in || 5184000; // 60 days default

    // Fetch Pages managed by the user. This allows a Buffer-like flow
    // where the user selects which Business Page to connect.
    const pagesUrl = new URL('https://graph.facebook.com/v18.0/me/accounts');
    pagesUrl.searchParams.set('access_token', accessToken);
    pagesUrl.searchParams.set('fields', 'id,name,access_token');

    const pagesResponse = await fetch(pagesUrl.toString());
    const pagesData = await pagesResponse.json();

    if (!pagesResponse.ok || pagesData.error) {
      console.error('Facebook pages error:', pagesData);
      return NextResponse.redirect(
        new URL('/accounts?error=Failed+to+fetch+Facebook+Pages', request.url)
      );
    }

    const pages: Array<{ id: string; name: string; access_token: string }> = pagesData.data || [];

    if (pages.length === 0) {
      return NextResponse.redirect(
        new URL('/accounts?error=No+Facebook+Pages+found+(check+permissions)', request.url)
      );
    }

    // Calculate token expiration
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + expiresIn);

    // If there is exactly one Page, connect it immediately.
    // Otherwise, store the user token briefly and redirect to a selection UI.
    if (pages.length === 1) {
      const page = pages[0];

      const { error: dbError } = await supabase
        .from('accounts')
        .upsert(
          {
            user_id: user.id,
            platform: 'facebook',
            name: page.name,
            username: page.id, // store Page ID
            profile_url: `https://www.facebook.com/${page.id}`,
            access_token: page.access_token, // store Page access token
            token_expires_at: tokenExpiresAt.toISOString(),
            is_active: true,
          },
          { onConflict: 'user_id,platform,username' }
        );

      if (dbError) {
        console.error('Database error:', dbError);
        return NextResponse.redirect(
          new URL('/accounts?error=Failed+to+save+Facebook+Page', request.url)
        );
      }

      const response = NextResponse.redirect(new URL('/accounts?success=facebook', request.url));
      response.cookies.delete('facebook_oauth_state');
      response.cookies.delete('facebook_user_access_token');
      return response;
    }

    const response = NextResponse.redirect(new URL('/accounts/connect?platform=facebook&select=1', request.url));

    // Save state + token briefly for the selection step.
    response.cookies.delete('facebook_oauth_state');
    response.cookies.set('facebook_user_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });
    response.cookies.set('facebook_user_token_expires_at', tokenExpiresAt.toISOString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
    });

    return response;
  } catch (error) {
    console.error('Facebook OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/accounts?error=Authentication+failed', request.url)
    );
  }
}
