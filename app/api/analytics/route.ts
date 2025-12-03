import { NextRequest, NextResponse } from 'next/server';
import { supabase, handleSupabaseError } from '@/lib/db';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET /api/analytics - Get analytics data
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const authClient = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await authClient.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const platformFilter = searchParams.get('platform');
    const accountFilter = searchParams.get('account_id');
    const nicheFilter = searchParams.get('niche_id');
    const viralOnly = searchParams.get('viral_only') === 'true';
    const minimumScore = parseFloat(searchParams.get('minimum_score') || '70');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Get posts for the date range
    let postsQuery = supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (platformFilter && platformFilter !== 'all') {
      postsQuery = postsQuery.eq('platform', platformFilter);
    }

    if (accountFilter && accountFilter !== 'all') {
      postsQuery = postsQuery.eq('account_id', accountFilter);
    }

    const { data: posts, error: postsError } = await postsQuery;

    if (postsError) throw postsError;

    // Get engagements for these posts
    const postIds = (posts || []).map(p => p.id);
    let engagements: any[] = [];
    
    if (postIds.length > 0) {
      const { data: engData, error: engError } = await supabase
        .from('post_engagements')
        .select('*')
        .in('post_id', postIds);
      
      if (engError) throw engError;
      engagements = engData || [];
    }

    // Calculate totals
    const accountIds = Array.from(new Set((posts || []).map((post) => post.account_id))).filter(Boolean);

    let accounts: Array<{ id: string; name: string | null; platform: string | null; niche_id: string | null }> = [];
    if (accountIds.length > 0) {
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('id, name, platform, niche_id')
        .in('id', accountIds);

      if (accountsError) throw accountsError;
      accounts = accountsData || [];
    }

    const accountMap = new Map(accounts.map((account) => [account.id, account]));

    const nicheIds = Array.from(new Set(accounts.map((account) => account.niche_id).filter(Boolean))) as string[];
    let niches: Array<{ id: string; name: string | null }> = [];
    if (nicheIds.length > 0) {
      const { data: nicheData, error: nicheError } = await supabase
        .from('niches')
        .select('id, name')
        .in('id', nicheIds);

      if (nicheError) throw nicheError;
      niches = nicheData || [];
    }

    const nicheMap = new Map(niches.map((niche) => [niche.id, niche.name]));

    // Apply niche filter after fetching accounts
    let filteredPosts = posts || [];
    if (nicheFilter && nicheFilter !== 'all') {
      filteredPosts = filteredPosts.filter((post) => {
        const account = accountMap.get(post.account_id);
        return account?.niche_id === nicheFilter;
      });
    }

    if (viralOnly) {
      filteredPosts = filteredPosts.filter((post) => {
        const actualScore = post.actual_viral_score ?? 0;
        const predictedScore = post.viral_score ?? post.predicted_viral_score ?? 0;
        const score = actualScore > 0 ? actualScore : predictedScore;
        return score >= minimumScore;
      });
    }

    const filteredPostIds = new Set(filteredPosts.map((post) => post.id));
    const filteredEngagements = engagements.filter((eng) => filteredPostIds.has(eng.post_id));

    const totalPosts = filteredPosts.length;
    const totalImpressions = filteredEngagements.reduce((sum, e) => sum + (e.impressions || 0), 0);
    const totalLikes = filteredEngagements.reduce((sum, e) => sum + (e.likes || 0), 0);
    const totalComments = filteredEngagements.reduce((sum, e) => sum + (e.comments || 0), 0);
    const totalShares = filteredEngagements.reduce((sum, e) => sum + (e.shares || 0), 0);
    
    const avgViralScore = totalPosts > 0 
      ? filteredPosts.reduce((sum, p) => sum + (p.actual_viral_score || p.viral_score || 0), 0) / totalPosts 
      : 0;
    
    const engagementRate = totalImpressions > 0 
      ? ((totalLikes + totalComments + totalShares) / totalImpressions) * 100 
      : 0;

    // Posts this week vs last week
    const postsThisWeek = filteredPosts.filter(p => new Date(p.created_at) >= oneWeekAgo).length;
    const postsLastWeek = filteredPosts.filter(p => {
      const created = new Date(p.created_at);
      return created >= twoWeeksAgo && created < oneWeekAgo;
    }).length;

    const viralPosts = filteredPosts.filter((post) => {
      const actualScore = post.actual_viral_score ?? 0;
      const predictedScore = post.viral_score ?? post.predicted_viral_score ?? 0;
      const score = actualScore > 0 ? actualScore : predictedScore;
      return score >= minimumScore;
    });
    const viralRate = totalPosts > 0 ? (viralPosts.length / totalPosts) * 100 : 0;

    // Platform breakdown
    const platformGroups = filteredPosts.reduce((acc: Record<string, any>, post) => {
      const platform = post.platform || 'unknown';
      if (!acc[platform]) {
        acc[platform] = { posts: 0, impressions: 0, engagement: 0 };
      }
      acc[platform].posts++;
      
      const postEngagements = filteredEngagements.filter(e => e.post_id === post.id);
      const impressions = postEngagements.reduce((sum, e) => sum + (e.impressions || 0), 0);
      const engagement = postEngagements.reduce((sum, e) => sum + (e.likes || 0) + (e.comments || 0) + (e.shares || 0), 0);
      
      acc[platform].impressions += impressions;
      acc[platform].engagement += engagement;
      
      return acc;
    }, {});

    const platformBreakdown = Object.entries(platformGroups).map(([platform, data]: [string, any]) => ({
      platform,
      posts: data.posts,
      impressions: data.impressions,
      engagement_rate: data.impressions > 0 ? (data.engagement / data.impressions) * 100 : 0,
    }));

    // Recent posts with their engagements
    const recentPosts = filteredPosts.slice(0, 10).map(post => {
      const postEngagements = filteredEngagements.filter(e => e.post_id === post.id);
      const account = accountMap.get(post.account_id);
      const accountName = account?.name || 'Unknown Account';
      const nicheName = account?.niche_id ? nicheMap.get(account.niche_id) || 'Unassigned Niche' : 'Unassigned Niche';
      return {
        id: post.id,
        content: post.content,
        platform: post.platform,
        viral_score: post.viral_score || 0,
        impressions: postEngagements.reduce((sum, e) => sum + (e.impressions || 0), 0),
        likes: postEngagements.reduce((sum, e) => sum + (e.likes || 0), 0),
        comments: postEngagements.reduce((sum, e) => sum + (e.comments || 0), 0),
        shares: postEngagements.reduce((sum, e) => sum + (e.shares || 0), 0),
        posted_at: post.posted_at || post.created_at,
        account_name: accountName,
        niche_name: nicheName,
      };
    });

    // Viral score trend (by day)
    const viralScoreTimeseries = filteredPosts.reduce((acc: Record<string, { date: string; average_score: number; samples: number }>, post) => {
      const dateKey = new Date(post.created_at).toISOString().split('T')[0];
      const score = post.actual_viral_score || post.viral_score || 0;
      if (!acc[dateKey]) {
        acc[dateKey] = { date: dateKey, average_score: score, samples: 1 };
      } else {
        acc[dateKey].average_score += score;
        acc[dateKey].samples += 1;
      }
      return acc;
    }, {});

    const viralScoreChart = Object.values(viralScoreTimeseries)
      .map(({ date, average_score, samples }) => ({ date, score: samples > 0 ? average_score / samples : 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Engagement distribution for pie chart
    const engagementDistribution = [
      { type: 'Likes', value: totalLikes },
      { type: 'Comments', value: totalComments },
      { type: 'Shares', value: totalShares },
    ];

    // Account performance table
    const accountPerformance = accounts.map((account) => {
      const accountPosts = filteredPosts.filter((post) => post.account_id === account.id);
      const accountPostIds = accountPosts.map((post) => post.id);
      const accountEngagements = filteredEngagements.filter((eng) => accountPostIds.includes(eng.post_id));
      const accountImpressions = accountEngagements.reduce((sum, eng) => sum + (eng.impressions || 0), 0);
      const accountEngagementTotal = accountEngagements.reduce(
        (sum, eng) => sum + (eng.likes || 0) + (eng.comments || 0) + (eng.shares || 0),
        0
      );
      const accountViralCount = accountPosts.filter((post) => {
        const score = post.actual_viral_score || post.viral_score || 0;
        return score >= minimumScore;
      }).length;
      const accountAvgEngagement = accountPosts.length > 0 ? accountEngagementTotal / accountPosts.length : 0;
      const accountViralRate = accountPosts.length > 0 ? (accountViralCount / accountPosts.length) * 100 : 0;

      return {
        account_id: account.id,
        account_name: account.name || 'Unnamed Account',
        platform: account.platform || 'unknown',
        posts_count: accountPosts.length,
        viral_rate: accountViralRate,
        avg_engagement: accountAvgEngagement,
        impressions: accountImpressions,
        niche_name: account.niche_id ? nicheMap.get(account.niche_id) || 'Unassigned Niche' : 'Unassigned Niche',
      };
    });

    // Best performing niche
    const nichePerformanceMap = new Map<
      string,
      {
        niche_name: string;
        posts: number;
        total_score: number;
        total_engagement: number;
      }
    >();

    filteredPosts.forEach((post) => {
      const account = accountMap.get(post.account_id);
      if (!account?.niche_id) return;
      const nicheId = account.niche_id;
      const key = nicheId;
      const name = nicheMap.get(nicheId) || 'Unassigned Niche';
      const score = post.actual_viral_score || post.viral_score || 0;
      const postEngagements = filteredEngagements.filter((eng) => eng.post_id === post.id);
      const engagementTotal = postEngagements.reduce(
        (sum, eng) => sum + (eng.likes || 0) + (eng.comments || 0) + (eng.shares || 0),
        0
      );

      if (!nichePerformanceMap.has(key)) {
        nichePerformanceMap.set(key, {
          niche_name: name,
          posts: 1,
          total_score: score,
          total_engagement: engagementTotal,
        });
      } else {
        const entry = nichePerformanceMap.get(key)!;
        entry.posts += 1;
        entry.total_score += score;
        entry.total_engagement += engagementTotal;
      }
    });

    const bestPerformingNiche = Array.from(nichePerformanceMap.entries())
      .map(([nicheId, data]) => ({
        niche_id: nicheId,
        niche_name: data.niche_name,
        avg_viral_score: data.posts > 0 ? data.total_score / data.posts : 0,
        avg_engagement: data.posts > 0 ? data.total_engagement / data.posts : 0,
      }))
      .sort((a, b) => b.avg_viral_score - a.avg_viral_score)[0] || null;

    // Insights: posting times heatmap data
    const postingTimesMap = new Map<string, { day: string; hour: number; posts: number }>();
    filteredPosts.forEach((post) => {
      const postedDate = post.posted_at ? new Date(post.posted_at) : new Date(post.created_at);
      const day = postedDate.toLocaleDateString('en-US', { weekday: 'short' });
      const hour = postedDate.getHours();
      const key = `${day}-${hour}`;
      if (!postingTimesMap.has(key)) {
        postingTimesMap.set(key, { day, hour, posts: 1 });
      } else {
        const entry = postingTimesMap.get(key)!;
        entry.posts += 1;
      }
    });

    const bestPostingTimes = Array.from(postingTimesMap.values()).sort((a, b) => b.posts - a.posts).slice(0, 25);

    // Engaging topics from trend topics
    const topicMap = new Map<
      string,
      {
        mentions: number;
        totalEngagement: number;
      }
    >();

    filteredPosts.forEach((post) => {
      if (!post.trend_topic) return;
      const key = post.trend_topic.trim();
      const postEngagements = filteredEngagements.filter((eng) => eng.post_id === post.id);
      const engagementTotal = postEngagements.reduce(
        (sum, eng) => sum + (eng.likes || 0) + (eng.comments || 0) + (eng.shares || 0),
        0
      );
      if (!topicMap.has(key)) {
        topicMap.set(key, { mentions: 1, totalEngagement: engagementTotal });
      } else {
        const entry = topicMap.get(key)!;
        entry.mentions += 1;
        entry.totalEngagement += engagementTotal;
      }
    });

    const engagingTopics = Array.from(topicMap.entries())
      .map(([topic, data]) => ({
        topic,
        mentions: data.mentions,
        avg_engagement: data.mentions > 0 ? data.totalEngagement / data.mentions : 0,
      }))
      .sort((a, b) => b.avg_engagement - a.avg_engagement)
      .slice(0, 10);

    // Trending hooks derived from post openings
    const hookMap = new Map<
      string,
      {
        usage: number;
        avgScore: number;
      }
    >();

    filteredPosts.forEach((post) => {
      const hook = post.content.split('\n')[0].slice(0, 120).trim();
      if (!hook) return;
      const score = post.actual_viral_score || post.viral_score || 0;
      if (!hookMap.has(hook)) {
        hookMap.set(hook, { usage: 1, avgScore: score });
      } else {
        const entry = hookMap.get(hook)!;
        entry.usage += 1;
        entry.avgScore += score;
      }
    });

    const trendingHooks = Array.from(hookMap.entries())
      .map(([hook, data]) => ({
        hook,
        usage_count: data.usage,
        success_score: data.usage > 0 ? data.avgScore / data.usage : 0,
      }))
      .sort((a, b) => b.success_score - a.success_score)
      .slice(0, 10);

    const responseData = {
      total_posts: totalPosts,
      viral_posts: viralPosts.length,
      viral_rate: viralRate,
      avg_engagement: totalPosts > 0 ? (totalLikes + totalComments + totalShares) / totalPosts : 0,
      total_impressions: totalImpressions,
      total_likes: totalLikes,
      total_comments: totalComments,
      total_shares: totalShares,
      avg_viral_score: avgViralScore,
      engagement_rate: engagementRate,
      posts_this_week: postsThisWeek,
      posts_last_week: postsLastWeek,
      top_posts: recentPosts,
      platform_breakdown: platformBreakdown,
      viral_score_trend: viralScoreChart,
      engagement_distribution: engagementDistribution,
      account_performance: accountPerformance,
      best_performing_niche: bestPerformingNiche,
      insights: {
        best_posting_times: bestPostingTimes,
        engaging_topics: engagingTopics,
        trending_hooks: trendingHooks,
        platform_comparison: platformBreakdown,
      },
      filters: {
        platforms: Array.from(new Set(filteredPosts.map((post) => post.platform || 'unknown'))),
        accounts: accountPerformance.map((account) => ({
          id: account.account_id,
          name: account.account_name,
          platform: account.platform,
        })),
        niches: Array.from(nichePerformanceMap.entries()).map(([nicheId, data]) => ({
          id: nicheId,
          name: data.niche_name,
        })),
      },
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    const errorMessage = handleSupabaseError(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
