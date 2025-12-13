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

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const organizationId = body?.organization_id as string | undefined;

    if (!organizationId) {
      return NextResponse.json({ success: false, error: 'organization_id is required' }, { status: 400 });
    }

    const userAccessToken = cookieStore.get('linkedin_user_access_token')?.value;
    const expiresAt = cookieStore.get('linkedin_user_token_expires_at')?.value;

    if (!userAccessToken) {
      return NextResponse.json(
        { success: false, error: 'LinkedIn connect session expired. Please try connecting again.' },
        { status: 400 }
      );
    }

    const orgs = await fetchLinkedInOrganizations(userAccessToken);
    const selected = orgs.find((o) => o.id === organizationId);

    if (!selected) {
      return NextResponse.json({ success: false, error: 'Selected organization not found' }, { status: 404 });
    }

    const profileUrl = selected.vanityName
      ? `https://www.linkedin.com/company/${selected.vanityName}`
      : `https://www.linkedin.com/company/${selected.id}`;

    const { error: dbError } = await supabase
      .from('accounts')
      .upsert(
        {
          user_id: user.id,
          platform: 'linkedin',
          name: selected.name,
          username: selected.id,
          profile_url: profileUrl,
          access_token: userAccessToken,
          token_expires_at: expiresAt || null,
          is_active: true,
        },
        { onConflict: 'user_id,platform,username' }
      );

    if (dbError) {
      console.error('Database error saving LinkedIn organization:', dbError);
      return NextResponse.json({ success: false, error: 'Failed to save LinkedIn organization' }, { status: 500 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('linkedin_user_access_token');
    response.cookies.delete('linkedin_user_token_expires_at');
    return response;
  } catch (err: any) {
    console.error('Error selecting LinkedIn organization:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Failed to connect LinkedIn organization' }, { status: 500 });
  }
}
