import { NextRequest, NextResponse } from 'next/server';
import { supabase, handleSupabaseError } from '@/lib/db';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET /api/posts - Get posts with optional filtering
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const authClient = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await authClient.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .order('scheduled_time', { ascending: true })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    const errorMessage = handleSupabaseError(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST /api/posts - Create a scheduled post
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const authClient = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await authClient.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      account_id, 
      niche_id, 
      content, 
      hashtags, 
      platform,
      scheduled_time,
      viral_score,
      trend_used 
    } = body;

    if (!content || !platform) {
      return NextResponse.json({ 
        success: false, 
        error: 'Content and platform are required' 
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        account_id: account_id || null,
        niche_id: niche_id || null,
        content,
        hashtags: hashtags || [],
        platform,
        scheduled_time: scheduled_time || new Date().toISOString(),
        viral_score: viral_score || 0,
        trend_used: trend_used || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const errorMessage = handleSupabaseError(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// PUT /api/posts - Update a post
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const authClient = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await authClient.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Post ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const errorMessage = handleSupabaseError(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// DELETE /api/posts?id=xxx - Delete a post
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const authClient = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await authClient.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Post ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = handleSupabaseError(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
