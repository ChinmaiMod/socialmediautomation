'use client';

import React, { useState, useEffect } from 'react';
import ModelSelector from '@/components/settings/ModelSelector';
import { Settings, Cpu, FileText, Search, Zap, Link2, ChevronDown, ChevronUp } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'models' | 'automation' | 'integrations' | 'platforms'>('models');
  const [maskedCron, setMaskedCron] = useState<string | null>(null);
  const [newCronSecret, setNewCronSecret] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [automationError, setAutomationError] = useState<string | null>(null);
  const [isRegenProcessing, setIsRegenProcessing] = useState<boolean>(false);
  const [openrouterEnabled, setOpenrouterEnabled] = useState<boolean>(false);
  const [openrouterKey, setOpenrouterKey] = useState<string>('');
  const [openrouterMasked, setOpenrouterMasked] = useState<string | null>(null);
  const [isOpenrouterProcessing, setIsOpenrouterProcessing] = useState<boolean>(false);
  const [openrouterError, setOpenrouterError] = useState<string | null>(null);
  const [openrouterSuccess, setOpenrouterSuccess] = useState<string | null>(null);

  // Platform credentials state
  const [platformsLoading, setPlatformsLoading] = useState(false);
  const [platformsError, setPlatformsError] = useState<string | null>(null);
  const [platformsSuccess, setPlatformsSuccess] = useState<string | null>(null);
  const [linkedinClientId, setLinkedinClientId] = useState('');
  const [linkedinClientSecret, setLinkedinClientSecret] = useState('');
  const [linkedinConfigured, setLinkedinConfigured] = useState(false);
  const [facebookAppId, setFacebookAppId] = useState('');
  const [facebookAppSecret, setFacebookAppSecret] = useState('');
  const [facebookConfigured, setFacebookConfigured] = useState(false);
  const [pinterestAppId, setPinterestAppId] = useState('');
  const [pinterestAppSecret, setPinterestAppSecret] = useState('');
  const [pinterestConfigured, setPinterestConfigured] = useState(false);
  const [twitterClientId, setTwitterClientId] = useState('');
  const [twitterClientSecret, setTwitterClientSecret] = useState('');
  const [twitterConfigured, setTwitterConfigured] = useState(false);
  const [expandedInstructions, setExpandedInstructions] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchMask = async () => {
      try {
        const res = await fetch('/api/settings/cron');
        const payload = await res.json();
        if (!mounted) return;
        if (res.ok && payload?.data?.secret) {
          setMaskedCron(payload.data.secret);
        }
      } catch (err) {
        // ignore
      }
    };
    fetchMask();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    // If Integrations tab becomes active, fetch OpenRouter settings
    if (activeTab !== 'integrations') return;
    let mounted = true;
    const fetchIntegration = async () => {
      try {
        setIsOpenrouterProcessing(true);
        const res = await fetch('/api/settings/integrations/openrouter');
        const payload = await res.json();
        if (!mounted) return;
        if (res.ok && payload.success) {
          setOpenrouterEnabled(Boolean(payload.data.enabled));
          setOpenrouterMasked(payload.data.key ?? null);
        }
      } catch (err) {
        // ignore
      } finally {
        setIsOpenrouterProcessing(false);
      }
    };
    fetchIntegration();
    return () => { mounted = false; };
  }, [activeTab]);

  // Fetch platform credentials when tab is active
  useEffect(() => {
    if (activeTab !== 'platforms') return;
    let mounted = true;
    const fetchPlatforms = async () => {
      setPlatformsLoading(true);
      try {
        const res = await fetch('/api/settings/platforms');
        const payload = await res.json();
        if (!mounted) return;
        if (res.ok && payload.success) {
          setLinkedinClientId(payload.data.linkedin?.client_id || '');
          setLinkedinConfigured(payload.data.linkedin?.configured || false);
          setFacebookAppId(payload.data.facebook?.app_id || '');
          setFacebookConfigured(payload.data.facebook?.configured || false);
          setPinterestAppId(payload.data.pinterest?.app_id || '');
          setPinterestConfigured(payload.data.pinterest?.configured || false);
          setTwitterClientId(payload.data.twitter?.client_id || '');
          setTwitterConfigured(payload.data.twitter?.configured || false);
        }
      } catch (err) {
        // ignore
      } finally {
        setPlatformsLoading(false);
      }
    };
    fetchPlatforms();
    return () => { mounted = false; };
  }, [activeTab]);

  const savePlatformCredentials = async () => {
    setPlatformsError(null);
    setPlatformsSuccess(null);
    setPlatformsLoading(true);
    try {
      const res = await fetch('/api/settings/platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedin_client_id: linkedinClientId,
          linkedin_client_secret: linkedinClientSecret || undefined,
          facebook_app_id: facebookAppId,
          facebook_app_secret: facebookAppSecret || undefined,
          pinterest_app_id: pinterestAppId,
          pinterest_app_secret: pinterestAppSecret || undefined,
          twitter_client_id: twitterClientId,
          twitter_client_secret: twitterClientSecret || undefined,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error || 'Failed to save');
      setPlatformsSuccess('Platform credentials saved successfully');
      // Clear secrets after save
      setLinkedinClientSecret('');
      setFacebookAppSecret('');
      setPinterestAppSecret('');
      setTwitterClientSecret('');
      // Refetch to update configured status
      const refetch = await fetch('/api/settings/platforms');
      const refetchPayload = await refetch.json();
      if (refetch.ok && refetchPayload.success) {
        setLinkedinConfigured(refetchPayload.data.linkedin?.configured || false);
        setFacebookConfigured(refetchPayload.data.facebook?.configured || false);
        setPinterestConfigured(refetchPayload.data.pinterest?.configured || false);
        setTwitterConfigured(refetchPayload.data.twitter?.configured || false);
      }
    } catch (err: any) {
      setPlatformsError(err.message || 'Failed to save credentials');
    } finally {
      setPlatformsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Settings className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500">Configure your automation preferences</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('models')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'models'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              AI Models
            </span>
          </button>
          <button
            onClick={() => setActiveTab('automation')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'automation'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Automation
            </span>
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'integrations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Integrations
            </span>
          </button>
          <button
            onClick={() => setActiveTab('platforms')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'platforms'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Social Platforms
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {activeTab === 'models' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">AI Model Configuration</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Choose which AI models to use for different tasks. OpenRouter provides access to multiple providers including 
                  Anthropic (Claude), OpenAI (GPT-4), Google (Gemini), and more.
                </p>
              </div>

              {/* Default Model */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Cpu className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Default Model</h3>
                    <p className="text-sm text-gray-500">
                      Used when no task-specific model is configured
                    </p>
                  </div>
                </div>
                <ModelSelector useCase="default" showTierBadge />
              </div>

              {/* Content Generation Model */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Content Generation</h3>
                    <p className="text-sm text-gray-500">
                      Used for creating social media posts. Premium models recommended for best quality.
                    </p>
                  </div>
                </div>
                <ModelSelector useCase="content" showTierBadge />
              </div>

              {/* Analysis Model */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Search className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Content Analysis</h3>
                    <p className="text-sm text-gray-500">
                      Used for analyzing and validating content. Standard models offer good balance.
                    </p>
                  </div>
                </div>
                <ModelSelector useCase="analysis" showTierBadge />
              </div>

              {/* Research Model */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Search className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Trend Research</h3>
                    <p className="text-sm text-gray-500">
                      Used for researching trending topics. Models with web access recommended.
                    </p>
                  </div>
                </div>
                <ModelSelector useCase="research" showTierBadge />
              </div>

              {/* Simple Tasks Model */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Zap className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Simple Tasks</h3>
                    <p className="text-sm text-gray-500">
                      Used for validation and simple operations. Budget models work well here.
                    </p>
                  </div>
                </div>
                <ModelSelector useCase="simple" showTierBadge />
              </div>

              {/* Model tiers info */}
              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">About Model Tiers (December 2025)</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Premium:</strong> Claude Opus 4, Claude Sonnet 4, GPT-4.5 Turbo, GPT-4o, OpenAI o1, Gemini 2.5 Pro, Grok 2</li>
                  <li>• <strong>Standard:</strong> Claude 3.5 Haiku, GPT-4o Mini, o1/o3 Mini, Gemini 2.5 Flash, DeepSeek R1, Mistral Large</li>
                  <li>• <strong>Budget:</strong> Gemini 2.0 Flash (Free), DeepSeek R1 (Free), Llama 3.3 70B, Qwen 2.5 72B</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'automation' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Automation Settings</h2>
              <p className="text-sm text-gray-500">
                Configure automated posting schedules and behaviors.
              </p>
              {/* Automation settings would go here */}
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Automation Settings</h2>
                <p className="text-sm text-gray-500">Configure automated posting schedules and behaviors.</p>

                <div className="p-6 bg-white rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700">Cron Secret</h3>
                  <p className="text-xs text-gray-500 mt-1 mb-4">Regenerate the cron secret used to validate external cron requests.</p>
                  <div className="flex items-center gap-3">
                    <input
                      readOnly
                      title="Cron secret"
                      value={maskedCron ?? 'Not set'}
                      className="px-3 py-2 border rounded-lg bg-gray-50 w-full"
                      aria-label="Cron secret"
                    />
                    <button
                      type="button"
                      disabled={isRegenProcessing}
                      onClick={async () => {
                        setAutomationError(null);
                        setSuccessMessage(null);
                        setIsRegenProcessing(true);
                        try {
                          const res = await fetch('/api/settings/cron', { method: 'POST' });
                          const payload = await res.json();
                          if (!res.ok || !payload.success) throw new Error(payload?.error || 'Failed');
                          setNewCronSecret(payload.data.secret);
                          setMaskedCron(`${payload.data.secret.slice(0, 4)}...${payload.data.secret.slice(-4)}`);
                          setSuccessMessage('Cron secret regenerated — copy it now');
                        } catch (err: any) {
                          setAutomationError(err.message || 'Failed to regenerate');
                        } finally {
                          setIsRegenProcessing(false);
                        }
                      }}
                      className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                      aria-label="Regenerate cron secret"
                    >
                      {isRegenProcessing ? 'Regenerating…' : 'Regenerate'}
                    </button>
                  </div>

                  {successMessage && <p className="text-sm text-green-600 mt-2">{successMessage}</p>}
                  {automationError && <p className="text-sm text-red-600 mt-2">{automationError}</p>}
                  {newCronSecret && (
                    <div className="mt-3 flex items-center gap-2">
                      <input readOnly title="New cron secret" aria-label="New cron secret" value={newCronSecret} className="px-3 py-2 border rounded-lg w-full" />
                      <button
                        onClick={() => navigator.clipboard?.writeText(newCronSecret)}
                        className="px-3 py-2 rounded-lg bg-gray-100"
                      >Copy</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Integrations</h2>
              <p className="text-sm text-gray-500">
                Manage API keys and connected services.
              </p>
              {/* Integration settings would go here */}
              <div className="p-6 bg-white rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700">OpenRouter Integration</h3>
                <p className="text-xs text-gray-500 mt-1 mb-4">Enable OpenRouter and manage API key to use AI models.</p>
                <div className="flex items-center gap-3 mb-4">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={openrouterEnabled} onChange={(e) => setOpenrouterEnabled(e.target.checked)} />
                    <span className="text-sm text-gray-700">Enabled</span>
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="password"
                    value={openrouterKey}
                    onChange={(e) => setOpenrouterKey(e.target.value)}
                    placeholder={openrouterMasked ?? 'Not set'}
                    className="px-3 py-2 border rounded-lg bg-gray-50 w-full"
                    aria-label="OpenRouter API key"
                  />
                  <button
                    onClick={async () => {
                      setOpenrouterError(null);
                      setOpenrouterSuccess(null);
                      setIsOpenrouterProcessing(true);
                      try {
                        const res = await fetch('/api/settings/integrations/openrouter', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ enabled: openrouterEnabled, key: openrouterKey || undefined }),
                        });
                        const payload = await res.json();
                        if (!res.ok || !payload.success) throw new Error(payload.error || 'Save failed');
                        setOpenrouterKey('');
                        // Display masked value after save
                        const mask = openrouterKey ? `${openrouterKey.slice(0, 4)}...${openrouterKey.slice(-4)}` : openrouterMasked;
                        setOpenrouterMasked(mask ?? openrouterMasked);
                        setOpenrouterSuccess('Integration saved');
                      } catch (err: any) {
                        setOpenrouterError(err.message || 'Failed to save');
                      } finally {
                        setIsOpenrouterProcessing(false);
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    aria-label="Save OpenRouter settings"
                    disabled={isOpenrouterProcessing}
                  >
                    Save
                  </button>
                  <button
                    onClick={async () => {
                      // Test key
                      setOpenrouterError(null);
                      setOpenrouterSuccess(null);
                      setIsOpenrouterProcessing(true);
                      try {
                        const res = await fetch('/api/settings/integrations/openrouter', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ key: openrouterKey }),
                        });
                        const payload = await res.json();
                        if (!res.ok || !payload.success) throw new Error(payload.error || 'Test failed');
                        setOpenrouterSuccess('Key validated');
                      } catch (err: any) {
                        setOpenrouterError(err.message || 'Failed to validate');
                      } finally {
                        setIsOpenrouterProcessing(false);
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-gray-100"
                    aria-label="Test OpenRouter key"
                    disabled={isOpenrouterProcessing}
                  >Test</button>
                </div>
                {openrouterSuccess && <p className="text-sm text-green-600 mt-2">{openrouterSuccess}</p>}
                {openrouterError && <p className="text-sm text-red-600 mt-2">{openrouterError}</p>}
                <div className="mt-3 text-xs text-gray-500">Stored key: {openrouterMasked ?? 'Not set'}</div>
              </div>
            </div>
          )}

          {activeTab === 'platforms' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Social Platform Credentials</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Configure OAuth credentials for each social media platform. Get these from each platform&apos;s developer portal.
                </p>
              </div>

              {platformsError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {platformsError}
                </div>
              )}
              {platformsSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  {platformsSuccess}
                </div>
              )}

              {/* LinkedIn */}
              <div className="p-6 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">in</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">LinkedIn</h3>
                      <p className="text-xs text-gray-500">
                        <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Get credentials from LinkedIn Developer Portal →
                        </a>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {linkedinConfigured && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Configured</span>
                    )}
                    <button
                      onClick={() => setExpandedInstructions(expandedInstructions === 'linkedin' ? null : 'linkedin')}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      aria-label="Toggle instructions"
                    >
                      {expandedInstructions === 'linkedin' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                {expandedInstructions === 'linkedin' && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg text-sm">
                    <h4 className="font-medium text-blue-900 mb-2">How to get LinkedIn OAuth credentials:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-blue-800">
                      <li>Go to <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noopener noreferrer" className="underline">LinkedIn Developer Portal</a></li>
                      <li>Click &quot;Create app&quot; and fill in your app details</li>
                      <li>Under the &quot;Auth&quot; tab, find your Client ID and Client Secret</li>
                      <li>Add the redirect URL shown below to &quot;Authorized redirect URLs for your app&quot;</li>
                      <li>Under &quot;Products&quot;, request access to &quot;Share on LinkedIn&quot; and &quot;Sign In with LinkedIn using OpenID Connect&quot;</li>
                      <li>Wait for product approval (usually instant for basic permissions)</li>
                    </ol>
                    <p className="mt-3 text-blue-700"><strong>Required scopes:</strong> openid, profile, email, w_member_social</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                    <input
                      type="text"
                      value={linkedinClientId}
                      onChange={(e) => setLinkedinClientId(e.target.value)}
                      placeholder="Enter LinkedIn Client ID"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
                    <input
                      type="password"
                      value={linkedinClientSecret}
                      onChange={(e) => setLinkedinClientSecret(e.target.value)}
                      placeholder={linkedinConfigured ? '••••••••' : 'Enter LinkedIn Client Secret'}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Redirect URI: <code className="bg-gray-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/callback/linkedin</code>
                </p>
              </div>

              {/* Facebook / Instagram */}
              <div className="p-6 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">f</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Facebook / Instagram</h3>
                      <p className="text-xs text-gray-500">
                        <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Get credentials from Meta Developer Portal →
                        </a>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {facebookConfigured && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Configured</span>
                    )}
                    <button
                      onClick={() => setExpandedInstructions(expandedInstructions === 'facebook' ? null : 'facebook')}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      aria-label="Toggle instructions"
                    >
                      {expandedInstructions === 'facebook' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                {expandedInstructions === 'facebook' && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg text-sm">
                    <h4 className="font-medium text-blue-900 mb-2">How to get Facebook/Instagram OAuth credentials:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-blue-800">
                      <li>Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="underline">Meta for Developers</a></li>
                      <li>Click &quot;Create App&quot; → Select &quot;Business&quot; type</li>
                      <li>Fill in your app name and contact email</li>
                      <li>In the app dashboard, go to Settings → Basic to find App ID and App Secret</li>
                      <li>Add &quot;Facebook Login&quot; product to your app</li>
                      <li>Configure Valid OAuth Redirect URIs with the URLs shown below</li>
                      <li>For Instagram: Add &quot;Instagram Basic Display&quot; or &quot;Instagram Graph API&quot; product</li>
                      <li>Submit your app for review if you need access beyond test users</li>
                    </ol>
                    <p className="mt-3 text-blue-700"><strong>Required permissions:</strong> pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic, instagram_content_publish</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">App ID</label>
                    <input
                      type="text"
                      value={facebookAppId}
                      onChange={(e) => setFacebookAppId(e.target.value)}
                      placeholder="Enter Facebook App ID"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">App Secret</label>
                    <input
                      type="password"
                      value={facebookAppSecret}
                      onChange={(e) => setFacebookAppSecret(e.target.value)}
                      placeholder={facebookConfigured ? '••••••••' : 'Enter Facebook App Secret'}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2 space-y-1">
                  <p>Facebook Redirect URI: <code className="bg-gray-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/callback/facebook</code></p>
                  <p>Instagram Redirect URI: <code className="bg-gray-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/callback/instagram</code></p>
                </div>
              </div>

              {/* Pinterest */}
              <div className="p-6 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">P</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Pinterest</h3>
                      <p className="text-xs text-gray-500">
                        <a href="https://developers.pinterest.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Get credentials from Pinterest Developer Portal →
                        </a>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pinterestConfigured && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Configured</span>
                    )}
                    <button
                      onClick={() => setExpandedInstructions(expandedInstructions === 'pinterest' ? null : 'pinterest')}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      aria-label="Toggle instructions"
                    >
                      {expandedInstructions === 'pinterest' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                {expandedInstructions === 'pinterest' && (
                  <div className="mb-4 p-4 bg-red-50 rounded-lg text-sm">
                    <h4 className="font-medium text-red-900 mb-2">How to get Pinterest OAuth credentials:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-red-800">
                      <li>Go to <a href="https://developers.pinterest.com/apps/" target="_blank" rel="noopener noreferrer" className="underline">Pinterest Developers</a></li>
                      <li>Click &quot;Create app&quot; and fill in your app details</li>
                      <li>You&apos;ll need a Pinterest Business account to create developer apps</li>
                      <li>Once created, find your App ID and App Secret in the app settings</li>
                      <li>Add the redirect URI shown below to your app&apos;s redirect URLs</li>
                      <li>Request access to required scopes: boards:read, pins:read, pins:write</li>
                    </ol>
                    <p className="mt-3 text-red-700"><strong>Required scopes:</strong> boards:read, pins:read, pins:write, user_accounts:read</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">App ID</label>
                    <input
                      type="text"
                      value={pinterestAppId}
                      onChange={(e) => setPinterestAppId(e.target.value)}
                      placeholder="Enter Pinterest App ID"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">App Secret</label>
                    <input
                      type="password"
                      value={pinterestAppSecret}
                      onChange={(e) => setPinterestAppSecret(e.target.value)}
                      placeholder={pinterestConfigured ? '••••••••' : 'Enter Pinterest App Secret'}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Redirect URI: <code className="bg-gray-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/callback/pinterest</code>
                </p>
              </div>

              {/* Twitter/X */}
              <div className="p-6 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">𝕏</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Twitter / X</h3>
                      <p className="text-xs text-gray-500">
                        <a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Get credentials from Twitter Developer Portal →
                        </a>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {twitterConfigured && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Configured</span>
                    )}
                    <button
                      onClick={() => setExpandedInstructions(expandedInstructions === 'twitter' ? null : 'twitter')}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      aria-label="Toggle instructions"
                    >
                      {expandedInstructions === 'twitter' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                {expandedInstructions === 'twitter' && (
                  <div className="mb-4 p-4 bg-gray-100 rounded-lg text-sm">
                    <h4 className="font-medium text-gray-900 mb-2">How to get Twitter/X OAuth 2.0 credentials:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700">
                      <li>Go to <a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer" className="underline">Twitter Developer Portal</a></li>
                      <li>Sign up for a developer account if you haven&apos;t already (requires account verification)</li>
                      <li>Create a new Project, then create an App within that project</li>
                      <li>In your App settings, go to &quot;User authentication settings&quot; and click &quot;Set up&quot;</li>
                      <li>Enable OAuth 2.0 and select &quot;Web App&quot; as the app type</li>
                      <li>Add the Callback URL / Redirect URI shown below</li>
                      <li>Set App permissions to &quot;Read and write&quot; to allow posting tweets</li>
                      <li>Save and copy your Client ID and Client Secret from the &quot;Keys and tokens&quot; tab</li>
                    </ol>
                    <p className="mt-3 text-gray-600"><strong>Required scopes:</strong> tweet.read, tweet.write, users.read, offline.access</p>
                    <p className="mt-2 text-gray-600"><strong>Note:</strong> Free tier allows 1,500 tweets/month. Basic tier ($100/month) allows 50,000 tweets/month.</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                    <input
                      type="text"
                      value={twitterClientId}
                      onChange={(e) => setTwitterClientId(e.target.value)}
                      placeholder="Enter Twitter Client ID"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
                    <input
                      type="password"
                      value={twitterClientSecret}
                      onChange={(e) => setTwitterClientSecret(e.target.value)}
                      placeholder={twitterConfigured ? '••••••••' : 'Enter Twitter Client Secret'}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Callback URI: <code className="bg-gray-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/callback/twitter</code>
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={savePlatformCredentials}
                  disabled={platformsLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {platformsLoading ? 'Saving...' : 'Save Credentials'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
