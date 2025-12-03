import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import PatternsPage from '../page';

jest.mock('@/components/layout/Sidebar', () => ({
  __esModule: true,
  default: () => <div data-testid="sidebar" />,
}));

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe('PatternsPage', () => {
  const nichesResponse = {
    success: true,
    data: [
      { id: 'niche-1', name: 'B2B SaaS' },
      { id: 'niche-2', name: 'Creator Economy' },
    ],
  };

  const pattern = {
    id: 'pattern-123',
    hook_example: 'Stop doing this in your SaaS demos',
    content_structure: '1. Hook your reader\n2. Share the painful mistake\n3. Offer the better path',
    emotional_trigger: 'Urgency',
    success_rate: 82,
    usage_count: 14,
    platforms: ['linkedin', 'instagram'],
    niches: ['niche-1'],
    is_custom: false,
    created_by: null,
    created_at: '2024-03-10T10:00:00.000Z',
    updated_at: '2024-03-10T10:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    const clipboardMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: clipboardMock },
      configurable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders viral pattern cards with detailed metadata', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => nichesResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: [pattern] }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<PatternsPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(await screen.findByText('Stop doing this in your SaaS demos')).toBeInTheDocument();
    const structureRow = screen.getByText(/Structure:/i).parentElement;
    const triggerRow = screen.getByText(/Trigger:/i).parentElement;
    if (!structureRow || !triggerRow) {
      throw new Error('Expected structure and trigger rows to be present');
    }
    expect(structureRow).toHaveTextContent('Structure: 1. Hook your reader 2. Share the painful mistake 3. Offer the better path');
    expect(triggerRow).toHaveTextContent('Trigger: Urgency');
    expect(screen.getByText(/Success rate/)).toHaveTextContent('Success rate: 82%');
    expect(screen.getByText(/Usage count/)).toHaveTextContent('Usage count: 14 uses');
    const linkedInChips = screen.getAllByText('LinkedIn', { selector: 'span' });
    const instagramChips = screen.getAllByText('Instagram', { selector: 'span' });
    expect(linkedInChips.length).toBeGreaterThan(0);
    expect(instagramChips.length).toBeGreaterThan(0);
    expect(screen.getByText('#B2B SaaS')).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('stores pattern preset and navigates to content generator when using a pattern', async () => {
    jest.useFakeTimers();
    const clipboardSpy = jest.spyOn(navigator.clipboard, 'writeText');
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => nichesResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: [pattern] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, message: 'Pattern usage incremented' }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<PatternsPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const useButton = await screen.findByRole('button', { name: /Use this pattern/i });
    await act(async () => {
      fireEvent.click(useButton);
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock).toHaveBeenNthCalledWith(3, expect.stringContaining('/api/patterns?id=pattern-123'), expect.objectContaining({ method: 'PATCH' }));

    const stored = sessionStorage.getItem('patternPreset');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string)).toMatchObject({ patternId: 'pattern-123', hook: pattern.hook_example });

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/content?patternId=pattern-123'));
    expect(clipboardSpy).toHaveBeenCalledWith(pattern.hook_example);

    jest.useRealTimers();
  });
});
