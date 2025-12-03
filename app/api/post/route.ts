import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateContent } from '@/lib/ai/content';
import { predictViralPotential } from '@/lib/utils/scoring';

// GET /api/post - Get posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const account_id = searchParams.get('account_id');
    const platform = searchParams.get('platform') as 'linkedin' | 'facebook' | 'instagram' | 'pinterest' | null;
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const posts = await db.getPosts({
      account_id: account_id || undefined,
      platform: platform || undefined,
      status: status || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

// POST /api/post - Generate and optionally post content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      account_id, 
      trend_topic, 
      pattern_id, 
      action = 'draft',  // 'draft', 'schedule', 'post'
      scheduled_at,
    } = body;

    if (!account_id) {
      return NextResponse.json(
        { error: 'account_id is required' },
        { status: 400 }
      );
    }

    // Get account details
    const account = await db.getAccount(account_id);
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Get niche details if account has one
    let niche = {
      name: 'General',
      keywords: [] as string[],
      target_audience: '',
      content_themes: [] as string[],
    };
    
    if (account.niche_id) {
      const nicheData = await db.getNiche(account.niche_id);
      if (nicheData) {
        niche = {
          name: nicheData.name,
          keywords: nicheData.keywords,
          target_audience: nicheData.target_audience || '',
          content_themes: nicheData.content_themes,
        };
      }
    }

    // Get viral pattern if specified
    let viralPattern;
    if (pattern_id) {
      const patterns = await db.getViralPatterns();
      const pattern = patterns.find(p => p.id === pattern_id);
      if (pattern) {
        viralPattern = {
          hook_example: pattern.hook_example,
          content_structure: pattern.content_structure || '',
          emotional_trigger: pattern.emotional_trigger || '',
        };
        // Increment pattern usage
        await db.incrementPatternUsage(pattern_id);
      }
    }

    // Generate content using AI
    const generatedContent = await generateContent({
      niche,
      platform: account.platform,
      tone: account.tone,
      trend_topic,
      viral_pattern: viralPattern,
      custom_instructions: account.custom_instructions || undefined,
    });

    // Predict viral potential
    const predicted_viral_score = predictViralPotential({
      content_length: generatedContent.content.length,
      has_hook: generatedContent.content.split('\n')[0].length < 100,
      has_cta: /\?|share|comment|follow|like/i.test(generatedContent.content),
      hashtag_count: generatedContent.hashtags.length,
      emotional_trigger: !!viralPattern?.emotional_trigger,
      trend_alignment: trend_topic ? 80 : 30,
      pattern_success_rate: viralPattern ? 75 : undefined,
    });

    // Determine status based on action
    let status: 'draft' | 'scheduled' | 'posted' = 'draft';
    let posted_at: string | null = null;

    if (action === 'schedule' && scheduled_at) {
      status = 'scheduled';
    } else if (action === 'post') {
      // In a real implementation, this would call the social platform API
      // For now, we'll mark it as posted
      status = 'posted';
      posted_at = new Date().toISOString();
    }

    // Create the post record
    const post = await db.createPost({
      account_id,
      platform: account.platform,
      content: generatedContent.content,
      hashtags: generatedContent.hashtags,
      trend_topic: trend_topic || null,
      pattern_id: pattern_id || null,
      predicted_viral_score,
      status,
      scheduled_at: scheduled_at || null,
      posted_at,
    });

    return NextResponse.json({ 
      post,
      generated: {
        content: generatedContent.content,
        hashtags: generatedContent.hashtags,
        predicted_viral_score,
        reasoning: generatedContent.reasoning,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}

// PUT /api/post - Update a post
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    const post = await db.updatePost(id, updates);

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}
