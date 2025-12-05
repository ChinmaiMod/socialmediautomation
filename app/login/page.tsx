'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { signIn } from '@/lib/auth';

type Feedback = {
  variant: 'error' | 'success';
  message: string;
};

function getFriendlyLoginError(message?: string, status?: number) {
  if (!message) return 'Unable to sign in. Please try again.';
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'The email or password you entered is incorrect. Double-check both fields and try again.';
  }

  if (normalized.includes('email not confirmed') || normalized.includes('not confirmed')) {
    return 'Your email address has not been confirmed yet. Open the verification link we sent when you registered.';
  }

  if (normalized.includes('not allowed')) {
    return 'This account is disabled or does not have access to the dashboard. Contact an administrator for help.';
  }

  if (normalized.includes('rate limit') || status === 429) {
    return 'Too many login attempts. Please wait a few moments before trying again.';
  }

  return message;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (!email || !password) {
      setFeedback({ variant: 'error', message: 'Email and password are required.' });
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setFeedback({ variant: 'error', message: 'You appear to be offline. Please connect to the internet and try again.' });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await signIn(email, password);

      if (error) {
        setFeedback({ variant: 'error', message: getFriendlyLoginError(error.message, (error as any)?.status) });
      } else if (!data.session) {
        setFeedback({ variant: 'error', message: 'We could not start a session. Confirm your email or reset your password, then try again.' });
      } else if (data.user) {
        setFeedback({ variant: 'success', message: 'Login successful! Redirecting to your dashboard…' });
        setTimeout(() => {
          router.replace('/');
          router.refresh();
        }, 600);
      }
    } catch (err: any) {
      const friendly = err?.message
        ? getFriendlyLoginError(err.message)
        : 'Login failed unexpectedly. Please try again.';
      setFeedback({ variant: 'error', message: friendly });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Social Auto</h1>
            <p className="text-blue-100">AI-Powered Automation</p>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Welcome Back!
          </h2>
          <p className="text-xl text-blue-50">
            Continue automating your social media marketing with AI-powered content generation and scheduling.
          </p>
        </div>

        <p className="text-blue-100 text-sm">© 2025 Social Auto. All rights reserved.</p>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="max-w-md w-full">
          <div className="bg-white p-8 rounded-2xl shadow-xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Sign In</h2>
              <p className="text-gray-600 mt-2">Access your dashboard</p>
            </div>

            {feedback && (
              <div
                className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${
                  feedback.variant === 'error'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-green-50 border-green-200 text-green-700'
                }`}
              >
                {feedback.variant === 'error' ? (
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-sm">{feedback.message}</p>
                  {feedback.variant === 'error' && (
                    <p className="text-xs mt-2 opacity-80">
                      Tip: If you just registered, confirm your email first or use the “Forgot password” option to reset access.
                    </p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="you@example.com"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Don't have an account?{' '}
                <Link href="/register" className="text-blue-600 font-medium hover:text-blue-700">
                  Create one
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
