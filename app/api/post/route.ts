import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { db, supabaseAdmin } from '@/lib/db';
import { generateContent } from '@/lib/ai/content';
import { predictViralPotential } from '@/lib/utils/scoring';
import { publishToPlatform } from '@/lib/social/publish';

type PostAction = 'generate' | 'draft' | 'schedule' | 'post';

function normalizeHashtags(hashtags: unknown): string[] {
  if (!Array.isArray(hashtags)) return [];
  return hashtags
    .map((h) => (typeof h === 'string' ? h.trim() : ''))
    .filter(Boolean)
    .map((h) => (h.startsWith('#') ? h.slice(1) : h));
}

function normalizeMediaUrls(mediaUrls: unknown): string[] {
  if (!Array.isArray(mediaUrls)) return [];
  return mediaUrls.map((u) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean);
}

// GET /api/post - Get posts
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const authClient = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const account_id = searchParams.get('account_id');
    const platform = searchParams.get('platform') as 'linkedin' | 'facebook' | 'instagram' | 'pinterest' | null;
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    // Extra safety: ensure the account belongs to the user when filtering by account_id.
    if (account_id) {
      const { data: ownedAccount, error: accountError } = await supabaseAdmin
        .from('accounts')
        .select('id')
        .eq('id', account_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (accountError) throw accountError;
      if (!ownedAccount) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
    }

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
    const cookieStore = cookies();
    const authClient = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      account_id,
      trend_topic,
      pattern_id,
      action = 'generate',
      scheduled_at,
      content,
      hashtags,
      media_urls,
      // These may be passed by the client, but we primarily rely on the stored account.
      niche: nicheFromClient,
      tone: toneFromClient,
      custom_instructions: customInstructionsFromClient,
    } = body;

    const parsedAction: PostAction = action;

    if (!account_id) {
      return NextResponse.json(
        { error: 'account_id is required' },
        { status: 400 }
      );
    }

    // Get account details (must belong to user)
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single();

    if (accountError) {
      console.error('Error fetching account:', accountError);
      return NextResponse.json({ error: 'Failed to load account' }, { status: 500 });
    }

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

    const resolvedTone = typeof toneFromClient === 'string' && toneFromClient.trim().length > 0
      ? toneFromClient
      : (account.tone || 'professional');

    const resolvedCustomInstructions = typeof customInstructionsFromClient === 'string' && customInstructionsFromClient.trim().length > 0
      ? customInstructionsFromClient
      : (account.custom_instructions || undefined);

    // Determine content source:
    // - action=generate always generates and does NOT persist
    // - action=post/draft/schedule uses provided content if given, otherwise generates
    const providedContent = typeof content === 'string' ? content : '';
    const providedHashtags = normalizeHashtags(hashtags);
    const providedMediaUrls = normalizeMediaUrls(media_urls);

    const shouldGenerate = parsedAction === 'generate' || !providedContent.trim();

    const generatedContent = shouldGenerate
      ? await generateContent({
          niche: nicheFromClient && typeof nicheFromClient === 'object' ? niche : niche,
          platform: account.platform,
          tone: resolvedTone,
          trend_topic,
          viral_pattern: viralPattern,
          custom_instructions: resolvedCustomInstructions,
        })
      : {
          content: providedContent,
          hashtags: providedHashtags,
          reasoning: '',
        };

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

    if (parsedAction === 'generate') {
      return NextResponse.json({
        success: true,
        generated: {
          content: generatedContent.content,
          hashtags: generatedContent.hashtags,
          predicted_viral_score,
          reasoning: generatedContent.reasoning,
        },
      });
    }

    // Determine status based on action
    let status: 'draft' | 'scheduled' | 'posted' | 'failed' = 'draft';
    let scheduledAt: string | null = null;
    if (parsedAction === 'schedule') {
      status = 'scheduled';
      scheduledAt = typeof scheduled_at === 'string' ? scheduled_at : new Date(Date.now() + 60 * 60 * 1000).toISOString();
    }

    // Create the post record (persist)
    const post = await db.createPost({
      user_id: user.id as any,
      account_id,
      platform: account.platform,
      content: generatedContent.content,
      media_urls: providedMediaUrls,
      hashtags: generatedContent.hashtags,
      trend_topic: trend_topic || null,
      pattern_id: pattern_id || null,
      predicted_viral_score,
      status,
      scheduled_at: scheduledAt,
      posted_at: null,
    } as any);

    // Publish now if requested
    if (parsedAction === 'post') {
      const publishResult = await publishToPlatform({
        account,
        content: generatedContent.content,
        hashtags: generatedContent.hashtags,
        media_urls: providedMediaUrls,
      });

      if (publishResult.success) {
        const updated = await db.updatePost(post.id, {
          status: 'posted',
          posted_at: new Date().toISOString(),
          external_post_id: publishResult.external_post_id || null,
          post_url: publishResult.post_url || null,
        });

        return NextResponse.json(
          {
            success: true,
            post: updated,
            published: {
              external_post_id: publishResult.external_post_id || null,
              post_url: publishResult.post_url || null,
            },
          },
          { status: 201 }
        );
      }

      const updated = await db.updatePost(post.id, {
        status: 'failed',
      });

      return NextResponse.json(
        {
          success: false,
          error: publishResult.error || 'Failed to publish',
          post: updated,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        post,
        generated: {
          content: generatedContent.content,
          hashtags: generatedContent.hashtags,
          predicted_viral_score,
          reasoning: generatedContent.reasoning,
        },
      },
      { status: 201 }
    );
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
