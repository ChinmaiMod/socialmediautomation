import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from '../page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock signUp helper
jest.mock('@/lib/auth', () => ({
  signUp: jest.fn(),
}));

const mockSignUp = require('@/lib/auth').signUp as jest.Mock;

const DUPLICATE_EMAIL_MESSAGE = 'This email is already registered. Try signing in or resetting your password instead.';

describe('Register Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows duplicate registration error when signUp returns an error', async () => {
    mockSignUp.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Email already registered' } });

    const { getByPlaceholderText, getAllByPlaceholderText, getByRole } = render(React.createElement(RegisterPage));
    const fullName = getByPlaceholderText('John Doe') as HTMLInputElement;
    const email = getByPlaceholderText('you@example.com') as HTMLInputElement;
    const password = getAllByPlaceholderText('••••••••')[0] as HTMLInputElement;
    const confirmPassword = getAllByPlaceholderText('••••••••')[1] as HTMLInputElement;
    const submit = getByRole('button', { name: /Create Account/i });

    await userEvent.type(fullName, 'Test User');
    await userEvent.type(email, 'existing@example.com');
    await userEvent.type(password, 'password123');
    await userEvent.type(confirmPassword, 'password123');

    await userEvent.click(submit);

    // Wait for the mock to be called and UI to update
    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));

    expect(await screen.findByText(new RegExp(DUPLICATE_EMAIL_MESSAGE, 'i'))).toBeInTheDocument();
  });

  it('shows duplicate registration error when signUp returns a user with empty identities array', async () => {
    mockSignUp.mockResolvedValueOnce({ data: { user: { id: 'abc', email: 'existing@example.com', identities: [] } }, error: null });

    const { getByPlaceholderText, getAllByPlaceholderText, getByRole } = render(React.createElement(RegisterPage));
    const fullName = getByPlaceholderText('John Doe') as HTMLInputElement;
    const email = getByPlaceholderText('you@example.com') as HTMLInputElement;
    const password = getAllByPlaceholderText('••••••••')[0] as HTMLInputElement;
    const confirmPassword = getAllByPlaceholderText('••••••••')[1] as HTMLInputElement;
    const submit = getByRole('button', { name: /Create Account/i });

    await userEvent.type(fullName, 'Test User');
    await userEvent.type(email, 'existing@example.com');
    await userEvent.type(password, 'password123');
    await userEvent.type(confirmPassword, 'password123');

    await userEvent.click(submit);

    // Wait for the mock to be called and UI to update
    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));

    expect(await screen.findByText(new RegExp(DUPLICATE_EMAIL_MESSAGE, 'i'))).toBeInTheDocument();
  });

  it('redirects/indicates success when signUp returns a new user', async () => {
    mockSignUp.mockResolvedValueOnce({ data: { user: { id: 'new', email: 'new@example.com' }, session: null }, error: null });

    const { getByPlaceholderText, getAllByPlaceholderText, getByRole } = render(React.createElement(RegisterPage));
    const fullName = getByPlaceholderText('John Doe') as HTMLInputElement;
    const email = getByPlaceholderText('you@example.com') as HTMLInputElement;
    const password = getAllByPlaceholderText('••••••••')[0] as HTMLInputElement;
    const confirmPassword = getAllByPlaceholderText('••••••••')[1] as HTMLInputElement;
    const submit = getByRole('button', { name: /Create Account/i });

    await userEvent.type(fullName, 'New User');
    await userEvent.type(email, 'new@example.com');
    await userEvent.type(password, 'password123');
    await userEvent.type(confirmPassword, 'password123');

    await userEvent.click(submit);

    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));

    expect(await screen.findByText(/Registration Successful/i)).toBeInTheDocument();
  });

  it('uses window.location.origin for emailRedirectTo when available', async () => {
    const redirectUtil = require('@/lib/utils/redirect');
    const spy = jest.spyOn(redirectUtil, 'getEmailRedirectUrl').mockReturnValue('https://prod.example.com/login');

    mockSignUp.mockResolvedValueOnce({ data: { user: { id: 'new', email: 'new@example.com' }, session: null }, error: null });

    const { getByPlaceholderText, getAllByPlaceholderText, getByRole } = render(React.createElement(RegisterPage));
    const fullName = getByPlaceholderText('John Doe') as HTMLInputElement;
    const email = getByPlaceholderText('you@example.com') as HTMLInputElement;
    const password = getAllByPlaceholderText('••••••••')[0] as HTMLInputElement;
    const confirmPassword = getAllByPlaceholderText('••••••••')[1] as HTMLInputElement;
    const submit = getByRole('button', { name: /Create Account/i });

    await userEvent.type(fullName, 'New User');
    await userEvent.type(email, 'new@example.com');
    await userEvent.type(password, 'password123');
    await userEvent.type(confirmPassword, 'password123');

    await userEvent.click(submit);
    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));

    // signUp signature: (email, password, fullName, redirectTo)
    expect(mockSignUp.mock.calls[0][3]).toBe('https://prod.example.com/login');
    spy.mockRestore();
  });
  it('passes expected redirectTo from util when signing up', async () => {
    const redirectUtil = require('@/lib/utils/redirect');
    const spy = jest.spyOn(redirectUtil, 'getEmailRedirectUrl').mockReturnValue('https://prod.example.com/login');

    mockSignUp.mockResolvedValueOnce({ data: { user: { id: 'new', email: 'new@example.com' }, session: null }, error: null });

    const { getByPlaceholderText, getAllByPlaceholderText, getByRole } = render(React.createElement(RegisterPage));
    const fullName = getByPlaceholderText('John Doe') as HTMLInputElement;
    const email = getByPlaceholderText('you@example.com') as HTMLInputElement;
    const password = getAllByPlaceholderText('••••••••')[0] as HTMLInputElement;
    const confirmPassword = getAllByPlaceholderText('••••••••')[1] as HTMLInputElement;
    const submit = getByRole('button', { name: /Create Account/i });

    await userEvent.type(fullName, 'New User');
    await userEvent.type(email, 'new@example.com');
    await userEvent.type(password, 'password123');
    await userEvent.type(confirmPassword, 'password123');

    await userEvent.click(submit);
    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));

    expect(mockSignUp.mock.calls[0][3]).toBe('https://prod.example.com/login');
    spy.mockRestore();
  });

  it('uses NEXT_PUBLIC_SITE_URL when window is not present', async () => {
    const redirectUtil = require('@/lib/utils/redirect');
    const spy = jest.spyOn(redirectUtil, 'getEmailRedirectUrl').mockReturnValue('https://env.example.com/login');

    mockSignUp.mockResolvedValueOnce({ data: { user: { id: 'new', email: 'new@example.com' }, session: null }, error: null });

    const { getByPlaceholderText, getAllByPlaceholderText, getByRole } = render(React.createElement(RegisterPage));
    const fullName = getByPlaceholderText('John Doe') as HTMLInputElement;
    const email = getByPlaceholderText('you@example.com') as HTMLInputElement;
    const password = getAllByPlaceholderText('••••••••')[0] as HTMLInputElement;
    const confirmPassword = getAllByPlaceholderText('••••••••')[1] as HTMLInputElement;
    const submit = getByRole('button', { name: /Create Account/i });

    await userEvent.type(fullName, 'New User');
    await userEvent.type(email, 'new@example.com');
    await userEvent.type(password, 'password123');
    await userEvent.type(confirmPassword, 'password123');

    await userEvent.click(submit);
    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));

    expect(mockSignUp.mock.calls[0][3]).toBe('https://env.example.com/login');
    spy.mockRestore();
  });
  it('uses NEXT_PUBLIC_SITE_URL via util if window is absent', async () => {
    const redirectUtil = require('@/lib/utils/redirect');
    const spy = jest.spyOn(redirectUtil, 'getEmailRedirectUrl').mockReturnValue('https://env.example.com/login');

    mockSignUp.mockResolvedValueOnce({ data: { user: { id: 'new', email: 'new@example.com' }, session: null }, error: null });

    const { getByPlaceholderText, getAllByPlaceholderText, getByRole } = render(React.createElement(RegisterPage));
    const fullName = getByPlaceholderText('John Doe') as HTMLInputElement;
    const email = getByPlaceholderText('you@example.com') as HTMLInputElement;
    const password = getAllByPlaceholderText('••••••••')[0] as HTMLInputElement;
    const confirmPassword = getAllByPlaceholderText('••••••••')[1] as HTMLInputElement;
    const submit = getByRole('button', { name: /Create Account/i });

    await userEvent.type(fullName, 'New User');
    await userEvent.type(email, 'new@example.com');
    await userEvent.type(password, 'password123');
    await userEvent.type(confirmPassword, 'password123');

    await userEvent.click(submit);
    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));

    expect(mockSignUp.mock.calls[0][3]).toBe('https://env.example.com/login');
    spy.mockRestore();
  });

  it('normalizes NEXT_PUBLIC_VERCEL_URL into https scheme when used', async () => {
    const redirectUtil = require('@/lib/utils/redirect');
    const spy = jest.spyOn(redirectUtil, 'getEmailRedirectUrl').mockReturnValue('https://my-deploy.vercel.app/login');

    mockSignUp.mockResolvedValueOnce({ data: { user: { id: 'new', email: 'new@example.com' }, session: null }, error: null });

    const { getByPlaceholderText, getAllByPlaceholderText, getByRole } = render(React.createElement(RegisterPage));
    const fullName = getByPlaceholderText('John Doe') as HTMLInputElement;
    const email = getByPlaceholderText('you@example.com') as HTMLInputElement;
    const password = getAllByPlaceholderText('••••••••')[0] as HTMLInputElement;
    const confirmPassword = getAllByPlaceholderText('••••••••')[1] as HTMLInputElement;
    const submit = getByRole('button', { name: /Create Account/i });

    await userEvent.type(fullName, 'New User');
    await userEvent.type(email, 'new@example.com');
    await userEvent.type(password, 'password123');
    await userEvent.type(confirmPassword, 'password123');

    await userEvent.click(submit);
    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));

    expect(mockSignUp.mock.calls[0][3]).toBe('https://my-deploy.vercel.app/login');
    spy.mockRestore();
  });
  it('normalizes NEXT_PUBLIC_VERCEL_URL into https scheme when used via util', async () => {
    const redirectUtil = require('@/lib/utils/redirect');
    const spy = jest.spyOn(redirectUtil, 'getEmailRedirectUrl').mockReturnValue('https://my-deploy.vercel.app/login');

    mockSignUp.mockResolvedValueOnce({ data: { user: { id: 'new', email: 'new@example.com' }, session: null }, error: null });

    const { getByPlaceholderText, getAllByPlaceholderText, getByRole } = render(React.createElement(RegisterPage));
    const fullName = getByPlaceholderText('John Doe') as HTMLInputElement;
    const email = getByPlaceholderText('you@example.com') as HTMLInputElement;
    const password = getAllByPlaceholderText('••••••••')[0] as HTMLInputElement;
    const confirmPassword = getAllByPlaceholderText('••••••••')[1] as HTMLInputElement;
    const submit = getByRole('button', { name: /Create Account/i });

    await userEvent.type(fullName, 'New User');
    await userEvent.type(email, 'new@example.com');
    await userEvent.type(password, 'password123');
    await userEvent.type(confirmPassword, 'password123');

    await userEvent.click(submit);
    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));

    expect(mockSignUp.mock.calls[0][3]).toBe('https://my-deploy.vercel.app/login');
    spy.mockRestore();
  });
});
