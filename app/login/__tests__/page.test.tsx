import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../page';

const replaceMock = jest.fn();
const refreshMock = jest.fn();
const pushMock = jest.fn();
const useSearchParamsMock = jest.fn().mockReturnValue({ get: (k: string) => null });

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock,
    push: pushMock,
  }),
  useSearchParams: () => useSearchParamsMock(),
}));

jest.mock('@/lib/auth', () => ({
  signIn: jest.fn(),
}));

const mockSignIn = require('@/lib/auth').signIn as jest.Mock;

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows success message and redirects to fallback / when no redirect param present', async () => {
    mockSignIn.mockResolvedValueOnce({ data: { session: { access_token: 't' }, user: { id: 'u', email: 'test@example.com' } }, error: null });

    const { getByPlaceholderText, getByRole } = render(React.createElement(LoginPage));
    const email = getByPlaceholderText('you@example.com') as HTMLInputElement;
    const password = getByPlaceholderText('••••••••') as HTMLInputElement;
    const submit = getByRole('button', { name: /Sign In/i });

    await userEvent.type(email, 'test@example.com');
    await userEvent.type(password, 'password123');
    await userEvent.click(submit);

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Login successful/i)).toBeInTheDocument();
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/'));
  });

  it('redirects to specified redirect param when present', async () => {
    useSearchParamsMock.mockReturnValue({ get: (k: string) => '/dashboard' });

    mockSignIn.mockResolvedValueOnce({ data: { session: { access_token: 't' }, user: { id: 'u', email: 'test@example.com' } }, error: null });

    const { getByPlaceholderText, getByRole } = render(React.createElement(LoginPage));
    const email = getByPlaceholderText('you@example.com') as HTMLInputElement;
    const password = getByPlaceholderText('••••••••') as HTMLInputElement;
    const submit = getByRole('button', { name: /Sign In/i });

    await userEvent.type(email, 'test@example.com');
    await userEvent.type(password, 'password123');
    await userEvent.click(submit);

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/dashboard'));
  });
});
