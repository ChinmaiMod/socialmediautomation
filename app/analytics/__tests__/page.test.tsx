import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AnalyticsPage from '../page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockSignOut = jest.fn();

jest.mock('@/lib/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

const { useAuth } = jest.requireMock('@/lib/AuthProvider');

const buildMockResponse = () => ({
  total_posts: 42,
  viral_posts: 10,
  viral_rate: 23.8,
  avg_engagement: 2750,
  total_impressions: 42000,
  total_likes: 18000,
  total_comments: 9000,
  total_shares: 6000,
  avg_viral_score: 76,
  engagement_rate: 12.4,
  posts_this_week: 18,
  posts_last_week: 12,
  top_posts: [
    {
      id: 'post-1',
      content: 'AI automation tips for LinkedIn success',
      platform: 'linkedin',
      account_name: 'GrowthOps',
      niche_name: 'B2B SaaS',
      viral_score: 88,
      impressions: 12000,
      likes: 4100,
      comments: 640,
      shares: 220,
      posted_at: '2024-03-10T10:00:00.000Z',
    },
  ],
  platform_breakdown: [
    {
      platform: 'linkedin',
      posts: 20,
      impressions: 22000,
      engagement_rate: 14.2,
    },
    {
      platform: 'instagram',
      posts: 12,
      impressions: 12000,
      engagement_rate: 9.6,
    },
  ],
  viral_score_trend: [
    { date: '2024-03-01', score: 65 },
    { date: '2024-03-02', score: 78 },
  ],
  engagement_distribution: [
    { type: 'likes', value: 18000 },
    { type: 'comments', value: 9000 },
    { type: 'shares', value: 6000 },
  ],
  account_performance: [
    {
      account_id: 'acc-1',
      account_name: 'GrowthOps',
      platform: 'linkedin',
      posts_count: 20,
      viral_rate: 35.5,
      avg_engagement: 3800,
      impressions: 22000,
      niche_name: 'B2B SaaS',
    },
  ],
  best_performing_niche: {
    niche_id: 'niche-1',
    niche_name: 'B2B SaaS',
    avg_viral_score: 82,
    avg_engagement: 3400,
  },
  insights: {
    best_posting_times: [
      { day: 'Mon', hour: 9, posts: 3 },
      { day: 'Tue', hour: 12, posts: 4 },
    ],
    engaging_topics: [
      { topic: 'Case studies', mentions: 6, avg_engagement: 3600 },
      { topic: 'Industry trends', mentions: 4, avg_engagement: 3100 },
    ],
    trending_hooks: [
      { hook: 'How we scaled to $1M ARR', usage_count: 3, success_score: 89 },
      { hook: 'Stop making this mistake', usage_count: 2, success_score: 81 },
    ],
    platform_comparison: [
      {
        platform: 'linkedin',
        posts: 20,
        impressions: 22000,
        engagement_rate: 14.2,
      },
      {
        platform: 'instagram',
        posts: 12,
        impressions: 12000,
        engagement_rate: 9.6,
      },
    ],
  },
  filters: {
    platforms: ['linkedin', 'instagram'],
    accounts: [
      { id: 'acc-1', name: 'GrowthOps', platform: 'linkedin' },
      { id: 'acc-2', name: 'LaunchPad', platform: 'instagram' },
    ],
    niches: [
      { id: 'niche-1', name: 'B2B SaaS' },
      { id: 'niche-2', name: 'Creator Economy' },
    ],
  },
});

describe('AnalyticsPage', () => {
  const mockUser = { email: 'founder@startup.io' };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: mockSignOut,
    });
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: buildMockResponse() }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('renders analytics dashboard sections with fetched data', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const heading = await screen.findByRole('heading', { name: 'Analytics' });
    expect(heading).toBeInTheDocument();

    expect(screen.getByText('Total posts')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    const viralLabel = screen.getByText('Viral posts');
    const viralContainer = viralLabel.parentElement as HTMLElement;
    expect(viralContainer).toHaveTextContent('10');
    expect(screen.getByTestId('viral-score-chart')).toBeInTheDocument();
    expect(screen.getByTestId('platform-bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('engagement-pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('top-posts-table')).toBeInTheDocument();
    expect(screen.getByTestId('account-performance-table')).toBeInTheDocument();
    expect(screen.getByTestId('insights-panel')).toBeInTheDocument();
    expect(screen.getByTestId('heatmap-grid')).toBeInTheDocument();
    expect(screen.getByTestId('engaging-topics')).toHaveTextContent('Case studies');
    expect(screen.getByTestId('trending-hooks')).toHaveTextContent('How we scaled to $1M ARR');
  });

  it('applies filters when selections change', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const platformSelect = await screen.findByLabelText('Platform filter');
    fireEvent.change(platformSelect, { target: { value: 'instagram' } });

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const lastRequest = (global.fetch as jest.Mock).mock.calls[1][0] as string;
    expect(lastRequest).toContain('platform=instagram');

    const accountSelect = await screen.findByLabelText('Account filter');
    fireEvent.change(accountSelect, { target: { value: 'acc-2' } });

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
    const thirdRequest = (global.fetch as jest.Mock).mock.calls[2][0] as string;
    expect(thirdRequest).toContain('account_id=acc-2');
  });
});
