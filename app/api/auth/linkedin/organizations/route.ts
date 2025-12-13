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
  // This endpoint may require org-related permissions on the LinkedIn app.
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

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userAccessToken = cookieStore.get('linkedin_user_access_token')?.value;
    if (!userAccessToken) {
      return NextResponse.json(
        { success: false, error: 'LinkedIn connect session expired. Please try connecting again.' },
        { status: 400 }
      );
    }

    const orgs = await fetchLinkedInOrganizations(userAccessToken);
    return NextResponse.json({ success: true, data: orgs.map((o) => ({ id: o.id, name: o.name })) });
  } catch (err: any) {
    console.error('Error listing LinkedIn organizations:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Failed to list LinkedIn organizations' }, { status: 500 });
  }
}
