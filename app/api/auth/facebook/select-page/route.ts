import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const pageId = body?.page_id as string | undefined;

    if (!pageId) {
      return NextResponse.json({ success: false, error: 'page_id is required' }, { status: 400 });
    }

    const userAccessToken = cookieStore.get('facebook_user_access_token')?.value;
    const expiresAt = cookieStore.get('facebook_user_token_expires_at')?.value;

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

    const pages: Array<{ id: string; name: string; access_token: string }> = data?.data || [];
    const selected = pages.find((p) => p.id === pageId);

    if (!selected) {
      return NextResponse.json({ success: false, error: 'Selected page not found' }, { status: 404 });
    }

    const { error: dbError } = await supabase
      .from('accounts')
      .upsert(
        {
          user_id: user.id,
          platform: 'facebook',
          name: selected.name,
          username: selected.id,
          profile_url: `https://www.facebook.com/${selected.id}`,
          access_token: selected.access_token,
          token_expires_at: expiresAt || null,
          is_active: true,
        },
        { onConflict: 'user_id,platform,username' }
      );

    if (dbError) {
      console.error('Database error saving Facebook page:', dbError);
      return NextResponse.json({ success: false, error: 'Failed to save Facebook Page' }, { status: 500 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('facebook_user_access_token');
    response.cookies.delete('facebook_user_token_expires_at');
    return response;
  } catch (err) {
    console.error('Error selecting Facebook page:', err);
    return NextResponse.json({ success: false, error: 'Failed to connect Facebook page' }, { status: 500 });
  }
}
