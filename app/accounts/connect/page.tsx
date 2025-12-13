'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  Linkedin,
  Facebook,
  Instagram,
  ExternalLink,
  AlertCircle,
  Loader2,
  Zap,
  Settings,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';

interface PlatformConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
  connected: boolean;
  configured?: boolean;
}

interface PlatformStatus {
  linkedin: { configured: boolean };
  facebook: { configured: boolean };
  pinterest: { configured: boolean };
  twitter: { configured: boolean };
}

export default function ConnectAccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const selectedPlatform = searchParams.get('platform');
  const isSelectingFacebookPage = selectedPlatform === 'facebook' && searchParams.get('select') === '1';

  const [facebookPages, setFacebookPages] = useState<Array<{ id: string; name: string }>>([]);
  const [facebookPagesLoading, setFacebookPagesLoading] = useState(false);
  const [facebookPagesError, setFacebookPagesError] = useState('');

  // Fetch platform configuration status
  useEffect(() => {
    const fetchPlatformStatus = async () => {
      try {
        const res = await fetch('/api/settings/platforms');
        const data = await res.json();
        if (data.success) {
          setPlatformStatus(data.data);
        } else {
          console.error('Failed to fetch platform status:', data.error);
        }
      } catch (err) {
        console.error('Failed to fetch platform status:', err);
      } finally {
        setStatusLoading(false);
      }
    };
    fetchPlatformStatus();
  }, []);

  // If returning from Facebook OAuth with multiple Pages, load the Page list.
  useEffect(() => {
    if (!isSelectingFacebookPage) return;

    const loadPages = async () => {
      setFacebookPagesLoading(true);
      setFacebookPagesError('');
      try {
        const res = await fetch('/api/auth/facebook/pages');
        const payload = await res.json();
        if (!res.ok || !payload?.success) {
          setFacebookPagesError(payload?.error || 'Failed to load Facebook Pages');
          return;
        }
        setFacebookPages(payload.data || []);
      } catch (e: any) {
        setFacebookPagesError(e?.message || 'Failed to load Facebook Pages');
      } finally {
        setFacebookPagesLoading(false);
      }
    };

    loadPages();
  }, [isSelectingFacebookPage]);

  const getPlatformConfigured = (platformId: string): boolean => {
    if (!platformStatus) return false;
    // Instagram uses Facebook credentials
    if (platformId === 'instagram') {
      return platformStatus.facebook?.configured || false;
    }
    const status = platformStatus as unknown as Record<string, { configured: boolean }>;
    return status[platformId]?.configured || false;
  };

  const platforms: PlatformConfig[] = [
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: <Linkedin className="w-8 h-8" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-600',
      description: 'Connect your LinkedIn profile to post professional content',
      connected: false,
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: <Facebook className="w-8 h-8" />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500',
      description: 'Connect your Facebook page for social updates',
      connected: false,
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: <Instagram className="w-8 h-8" />,
      color: 'text-pink-600',
      bgColor: 'bg-gradient-to-r from-purple-500 to-pink-500',
      description: 'Connect your Instagram business account',
      connected: false,
    },
    {
      id: 'pinterest',
      name: 'Pinterest',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
        </svg>
      ),
      color: 'text-red-600',
      bgColor: 'bg-red-600',
      description: 'Connect your Pinterest business account for pins',
      connected: false,
    },
    {
      id: 'twitter',
      name: 'Twitter/X',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      color: 'text-black',
      bgColor: 'bg-black',
      description: 'Connect your Twitter/X account to post tweets',
      connected: false,
    },
  ];

  async function handleConnect(platformId: string) {
    setConnecting(platformId);
    setError('');

    // Redirect to OAuth flow
    window.location.href = `/api/auth/connect/${platformId}`;
  }

  async function handleSelectFacebookPage(pageId: string) {
    setConnecting('facebook');
    setFacebookPagesError('');
    try {
      const res = await fetch('/api/auth/facebook/select-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_id: pageId }),
      });
      const payload = await res.json();

      if (!res.ok || !payload?.success) {
        setFacebookPagesError(payload?.error || 'Failed to connect Facebook Page');
        return;
      }

      router.push('/accounts?success=facebook');
    } catch (e: any) {
      setFacebookPagesError(e?.message || 'Failed to connect Facebook Page');
    } finally {
      setConnecting(null);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  if (isSelectingFacebookPage) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link
                href="/accounts/connect"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Facebook className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">Select a Facebook Page</span>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-6">
            <p className="text-gray-600">
              Choose which Business Page you want this app to post to.
            </p>
          </div>

          {facebookPagesError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{facebookPagesError}</p>
            </div>
          )}

          {facebookPagesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Loading pages...</span>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                {facebookPages.length === 0 ? (
                  <p className="text-sm text-gray-600">No pages found for this Facebook account.</p>
                ) : (
                  <div className="space-y-3">
                    {facebookPages.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectFacebookPage(p.id)}
                        disabled={connecting === 'facebook'}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="font-medium text-gray-900">{p.name}</span>
                        {connecting === 'facebook' ? (
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        ) : (
                          <ExternalLink className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/accounts"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Social Auto</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Connect a Social Account</h1>
          <p className="text-gray-600 mt-2">
            Connect your social media accounts to start posting automatically
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Setup Notice */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <Settings className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">OAuth Credentials Required</p>
            <p className="text-sm text-amber-700 mt-1">
              Before connecting accounts, ensure your platform OAuth credentials are configured in the{' '}
              <Link href="/settings" className="underline font-medium hover:text-amber-900">
                Settings → Platforms
              </Link>{' '}
              tab. Each platform requires a registered developer app with valid API keys.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {statusLoading ? (
            <div className="col-span-2 flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Loading platforms...</span>
            </div>
          ) : (
          platforms.map((platform) => {
            const isConfigured = getPlatformConfigured(platform.id);
            return (
            <div
              key={platform.id}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden ${isConfigured ? 'border-gray-200' : 'border-gray-200 opacity-75'}`}
            >
              <div className={`h-2 ${isConfigured ? platform.bgColor : 'bg-gray-300'}`} />
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${isConfigured ? platform.bgColor : 'bg-gray-400'} text-white`}>
                    {platform.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{platform.name}</h3>
                      {!statusLoading && (
                        isConfigured ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            Configured
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" />
                            Not Configured
                          </span>
                        )
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{platform.description}</p>
                  </div>
                </div>

                <div className="mt-6">
                  {isConfigured ? (
                  <button
                    onClick={() => handleConnect(platform.id)}
                    disabled={connecting === platform.id}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 ${platform.bgColor} text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {connecting === platform.id ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-5 h-5" />
                        Connect {platform.name}
                      </>
                    )}
                  </button>
                  ) : (
                    <Link
                      href="/settings"
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      <Settings className="w-5 h-5" />
                      Configure in Settings
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )})
          )}
        </div>

        <div className="mt-8 p-6 bg-blue-50 rounded-xl">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Important Information</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• You will be redirected to each platform to authorize the connection</li>
            <li>• We only request permissions necessary to post on your behalf</li>
            <li>• You can disconnect accounts at any time from the Accounts page</li>
            <li>• Your credentials are securely encrypted and stored</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
