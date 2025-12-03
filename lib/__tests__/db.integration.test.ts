/**
 * Database Module - Type and Error Handler Tests
 * Tests for db.ts type definitions and handleSupabaseError function
 */

import {
  handleSupabaseError,
  Platform,
  Niche,
  Account,
  Post,
  ViralDefinition,
  ViralPattern,
  PostEngagement,
  TrendingTopic,
  AppSetting,
  AutomationProfile,
} from '../db';

describe('Database Module - Type Definitions and Error Handling', () => {
  describe('Type Definitions', () => {
    describe('Platform Type', () => {
      it('should allow valid platform values', () => {
        const platforms: Platform[] = ['linkedin', 'facebook', 'instagram', 'pinterest'];
        expect(platforms).toHaveLength(4);
        expect(platforms).toContain('linkedin');
        expect(platforms).toContain('facebook');
        expect(platforms).toContain('instagram');
        expect(platforms).toContain('pinterest');
      });
    });

    describe('Niche Interface', () => {
      it('should create a valid Niche object', () => {
        const niche: Niche = {
          id: 'niche-1',
          name: 'Technology',
          description: 'Tech content',
          keywords: ['AI', 'automation'],
          target_audience: 'developers',
          content_themes: ['tutorials', 'news'],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        };
        
        expect(niche.id).toBe('niche-1');
        expect(niche.name).toBe('Technology');
        expect(niche.keywords).toContain('AI');
      });
    });

    describe('Account Interface', () => {
      it('should create a valid Account object', () => {
        const account: Account = {
          id: 'acc-1',
          name: 'LinkedIn Account',
          platform: 'linkedin',
          niche_id: 'niche-1',
          username: 'testuser',
          profile_url: 'https://linkedin.com/in/testuser',
          access_token: 'token123',
          refresh_token: 'refresh123',
          token_expires_at: '2025-12-31T00:00:00Z',
          is_active: true,
          posting_schedule: { times: ['09:00', '15:00'], timezone: 'UTC' },
          tone: 'professional',
          custom_instructions: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        };
        
        expect(account.platform).toBe('linkedin');
        expect(account.posting_schedule.times).toHaveLength(2);
      });
    });

    describe('Post Interface', () => {
      it('should create a valid Post object', () => {
        const post: Post = {
          id: 'post-1',
          account_id: 'acc-1',
          platform: 'linkedin',
          content: 'Test post content',
          media_urls: ['https://example.com/image.jpg'],
          hashtags: ['#tech', '#ai'],
          external_post_id: null,
          post_url: null,
          trend_topic: 'AI Trends',
          pattern_id: null,
          predicted_viral_score: 75,
          actual_viral_score: null,
          status: 'draft',
          scheduled_at: null,
          posted_at: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        };
        
        expect(post.status).toBe('draft');
        expect(post.hashtags).toHaveLength(2);
      });

      it('should allow all valid post statuses', () => {
        const statuses: Post['status'][] = ['draft', 'scheduled', 'posted', 'failed'];
        expect(statuses).toHaveLength(4);
      });
    });

    describe('ViralDefinition Interface', () => {
      it('should create a valid ViralDefinition object', () => {
        const definition: ViralDefinition = {
          id: 'vd-1',
          account_id: 'acc-1',
          likes_weight: 0.2,
          likes_threshold: 100,
          shares_weight: 0.25,
          shares_threshold: 50,
          comments_weight: 0.2,
          comments_threshold: 30,
          views_weight: 0.15,
          views_threshold: 1000,
          saves_weight: 0.1,
          saves_threshold: 20,
          ctr_weight: 0.1,
          ctr_threshold: 5,
          minimum_viral_score: 70,
          timeframe_hours: 24,
          comparison_method: 'average',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        };
        
        // Weights should sum to approximately 1.0
        const totalWeight = 
          definition.likes_weight +
          definition.shares_weight +
          definition.comments_weight +
          definition.views_weight +
          definition.saves_weight +
          definition.ctr_weight;
        
        expect(totalWeight).toBe(1.0);
      });
    });

    describe('ViralPattern Interface', () => {
      it('should create a valid ViralPattern object', () => {
        const pattern: ViralPattern = {
          id: 'vp-1',
          hook_example: 'Start with a question',
          content_structure: 'Problem -> Solution -> CTA',
          emotional_trigger: 'curiosity',
          success_rate: 85,
          usage_count: 100,
          platforms: ['linkedin', 'facebook'],
          niches: ['technology'],
          is_custom: false,
          created_by: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        };
        
        expect(pattern.platforms).toContain('linkedin');
        expect(pattern.success_rate).toBe(85);
      });
    });

    describe('PostEngagement Interface', () => {
      it('should create a valid PostEngagement object', () => {
        const engagement: PostEngagement = {
          id: 'eng-1',
          post_id: 'post-1',
          checkpoint_hours: 24,
          likes: 150,
          shares: 30,
          comments: 45,
          views: 2000,
          saves: 25,
          clicks: 100,
          impressions: 5000,
          reach: 3000,
          viral_score: 82,
          recorded_at: '2025-01-02T00:00:00Z',
        };
        
        expect(engagement.checkpoint_hours).toBe(24);
        expect(engagement.viral_score).toBe(82);
      });
    });

    describe('TrendingTopic Interface', () => {
      it('should create a valid TrendingTopic object', () => {
        const topic: TrendingTopic = {
          id: 'topic-1',
          niche_id: 'niche-1',
          topic: 'AI Revolution 2025',
          source_url: 'https://example.com/ai',
          source_published_at: '2025-01-01T00:00:00Z',
          relevance_score: 92,
          is_current_version: true,
          expires_at: '2025-12-31T00:00:00Z',
          created_at: '2025-01-01T00:00:00Z',
        };
        
        expect(topic.relevance_score).toBe(92);
        expect(topic.is_current_version).toBe(true);
      });
    });

    describe('AppSetting Interface', () => {
      it('should create a valid AppSetting object', () => {
        const setting: AppSetting = {
          id: 'setting-1',
          key: 'openrouter_model',
          value: 'anthropic/claude-sonnet-4',
          description: 'Default AI model',
          created_by: null,
          updated_by: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        };
        
        expect(setting.key).toBe('openrouter_model');
        expect(setting.value).toBe('anthropic/claude-sonnet-4');
      });
    });

    describe('AutomationProfile Interface', () => {
      it('should create a valid AutomationProfile object', () => {
        const profile: AutomationProfile = {
          id: 'profile-1',
          account_id: 'acc-1',
          batch_size: 5,
          cron_schedule: '0 9 * * *',
          notification_email: 'test@example.com',
          notification_slack_webhook: null,
          error_handling: 'continue',
          is_enabled: true,
          created_by: null,
          updated_by: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        };
        
        expect(profile.error_handling).toBe('continue');
        expect(profile.is_enabled).toBe(true);
      });

      it('should allow both error handling modes', () => {
        const modes: AutomationProfile['error_handling'][] = ['continue', 'stop'];
        expect(modes).toHaveLength(2);
      });
    });
  });

  describe('handleSupabaseError Function', () => {
    it('should handle error with message', () => {
      const error = { message: 'Custom error message' };
      expect(handleSupabaseError(error)).toBe('Custom error message');
    });

    it('should handle PGRST116 error code (record not found)', () => {
      const error = { code: 'PGRST116' };
      expect(handleSupabaseError(error)).toBe('Record not found');
    });

    it('should handle 23505 error code (duplicate)', () => {
      const error = { code: '23505' };
      expect(handleSupabaseError(error)).toBe('This record already exists');
    });

    it('should handle 23503 error code (foreign key)', () => {
      const error = { code: '23503' };
      expect(handleSupabaseError(error)).toBe('Referenced record does not exist');
    });

    it('should handle 42501 error code (permission denied)', () => {
      const error = { code: '42501' };
      expect(handleSupabaseError(error)).toBe('Permission denied');
    });

    it('should handle unknown error code', () => {
      const error = { code: 'UNKNOWN_CODE' };
      expect(handleSupabaseError(error)).toBe('Database error: UNKNOWN_CODE');
    });

    it('should handle undefined error', () => {
      expect(handleSupabaseError(undefined)).toBe('An unexpected database error occurred');
    });

    it('should handle null error', () => {
      expect(handleSupabaseError(null)).toBe('An unexpected database error occurred');
    });

    it('should handle empty object', () => {
      expect(handleSupabaseError({})).toBe('An unexpected database error occurred');
    });

    it('should prioritize message over code', () => {
      const error = { message: 'Specific message', code: 'PGRST116' };
      expect(handleSupabaseError(error)).toBe('Specific message');
    });

    it('should handle error with only code (no message)', () => {
      const error = { code: '23505' };
      expect(handleSupabaseError(error)).toBe('This record already exists');
    });

    it('should handle error string', () => {
      expect(handleSupabaseError('Some error')).toBe('An unexpected database error occurred');
    });
  });
});
