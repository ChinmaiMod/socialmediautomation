import { NextRequest, NextResponse } from 'next/server';
import { db, supabaseAdmin } from '@/lib/db';
import { generateContent } from '@/lib/ai/content';
import { researchTrendingTopics } from '@/lib/ai/trends';
import { predictViralPotential } from '@/lib/utils/scoring';

// Verify cron secret to prevent unauthorized access
async function verifyCronSecret(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  const envSecret = process.env.CRON_SECRET;
  
  // If env secret is provided, check it
  if (envSecret) {
    if (authHeader === `Bearer ${envSecret}`) return true;
    const { searchParams } = new URL(request.url);
    if (searchParams.get('secret') === envSecret) return true;
  }

  // Fall back to DB stored secret (app_settings.cron_secret)
  try {
    const dbSecret = await db.getSetting('cron_secret');
    const secretString = typeof dbSecret === 'string' ? dbSecret : undefined;
    if (secretString) {
      if (authHeader === `Bearer ${secretString}`) return true;
      const { searchParams } = new URL(request.url);
      if (searchParams.get('secret') === secretString) return true;
    }
  } catch (err) {
    console.warn('Error reading cron secret from DB', err);
  }

  // Development mode allows local invocation for convenience
  if (!envSecret && process.env.NODE_ENV === 'development') return true;

  return false;
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!(await verifyCronSecret(request))) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  const results: {
    success: boolean;
    account_id: string;
    account_name: string;
    platform: string;
    post_id?: string;
    error?: string;
  }[] = [];

  try {
    // Get all enabled automation profiles
    const profiles = await db.getEnabledAutomationProfiles();
    
    if (profiles.length === 0) {
      return NextResponse.json({
        message: 'No enabled automation profiles found',
        results: [],
        duration_ms: Date.now() - startTime,
      });
    }

    // Process each enabled profile
    for (const profile of profiles) {
      try {
        // Get account details
        const account = await db.getAccount(profile.account_id);
        if (!account || !account.is_active) {
          results.push({
            success: false,
            account_id: profile.account_id,
            account_name: 'Unknown',
            platform: 'unknown',
            error: 'Account not found or inactive',
          });
          continue;
        }

        // Get niche details
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

        // Research trending topics for the niche
        let trendTopic: string | undefined;
        if (account.niche_id) {
          const trends = await researchTrendingTopics({
            niche: {
              name: niche.name,
              keywords: niche.keywords,
              target_audience: niche.target_audience,
            },
            max_results: 3,
            recency_days: 7,
          });

          if (trends.length > 0) {
            // Pick a random trend from top 3
            const randomIndex = Math.floor(Math.random() * Math.min(3, trends.length));
            trendTopic = trends[randomIndex].topic;
            
            // Save the trend to database
            await db.createTrendingTopic({
              niche_id: account.niche_id,
              topic: trendTopic,
              source_url: trends[randomIndex].source_url,
              source_published_at: trends[randomIndex].source_published_at,
              relevance_score: trends[randomIndex].relevance_score,
              is_current_version: true,
            });
          }
        }

        // Get a viral pattern for this platform/niche
        const patterns = await db.getViralPatterns({
          platform: account.platform,
          niche_id: account.niche_id || undefined,
        });

        let viralPattern;
        if (patterns.length > 0) {
          // Pick pattern with best success rate
          const topPattern = patterns[0];
          viralPattern = {
            hook_example: topPattern.hook_example,
            content_structure: topPattern.content_structure || '',
            emotional_trigger: topPattern.emotional_trigger || '',
          };
          await db.incrementPatternUsage(topPattern.id);
        }

        // Generate content
        const generatedContent = await generateContent({
          niche,
          platform: account.platform,
          tone: account.tone,
          trend_topic: trendTopic,
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
          trend_alignment: trendTopic ? 80 : 30,
          pattern_success_rate: patterns.length > 0 ? patterns[0].success_rate : undefined,
        });

        // Create the post (in a real implementation, this would also post to the social platform)
        const post = await db.createPost({
          account_id: account.id,
          platform: account.platform,
          content: generatedContent.content,
          hashtags: generatedContent.hashtags,
          trend_topic: trendTopic || null,
          pattern_id: patterns.length > 0 ? patterns[0].id : null,
          predicted_viral_score,
          status: 'posted',
          posted_at: new Date().toISOString(),
        });

        results.push({
          success: true,
          account_id: account.id,
          account_name: account.name,
          platform: account.platform,
          post_id: post.id,
        });

      } catch (accountError) {
        console.error(`Error processing account ${profile.account_id}:`, accountError);
        results.push({
          success: false,
          account_id: profile.account_id,
          account_name: 'Unknown',
          platform: 'unknown',
          error: accountError instanceof Error ? accountError.message : 'Unknown error',
        });

        // Check error handling preference
        if (profile.error_handling === 'stop') {
          break;
        }
      }
    }

    const duration_ms = Date.now() - startTime;
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Cron job completed. ${successful} successful, ${failed} failed.`,
      results,
      summary: {
        total_profiles: profiles.length,
        successful,
        failed,
        duration_ms,
      },
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { 
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        results,
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// POST method for manual trigger
export async function POST(request: NextRequest) {
  return GET(request);
}
