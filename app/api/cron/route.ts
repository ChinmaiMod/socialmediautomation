import { NextRequest, NextResponse } from 'next/server';
import { db, supabaseAdmin } from '@/lib/db';
import { generateContent } from '@/lib/ai/content';
import { researchTrendingTopics } from '@/lib/ai/trends';
import { predictViralPotential } from '@/lib/utils/scoring';
import { publishToPlatform } from '@/lib/social/publish';

type PostingSchedule = {
  times?: string[];
  timezone?: string;
};

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean);
}

function safeTimezone(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) return 'UTC';
  return value.trim();
}

function parseTimeHHMM(value: string): { hour: number; minute: number } | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return { hour: parseInt(match[1], 10), minute: parseInt(match[2], 10) };
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = dtf.formatToParts(date);
  const lookup = (type: string) => parts.find((p) => p.type === type)?.value;
  const year = parseInt(lookup('year') || '0', 10);
  const month = parseInt(lookup('month') || '1', 10);
  const day = parseInt(lookup('day') || '1', 10);
  const hour = parseInt(lookup('hour') || '0', 10);
  const minute = parseInt(lookup('minute') || '0', 10);
  const second = parseInt(lookup('second') || '0', 10);

  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return (asIfUtc - date.getTime()) / 60000;
}

function getZonedDateParts(now: Date, timeZone: string): { year: number; month: number; day: number } {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = dtf.formatToParts(now);
  const lookup = (type: string) => parts.find((p) => p.type === type)?.value;
  return {
    year: parseInt(lookup('year') || '1970', 10),
    month: parseInt(lookup('month') || '1', 10),
    day: parseInt(lookup('day') || '1', 10),
  };
}

function zonedTimeToUtc(dateParts: { year: number; month: number; day: number }, time: { hour: number; minute: number }, timeZone: string): Date {
  // Start with a UTC guess and adjust by the zone offset at that instant.
  const utcGuess = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, time.hour, time.minute, 0));
  const offsetMinutes = getTimeZoneOffsetMinutes(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMinutes * 60000);
}

async function alreadyProcessedSlot(accountId: string, scheduledAtIsoUtc: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('id,status')
    .eq('account_id', accountId)
    .eq('scheduled_at', scheduledAtIsoUtc)
    .in('status', ['posted', 'failed'])
    .limit(1);
  if (error) throw error;
  return (data || []).length > 0;
}

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
    scheduled_at?: string;
    skipped?: boolean;
    error?: string;
  }[] = [];

  try {
    // 1) Publish any due scheduled posts (created via /api/post action=schedule)
    // This runs regardless of automation profiles.
    const nowIso = new Date().toISOString();
    const dueLimit = 25;
    const { data: duePosts, error: dueError } = await supabaseAdmin
      .from('posts')
      .select(`
        id,
        account_id,
        platform,
        content,
        media_urls,
        hashtags,
        scheduled_at,
        status,
        accounts:accounts!inner(*)
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_at', nowIso)
      .order('scheduled_at', { ascending: true })
      .limit(dueLimit);
    if (dueError) throw dueError;

    for (const row of duePosts || []) {
      try {
        const post = row as any;
        const account = post.accounts;
        if (!account || !account.is_active) {
          const { error: updErr } = await supabaseAdmin
            .from('posts')
            .update({ status: 'failed' })
            .eq('id', post.id);
          if (updErr) throw updErr;

          results.push({
            success: false,
            account_id: post.account_id,
            account_name: account?.name || 'Unknown',
            platform: post.platform,
            post_id: post.id,
            scheduled_at: post.scheduled_at,
            error: 'Account not found or inactive',
          });
          continue;
        }

        const publishResult = await publishToPlatform({
          account,
          content: post.content,
          hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
          media_urls: Array.isArray(post.media_urls) ? post.media_urls : [],
        });

        if (publishResult.success) {
          const { error: updErr } = await supabaseAdmin
            .from('posts')
            .update({
              status: 'posted',
              posted_at: new Date().toISOString(),
              external_post_id: publishResult.external_post_id || null,
              post_url: publishResult.post_url || null,
            })
            .eq('id', post.id);
          if (updErr) throw updErr;

          results.push({
            success: true,
            account_id: post.account_id,
            account_name: account.name,
            platform: post.platform,
            post_id: post.id,
            scheduled_at: post.scheduled_at,
          });
        } else {
          const { error: updErr } = await supabaseAdmin
            .from('posts')
            .update({ status: 'failed' })
            .eq('id', post.id);
          if (updErr) throw updErr;

          results.push({
            success: false,
            account_id: post.account_id,
            account_name: account.name,
            platform: post.platform,
            post_id: post.id,
            scheduled_at: post.scheduled_at,
            error: publishResult.error || 'Failed to publish',
          });
        }
      } catch (err) {
        console.error('Error publishing scheduled post', err);
        results.push({
          success: false,
          account_id: (row as any).account_id,
          account_name: (row as any).accounts?.name || 'Unknown',
          platform: (row as any).platform,
          post_id: (row as any).id,
          scheduled_at: (row as any).scheduled_at,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Get all enabled automation profiles
    const profiles = await db.getEnabledAutomationProfiles();
    
    if (profiles.length === 0) {
      const duration_ms = Date.now() - startTime;
      const successful = results.filter(r => r.success && !r.skipped).length;
      const failed = results.filter(r => !r.success).length;
      const skipped = results.filter(r => r.skipped).length;

      return NextResponse.json({
        message: 'No enabled automation profiles found',
        results,
        summary: {
          total_profiles: 0,
          successful,
          failed,
          skipped,
          duration_ms,
        },
        duration_ms,
      });
    }

    // Process each enabled profile
    for (const profile of profiles) {
      try {
        // Get account details (cron runs without a user session; use admin client)
        const { data: account, error: accountError } = await supabaseAdmin
          .from('accounts')
          .select('*')
          .eq('id', profile.account_id)
          .single();
        if (accountError) throw accountError;

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

        // Determine if this account should post right now based on its schedule
        const scheduleRaw = (account as any).posting_schedule as PostingSchedule | undefined;
        const timezone = safeTimezone(scheduleRaw?.timezone);
        const times = safeStringArray(scheduleRaw?.times);
        const cronWindowMinutes = 6; // allows running every 5 minutes without missing a slot
        const now = new Date();
        const nowMs = now.getTime();

        const todayParts = getZonedDateParts(now, timezone);

        const dueSlotsUtc: Date[] = [];
        for (const t of times.length ? times : ['08:00', '14:00', '19:00']) {
          const parsed = parseTimeHHMM(t);
          if (!parsed) continue;
          const scheduledUtc = zonedTimeToUtc(todayParts, parsed, timezone);
          const start = scheduledUtc.getTime();
          const end = start + cronWindowMinutes * 60 * 1000;
          if (nowMs >= start && nowMs <= end) {
            dueSlotsUtc.push(scheduledUtc);
          }
        }

        if (dueSlotsUtc.length === 0) {
          results.push({
            success: true,
            skipped: true,
            account_id: account.id,
            account_name: account.name,
            platform: account.platform,
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

        // Post at each due slot (usually 1), idempotent via scheduled_at
        for (const scheduledUtc of dueSlotsUtc.slice(0, Math.max(1, profile.batch_size || 1))) {
          const scheduledAtIsoUtc = scheduledUtc.toISOString();

          if (await alreadyProcessedSlot(account.id, scheduledAtIsoUtc)) {
            results.push({
              success: true,
              skipped: true,
              account_id: account.id,
              account_name: account.name,
              platform: account.platform,
              scheduled_at: scheduledAtIsoUtc,
            });
            continue;
          }

          const publishResult = await publishToPlatform({
            account,
            content: generatedContent.content,
            hashtags: generatedContent.hashtags,
            media_urls: Array.isArray((generatedContent as any).media_urls) ? (generatedContent as any).media_urls : [],
          });

          const basePost = {
            user_id: (account as any).user_id,
            account_id: account.id,
            platform: account.platform,
            content: generatedContent.content,
            media_urls: [],
            hashtags: generatedContent.hashtags,
            trend_topic: trendTopic || null,
            pattern_id: patterns.length > 0 ? patterns[0].id : null,
            predicted_viral_score,
            scheduled_at: scheduledAtIsoUtc,
          };

          if (publishResult.success) {
            const { data: post, error: postError } = await supabaseAdmin
              .from('posts')
              .insert({
                ...basePost,
                status: 'posted',
                posted_at: new Date().toISOString(),
                external_post_id: publishResult.external_post_id || null,
                post_url: publishResult.post_url || null,
              })
              .select()
              .single();
            if (postError) throw postError;

            results.push({
              success: true,
              account_id: account.id,
              account_name: account.name,
              platform: account.platform,
              scheduled_at: scheduledAtIsoUtc,
              post_id: post.id,
            });
          } else {
            const { data: post, error: postError } = await supabaseAdmin
              .from('posts')
              .insert({
                ...basePost,
                status: 'failed',
                posted_at: null,
                external_post_id: null,
                post_url: null,
              })
              .select()
              .single();
            if (postError) throw postError;

            results.push({
              success: false,
              account_id: account.id,
              account_name: account.name,
              platform: account.platform,
              scheduled_at: scheduledAtIsoUtc,
              post_id: post.id,
              error: publishResult.error || 'Failed to publish',
            });

            if (profile.error_handling === 'stop') {
              break;
            }
          }
        }

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
    const successful = results.filter(r => r.success && !r.skipped).length;
    const failed = results.filter(r => !r.success).length;
    const skipped = results.filter(r => r.skipped).length;

    return NextResponse.json({
      message: `Cron job completed. ${successful} published, ${failed} failed, ${skipped} skipped.`,
      results,
      summary: {
        total_profiles: profiles.length,
        successful,
        failed,
        skipped,
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
