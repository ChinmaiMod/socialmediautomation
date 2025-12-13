import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userAccessToken = cookieStore.get('facebook_user_access_token')?.value;
    if (!userAccessToken) {
      return NextResponse.json(
        { success: false, error: 'Facebook connect session expired. Please try connecting again.' },
        { status: 400 }
      );
    }

    const pagesUrl = new URL('https://graph.facebook.com/v18.0/me/accounts');
    pagesUrl.searchParams.set('access_token', userAccessToken);
    pagesUrl.searchParams.set('fields', 'id,name,access_token');

    const resp = await fetch(pagesUrl.toString());
    const data = await resp.json();

    if (!resp.ok || data?.error) {
      console.error('Facebook pages error:', data);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch Facebook Pages. Please try again.' },
        { status: 502 }
      );
    }

    const pages = (data?.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      access_token: p.access_token,
    }));

    // Do not return the access token to the client.
    return NextResponse.json({ success: true, data: pages.map((p: any) => ({ id: p.id, name: p.name })) });
  } catch (err) {
    console.error('Error listing Facebook pages:', err);
    return NextResponse.json({ success: false, error: 'Failed to list Facebook pages' }, { status: 500 });
  }
}
