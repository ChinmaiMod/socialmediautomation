import { NextRequest, NextResponse } from 'next/server';
import { supabase, handleSupabaseError } from '@/lib/db';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET /api/niches - Get all niches for the user
export async function GET(request: NextRequest) {
  try {
    // Get auth from cookies
    const cookieStore = cookies();
    const authClient = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await authClient.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('niches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

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
    const authClient = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await authClient.auth.getUser();
    
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

// DELETE /api/niches?id=xxx - Delete a niche
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
