import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HistoryPage from '../page';

jest.mock('@/components/layout/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));

describe('HistoryPage', () => {
  const accountsResponse = {
    accounts: [
      { id: 'account-1', platform: 'linkedin', name: 'LinkedIn Lion' },
      { id: 'account-2', platform: 'instagram', name: 'Insta Growth Lab' },
    ],
  };

  const nichesResponse = {
    success: true,
    data: [
      { id: 'niche-1', name: 'B2B SaaS' },
      { id: 'niche-2', name: 'Creator Economy' },
    ],
  };

  const historyResponse = {
    success: true,
    data: [
      {
        id: 'post-1',
        account_id: 'account-1',
        account_name: 'LinkedIn Lion',
        platform: 'linkedin',
        status: 'posted',
        posted_at: '2024-10-20T14:00:00.000Z',
        created_at: '2024-10-18T10:00:00.000Z',
        content: 'Here is an AI onboarding flow that 10x conversions.',
        niche_id: 'niche-1',
        viral_score: 88,
        predicted_viral_score: 74,
        metrics: {
          likes: 420,
          comments: 51,
          shares: 12,
          saves: 7,
          impressions: 12000,
          reach: 8000,
        },
        trend: {
          name: 'AI onboarding flows',
          source: 'Trend report 2024-10-18',
        },
        performance_history: [
          { timestamp: '2024-10-20T15:00:00.000Z', engagements: 120, impressions: 4000, viral_score: 72 },
          { timestamp: '2024-10-20T18:00:00.000Z', engagements: 220, impressions: 8000, viral_score: 81 },
        ],
        similar_posts: [
          {
            id: 'similar-1',
            account_name: 'Growth Ops',
            platform: 'linkedin',
            snippet: 'Five onboarding touchpoints you can automate today',
          },
        ],
      },
      {
        id: 'post-2',
        account_id: 'account-2',
        account_name: 'Insta Growth Lab',
        platform: 'instagram',
        status: 'posted',
        posted_at: '2024-10-19T09:30:00.000Z',
        created_at: '2024-10-18T11:00:00.000Z',
        content: 'Carousels that trigger urgency with real-time launches.',
        niche_id: 'niche-2',
        viral_score: 64,
        predicted_viral_score: 69,
        metrics: {
          likes: 318,
          comments: 77,
          shares: 55,
          saves: 21,
          impressions: 9800,
          reach: 6400,
        },
        trend: {
          name: 'Launch urgency triggers',
          source: 'Tiktok Trend Miner',
        },
        performance_history: [
          { timestamp: '2024-10-19T10:30:00.000Z', engagements: 90, impressions: 3000, viral_score: 58 },
        ],
        similar_posts: [],
      },
    ],
    meta: {
      hasMore: false,
      limit: 25,
      offset: 0,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a timeline of posts with metrics and viral score indicators', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => accountsResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => nichesResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => historyResponse });

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<HistoryPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    const timelineItems = await screen.findAllByTestId('timeline-item');
    expect(timelineItems).toHaveLength(2);

    const firstItem = timelineItems[0];
    expect(within(firstItem).getByText('LinkedIn Lion')).toBeInTheDocument();
    expect(within(firstItem).getByText('🔥 Viral')).toBeInTheDocument();
    expect(within(firstItem).getByText(/88%/)).toBeInTheDocument();
    expect(within(firstItem).getByText(/420 likes/i)).toBeInTheDocument();
    expect(screen.getByText('#B2B SaaS')).toBeInTheDocument();
  });

  it('applies filters and propagates them to the history request', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => accountsResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => nichesResponse })
      .mockResolvedValue({ ok: true, json: async () => historyResponse });

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<HistoryPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    await screen.findByRole('option', { name: /LinkedIn Lion/i });

    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText('Account'), 'account-1');
    await user.selectOptions(screen.getByLabelText('Platform'), 'linkedin');
    await user.selectOptions(screen.getByLabelText('Niche'), 'niche-1');
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2024-10-01' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2024-10-31' } });
    await user.click(screen.getByRole('checkbox', { name: /viral posts only/i }));

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((call) => call[0] as string);
      const filteredCall = urls.find((url) =>
        url.includes('account_id=account-1') &&
        url.includes('platform=linkedin') &&
        url.includes('niche_id=niche-1') &&
        url.includes('start_date=2024-10-01') &&
        url.includes('end_date=2024-10-31') &&
        url.includes('viral_only=true')
      );

      expect(filteredCall).toBeDefined();
    });
  });

  it('opens the details modal with performance insights', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => accountsResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => nichesResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => historyResponse });

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<HistoryPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    const viewButtons = await screen.findAllByRole('button', { name: /View details/i });
    fireEvent.click(viewButtons[0]);

    const modal = await screen.findByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText('Performance insights')).toBeInTheDocument();
    expect(within(modal).getByText(/Trend:\s*AI onboarding flows/i)).toBeInTheDocument();
    expect(within(modal).getByText('74%')).toBeInTheDocument();
    expect(within(modal).getByText('88%')).toBeInTheDocument();
    expect(within(modal).getByTestId('metrics-history')).toHaveTextContent('120 engagements');
    expect(within(modal).getByText('Similar successful posts')).toBeInTheDocument();
  });
});
