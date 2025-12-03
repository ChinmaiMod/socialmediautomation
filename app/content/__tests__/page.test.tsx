import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContentPage from '../page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/lib/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = require('@/lib/AuthProvider').useAuth as jest.Mock;

type FetchResponse = {
  ok: boolean;
  status?: number;
  json: () => Promise<any>;
};

const createFetchResponse = (data: unknown, ok = true, status = 200): FetchResponse => ({
  ok,
  status,
  json: () => Promise.resolve(data),
});

describe('ContentPage manual generation interface', () => {
  const niches = [
    {
      id: 'niche-a',
      name: 'AI Startups',
      keywords: ['ai', 'startup'],
      target_audience: 'Founders',
      content_themes: ['funding', 'growth'],
    },
    {
      id: 'niche-b',
      name: 'Health Tech',
      keywords: ['health', 'innovation'],
      target_audience: 'Clinicians',
      content_themes: ['telemedicine'],
    },
  ];

  const accountsByNiche: Record<string, any[]> = {
    'niche-a': [
      { id: 'acct-1', name: 'Northwind LinkedIn', platform: 'linkedin' },
      { id: 'acct-2', name: 'Northwind Instagram', platform: 'instagram' },
    ],
    'niche-b': [{ id: 'acct-3', name: 'Health Hub Facebook', platform: 'facebook' }],
  };

  const trendsByNiche: Record<string, any[]> = {
    'niche-a': [
      {
        id: 'trend-1',
        topic: 'Gemini Flash 2.5 unlocks B2B automation',
        source_published_at: new Date().toISOString(),
        is_current_version: true,
        relevance_score: 92,
      },
    ],
    'niche-b': [],
  };

  let manualValidationResponse = {
    validation: {
      isValid: true,
      issues: [] as string[],
      suggestions: [] as string[],
    },
  };

  const user = userEvent.setup();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'founder@example.com' },
      loading: false,
      signOut: jest.fn(),
    });

    manualValidationResponse = {
      validation: {
        isValid: true,
        issues: [],
        suggestions: [],
      },
    };

    const globalWithFetch = global as unknown as { fetch?: typeof fetch };
    if (!globalWithFetch.fetch) {
      globalWithFetch.fetch = jest.fn();
    }

    jest.spyOn(globalWithFetch, 'fetch').mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method ?? 'GET';

      if (url.startsWith('/api/niches')) {
        return Promise.resolve(createFetchResponse({ success: true, data: niches }));
      }

      if (url.startsWith('/api/accounts')) {
        const parsed = new URL(url, 'http://localhost');
        const nicheId = parsed.searchParams.get('niche_id') ?? 'niche-a';
        return Promise.resolve(createFetchResponse({ accounts: accountsByNiche[nicheId] ?? [] }));
      }

      if (url.startsWith('/api/trends') && method === 'GET') {
        const parsed = new URL(url, 'http://localhost');
        const nicheId = parsed.searchParams.get('niche_id') ?? 'niche-a';
        return Promise.resolve(createFetchResponse({ topics: trendsByNiche[nicheId] ?? [] }));
      }

      if (url.startsWith('/api/trends') && method === 'POST') {
        const body = JSON.parse(init?.body as string);
        const nicheId = body.niche_id as string;
        return Promise.resolve(
          createFetchResponse({
            topics: trendsByNiche[nicheId] ?? [],
            research_summary: { total_found: trendsByNiche[nicheId]?.length ?? 0 },
          })
        );
      }

      if (url.startsWith('/api/trends') && method === 'PUT') {
        return Promise.resolve(createFetchResponse(manualValidationResponse));
      }

      if (url.startsWith('/api/post') && method === 'POST') {
        const body = JSON.parse(init?.body as string);
        return Promise.resolve(
          createFetchResponse(
            {
              post: {
                id: `post-${body.account_id}`,
                account_id: body.account_id,
              },
              generated: {
                content: `Generated content for ${body.account_id}`,
                hashtags: ['ai', 'growth'],
                predicted_viral_score: 82,
                reasoning: 'Strong hook and current trend',
              },
            },
            true,
            201
          )
        );
      }

      return Promise.resolve(createFetchResponse({}));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('filters account checkboxes by selected niche', async () => {
    render(React.createElement(ContentPage));

    const aiAccountCheckbox = await screen.findByLabelText('Northwind LinkedIn (LinkedIn)');
    expect(aiAccountCheckbox).toBeInTheDocument();

    const nicheSelect = screen.getByLabelText('Niche');
    await user.selectOptions(nicheSelect, 'niche-b');

    await waitFor(() => {
      expect(screen.queryByLabelText('Northwind LinkedIn (LinkedIn)')).not.toBeInTheDocument();
    });

    expect(screen.getByLabelText('Health Hub Facebook (Facebook)')).toBeInTheDocument();
  });

  it('shows recency guard validation issues for manual trend topics', async () => {
    manualValidationResponse = {
      validation: {
        isValid: false,
        issues: ['Topic mentions Gemini Flash 2.0 which is outdated'],
        suggestions: ['Update to Gemini Flash 2.5 release'],
      },
    };

    render(React.createElement(ContentPage));

    const topicInput = await screen.findByLabelText('Manual trend topic');
    await user.type(topicInput, 'Gemini Flash 2.0 product update');

    await user.click(screen.getByRole('button', { name: /Validate Topic/i }));

    expect(await screen.findByText(/Topic mentions Gemini Flash 2.0 which is outdated/i)).toBeInTheDocument();
    expect(screen.getByText(/Update to Gemini Flash 2.5 release/i)).toBeInTheDocument();
  });

  it('displays platform previews and action buttons after generation', async () => {
    render(React.createElement(ContentPage));

    const firstCheckbox = await screen.findByLabelText('Northwind LinkedIn (LinkedIn)');
    const secondCheckbox = screen.getByLabelText('Northwind Instagram (Instagram)');

    await user.click(firstCheckbox);
    await user.click(secondCheckbox);

    await user.click(screen.getByRole('button', { name: /Generate Content/i }));

    expect(await screen.findByRole('tab', { name: /LinkedIn/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Instagram/i })).toBeInTheDocument();

    expect(await screen.findByText(/Predicted Viral Score/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Post Now/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Schedule/i }).length).toBeGreaterThan(0);
  });
});