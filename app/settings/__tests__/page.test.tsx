import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from '../page';

// Mock the layout sidebar if used
jest.mock('@/components/layout/Sidebar', () => ({ __esModule: true, default: () => <div data-testid="sidebar" /> }));

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows masked cron secret and can regenerate', async () => {
    const masked = 'abcd...wxyz';
    const newSecret = 'abcde12345xyzde67890';

    const modelPayload = {
      success: true,
      data: {
        tiers: { premium: [], standard: [], budget: [] },
        current: { default: 'm1', content: 'm1', analysis: 'm1', research: 'm1', simple: 'm1' },
      },
    };

    // fetch mock that handles different endpoints
    const fetchMock = jest.fn(async (url, options) => {
      const pathname = typeof url === 'string' ? url : (url as Request).url;
      if (pathname.includes('/api/settings/integrations/openrouter') && (!options || (options as RequestInit).method === 'GET')) {
        return { ok: true, json: async () => ({ success: true, data: { enabled: true, key: masked } }) } as unknown as Response;
      }
      if (pathname.includes('/api/settings/integrations/openrouter') && (options as RequestInit)?.method === 'PUT') {
        return { ok: true, json: async () => ({ success: true }) } as unknown as Response;
      }
      if (pathname.includes('/api/settings/integrations/openrouter') && (options as RequestInit)?.method === 'POST') {
        return { ok: true, json: async () => ({ success: true }) } as unknown as Response;
      }
      if (pathname.includes('/api/settings/models')) {
        return { ok: true, json: async () => modelPayload } as unknown as Response;
      }
      if (pathname.includes('/api/settings/cron') && (!options || (options as RequestInit).method === 'GET')) {
        return { ok: true, json: async () => ({ success: true, data: { secret: masked } }) } as unknown as Response;
      }
      if (pathname.includes('/api/settings/cron') && (options as RequestInit)?.method === 'POST') {
        return { ok: true, json: async () => ({ success: true, data: { secret: newSecret } }) } as unknown as Response;
      }
      return { ok: true, json: async () => ({ success: true }) } as unknown as Response;
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<SettingsPage />);

    // Switch to automation tab
    const user = userEvent.setup();
    const automationTab = screen.getByRole('button', { name: /Automation/i });
    await user.click(automationTab);

    // Wait for initial fetches (models + cron)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    await waitFor(() => expect(screen.getByLabelText('Cron secret')).toHaveValue(masked));

    const regenerateBtn = screen.getByRole('button', { name: /Regenerate cron secret/i });
    await user.click(regenerateBtn);

    // New secret should appear
    const newSecretInput = await screen.findByLabelText('New cron secret') as HTMLInputElement;
    expect(newSecretInput.value).toBe(newSecret);
    const cronInputAfter = screen.getByLabelText('Cron secret') as HTMLInputElement;
    expect(cronInputAfter.value).toBe(`${newSecret.slice(0,4)}...${newSecret.slice(-4)}`);
  });

  it('shows OpenRouter integration and can save/test key', async () => {
    const masked = 'qwer...tyui';
    const newKey = 'openrouter-new-key-abc123';

    const modelPayload = {
      success: true,
      data: {
        tiers: { premium: [], standard: [], budget: [] },
        current: { default: 'm1', content: 'm1', analysis: 'm1', research: 'm1', simple: 'm1' },
      },
    };

    const fetchMock = jest.fn(async (url, options) => {
      const pathname = typeof url === 'string' ? url : (url as Request).url;
      if (pathname.includes('/api/settings/models')) {
        return { ok: true, json: async () => modelPayload } as unknown as Response;
      }
      if (pathname.includes('/api/settings/cron') && (!options || (options as RequestInit).method === 'GET')) {
        return { ok: true, json: async () => ({ success: true, data: { secret: masked } }) } as unknown as Response;
      }
      if (pathname.includes('/api/settings/cron') && (options as RequestInit)?.method === 'POST') {
        return { ok: true, json: async () => ({ success: true, data: { secret: newKey } }) } as unknown as Response;
      }
      if (pathname.includes('/api/settings/integrations/openrouter') && (!options || (options as RequestInit).method === 'GET')) {
        return { ok: true, json: async () => ({ success: true, data: { enabled: true, key: masked } }) } as unknown as Response;
      }
      if (pathname.includes('/api/settings/integrations/openrouter') && (options as RequestInit)?.method === 'PUT') {
        return { ok: true, json: async () => ({ success: true }) } as unknown as Response;
      }
      if (pathname.includes('/api/settings/integrations/openrouter') && (options as RequestInit)?.method === 'POST') {
        return { ok: true, json: async () => ({ success: true }) } as unknown as Response;
      }
      return { ok: true, json: async () => ({ success: true }) } as unknown as Response;
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<SettingsPage />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Integrations/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    // Integration block should have stored key shown
    expect(screen.getByText(`Stored key: ${masked}`)).toBeInTheDocument();

    // Enter a key and click Save and Test
    const apiInput = screen.getByLabelText('OpenRouter API key');
    await user.type(apiInput, 'openrouter-new-key-abc123');
    const saveBtn = screen.getByRole('button', { name: 'Save OpenRouter settings' });
    const testBtn = screen.getByRole('button', { name: 'Test OpenRouter key' });
    await user.click(saveBtn);
    await waitFor(() => expect(fetchMock.mock.calls.some((call) => (call[0] as string).includes('/api/settings/integrations/openrouter'))));
    await user.click(testBtn);
    // Should show a success message
    await waitFor(() => expect(screen.getByText(/Key validated|Integration saved/)).toBeInTheDocument());
  });
});
