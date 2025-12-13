import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function extractOrganizationIdFromUrn(urn: string): string | null {
  if (!urn) return null;
  const match = urn.match(/urn:li:organization:(\d+)/);
  return match?.[1] || null;
}

async function fetchLinkedInOrganizations(accessToken: string): Promise<Array<{ id: string; name: string; vanityName?: string }>> {
  const aclsUrl = new URL('https://api.linkedin.com/v2/organizationAcls');
  aclsUrl.searchParams.set('q', 'roleAssignee');
  aclsUrl.searchParams.set('role', 'ADMINISTRATOR');
  aclsUrl.searchParams.set('state', 'APPROVED');
  aclsUrl.searchParams.set('projection', '(elements*(organization,role,state))');

  const aclsResp = await fetch(aclsUrl.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
    },
  });

  const aclsData = await aclsResp.json().catch(() => ({}));
  if (!aclsResp.ok) {
    const message = aclsData?.message || aclsData?.error_description || aclsData?.error || 'Failed to fetch LinkedIn organizations';
    throw new Error(message);
  }

  const orgIds: string[] = (aclsData?.elements || [])
    .map((e: any) => extractOrganizationIdFromUrn(e?.organization))
    .filter(Boolean);

  const uniqueOrgIds = Array.from(new Set(orgIds));
  if (uniqueOrgIds.length === 0) return [];

  const orgs = await Promise.all(
    uniqueOrgIds.map(async (id) => {
      const orgResp = await fetch(`https://api.linkedin.com/v2/organizations/${id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });
      const orgData = await orgResp.json().catch(() => ({}));
      if (!orgResp.ok) {
        return { id, name: `LinkedIn Organization ${id}` };
      }
      return {
        id,
        name: orgData?.localizedName || orgData?.name || `LinkedIn Organization ${id}`,
        vanityName: orgData?.vanityName || undefined,
      };
    })
  );

  return orgs;
}

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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
      `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;
    const redirectUri = `${appUrl}/api/auth/callback/linkedin`;

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

    // If the token has org permissions, allow selecting which Company Page to connect.
    // If org lookup fails (missing approval/scopes), fall back to personal profile connect.
    try {
      const orgs = await fetchLinkedInOrganizations(tokenData.access_token);
      if (orgs.length > 1) {
        const response = NextResponse.redirect(new URL('/accounts/connect?platform=linkedin&select=1', request.url));
        response.cookies.delete('linkedin_oauth_state');
        response.cookies.set('linkedin_user_access_token', tokenData.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 600,
        });
        response.cookies.set('linkedin_user_token_expires_at', tokenExpiresAt.toISOString(), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 600,
        });
        return response;
      }

      if (orgs.length === 1) {
        const selected = orgs[0];
        const profileUrl = selected.vanityName
          ? `https://www.linkedin.com/company/${selected.vanityName}`
          : `https://www.linkedin.com/company/${selected.id}`;

        const { error: dbError } = await authClient
          .from('accounts')
          .upsert(
            {
              user_id: user.id,
              platform: 'linkedin',
              name: selected.name,
              username: selected.id,
              profile_url: profileUrl,
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token || null,
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

        const response = NextResponse.redirect(new URL('/accounts?success=linkedin', request.url));
        response.cookies.delete('linkedin_oauth_state');
        return response;
      }
    } catch (orgErr) {
      // Ignore org selection failures and continue with personal profile connection.
      console.warn('LinkedIn org discovery failed; falling back to profile:', orgErr);
    }

    // Save account to database
    const profileSub = (profileData?.sub as string | undefined) || null;
    const displayName = (profileData?.name as string | undefined) || (profileData?.email as string | undefined) || 'LinkedIn';

    const { error: dbError } = await authClient
      .from('accounts')
      .upsert(
        {
          user_id: user.id,
          platform: 'linkedin',
          name: displayName,
          username: profileSub || displayName,
          profile_url: profileSub ? `https://www.linkedin.com/in/${profileSub}` : null,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          token_expires_at: tokenExpiresAt.toISOString(),
          is_active: true,
        },
        {
          onConflict: 'user_id,platform,username',
        }
      );

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
