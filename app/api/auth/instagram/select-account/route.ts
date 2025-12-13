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
    const instagramAccountId = body?.instagram_account_id as string | undefined;

    if (!instagramAccountId) {
      return NextResponse.json({ success: false, error: 'instagram_account_id is required' }, { status: 400 });
    }

    const userAccessToken = cookieStore.get('instagram_user_access_token')?.value;
    const expiresAt = cookieStore.get('instagram_user_token_expires_at')?.value;

    if (!userAccessToken) {
      return NextResponse.json(
        { success: false, error: 'Instagram connect session expired. Please try connecting again.' },
        { status: 400 }
      );
    }

    // Fetch IG account details
    const igUrl = new URL(`https://graph.facebook.com/v18.0/${instagramAccountId}`);
    igUrl.searchParams.set('access_token', userAccessToken);
    igUrl.searchParams.set('fields', 'id,username,profile_picture_url');

    const igResp = await fetch(igUrl.toString());
    const igData = await igResp.json();

    if (!igResp.ok || igData?.error) {
      console.error('Instagram account details error:', igData);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch Instagram account details' },
        { status: 502 }
      );
    }

    const igUsername = igData.username || 'Instagram Business';
    const igId = igData.id || instagramAccountId;

    const { error: dbError } = await supabase
      .from('accounts')
      .upsert(
        {
          user_id: user.id,
          platform: 'instagram',
          name: igUsername,
          username: igId,
          profile_url: igUsername ? `https://www.instagram.com/${igUsername}` : null,
          access_token: userAccessToken,
          token_expires_at: expiresAt || null,
          is_active: true,
        },
        { onConflict: 'user_id,platform,username' }
      );

    if (dbError) {
      console.error('Database error saving Instagram account:', dbError);
      return NextResponse.json({ success: false, error: 'Failed to save Instagram account' }, { status: 500 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('instagram_user_access_token');
    response.cookies.delete('instagram_user_token_expires_at');
    return response;
  } catch (err) {
    console.error('Error selecting Instagram account:', err);
    return NextResponse.json({ success: false, error: 'Failed to connect Instagram account' }, { status: 500 });
  }
}
