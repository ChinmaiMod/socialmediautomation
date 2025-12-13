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

    const userAccessToken = cookieStore.get('instagram_user_access_token')?.value;
    if (!userAccessToken) {
      return NextResponse.json(
        { success: false, error: 'Instagram connect session expired. Please try connecting again.' },
        { status: 400 }
      );
    }

    // Pages with linked IG business accounts
    const pagesUrl = new URL('https://graph.facebook.com/v18.0/me/accounts');
    pagesUrl.searchParams.set('access_token', userAccessToken);
    pagesUrl.searchParams.set('fields', 'id,name,instagram_business_account');

    const pagesResp = await fetch(pagesUrl.toString());
    const pagesData = await pagesResp.json();

    if (!pagesResp.ok || pagesData?.error) {
      console.error('Instagram pages error:', pagesData);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch Instagram-linked Pages. Please try again.' },
        { status: 502 }
      );
    }

    const candidates: Array<{ instagram_account_id: string; page_name: string }> = (pagesData?.data || [])
      .filter((p: any) => p?.instagram_business_account?.id)
      .map((p: any) => ({
        instagram_account_id: p.instagram_business_account.id,
        page_name: p.name,
      }));

    // Fetch IG usernames for display
    const accounts = await Promise.all(
      candidates.map(async (c) => {
        const igUrl = new URL(`https://graph.facebook.com/v18.0/${c.instagram_account_id}`);
        igUrl.searchParams.set('access_token', userAccessToken);
        igUrl.searchParams.set('fields', 'id,username');

        const igResp = await fetch(igUrl.toString());
        const igData = await igResp.json();

        if (!igResp.ok || igData?.error) {
          console.error('Instagram account details error:', igData);
          return {
            id: c.instagram_account_id,
            username: 'Instagram Business',
            page_name: c.page_name,
          };
        }

        return {
          id: igData.id || c.instagram_account_id,
          username: igData.username || 'Instagram Business',
          page_name: c.page_name,
        };
      })
    );

    return NextResponse.json({ success: true, data: accounts });
  } catch (err) {
    console.error('Error listing Instagram accounts:', err);
    return NextResponse.json({ success: false, error: 'Failed to list Instagram accounts' }, { status: 500 });
  }
}
