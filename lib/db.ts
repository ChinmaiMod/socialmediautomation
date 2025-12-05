import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabase, getSupabaseClient } from './auth';

export { supabase };

function ensureEnvVar(key: string) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

let supabaseAdminClient: SupabaseClient | null = null;

function createSupabaseAdminClient(): SupabaseClient {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseServiceKey) {
    return getSupabaseClient();
  }
  const supabaseUrl = ensureEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  return createClient(supabaseUrl, supabaseServiceKey);
}

function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseAdminClient) {
    supabaseAdminClient = createSupabaseAdminClient();
  }
  return supabaseAdminClient;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseAdminClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

// Type definitions for database tables
export type Platform = 'linkedin' | 'facebook' | 'instagram' | 'pinterest';

export interface Niche {
  id: string;
  name: string;
  description: string | null;
  keywords: string[];
  target_audience: string | null;
  content_themes: string[];
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  name: string;
  platform: Platform;
  niche_id: string | null;
  username: string | null;
  profile_url: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  posting_schedule: {
    times: string[];
    timezone: string;
  };
  tone: string;
  custom_instructions: string | null;
  created_at: string;
  updated_at: string;
}

export interface ViralDefinition {
  id: string;
  account_id: string;
  likes_weight: number;
  likes_threshold: number;
  shares_weight: number;
  shares_threshold: number;
  comments_weight: number;
  comments_threshold: number;
  views_weight: number;
  views_threshold: number;
  saves_weight: number;
  saves_threshold: number;
  ctr_weight: number;
  ctr_threshold: number;
  minimum_viral_score: number;
  timeframe_hours: number;
  comparison_method: string;
  created_at: string;
  updated_at: string;
}

export interface ViralPattern {
  id: string;
  hook_example: string;
  content_structure: string | null;
  emotional_trigger: string | null;
  success_rate: number;
  usage_count: number;
  platforms: Platform[];
  niches: string[];
  is_custom: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  account_id: string;
  platform: Platform;
  content: string;
  media_urls: string[];
  hashtags: string[];
  external_post_id: string | null;
  post_url: string | null;
  trend_topic: string | null;
  pattern_id: string | null;
  predicted_viral_score: number | null;
  actual_viral_score: number | null;
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  scheduled_at: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostEngagement {
  id: string;
  post_id: string;
  checkpoint_hours: number;
  likes: number;
  shares: number;
  comments: number;
  views: number;
  saves: number;
  clicks: number;
  impressions: number;
  reach: number;
  viral_score: number | null;
  recorded_at: string;
}

export interface TrendingTopic {
  id: string;
  niche_id: string;
  topic: string;
  source_url: string | null;
  source_published_at: string | null;
  relevance_score: number;
  is_current_version: boolean;
  expires_at: string;
  created_at: string;
}

export interface AppSetting {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationProfile {
  id: string;
  account_id: string;
  batch_size: number;
  cron_schedule: string;
  notification_email: string | null;
  notification_slack_webhook: string | null;
  error_handling: 'continue' | 'stop';
  is_enabled: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// Database helper functions
export const db = {
  // Niches
  async getNiches(): Promise<Niche[]> {
    const { data, error } = await supabase
      .from('niches')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getNiche(id: string): Promise<Niche | null> {
    const { data, error } = await supabase
      .from('niches')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async createNiche(niche: Partial<Niche>): Promise<Niche> {
    const { data, error } = await supabase
      .from('niches')
      .insert(niche)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateNiche(id: string, updates: Partial<Niche>): Promise<Niche> {
    const { data, error } = await supabase
      .from('niches')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteNiche(id: string): Promise<void> {
    const { error } = await supabase.from('niches').delete().eq('id', id);
    if (error) throw error;
  },

  // Accounts
  async getAccounts(filters?: { platform?: Platform; niche_id?: string; is_active?: boolean }): Promise<Account[]> {
    let query = supabase.from('accounts').select('*');
    if (filters?.platform) query = query.eq('platform', filters.platform);
    if (filters?.niche_id) query = query.eq('niche_id', filters.niche_id);
    if (filters?.is_active !== undefined) query = query.eq('is_active', filters.is_active);
    const { data, error } = await query.order('name');
    if (error) throw error;
    return data || [];
  },

  async getAccount(id: string): Promise<Account | null> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async createAccount(account: Partial<Account>): Promise<Account> {
    const { data, error } = await supabase
      .from('accounts')
      .insert(account)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateAccount(id: string, updates: Partial<Account>): Promise<Account> {
    const { data, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteAccount(id: string): Promise<void> {
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) throw error;
  },

  // Viral Definitions
  async getViralDefinition(accountId: string): Promise<ViralDefinition | null> {
    const { data, error } = await supabase
      .from('viral_definitions')
      .select('*')
      .eq('account_id', accountId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async upsertViralDefinition(definition: Partial<ViralDefinition>): Promise<ViralDefinition> {
    const { data, error } = await supabase
      .from('viral_definitions')
      .upsert(definition, { onConflict: 'account_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Viral Patterns
  async getViralPatterns(filters?: { platform?: Platform; niche_id?: string }): Promise<ViralPattern[]> {
    let query = supabase.from('viral_patterns').select('*');
    if (filters?.platform) query = query.contains('platforms', [filters.platform]);
    if (filters?.niche_id) query = query.contains('niches', [filters.niche_id]);
    const { data, error } = await query.order('success_rate', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createViralPattern(pattern: Partial<ViralPattern>): Promise<ViralPattern> {
    const { data, error } = await supabase
      .from('viral_patterns')
      .insert(pattern)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async incrementPatternUsage(id: string): Promise<void> {
    const { error } = await supabase.rpc('increment_pattern_usage', { pattern_id: id });
    if (error) {
      // Fallback if RPC doesn't exist
      const { data } = await supabase
        .from('viral_patterns')
        .select('usage_count')
        .eq('id', id)
        .single();
      if (data) {
        await supabase
          .from('viral_patterns')
          .update({ usage_count: (data.usage_count || 0) + 1 })
          .eq('id', id);
      }
    }
  },

  // Posts
  async getPosts(filters?: { 
    account_id?: string; 
    platform?: Platform; 
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Post[]> {
    let query = supabase.from('posts').select('*');
    if (filters?.account_id) query = query.eq('account_id', filters.account_id);
    if (filters?.platform) query = query.eq('platform', filters.platform);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.limit) query = query.limit(filters.limit);
    if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getPost(id: string): Promise<Post | null> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async createPost(post: Partial<Post>): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .insert(post)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updatePost(id: string, updates: Partial<Post>): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Post Engagements
  async getPostEngagements(postId: string): Promise<PostEngagement[]> {
    const { data, error } = await supabase
      .from('post_engagements')
      .select('*')
      .eq('post_id', postId)
      .order('checkpoint_hours');
    if (error) throw error;
    return data || [];
  },

  async upsertPostEngagement(engagement: Partial<PostEngagement>): Promise<PostEngagement> {
    const { data, error } = await supabase
      .from('post_engagements')
      .upsert(engagement, { onConflict: 'post_id,checkpoint_hours' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Trending Topics
  async getTrendingTopics(nicheId: string, options?: { includeExpired?: boolean }): Promise<TrendingTopic[]> {
    let query = supabase
      .from('trending_topics')
      .select('*')
      .eq('niche_id', nicheId)
      .eq('is_current_version', true);
    
    if (!options?.includeExpired) {
      query = query.gt('expires_at', new Date().toISOString());
    }
    
    const { data, error } = await query.order('relevance_score', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createTrendingTopic(topic: Partial<TrendingTopic>): Promise<TrendingTopic> {
    const { data, error } = await supabase
      .from('trending_topics')
      .insert(topic)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async expireOldTopics(nicheId: string): Promise<void> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    await supabase
      .from('trending_topics')
      .update({ is_current_version: false })
      .eq('niche_id', nicheId)
      .lt('source_published_at', sevenDaysAgo.toISOString());
  },

  // App Settings
  async getSettings(): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.from('app_settings').select('key, value');
    if (error) throw error;
    return (data || []).reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, unknown>);
  },

  async getSetting(key: string): Promise<unknown> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data?.value;
  },

  async updateSetting(key: string, value: unknown): Promise<void> {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
  },

  // Automation Profiles
  async getAutomationProfile(accountId: string): Promise<AutomationProfile | null> {
    const { data, error } = await supabase
      .from('automation_profiles')
      .select('*')
      .eq('account_id', accountId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async upsertAutomationProfile(profile: Partial<AutomationProfile>): Promise<AutomationProfile> {
    const { data, error } = await supabase
      .from('automation_profiles')
      .upsert(profile, { onConflict: 'account_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getEnabledAutomationProfiles(): Promise<AutomationProfile[]> {
    const { data, error } = await supabase
      .from('automation_profiles')
      .select('*')
      .eq('is_enabled', true);
    if (error) throw error;
    return data || [];
  },
};

export default db;

// Error handling helper
export function handleSupabaseError(error: any): string {
  if (error?.message) return error.message;
  if (error?.code) {
    switch (error.code) {
      case 'PGRST116': return 'Record not found';
      case '23505': return 'This record already exists';
      case '23503': return 'Referenced record does not exist';
      case '42501': return 'Permission denied';
      default: return `Database error: ${error.code}`;
    }
  }
  return 'An unexpected database error occurred';
}
