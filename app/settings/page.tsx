'use client';

import React, { useState, useEffect } from 'react';
import ModelSelector from '@/components/settings/ModelSelector';
import { Settings, Cpu, FileText, Search, Zap } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'models' | 'automation' | 'integrations'>('models');
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
        </div>
      </div>
    </div>
  );
}
