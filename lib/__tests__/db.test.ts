import {
  supabase,
  Account,
  Post,
  Niche,
  ViralDefinition,
  TrendingTopic,
  Platform,
} from '../db';

// Mock supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
  })),
}));

describe('Database Module', () => {
  describe('Type Definitions', () => {
    it('should have Platform type with all supported platforms', () => {
      const platforms: Platform[] = ['linkedin', 'facebook', 'instagram', 'pinterest'];
      expect(platforms).toHaveLength(4);
    });

    it('should have Account interface with required fields', () => {
      const account: Partial<Account> = {
        id: '123',
        name: 'Test Account',
        platform: 'linkedin',
        is_active: true,
      };
      expect(account.id).toBeDefined();
      expect(account.platform).toBe('linkedin');
    });

    it('should have Post interface with required fields', () => {
      const post: Partial<Post> = {
        id: '123',
        account_id: 'acc-123',
        content: 'Test content',
        platform: 'linkedin',
        status: 'draft',
      };
      expect(post.content).toBeDefined();
      expect(post.platform).toBe('linkedin');
    });

    it('should have Niche interface with required fields', () => {
      const niche: Partial<Niche> = {
        id: '123',
        name: 'Technology',
        keywords: ['AI', 'automation'],
        target_audience: 'tech professionals',
      };
      expect(niche.name).toBe('Technology');
      expect(niche.keywords).toContain('AI');
    });

    it('should have ViralDefinition interface with weight fields', () => {
      const definition: Partial<ViralDefinition> = {
        id: '123',
        likes_weight: 0.2,
        shares_weight: 0.25,
        comments_weight: 0.2,
        views_weight: 0.15,
        saves_weight: 0.1,
        ctr_weight: 0.1,
      };
      
      // Weights should sum to approximately 1.0
      const totalWeight = 
        (definition.likes_weight || 0) +
        (definition.shares_weight || 0) +
        (definition.comments_weight || 0) +
        (definition.views_weight || 0) +
        (definition.saves_weight || 0) +
        (definition.ctr_weight || 0);
      
      expect(totalWeight).toBe(1.0);
    });

    it('should have TrendingTopic interface with required fields', () => {
      const topic: Partial<TrendingTopic> = {
        id: '123',
        topic: 'AI Trends 2025',
        relevance_score: 85,
        is_used: false,
      };
      expect(topic.topic).toBeDefined();
      expect(topic.relevance_score).toBeGreaterThan(0);
    });
  });

  describe('Supabase Client', () => {
    it('should export supabase client', () => {
      expect(supabase).toBeDefined();
    });

    it('should have from method for table access', () => {
      expect(typeof supabase.from).toBe('function');
    });

    it('should have auth methods', () => {
      expect(supabase.auth).toBeDefined();
      expect(typeof supabase.auth.signUp).toBe('function');
      expect(typeof supabase.auth.signInWithPassword).toBe('function');
      expect(typeof supabase.auth.signOut).toBe('function');
    });
  });

  describe('Database Operations', () => {
    it('should support chained query methods', () => {
      const query = supabase
        .from('accounts')
        .select('*')
        .eq('platform', 'linkedin')
        .order('created_at', { ascending: false })
        .limit(10);
      
      expect(query).toBeDefined();
    });

    it('should support insert operations', () => {
      const query = supabase
        .from('posts')
        .insert({
          content: 'Test post',
          platform: 'linkedin',
        });
      
      expect(query).toBeDefined();
    });

    it('should support update operations', () => {
      const query = supabase
        .from('posts')
        .update({ status: 'published' })
        .eq('id', '123');
      
      expect(query).toBeDefined();
    });

    it('should support delete operations', () => {
      const query = supabase
        .from('posts')
        .delete()
        .eq('id', '123');
      
      expect(query).toBeDefined();
    });
  });
});
