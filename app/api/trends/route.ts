import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { researchTrendingTopics, validateManualTopic } from '@/lib/ai/trends';

// GET /api/trends - Get trending topics for a niche
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const niche_id = searchParams.get('niche_id');
    const include_expired = searchParams.get('include_expired') === 'true';

    if (!niche_id) {
      return NextResponse.json(
        { error: 'niche_id is required' },
        { status: 400 }
      );
    }

    // Ensure niche belongs to user
    const { data: niche, error: nicheError } = await supabase
      .from('niches')
      .select('id')
      .eq('id', niche_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (nicheError) throw nicheError;
    if (!niche) {
      return NextResponse.json({ error: 'Niche not found' }, { status: 404 });
    }

    // Get cached trending topics
    let query = supabase
      .from('trending_topics')
      .select('*')
      .eq('niche_id', niche_id)
      .eq('is_current_version', true);

    if (!include_expired) {
      query = query.gt('expires_at', new Date().toISOString());
    }

    const { data: topics, error } = await query.order('relevance_score', { ascending: false });
    if (error) throw error;

    return NextResponse.json({ topics: topics || [] });
  } catch (error) {
    console.error('Error fetching trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending topics' },
      { status: 500 }
    );
  }
}

// POST /api/trends - Research new trending topics
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { niche_id, max_results, recency_days } = body;

    if (!niche_id) {
      return NextResponse.json(
        { error: 'niche_id is required' },
        { status: 400 }
      );
    }

    // Get niche details (must belong to user)
    const { data: niche, error: nicheError } = await supabase
      .from('niches')
      .select('*')
      .eq('id', niche_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (nicheError) throw nicheError;
    if (!niche) {
      return NextResponse.json(
        { error: 'Niche not found' },
        { status: 404 }
      );
    }

    // Research trending topics using AI
    const trendResults = await researchTrendingTopics({
      niche: {
        name: niche.name,
        keywords: niche.keywords,
        target_audience: niche.target_audience || '',
      },
      max_results: max_results || 5,
      recency_days: recency_days || 7,
    });

    // Expire old topics for this niche
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    await supabase
      .from('trending_topics')
      .update({ is_current_version: false })
      .eq('niche_id', niche_id)
      .lt('source_published_at', sevenDaysAgo.toISOString());

    // Save new topics to database
    const savedTopics = await Promise.all(
      trendResults.map(async (topic) => {
        const { data, error } = await supabase
          .from('trending_topics')
          .insert({
            niche_id,
            topic: topic.topic,
            source_url: topic.source_url,
            source_published_at: topic.source_published_at,
            relevance_score: topic.relevance_score,
            is_current_version: topic.is_current_version,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      })
    );

    return NextResponse.json({ 
      topics: savedTopics,
      research_summary: {
        total_found: trendResults.length,
        niche: niche.name,
        recency_days: recency_days || 7,
      }
    });
  } catch (error) {
    console.error('Error researching trends:', error);
    return NextResponse.json(
      { error: 'Failed to research trending topics' },
      { status: 500 }
    );
  }
}

// PUT /api/trends/validate - Validate a manual topic
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { topic, niche_id } = body;

    if (!topic) {
      return NextResponse.json(
        { error: 'topic is required' },
        { status: 400 }
      );
    }

    // Get niche if provided
    let niche = { name: 'General', keywords: [] as string[] };
    if (niche_id) {
      const { data: nicheData, error: nicheError } = await supabase
        .from('niches')
        .select('name, keywords')
        .eq('id', niche_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (nicheError) throw nicheError;
      if (nicheData) niche = { name: nicheData.name, keywords: nicheData.keywords };
    }

    // Validate the topic
    const validation = await validateManualTopic(topic, niche);

    return NextResponse.json({ validation });
  } catch (error) {
    console.error('Error validating topic:', error);
    return NextResponse.json(
      { error: 'Failed to validate topic' },
      { status: 500 }
    );
  }
}
