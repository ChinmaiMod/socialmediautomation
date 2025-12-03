import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { researchTrendingTopics, validateManualTopic } from '@/lib/ai/trends';

// GET /api/trends - Get trending topics for a niche
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const niche_id = searchParams.get('niche_id');
    const include_expired = searchParams.get('include_expired') === 'true';

    if (!niche_id) {
      return NextResponse.json(
        { error: 'niche_id is required' },
        { status: 400 }
      );
    }

    // Get cached trending topics from database
    const topics = await db.getTrendingTopics(niche_id, { includeExpired: include_expired });

    return NextResponse.json({ topics });
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
    const body = await request.json();
    const { niche_id, max_results, recency_days } = body;

    if (!niche_id) {
      return NextResponse.json(
        { error: 'niche_id is required' },
        { status: 400 }
      );
    }

    // Get niche details
    const niche = await db.getNiche(niche_id);
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
    await db.expireOldTopics(niche_id);

    // Save new topics to database
    const savedTopics = await Promise.all(
      trendResults.map(async (topic) => {
        return await db.createTrendingTopic({
          niche_id,
          topic: topic.topic,
          source_url: topic.source_url,
          source_published_at: topic.source_published_at,
          relevance_score: topic.relevance_score,
          is_current_version: topic.is_current_version,
        });
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
      const nicheData = await db.getNiche(niche_id);
      if (nicheData) {
        niche = { name: nicheData.name, keywords: nicheData.keywords };
      }
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
