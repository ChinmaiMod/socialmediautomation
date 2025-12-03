import { ViralDefinition, PostEngagement } from '../db';

export interface ViralScoreInput {
  likes: number;
  shares: number;
  comments: number;
  views: number;
  saves: number;
  clicks?: number;
  impressions?: number;
}

export interface ViralScoreResult {
  score: number;
  breakdown: {
    likes_contribution: number;
    shares_contribution: number;
    comments_contribution: number;
    views_contribution: number;
    saves_contribution: number;
    ctr_contribution: number;
  };
  is_viral: boolean;
  analysis: string;
}

/**
 * Calculate viral score based on engagement metrics and custom definition
 */
export function calculateViralScore(
  metrics: ViralScoreInput,
  definition: ViralDefinition
): ViralScoreResult {
  // Calculate each metric's contribution
  const likesRatio = Math.min(metrics.likes / definition.likes_threshold, 2);
  const sharesRatio = Math.min(metrics.shares / definition.shares_threshold, 2);
  const commentsRatio = Math.min(metrics.comments / definition.comments_threshold, 2);
  const viewsRatio = Math.min(metrics.views / definition.views_threshold, 2);
  const savesRatio = Math.min(metrics.saves / definition.saves_threshold, 2);
  
  // Calculate CTR if we have clicks and impressions
  let ctrRatio = 0;
  if (metrics.clicks !== undefined && metrics.impressions && metrics.impressions > 0) {
    const ctr = (metrics.clicks / metrics.impressions) * 100;
    ctrRatio = Math.min(ctr / definition.ctr_threshold, 2);
  }

  // Calculate weighted contributions
  const likes_contribution = likesRatio * Number(definition.likes_weight) * 100;
  const shares_contribution = sharesRatio * Number(definition.shares_weight) * 100;
  const comments_contribution = commentsRatio * Number(definition.comments_weight) * 100;
  const views_contribution = viewsRatio * Number(definition.views_weight) * 100;
  const saves_contribution = savesRatio * Number(definition.saves_weight) * 100;
  const ctr_contribution = ctrRatio * Number(definition.ctr_weight) * 100;

  // Sum up the score (max 100 if all ratios are 1, can exceed if metrics exceed thresholds)
  const rawScore = likes_contribution + shares_contribution + comments_contribution + 
                   views_contribution + saves_contribution + ctr_contribution;
  
  // Normalize to 0-100 range
  const score = Math.min(Math.round(rawScore), 100);
  const is_viral = score >= definition.minimum_viral_score;

  // Generate analysis
  const topContributors = [
    { name: 'likes', value: likes_contribution },
    { name: 'shares', value: shares_contribution },
    { name: 'comments', value: comments_contribution },
    { name: 'views', value: views_contribution },
    { name: 'saves', value: saves_contribution },
    { name: 'ctr', value: ctr_contribution },
  ].sort((a, b) => b.value - a.value);

  const analysis = is_viral
    ? `This post is performing virally! Top drivers: ${topContributors[0].name} (${topContributors[0].value.toFixed(1)}), ${topContributors[1].name} (${topContributors[1].value.toFixed(1)})`
    : `Score: ${score}/${definition.minimum_viral_score} needed. Focus on improving ${topContributors.filter(c => c.value < 10).map(c => c.name).join(', ')}`;

  return {
    score,
    breakdown: {
      likes_contribution,
      shares_contribution,
      comments_contribution,
      views_contribution,
      saves_contribution,
      ctr_contribution,
    },
    is_viral,
    analysis,
  };
}

/**
 * Calculate viral score from post engagement record
 */
export function calculateViralScoreFromEngagement(
  engagement: PostEngagement,
  definition: ViralDefinition
): ViralScoreResult {
  return calculateViralScore(
    {
      likes: engagement.likes,
      shares: engagement.shares,
      comments: engagement.comments,
      views: engagement.views,
      saves: engagement.saves,
      clicks: engagement.clicks,
      impressions: engagement.impressions,
    },
    definition
  );
}

/**
 * Predict viral potential before posting based on content analysis
 */
export function predictViralPotential(params: {
  content_length: number;
  has_hook: boolean;
  has_cta: boolean;
  hashtag_count: number;
  emotional_trigger: boolean;
  trend_alignment: number; // 0-100
  pattern_success_rate?: number; // 0-100
}): number {
  let score = 30; // Base score

  // Content length optimization (varies by platform but generally 100-280 is optimal)
  if (params.content_length >= 100 && params.content_length <= 300) {
    score += 10;
  } else if (params.content_length > 300 && params.content_length <= 500) {
    score += 5;
  }

  // Hook presence is crucial
  if (params.has_hook) {
    score += 15;
  }

  // Call-to-action improves engagement
  if (params.has_cta) {
    score += 10;
  }

  // Hashtag optimization (3-5 is usually optimal)
  if (params.hashtag_count >= 3 && params.hashtag_count <= 5) {
    score += 10;
  } else if (params.hashtag_count > 5 && params.hashtag_count <= 10) {
    score += 5;
  } else if (params.hashtag_count > 10) {
    score -= 5; // Too many hashtags can hurt
  }

  // Emotional content performs better
  if (params.emotional_trigger) {
    score += 10;
  }

  // Trend alignment adds significant boost
  score += Math.round(params.trend_alignment * 0.15);

  // Pattern success rate if using a proven pattern
  if (params.pattern_success_rate !== undefined) {
    score += Math.round(params.pattern_success_rate * 0.1);
  }

  return Math.min(Math.max(score, 0), 100);
}

/**
 * Compare post performance to account average
 */
export function compareToAverage(
  currentScore: number,
  averageScore: number
): { percentageDiff: number; analysis: string } {
  if (averageScore === 0) {
    return {
      percentageDiff: 0,
      analysis: 'No historical data for comparison',
    };
  }

  const percentageDiff = ((currentScore - averageScore) / averageScore) * 100;
  
  let analysis: string;
  if (percentageDiff > 50) {
    analysis = `Exceptional performance! ${percentageDiff.toFixed(1)}% above average`;
  } else if (percentageDiff > 20) {
    analysis = `Strong performance, ${percentageDiff.toFixed(1)}% above average`;
  } else if (percentageDiff > -10) {
    analysis = `Performing at average level`;
  } else if (percentageDiff > -30) {
    analysis = `Below average by ${Math.abs(percentageDiff).toFixed(1)}%`;
  } else {
    analysis = `Significantly underperforming, ${Math.abs(percentageDiff).toFixed(1)}% below average`;
  }

  return { percentageDiff, analysis };
}

export default {
  calculateViralScore,
  calculateViralScoreFromEngagement,
  predictViralPotential,
  compareToAverage,
};
