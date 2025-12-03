import { NextRequest, NextResponse } from 'next/server';
import { db, Account, supabaseAdmin } from '@/lib/db';

// GET /api/accounts - List all accounts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') as Account['platform'] | null;
    const niche_id = searchParams.get('niche_id');
    const is_active = searchParams.get('is_active');

    const accounts = await db.getAccounts({
      platform: platform || undefined,
      niche_id: niche_id || undefined,
      is_active: is_active !== null ? is_active === 'true' : undefined,
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

// POST /api/accounts - Create a new account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.platform) {
      return NextResponse.json(
        { error: 'Name and platform are required' },
        { status: 400 }
      );
    }

    // Validate platform
    const validPlatforms = ['linkedin', 'facebook', 'instagram', 'pinterest'];
    if (!validPlatforms.includes(body.platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      );
    }

    const account = await db.createAccount({
      name: body.name,
      platform: body.platform,
      niche_id: body.niche_id || null,
      username: body.username || null,
      profile_url: body.profile_url || null,
      access_token: body.access_token || null,
      refresh_token: body.refresh_token || null,
      token_expires_at: body.token_expires_at || null,
      is_active: body.is_active ?? true,
      posting_schedule: body.posting_schedule || { times: ['08:00', '14:00', '19:00'], timezone: 'UTC' },
      tone: body.tone || 'professional',
      custom_instructions: body.custom_instructions || null,
    });

    // Create default viral definition for the account
    await db.upsertViralDefinition({
      account_id: account.id,
      likes_weight: 0.25,
      likes_threshold: 100,
      shares_weight: 0.30,
      shares_threshold: 20,
      comments_weight: 0.25,
      comments_threshold: 30,
      views_weight: 0.10,
      views_threshold: 1000,
      saves_weight: 0.05,
      saves_threshold: 10,
      ctr_weight: 0.05,
      ctr_threshold: 2.00,
      minimum_viral_score: 70,
      timeframe_hours: 48,
      comparison_method: 'account_average',
    });

    // Create default automation profile
    await db.upsertAutomationProfile({
      account_id: account.id,
      batch_size: 1,
      cron_schedule: '0 8,14,19 * * *',
      is_enabled: true,
      error_handling: 'continue',
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}

// PUT /api/accounts - Update an account
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const account = await db.updateAccount(body.id, {
      name: body.name,
      platform: body.platform,
      niche_id: body.niche_id,
      username: body.username,
      profile_url: body.profile_url,
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      token_expires_at: body.token_expires_at,
      is_active: body.is_active,
      posting_schedule: body.posting_schedule,
      tone: body.tone,
      custom_instructions: body.custom_instructions,
    });

    return NextResponse.json({ account });
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}

// DELETE /api/accounts - Delete an account
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    await db.deleteAccount(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
