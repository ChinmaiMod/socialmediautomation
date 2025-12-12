import { NextRequest, NextResponse } from 'next/server';
import { handleSupabaseError } from '@/lib/db';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET /api/niches - Get all niches for the user
export async function GET(request: NextRequest) {
  try {
    // Get auth from cookies
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('niches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if ((data || []).length === 0) {
      // Create a default niche so the app is usable immediately.
      const { data: created, error: createError } = await supabase
        .from('niches')
        .insert({
          user_id: user.id,
          name: 'General',
          description: 'Default niche',
          keywords: [],
          target_audience: null,
          content_themes: [],
        })
        .select()
        .single();

      if (createError) {
        // If a concurrent request created it first, just re-fetch.
        if (createError.code === '23505') {
          const { data: retry, error: retryError } = await supabase
            .from('niches')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          if (retryError) throw retryError;
          return NextResponse.json({ success: true, data: retry || [] });
        }
        throw createError;
      }

      return NextResponse.json({ success: true, data: created ? [created] : [] });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    const errorMessage = handleSupabaseError(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST /api/niches - Create a new niche
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, keywords, target_audience, content_themes } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('niches')
      .insert({
        user_id: user.id,
        name,
        keywords: keywords || [],
        target_audience: target_audience || '',
        content_themes: content_themes || [],
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

// PUT /api/niches?id=xxx - Update a niche
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Niche ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, keywords, target_audience, content_themes } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('niches')
      .update({
        name,
        description: description ?? null,
        keywords: Array.isArray(keywords) ? keywords : [],
        target_audience: target_audience ?? null,
        content_themes: Array.isArray(content_themes) ? content_themes : [],
      })
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

// DELETE /api/niches?id=xxx - Delete a niche
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Niche ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('niches')
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
