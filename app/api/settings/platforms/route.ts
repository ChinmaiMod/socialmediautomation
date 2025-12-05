import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';

interface PlatformCredentials {
  linkedin_client_id?: string;
  linkedin_client_secret?: string;
  facebook_app_id?: string;
  facebook_app_secret?: string;
  pinterest_app_id?: string;
  pinterest_app_secret?: string;
  twitter_client_id?: string;
  twitter_client_secret?: string;
}

function maskSecret(secret: string | null | undefined): string | null {
  if (!secret) return null;
  if (secret.length <= 8) return '••••••••';
  return secret.slice(0, 4) + '••••••••' + secret.slice(-4);
}

// GET - Fetch platform credentials (masked)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('key, value')
      .in('key', [
        'linkedin_client_id',
        'linkedin_client_secret',
        'facebook_app_id',
        'facebook_app_secret',
        'pinterest_app_id',
        'pinterest_app_secret',
        'twitter_client_id',
        'twitter_client_secret',
      ]);

    if (error) throw error;

    const credentials: Record<string, string | null> = {};
    for (const row of data || []) {
      const val = row.value as string | null;
      // Mask secrets, show IDs in full
      if (row.key.includes('secret')) {
        credentials[row.key] = maskSecret(val);
      } else {
        credentials[row.key] = val;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        linkedin: {
          client_id: credentials.linkedin_client_id || null,
          client_secret: credentials.linkedin_client_secret || null,
          configured: !!(credentials.linkedin_client_id && credentials.linkedin_client_secret),
        },
        facebook: {
          app_id: credentials.facebook_app_id || null,
          app_secret: credentials.facebook_app_secret || null,
          configured: !!(credentials.facebook_app_id && credentials.facebook_app_secret),
        },
        pinterest: {
          app_id: credentials.pinterest_app_id || null,
          app_secret: credentials.pinterest_app_secret || null,
          configured: !!(credentials.pinterest_app_id && credentials.pinterest_app_secret),
        },
        twitter: {
          client_id: credentials.twitter_client_id || null,
          client_secret: credentials.twitter_client_secret || null,
          configured: !!(credentials.twitter_client_id && credentials.twitter_client_secret),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching platform credentials:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch credentials' },
      { status: 500 }
    );
  }
}

// POST - Save platform credentials
export async function POST(request: NextRequest) {
  try {
    const body: PlatformCredentials = await request.json();

    const updates: { key: string; value: string }[] = [];

    // Only update fields that are provided and not empty
    if (body.linkedin_client_id !== undefined) {
      updates.push({ key: 'linkedin_client_id', value: body.linkedin_client_id });
    }
    if (body.linkedin_client_secret !== undefined && body.linkedin_client_secret !== '') {
      updates.push({ key: 'linkedin_client_secret', value: body.linkedin_client_secret });
    }
    if (body.facebook_app_id !== undefined) {
      updates.push({ key: 'facebook_app_id', value: body.facebook_app_id });
    }
    if (body.facebook_app_secret !== undefined && body.facebook_app_secret !== '') {
      updates.push({ key: 'facebook_app_secret', value: body.facebook_app_secret });
    }
    if (body.pinterest_app_id !== undefined) {
      updates.push({ key: 'pinterest_app_id', value: body.pinterest_app_id });
    }
    if (body.pinterest_app_secret !== undefined && body.pinterest_app_secret !== '') {
      updates.push({ key: 'pinterest_app_secret', value: body.pinterest_app_secret });
    }
    if (body.twitter_client_id !== undefined) {
      updates.push({ key: 'twitter_client_id', value: body.twitter_client_id });
    }
    if (body.twitter_client_secret !== undefined && body.twitter_client_secret !== '') {
      updates.push({ key: 'twitter_client_secret', value: body.twitter_client_secret });
    }

    // Upsert each setting
    for (const update of updates) {
      const { error } = await supabaseAdmin
        .from('app_settings')
        .upsert(
          { key: update.key, value: update.value, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving platform credentials:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save credentials' },
      { status: 500 }
    );
  }
}
