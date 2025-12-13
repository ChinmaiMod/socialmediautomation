import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getFacebookCredentials } from '@/lib/platformCredentials';

export const dynamic = 'force-dynamic';

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
    const { clientId, clientSecret } = await getFacebookCredentials();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
      `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;
    const redirectUri = `${appUrl}/api/auth/callback/instagram`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL('/accounts?error=Instagram%2FFacebook+is+not+configured', request.url)
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
      console.error('Instagram token error:', tokenData);
      return NextResponse.redirect(
        new URL('/accounts?error=Failed+to+exchange+authorization+code', request.url)
      );
    }

    // Exchange for long-lived token (60 days) for stability
    const longLivedUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longLivedUrl.searchParams.set('client_id', clientId);
    longLivedUrl.searchParams.set('client_secret', clientSecret);
    longLivedUrl.searchParams.set('fb_exchange_token', tokenData.access_token);

    const longLivedResponse = await fetch(longLivedUrl.toString());
    const longLivedData = await longLivedResponse.json();

    const accessToken = longLivedData.access_token || tokenData.access_token;
    const expiresIn = longLivedData.expires_in || tokenData.expires_in || 5184000;

    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + expiresIn);

    // Get Instagram Business Account
    // First, get Facebook Pages the user has access to
    const pagesUrl = new URL('https://graph.facebook.com/v18.0/me/accounts');
    pagesUrl.searchParams.set('access_token', accessToken);
    pagesUrl.searchParams.set('fields', 'id,name,instagram_business_account');

    const pagesResponse = await fetch(pagesUrl.toString());
    const pagesData = await pagesResponse.json();

    if (!pagesResponse.ok || pagesData.error) {
      console.error('Instagram pages error:', pagesData);
      return NextResponse.redirect(
        new URL('/accounts?error=Failed+to+fetch+Instagram+account', request.url)
      );
    }

    const pages: any[] = pagesData.data || [];
    const instagramCandidates = pages
      .filter((p) => p?.instagram_business_account?.id)
      .map((p) => ({ page_id: p.id, page_name: p.name, instagram_account_id: p.instagram_business_account.id }));

    if (instagramCandidates.length === 0) {
      return NextResponse.redirect(
        new URL('/accounts?error=No+Instagram+Business+Account+found', request.url)
      );
    }

    const supabase = authClient;

    // If there is exactly one IG business account, connect it immediately.
    if (instagramCandidates.length === 1) {
      const selected = instagramCandidates[0];

      const instagramUrl = new URL(`https://graph.facebook.com/v18.0/${selected.instagram_account_id}`);
      instagramUrl.searchParams.set('access_token', accessToken);
      instagramUrl.searchParams.set('fields', 'id,username,profile_picture_url');

      const instagramResponse = await fetch(instagramUrl.toString());
      const instagramData = await instagramResponse.json();

      if (!instagramResponse.ok || instagramData?.error) {
        console.error('Instagram account details error:', instagramData);
        return NextResponse.redirect(
          new URL('/accounts?error=Failed+to+fetch+Instagram+account+details', request.url)
        );
      }

      const igUsername = instagramData.username || 'Instagram Business';
      const igId = instagramData.id || selected.instagram_account_id;

      const { error: dbError } = await supabase
        .from('accounts')
        .upsert(
          {
            user_id: user.id,
            platform: 'instagram',
            name: igUsername,
            username: igId,
            profile_url: igUsername ? `https://www.instagram.com/${igUsername}` : null,
            access_token: accessToken,
            token_expires_at: tokenExpiresAt.toISOString(),
            is_active: true,
          },
          { onConflict: 'user_id,platform,username' }
        );

      if (dbError) {
        console.error('Database error:', dbError);
        return NextResponse.redirect(
          new URL('/accounts?error=Failed+to+save+account', request.url)
        );
      }

      const response = NextResponse.redirect(new URL('/accounts?success=instagram', request.url));
      response.cookies.delete('instagram_oauth_state');
      response.cookies.delete('instagram_user_access_token');
      response.cookies.delete('instagram_user_token_expires_at');
      return response;
    }

    // Multiple accounts: redirect to selection UI
    const response = NextResponse.redirect(new URL('/accounts/connect?platform=instagram&select=1', request.url));
    response.cookies.delete('instagram_oauth_state');
    response.cookies.set('instagram_user_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
    });
    response.cookies.set('instagram_user_token_expires_at', tokenExpiresAt.toISOString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
    });
    return response;
  } catch (error) {
    console.error('Instagram OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/accounts?error=Authentication+failed', request.url)
    );
  }
}
