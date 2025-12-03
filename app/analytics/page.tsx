'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Calendar,
  Flame,
  LayoutDashboard,
  LineChart,
  ListChecks,
  LogOut,
  PieChart,
  Settings,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import {
  LineChart as ReLineChart,
  Line as ReLine,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
  BarChart as ReBarChart,
  Bar as ReBar,
  PieChart as RePieChart,
  Pie as RePie,
  Cell as ReCell,
  Legend as ReLegend,
  ResponsiveContainer as ReResponsiveContainer,
} from 'recharts';
import { useAuth } from '@/lib/AuthProvider';

interface TopPostRow {
  id: string;
  content: string;
  platform: string;
  account_name: string;
  niche_name: string;
  viral_score: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  posted_at: string;
}

interface PlatformBreakdownRow {
  platform: string;
  posts: number;
  impressions: number;
  engagement_rate: number;
}

interface AccountPerformanceRow {
  account_id: string;
  account_name: string;
  platform: string;
  posts_count: number;
  viral_rate: number;
  avg_engagement: number;
  impressions: number;
  niche_name: string;
}

interface BestPerformingNiche {
  niche_id: string;
  niche_name: string;
  avg_viral_score: number;
  avg_engagement: number;
}

interface AnalyticsData {
  total_posts: number;
  viral_posts: number;
  viral_rate: number;
  avg_engagement: number;
  total_impressions: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  avg_viral_score: number;
  engagement_rate: number;
  posts_this_week: number;
  posts_last_week: number;
  top_posts: TopPostRow[];
  platform_breakdown: PlatformBreakdownRow[];
  viral_score_trend: { date: string; score: number }[];
  engagement_distribution: { type: string; value: number }[];
  account_performance: AccountPerformanceRow[];
  best_performing_niche: BestPerformingNiche | null;
  insights: {
    best_posting_times: { day: string; hour: number; posts: number }[];
    engaging_topics: { topic: string; mentions: number; avg_engagement: number }[];
    trending_hooks: { hook: string; usage_count: number; success_score: number }[];
    platform_comparison: PlatformBreakdownRow[];
  };
  filters: {
    platforms: string[];
    accounts: { id: string; name: string; platform: string }[];
    niches: { id: string; name: string }[];
  };
}

type FilterState = {
  days: string;
  platform: string;
  account: string;
  niche: string;
  viralOnly: boolean;
};

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
  pinterest: 'Pinterest',
  twitter: 'Twitter',
  unknown: 'Unknown',
};

const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
};

const formatDate = (value: string): string => new Date(value).toLocaleDateString();

const navigationItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/accounts', icon: Users, label: 'Accounts' },
  { href: '/content', icon: ListChecks, label: 'Content' },
  { href: '/trends', icon: TrendingUp, label: 'Trends' },
  { href: '/schedule', icon: Calendar, label: 'Schedule' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics', active: true },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

function ChartCard({ title, description, children, testId }: { title: string; description: string; children: React.ReactNode; testId: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" data-testid={testId}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
        {children}
      </div>
    </div>
  );
}

function Heatmap({ data }: { data: { day: string; hour: number; posts: number }[] }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = [6, 9, 12, 15, 18, 21];

  const lookup = new Map<string, number>();
  data.forEach((entry) => {
    lookup.set(`${entry.day}-${entry.hour}`, entry.posts);
  });

  return (
    <div className="grid grid-cols-7 gap-2 text-xs" data-testid="heatmap-grid">
      {days.map((day) => (
        <div key={day} className="space-y-2">
          <p className="text-center text-gray-500">{day}</p>
          {hours.map((hour) => {
            const posts = lookup.get(`${day}-${hour}`) || 0;
            const intensity = Math.min(1, posts / 5);
            const opacityClasses = ['opacity-40', 'opacity-60', 'opacity-80', 'opacity-100'];
            const opacityClass = opacityClasses[Math.min(3, Math.floor(intensity * opacityClasses.length))];
            const baseClass = posts === 0 ? 'bg-gray-100 text-gray-500 opacity-100' : `bg-blue-500 text-white ${opacityClass}`;
            return (
              <div
                key={`${day}-${hour}`}
                className={`h-8 rounded flex items-center justify-center ${baseClass}`}
                title={`${day} ${hour}:00 • ${posts} posts`}
              >
                {posts}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    days: '30',
    platform: 'all',
    account: 'all',
    niche: 'all',
    viralOnly: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError('');
        const params = new URLSearchParams();
        params.set('days', filters.days);
        if (filters.platform !== 'all') params.set('platform', filters.platform);
        if (filters.account !== 'all') params.set('account_id', filters.account);
        if (filters.niche !== 'all') params.set('niche_id', filters.niche);
        if (filters.viralOnly) params.set('viral_only', 'true');

        const response = await fetch(`/api/analytics?${params.toString()}`);
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || 'Failed to load analytics');
        }
        setAnalytics(payload.data as AnalyticsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load analytics');
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [authLoading, user, filters]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const postGrowth = useMemo(() => {
    if (!analytics) return 0;
    if (analytics.posts_last_week === 0) return analytics.posts_this_week > 0 ? 100 : 0;
    return ((analytics.posts_this_week - analytics.posts_last_week) / analytics.posts_last_week) * 100;
  }, [analytics]);

  const bestNicheLabel = analytics?.best_performing_niche
    ? `${analytics.best_performing_niche.niche_name} (${analytics.best_performing_niche.avg_viral_score.toFixed(1)})`
    : 'No niche data yet';

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Social Auto</h1>
                <p className="text-xs text-gray-500">AI-Powered</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  item.active ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="mb-3 px-4 py-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Signed in as</p>
              <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="ml-64">
        <div className="p-8 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Analytics</h2>
              <p className="text-gray-600 mt-1">Monitor viral performance, platform mix, and account health.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                value={filters.days}
                onChange={(event) => setFilters((prev) => ({ ...prev, days: event.target.value }))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Date range"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
              <select
                value={filters.platform}
                onChange={(event) => setFilters((prev) => ({ ...prev, platform: event.target.value }))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Platform filter"
              >
                <option value="all">All platforms</option>
                {(analytics?.filters.platforms || []).map((platform) => (
                  <option key={platform} value={platform}>
                    {PLATFORM_LABELS[platform] || platform}
                  </option>
                ))}
              </select>
              <select
                value={filters.niche}
                onChange={(event) => setFilters((prev) => ({ ...prev, niche: event.target.value }))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Niche filter"
              >
                <option value="all">All niches</option>
                {(analytics?.filters.niches || []).map((niche) => (
                  <option key={niche.id} value={niche.id}>
                    {niche.name}
                  </option>
                ))}
              </select>
              <select
                value={filters.account}
                onChange={(event) => setFilters((prev) => ({ ...prev, account: event.target.value }))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Account filter"
              >
                <option value="all">All accounts</option>
                {(analytics?.filters.accounts || []).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={filters.viralOnly}
                  onChange={(event) => setFilters((prev) => ({ ...prev, viralOnly: event.target.checked }))}
                />
                Viral only
              </label>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {analytics ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total posts</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.total_posts}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <BarChart3 className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-sm">
                    {postGrowth >= 0 ? (
                      <>
                        <ArrowUp className="w-4 h-4 text-green-500" />
                        <span className="text-green-600">{Math.abs(postGrowth).toFixed(1)}%</span>
                      </>
                    ) : (
                      <>
                        <ArrowDown className="w-4 h-4 text-red-500" />
                        <span className="text-red-600">{Math.abs(postGrowth).toFixed(1)}%</span>
                      </>
                    )}
                    <span className="text-gray-500">vs last week</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Viral posts</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.viral_posts}</p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <Flame className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-orange-600">Viral rate {analytics.viral_rate.toFixed(1)}%</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Avg engagement</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{formatNumber(analytics.avg_engagement)}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Activity className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-gray-500">Engagement rate {analytics.engagement_rate.toFixed(2)}%</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Best performing niche</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{bestNicheLabel}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <LineChart className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <ChartCard title="Viral score over time" description="Average daily viral score" testId="viral-score-chart">
                  {analytics.viral_score_trend && (
                    <div className="w-full h-56" data-testid="viral-score-chart-content">
                      <ReResponsiveContainer width="100%" height="100%">
                        <ReLineChart data={analytics.viral_score_trend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ReTooltip />
                        <ReLine type="monotone" dataKey="score" stroke="#2563EB" strokeWidth={2} dot={false} />
                        </ReLineChart>
                      </ReResponsiveContainer>
                    </div>
                  )}
                </ChartCard>
                <ChartCard title="Posts by platform" description="Volume split" testId="platform-bar-chart">
                  {analytics.platform_breakdown && (
                    <div className="w-full h-56" data-testid="platform-bar-chart-content">
                      <ReResponsiveContainer width="100%" height="100%">
                        <ReBarChart data={analytics.platform_breakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="platform" />
                        <YAxis />
                        <ReTooltip />
                        <ReBar dataKey="posts" fill="#6366F1" />
                        </ReBarChart>
                      </ReResponsiveContainer>
                    </div>
                  )}
                </ChartCard>
                <ChartCard title="Engagement distribution" description="Likes vs comments vs shares" testId="engagement-pie-chart">
                  {analytics.engagement_distribution && (
                    <div className="w-full h-56" data-testid="engagement-pie-chart-content">
                      <ReResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                        <RePie data={analytics.engagement_distribution} dataKey="value" nameKey="type" cx="50%" cy="50%" outerRadius={60} fill="#10B981" label>
                          {analytics.engagement_distribution.map((entry, idx) => (
                            <ReCell key={entry.type} fill={['#10B981','#60A5FA','#F59E0B'][idx % 3]} />
                          ))}
                        </RePie>
                        <ReLegend />
                        </RePieChart>
                      </ReResponsiveContainer>
                    </div>
                  )}
                </ChartCard>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" data-testid="top-posts-table">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Top performing posts</h3>
                    <span className="text-sm text-gray-500">Last {filters.days} days</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs uppercase text-gray-500">
                        <tr>
                          <th className="py-2 pr-4">Date</th>
                          <th className="py-2 pr-4">Account</th>
                          <th className="py-2 pr-4">Content</th>
                          <th className="py-2 pr-4">Viral score</th>
                          <th className="py-2 pr-4">Engagement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {analytics.top_posts.slice(0, 10).map((post) => (
                          <tr key={post.id}>
                            <td className="py-3 pr-4 text-gray-500">{formatDate(post.posted_at)}</td>
                            <td className="py-3 pr-4">
                              <p className="font-medium text-gray-900">{post.account_name}</p>
                              <p className="text-xs text-gray-500">{PLATFORM_LABELS[post.platform] || post.platform}</p>
                            </td>
                            <td className="py-3 pr-4 text-gray-700 line-clamp-2">{post.content}</td>
                            <td className="py-3 pr-4">
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-600 font-semibold">
                                {post.viral_score.toFixed(0)}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-gray-600">{formatNumber(post.likes + post.comments + post.shares)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" data-testid="account-performance-table">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Account performance</h3>
                    <span className="text-sm text-gray-500">By engagement</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs uppercase text-gray-500">
                        <tr>
                          <th className="py-2 pr-4">Account</th>
                          <th className="py-2 pr-4">Posts</th>
                          <th className="py-2 pr-4">Viral rate</th>
                          <th className="py-2 pr-4">Avg engagement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {analytics.account_performance.map((account) => (
                          <tr key={account.account_id}>
                            <td className="py-3 pr-4">
                              <p className="font-medium text-gray-900">{account.account_name}</p>
                              <p className="text-xs text-gray-500">{account.niche_name}</p>
                            </td>
                            <td className="py-3 pr-4 text-gray-600">{account.posts_count}</td>
                            <td className="py-3 pr-4 text-gray-600">{account.viral_rate.toFixed(1)}%</td>
                            <td className="py-3 pr-4 text-gray-600">{formatNumber(account.avg_engagement)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" data-testid="insights-panel">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Insights</h3>
                  <span className="text-sm text-gray-500">Actionable opportunities</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-3">Best posting times</p>
                    <Heatmap data={analytics.insights.best_posting_times} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-3">Most engaging topics</p>
                    <ul className="space-y-2 text-sm text-gray-700" data-testid="engaging-topics">
                      {analytics.insights.engaging_topics.slice(0, 5).map((topic) => (
                        <li key={topic.topic} className="flex items-center justify-between">
                          <span>{topic.topic}</span>
                          <span className="text-gray-500">{topic.avg_engagement.toFixed(0)} avg</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-3">Trending hooks</p>
                    <ul className="space-y-2 text-sm text-gray-700" data-testid="trending-hooks">
                      {analytics.insights.trending_hooks.slice(0, 5).map((hook) => (
                        <li key={hook.hook}>
                          <p className="font-medium text-gray-900 line-clamp-2">{hook.hook}</p>
                          <p className="text-xs text-gray-500">{hook.usage_count} uses · {hook.success_score.toFixed(1)} avg score</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-3">Platform comparison</p>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {analytics.insights.platform_comparison.map((platform) => (
                        <li key={platform.platform} className="flex items-center justify-between">
                          <span>{PLATFORM_LABELS[platform.platform] || platform.platform}</span>
                          <span className="text-gray-500">{platform.engagement_rate.toFixed(1)}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics data</h3>
              <p className="text-gray-500 mb-6">Start posting to populate your analytics dashboard.</p>
              <button
                onClick={() => router.push('/content')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Go to Content Generator
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
