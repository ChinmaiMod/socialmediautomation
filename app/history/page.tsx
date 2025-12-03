'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';

interface AccountOption {
  id: string;
  name: string;
  platform: string;
}

interface NicheOption {
  id: string;
  name: string;
}

interface MetricSnapshot {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  impressions: number;
  reach: number;
}

interface PerformanceSample {
  timestamp: string;
  engagements?: number;
  impressions?: number;
  viral_score?: number;
}

interface SimilarPost {
  id: string;
  account_name: string;
  platform: string;
  snippet: string;
}

interface TrendInfo {
  name: string;
  source?: string;
}

interface HistoryPost {
  id: string;
  accountId: string;
  accountName: string;
  platform: string;
  status: string;
  content: string;
  createdAt: string;
  postedAt?: string;
  scheduledAt?: string;
  isViral: boolean;
  viralScore: number;
  predictedViralScore?: number | null;
  nicheId?: string | null;
  metrics: MetricSnapshot;
  performanceHistory: PerformanceSample[];
  trend?: TrendInfo | null;
  similarPosts: SimilarPost[];
}

const STATUS_OPTIONS = ['all', 'posted', 'scheduled', 'draft', 'failed'] as const;
const PLATFORM_OPTIONS = ['all', 'linkedin', 'facebook', 'instagram', 'pinterest', 'twitter'] as const;
const DEFAULT_RANGE_DAYS = 30;

const PLATFORM_ICONS: Record<string, string> = {
  linkedin: '💼',
  facebook: '📘',
  instagram: '📷',
  pinterest: '📌',
  twitter: '🐦',
};

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
  pinterest: 'Pinterest',
  twitter: 'Twitter',
};

const formatDateForInput = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatFullDate = (value?: string) => {
  if (!value) return 'Unknown date';
  return new Date(value).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTime = (value?: string) => {
  if (!value) return '';
  return new Date(value).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatMetricValue = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
};

const scoreBadgeClasses = (score: number) => {
  if (score >= 80) return 'bg-green-100 text-green-700 border border-green-200';
  if (score >= 60) return 'bg-amber-100 text-amber-700 border border-amber-200';
  return 'bg-rose-100 text-rose-700 border border-rose-200';
};

const normalizeAccount = (raw: any): AccountOption => ({
  id: raw.id,
  name: raw.name || raw.account_name || 'Unknown account',
  platform: raw.platform || 'unknown',
});

const normalizePost = (raw: any): HistoryPost => {
  const metrics = raw.metrics || raw.engagement || {};
  return {
    id: raw.id,
    accountId: raw.account_id,
    accountName: raw.account_name || raw.account?.name || raw.account?.account_name || 'Unknown account',
    platform: raw.platform,
    status: raw.status || 'posted',
    content: raw.content || '',
    createdAt: raw.created_at,
    postedAt: raw.posted_at || raw.posted_time || raw.published_at,
    scheduledAt: raw.scheduled_at || raw.scheduled_time,
    isViral: typeof raw.is_viral === 'boolean' ? raw.is_viral : (raw.viral_score ?? raw.actual_viral_score ?? 0) >= 70,
    viralScore: raw.viral_score ?? raw.actual_viral_score ?? 0,
    predictedViralScore: raw.predicted_viral_score ?? raw.predicted_score ?? null,
    nicheId: raw.niche_id || raw.account?.niche_id || null,
    metrics: {
      likes: metrics.likes ?? 0,
      comments: metrics.comments ?? 0,
      shares: metrics.shares ?? 0,
      saves: metrics.saves ?? 0,
      impressions: metrics.impressions ?? 0,
      reach: metrics.reach ?? 0,
    },
    performanceHistory: Array.isArray(raw.performance_history)
      ? raw.performance_history
      : Array.isArray(raw.engagements)
        ? raw.engagements
        : [],
    trend: raw.trend ?? null,
    similarPosts: Array.isArray(raw.similar_posts) ? raw.similar_posts : [],
  };
};

export default function HistoryPage() {
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [niches, setNiches] = useState<NicheOption[]>([]);
  const [posts, setPosts] = useState<HistoryPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const defaultStart = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - DEFAULT_RANGE_DAYS);
    return start;
  }, []);

  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedNiche, setSelectedNiche] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>(formatDateForInput(defaultStart));
  const [endDate, setEndDate] = useState<string>(formatDateForInput(today));
  const [viralOnly, setViralOnly] = useState<boolean>(false);
  const [selectedPost, setSelectedPost] = useState<HistoryPost | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadFilters = async () => {
      try {
        const [accountsRes, nichesRes] = await Promise.all([
          fetch('/api/accounts'),
          fetch('/api/niches'),
        ]);

        if (isCancelled) return;

        if (accountsRes.ok) {
          const accountsPayload = await accountsRes.json();
          const rawAccounts = Array.isArray(accountsPayload?.accounts)
            ? accountsPayload.accounts
            : accountsPayload?.data || [];
          setAccounts(rawAccounts.map(normalizeAccount));
        }

        if (nichesRes.ok) {
          const nichesPayload = await nichesRes.json();
          const rawNiches = Array.isArray(nichesPayload?.data) ? nichesPayload.data : [];
          setNiches(rawNiches.map((niche: any) => ({ id: niche.id, name: niche.name })));
        }
      } catch {
        // Filter data is helpful but non-blocking, so swallow errors silently
      }
    };

    loadFilters();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadHistory = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ limit: '50' });

        if (selectedAccount !== 'all') params.set('account_id', selectedAccount);
        if (selectedPlatform !== 'all') params.set('platform', selectedPlatform);
        if (selectedStatus !== 'all') params.set('status', selectedStatus);
        if (selectedNiche !== 'all') params.set('niche_id', selectedNiche);
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);
        if (viralOnly) params.set('viral_only', 'true');

        const response = await fetch(`/api/history?${params.toString()}`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to fetch post history');
        }

        const payload = await response.json();
        if (isCancelled) return;

        const rawPosts = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.posts)
            ? payload.posts
            : [];

        setPosts(rawPosts.map(normalizePost));
      } catch (err) {
        if (isCancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load history');
        setPosts([]);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      isCancelled = true;
    };
  }, [selectedAccount, selectedPlatform, selectedStatus, selectedNiche, startDate, endDate, viralOnly]);

  const summary = useMemo(() => {
    const total = posts.length;
    const posted = posts.filter((post) => post.status === 'posted').length;
    const scheduled = posts.filter((post) => post.status === 'scheduled').length;
    const viral = posts.filter((post) => post.isViral).length;
    return { total, posted, scheduled, viral };
  }, [posts]);

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      const aDate = a.postedAt || a.createdAt;
      const bDate = b.postedAt || b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [posts]);

  const getPlatformIcon = (platform: string) => PLATFORM_ICONS[platform] || '🌐';
  const getPlatformLabel = (platform: string) => PLATFORM_LABELS[platform] || platform;
  const getNicheName = (id?: string | null) => niches.find((niche) => niche.id === id)?.name;

  const renderMetrics = (metrics: MetricSnapshot) => {
    const metricItems = [
      { key: 'likes', label: 'likes', value: metrics.likes },
      { key: 'comments', label: 'comments', value: metrics.comments },
      { key: 'shares', label: 'shares', value: metrics.shares },
      { key: 'saves', label: 'saves', value: metrics.saves },
      { key: 'impressions', label: 'impressions', value: metrics.impressions },
      { key: 'reach', label: 'reach', value: metrics.reach },
    ].filter((item) => item.value > 0);

    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
        {metricItems.map((item) => (
          <div
            key={item.key}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 px-4 py-3 text-sm"
          >
            <p className="text-gray-500 dark:text-gray-400 capitalize">{item.label}</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatMetricValue(item.value)} {item.label}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const closeModal = () => setSelectedPost(null);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <main className="flex-1 ml-64 p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Post History</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Audit historical performance, drill into viral wins, and understand platform momentum.
            </p>
          </header>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <article className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total posts</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{summary.total}</p>
            </article>
            <article className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Published</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-500">{summary.posted}</p>
            </article>
            <article className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Scheduled</p>
              <p className="mt-2 text-3xl font-semibold text-sky-500">{summary.scheduled}</p>
            </article>
            <article className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Viral wins</p>
              <p className="mt-2 text-3xl font-semibold text-amber-500">{summary.viral}</p>
            </article>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="account-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Account
                </label>
                <select
                  id="account-filter"
                  value={selectedAccount}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                    const select = event.currentTarget;
                    const rawValue = event.target.value || select.value;
                    const nextAccount = rawValue || select.selectedOptions?.[0]?.value || 'all';
                    setSelectedAccount(nextAccount);
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  <option value="all">All accounts</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({getPlatformLabel(account.platform)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="platform-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Platform
                </label>
                <select
                  id="platform-filter"
                  value={selectedPlatform}
                  onChange={(event) => setSelectedPlatform(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  {PLATFORM_OPTIONS.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform === 'all' ? 'All platforms' : getPlatformLabel(platform)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="status-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <select
                  id="status-filter"
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  {STATUS_OPTIONS.map((statusOption) => (
                    <option key={statusOption} value={statusOption}>
                      {statusOption === 'all'
                        ? 'All statuses'
                        : statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="niche-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Niche
                </label>
                <select
                  id="niche-filter"
                  value={selectedNiche}
                  onChange={(event) => setSelectedNiche(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  <option value="all">All niches</option>
                  {niches.map((niche) => (
                    <option key={niche.id} value={niche.id}>
                      {niche.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="start-date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Start date
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="end-date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  End date
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={viralOnly}
                  onChange={(event) => setViralOnly(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500 dark:border-gray-500"
                />
                Viral posts only
              </label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Showing {posts.length} result{posts.length === 1 ? '' : 's'}
              </span>
            </div>
          </section>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-900/70 dark:bg-rose-900/20 dark:text-rose-200">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" aria-label="Loading" />
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-16 text-center dark:border-gray-700 dark:bg-gray-800/70">
              <p className="text-4xl">📭</p>
              <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">No history for this slice</h2>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Adjust the filters or expand the date range to see additional posts.
              </p>
            </div>
          ) : (
            <section className="relative">
              <div className="absolute left-6 top-0 bottom-0 hidden w-px bg-gray-200 dark:bg-gray-700 lg:block" aria-hidden="true" />
              <div className="space-y-8">
                {(() => {
                  let lastDateLabel: string | null = null;
                  return sortedPosts.map((post) => {
                    const timestamp = post.postedAt || post.scheduledAt || post.createdAt;
                    const dateLabel = formatFullDate(timestamp);
                    const timeLabel = formatTime(timestamp);
                    const niche = getNicheName(post.nicheId);

                    const shouldRenderDate = dateLabel !== lastDateLabel;
                    lastDateLabel = dateLabel;

                    return (
                      <article key={post.id} className="relative pl-4 lg:pl-16" data-testid="timeline-item">
                        <span className="absolute left-[18px] top-6 hidden h-3 w-3 rounded-full border-2 border-white bg-sky-500 dark:border-gray-900 lg:block" aria-hidden="true" />

                        {shouldRenderDate && (
                          <div className="mb-2 text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {dateLabel}
                          </div>
                        )}

                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span className="text-xl" aria-hidden="true">
                                {getPlatformIcon(post.platform)}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {post.accountName}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {getPlatformLabel(post.platform)} • {timeLabel}
                                </p>
                              </div>
                              <span className={`rounded-full px-2 py-1 text-xs font-medium ${scoreBadgeClasses(post.viralScore)}`}>
                                {post.viralScore.toFixed(0)}%
                              </span>
                              {post.isViral && (
                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                                  🔥 Viral
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <span className="rounded-full border border-gray-200 px-3 py-1 capitalize dark:border-gray-700 dark:text-gray-300">
                                {post.status}
                              </span>
                              {niche && (
                                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700 dark:border-sky-900/60 dark:bg-sky-900/30 dark:text-sky-200">
                                  #{niche}
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="mt-4 line-clamp-3 text-sm text-gray-700 dark:text-gray-200">
                            {post.content}
                          </p>

                          {renderMetrics(post.metrics)}

                          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                            {post.trend?.name && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Based on trend: <span className="font-medium text-gray-900 dark:text-gray-200">{post.trend.name}</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedPost(post)}
                              className="inline-flex items-center gap-2 rounded-full border border-sky-500 px-4 py-2 text-sm font-medium text-sky-600 transition hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:border-sky-400 dark:text-sky-300 dark:hover:bg-sky-900/40"
                            >
                              View details
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  });
                })()}
              </div>
            </section>
          )}
        </div>
      </main>

      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-detail-title"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start justify-between gap-6 border-b border-gray-200 px-6 py-5 dark:border-gray-700">
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span aria-hidden="true" className="text-xl">
                    {getPlatformIcon(selectedPost.platform)}
                  </span>
                  {getPlatformLabel(selectedPost.platform)} • {selectedPost.accountName}
                </p>
                <h2 id="history-detail-title" className="text-xl font-semibold text-gray-900 dark:text-white">
                  Performance insights
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedPost.postedAt
                    ? `Published ${formatFullDate(selectedPost.postedAt)} at ${formatTime(selectedPost.postedAt)}`
                    : `Created ${formatFullDate(selectedPost.createdAt)} at ${formatTime(selectedPost.createdAt)}`}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-8 px-6 py-6">
              <section>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Full post</h3>
                <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
                  {selectedPost.content}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Predicted vs actual</h3>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Predicted viral score</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                      {selectedPost.predictedViralScore != null ? `${selectedPost.predictedViralScore.toFixed(0)}%` : '–'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Actual viral score</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{selectedPost.viralScore.toFixed(0)}%</p>
                  </div>
                </div>
              </section>

              {selectedPost.trend?.name && (
                <section>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Trend intelligence</h3>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    Trend: {selectedPost.trend.name}
                    {selectedPost.trend.source ? ` • Source: ${selectedPost.trend.source}` : ''}
                  </p>
                </section>
              )}

              <section>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Performance over time</h3>
                <div
                  data-testid="metrics-history"
                  className="mt-3 space-y-2 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  {selectedPost.performanceHistory.length === 0 && <p>No engagement history captured yet.</p>}
                  {selectedPost.performanceHistory.map((sample) => (
                    <div key={sample.timestamp} className="flex flex-wrap items-center justify-between">
                      <span>{formatFullDate(sample.timestamp)} • {formatTime(sample.timestamp)}</span>
                      <span>
                        {sample.engagements != null && `${sample.engagements} engagements`}
                        {sample.engagements != null && sample.impressions != null && ' • '}
                        {sample.impressions != null && `${sample.impressions} impressions`}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Similar successful posts</h3>
                {selectedPost.similarPosts.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No similar wins logged yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" role="list">
                    {selectedPost.similarPosts.map((similar) => (
                      <li key={similar.id} className="flex flex-col gap-1">
                        <span className="font-medium text-gray-900 dark:text-white">{similar.account_name}</span>
                        <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{getPlatformLabel(similar.platform)}</span>
                        <span>{similar.snippet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex items-center rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
