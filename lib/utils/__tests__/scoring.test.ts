import { calculateViralScore, predictViralPotential, compareToAverage, ViralScoreInput, ViralScoreResult } from '../scoring';
import { ViralDefinition } from '../../db';

// Mock viral definition for testing
const mockDefinition: ViralDefinition = {
  id: '1',
  account_id: '1',
  likes_weight: 0.2,
  shares_weight: 0.25,
  comments_weight: 0.2,
  views_weight: 0.15,
  saves_weight: 0.1,
  ctr_weight: 0.1,
  likes_threshold: 100,
  shares_threshold: 50,
  comments_threshold: 25,
  views_threshold: 1000,
  saves_threshold: 20,
  ctr_threshold: 5,
  minimum_viral_score: 70,
  timeframe_hours: 24,
  comparison_method: 'weighted_average',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('Scoring Utils', () => {
  describe('calculateViralScore', () => {
    it('should return score between 0 and 100', () => {
      const metrics: ViralScoreInput = {
        likes: 50,
        shares: 25,
        comments: 12,
        views: 500,
        saves: 10,
      };

      const result = calculateViralScore(metrics, mockDefinition);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return is_viral true when score exceeds threshold', () => {
      const highMetrics: ViralScoreInput = {
        likes: 200,
        shares: 100,
        comments: 50,
        views: 2000,
        saves: 40,
        clicks: 200,
        impressions: 2000,
      };

      const result = calculateViralScore(highMetrics, mockDefinition);
      expect(result.is_viral).toBe(true);
    });

    it('should return is_viral false when score is below threshold', () => {
      const lowMetrics: ViralScoreInput = {
        likes: 10,
        shares: 5,
        comments: 2,
        views: 100,
        saves: 2,
      };

      const result = calculateViralScore(lowMetrics, mockDefinition);
      expect(result.is_viral).toBe(false);
    });

    it('should calculate breakdown correctly', () => {
      const metrics: ViralScoreInput = {
        likes: 100,
        shares: 50,
        comments: 25,
        views: 1000,
        saves: 20,
      };

      const result = calculateViralScore(metrics, mockDefinition);

      expect(result.breakdown).toHaveProperty('likes_contribution');
      expect(result.breakdown).toHaveProperty('shares_contribution');
      expect(result.breakdown).toHaveProperty('comments_contribution');
      expect(result.breakdown).toHaveProperty('views_contribution');
      expect(result.breakdown).toHaveProperty('saves_contribution');
      expect(result.breakdown).toHaveProperty('ctr_contribution');
    });

    it('should include analysis in result', () => {
      const metrics: ViralScoreInput = {
        likes: 50,
        shares: 25,
        comments: 12,
        views: 500,
        saves: 10,
      };

      const result = calculateViralScore(metrics, mockDefinition);
      expect(result.analysis).toBeTruthy();
      expect(typeof result.analysis).toBe('string');
    });

    it('should handle CTR calculation when clicks and impressions provided', () => {
      const metrics: ViralScoreInput = {
        likes: 50,
        shares: 25,
        comments: 12,
        views: 500,
        saves: 10,
        clicks: 100,
        impressions: 1000,
      };

      const result = calculateViralScore(metrics, mockDefinition);
      expect(result.breakdown.ctr_contribution).toBeGreaterThan(0);
    });

    it('should handle zero impressions gracefully', () => {
      const metrics: ViralScoreInput = {
        likes: 50,
        shares: 25,
        comments: 12,
        views: 500,
        saves: 10,
        clicks: 100,
        impressions: 0,
      };

      const result = calculateViralScore(metrics, mockDefinition);
      expect(result.breakdown.ctr_contribution).toBe(0);
    });

    it('should cap ratios at 2x threshold to prevent score explosion', () => {
      const extremeMetrics: ViralScoreInput = {
        likes: 10000,
        shares: 5000,
        comments: 2500,
        views: 100000,
        saves: 2000,
      };

      const result = calculateViralScore(extremeMetrics, mockDefinition);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('predictViralPotential', () => {
    it('should return score between 0 and 100', () => {
      const result = predictViralPotential({
        content_length: 200,
        has_hook: true,
        has_cta: true,
        hashtag_count: 4,
        emotional_trigger: true,
        trend_alignment: 80,
      });
      
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should give higher score for optimal content length', () => {
      const optimalLength = predictViralPotential({
        content_length: 200,
        has_hook: false,
        has_cta: false,
        hashtag_count: 0,
        emotional_trigger: false,
        trend_alignment: 0,
      });

      const tooShort = predictViralPotential({
        content_length: 50,
        has_hook: false,
        has_cta: false,
        hashtag_count: 0,
        emotional_trigger: false,
        trend_alignment: 0,
      });

      expect(optimalLength).toBeGreaterThan(tooShort);
    });

    it('should give higher score for content with hook', () => {
      const withHook = predictViralPotential({
        content_length: 200,
        has_hook: true,
        has_cta: false,
        hashtag_count: 0,
        emotional_trigger: false,
        trend_alignment: 0,
      });

      const withoutHook = predictViralPotential({
        content_length: 200,
        has_hook: false,
        has_cta: false,
        hashtag_count: 0,
        emotional_trigger: false,
        trend_alignment: 0,
      });

      expect(withHook).toBeGreaterThan(withoutHook);
    });

    it('should give higher score for content with CTA', () => {
      const withCTA = predictViralPotential({
        content_length: 200,
        has_hook: false,
        has_cta: true,
        hashtag_count: 0,
        emotional_trigger: false,
        trend_alignment: 0,
      });

      const withoutCTA = predictViralPotential({
        content_length: 200,
        has_hook: false,
        has_cta: false,
        hashtag_count: 0,
        emotional_trigger: false,
        trend_alignment: 0,
      });

      expect(withCTA).toBeGreaterThan(withoutCTA);
    });

    it('should give optimal score for 3-5 hashtags', () => {
      const optimal = predictViralPotential({
        content_length: 200,
        has_hook: false,
        has_cta: false,
        hashtag_count: 4,
        emotional_trigger: false,
        trend_alignment: 0,
      });

      const tooMany = predictViralPotential({
        content_length: 200,
        has_hook: false,
        has_cta: false,
        hashtag_count: 15,
        emotional_trigger: false,
        trend_alignment: 0,
      });

      expect(optimal).toBeGreaterThan(tooMany);
    });

    it('should give higher score for emotional trigger', () => {
      const emotional = predictViralPotential({
        content_length: 200,
        has_hook: false,
        has_cta: false,
        hashtag_count: 0,
        emotional_trigger: true,
        trend_alignment: 0,
      });

      const neutral = predictViralPotential({
        content_length: 200,
        has_hook: false,
        has_cta: false,
        hashtag_count: 0,
        emotional_trigger: false,
        trend_alignment: 0,
      });

      expect(emotional).toBeGreaterThan(neutral);
    });

    it('should increase score based on trend alignment', () => {
      const highTrend = predictViralPotential({
        content_length: 200,
        has_hook: false,
        has_cta: false,
        hashtag_count: 0,
        emotional_trigger: false,
        trend_alignment: 100,
      });

      const lowTrend = predictViralPotential({
        content_length: 200,
        has_hook: false,
        has_cta: false,
        hashtag_count: 0,
        emotional_trigger: false,
        trend_alignment: 0,
      });

      expect(highTrend).toBeGreaterThan(lowTrend);
    });

    it('should include pattern success rate when provided', () => {
      const withPattern = predictViralPotential({
        content_length: 200,
        has_hook: false,
        has_cta: false,
        hashtag_count: 0,
        emotional_trigger: false,
        trend_alignment: 0,
        pattern_success_rate: 80,
      });

      const withoutPattern = predictViralPotential({
        content_length: 200,
        has_hook: false,
        has_cta: false,
        hashtag_count: 0,
        emotional_trigger: false,
        trend_alignment: 0,
      });

      expect(withPattern).toBeGreaterThan(withoutPattern);
    });

    it('should cap score at 100', () => {
      const maxScore = predictViralPotential({
        content_length: 200,
        has_hook: true,
        has_cta: true,
        hashtag_count: 4,
        emotional_trigger: true,
        trend_alignment: 100,
        pattern_success_rate: 100,
      });

      expect(maxScore).toBeLessThanOrEqual(100);
    });
  });

  describe('compareToAverage', () => {
    it('should return exceptional analysis for >50% above average', () => {
      const result = compareToAverage(80, 50);
      expect(result.percentageDiff).toBe(60);
      expect(result.analysis).toContain('Exceptional');
    });

    it('should return strong analysis for 20-50% above average', () => {
      // 65 is 30% above 50 (must be >20% to get Strong)
      const result = compareToAverage(65, 50);
      expect(result.percentageDiff).toBe(30);
      expect(result.analysis).toContain('Strong');
    });

    it('should return average analysis for -10% to +20%', () => {
      const result = compareToAverage(52, 50);
      expect(result.analysis).toContain('average level');
    });

    it('should return below average analysis for -10% to -30%', () => {
      const result = compareToAverage(40, 50);
      expect(result.percentageDiff).toBe(-20);
      expect(result.analysis).toContain('Below average');
    });

    it('should return underperforming analysis for >30% below average', () => {
      const result = compareToAverage(30, 50);
      expect(result.percentageDiff).toBe(-40);
      expect(result.analysis).toContain('underperforming');
    });

    it('should handle zero average gracefully', () => {
      const result = compareToAverage(50, 0);
      expect(result.percentageDiff).toBe(0);
      expect(result.analysis).toContain('No historical data');
    });
  });
});
