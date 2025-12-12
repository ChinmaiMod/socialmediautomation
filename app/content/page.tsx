'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  LayoutDashboard,
  Users,
  TrendingUp,
  Calendar,
  BarChart3,
  Settings,
  Zap,
  LogOut,
  AlertCircle,
  Send,
  ShieldCheck,
  Clock,
  RefreshCcw
} from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';

interface Niche {
  id: string;
  name: string;
  keywords: string[];
  target_audience: string;
  content_themes: string[];
}

interface AccountOption {
  id: string;
  name: string;
  platform: string;
}

interface TrendTopic {
  id: string;
  topic: string;
  source_published_at: string;
  is_current_version: boolean;
  relevance_score: number;
}

interface GeneratedContent {
  content: string;
  hashtags: string[];
  predicted_viral_score: number;
  reasoning: string;
}

interface GeneratedResult {
  account: AccountOption;
  content: GeneratedContent;
}

interface PatternPreset {
  patternId: string;
  hook: string;
  contentStructure: string | null;
  emotionalTrigger: string | null;
  platforms: string[];
  niches: string[];
}

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
  pinterest: 'Pinterest',
  twitter: 'Twitter',
};

const buildPatternInstructions = (pattern: PatternPreset): string => {
  const instructions: string[] = [`Apply viral hook: "${pattern.hook}"`];
  if (pattern.contentStructure) {
    instructions.push(`Follow structure: ${pattern.contentStructure}`);
  }
  if (pattern.emotionalTrigger) {
    instructions.push(`Emphasize emotional trigger: ${pattern.emotionalTrigger}`);
  }
  return instructions.join('\n');
};

export default function ContentPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [niches, setNiches] = useState<Niche[]>([]);
  const [selectedNicheId, setSelectedNicheId] = useState<string>('');
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [tone, setTone] = useState<string>('professional');
  const [manualTrendTopic, setManualTrendTopic] = useState<string>('');
  const [autoTrendTopics, setAutoTrendTopics] = useState<TrendTopic[]>([]);
  const [selectedAutoTrendId, setSelectedAutoTrendId] = useState<string>('');
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [generatedResults, setGeneratedResults] = useState<Record<string, GeneratedResult>>({});
  const [activePreviewAccount, setActivePreviewAccount] = useState<string>('');
  const [loadingNiches, setLoadingNiches] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copiedAccountId, setCopiedAccountId] = useState<string>('');
  const [error, setError] = useState('');
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [validationSuggestions, setValidationSuggestions] = useState<string[]>([]);
  const [validatingTopic, setValidatingTopic] = useState(false);
  const [activePattern, setActivePattern] = useState<PatternPreset | null>(null);
  const [postingNow, setPostingNow] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      fetchNiches();
    }
  }, [authLoading, user]);

  useEffect(() => {
    const stored = sessionStorage.getItem('patternPreset');
    if (!stored) return;

    try {
      const preset: PatternPreset = JSON.parse(stored);
      setActivePattern(preset);
      const instructions = buildPatternInstructions(preset);
      setCustomInstructions((prev) => (prev ? `${prev}\n\n${instructions}` : instructions));
    } catch (err) {
      console.error('Failed to load pattern preset', err);
    } finally {
      sessionStorage.removeItem('patternPreset');
    }
  }, []);

  async function fetchNiches() {
    try {
      setLoadingNiches(true);
      const response = await fetch('/api/niches');
      const data = await response.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setNiches(data.data);
        const defaultNicheId = data.data[0].id;
        setSelectedNicheId(defaultNicheId);
        await Promise.all([fetchAccounts(defaultNicheId), fetchTrends(defaultNicheId)]);
        return;
      }

      if (data.success) {
        setNiches([]);
        setSelectedNicheId('');
        setError('No niches found. Create one in the Niches page.');
        return;
      }

      setError(data.error || 'Failed to load niches');
    } catch (err) {
      console.error('Failed to load niches:', err);
      setError('Failed to load niches');
    } finally {
      setLoadingNiches(false);
    }
  }

  const fetchAccounts = async (nicheId: string) => {
    try {
      setLoadingAccounts(true);
      const response = await fetch(`/api/accounts?niche_id=${nicheId}`);
      const data = await response.json();
      const options: AccountOption[] = (data.accounts ?? []).map((account: any) => ({
        id: account.id,
        name: account.name || account.account_name,
        platform: account.platform,
      }));
      setAccounts(options);
      setSelectedAccountIds([]);
      setGeneratedResults({});
      setActivePreviewAccount('');
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const fetchTrends = async (nicheId: string) => {
    try {
      setLoadingTrends(true);
      const response = await fetch(`/api/trends?niche_id=${nicheId}`);
      const data = await response.json();
      setAutoTrendTopics(data.topics ?? []);
      setSelectedAutoTrendId('');
    } catch (err) {
      console.error('Failed to load trends:', err);
      setAutoTrendTopics([]);
    } finally {
      setLoadingTrends(false);
    }
  };

  const handleNicheChange = async (nicheId: string) => {
    setSelectedNicheId(nicheId);
    await Promise.all([fetchAccounts(nicheId), fetchTrends(nicheId)]);
  };

  const handleAutoResearch = async () => {
    if (!selectedNicheId) return;
    setLoadingTrends(true);
    setError('');
    try {
      const response = await fetch('/api/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche_id: selectedNicheId }),
      });
      const data = await response.json();
      setAutoTrendTopics(data.topics ?? []);
      if ((data.topics ?? []).length > 0) {
        setSelectedAutoTrendId(data.topics[0].id);
      }
    } catch (err) {
      setError('Failed to auto-research trends');
    } finally {
      setLoadingTrends(false);
    }
  };

  const handleValidateTopic = async () => {
    if (!manualTrendTopic) return;
    setValidatingTopic(true);
    setValidationIssues([]);
    setValidationSuggestions([]);
    try {
      const response = await fetch('/api/trends', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: manualTrendTopic,
          niche_id: selectedNicheId,
        }),
      });
      const data = await response.json();
      const validation = data.validation ?? {};
      setValidationIssues(validation.issues ?? []);
      setValidationSuggestions(validation.suggestions ?? []);
      if (validation.isValid === false) {
        setError('This topic may be outdated or mismatched. Review the guard output below.');
      } else {
        setError('');
      }
    } catch (err) {
      setError('Failed to validate trend topic');
    } finally {
      setValidatingTopic(false);
    }
  };

  const handleClearPattern = () => {
    setActivePattern(null);
  };

  async function handleGenerate() {
    if (!selectedNicheId) {
      setError('Please select a niche first');
      return;
    }

    if (selectedAccountIds.length === 0) {
      setError('Select at least one account to generate content');
      return;
    }

    setGenerating(true);
    setError('');
    setGeneratedResults({});
    setActivePreviewAccount('');

    try {
      const niche = niches.find((n) => n.id === selectedNicheId);
      const trendTopic = manualTrendTopic || autoTrendTopics.find((topic) => topic.id === selectedAutoTrendId)?.topic;

      const generationPromises = selectedAccountIds.map(async (accountId) => {
        const account = accounts.find((acct) => acct.id === accountId);
        const response = await fetch('/api/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate',
            account_id: accountId,
            niche,
            platform: account?.platform,
            tone,
            trend_topic: trendTopic || undefined,
            custom_instructions: customInstructions || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to generate content for one of the accounts');
        }

        return {
          account,
          content: data.generated ?? data.data,
        } as GeneratedResult;
      });

      const results = await Promise.all(generationPromises);
      const resultsByAccount: Record<string, GeneratedResult> = {};
      results.forEach((result) => {
        if (result.account) {
          resultsByAccount[result.account.id] = result;
        }
      });

      setGeneratedResults(resultsByAccount);
      if (results.length > 0 && results[0].account) {
        setActivePreviewAccount(results[0].account.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate content');
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!activePreviewAccount) return;
    const preview = generatedResults[activePreviewAccount];
    if (!preview) return;

    const fullContent = `${preview.content.content}\n\n${preview.content.hashtags.map((h) => `#${h}`).join(' ')}`.trim();
    await navigator.clipboard.writeText(fullContent);
    setCopiedAccountId(activePreviewAccount);
    setTimeout(() => setCopiedAccountId(''), 2000);
  }

  async function handleLogout() {
    await signOut();
    router.push('/login');
  }

  async function handlePostNow() {
    if (postingNow) return;
    if (selectedAccountIds.length === 0) {
      setError('Select at least one account to post');
      return;
    }

    setPostingNow(true);
    setError('');

    try {
      const postPromises = selectedAccountIds.map(async (accountId) => {
        const result = generatedResults[accountId];
        if (!result) {
          throw new Error('Generate content first before posting');
        }

        const res = await fetch('/api/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'post',
            account_id: accountId,
            content: result.content.content,
            hashtags: result.content.hashtags,
          }),
        });

        const data = await res.json();
        if (!res.ok || data.success === false) {
          throw new Error(data.error || 'Failed to post to one of the accounts');
        }
        return data;
      });

      await Promise.all(postPromises);
      router.push('/history');
    } catch (err: any) {
      setError(err.message || 'Failed to post');
    } finally {
      setPostingNow(false);
    }
  }

  const generatedAccountList = useMemo(() => Object.values(generatedResults), [generatedResults]);

  const navigationItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/accounts', icon: Users, label: 'Accounts' },
    { href: '/content', icon: FileText, label: 'Content', active: true },
    { href: '/trends', icon: TrendingUp, label: 'Trends' },
    { href: '/schedule', icon: Calendar, label: 'Schedule' },
    { href: '/analytics', icon: BarChart3, label: 'Analytics' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ];

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Social Auto</h1>
                <p className="text-xs text-gray-500">AI-Powered</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  item.active
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="mb-3 px-4 py-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Signed in as</p>
              <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-64">
        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Content Generator</h2>
            <p className="text-gray-600 mt-1">
              Generate and preview platform-specific content with trend validation safeguards.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Generation Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Generate Content</h3>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {activePattern && (
                <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">Pattern applied</p>
                      <p className="text-base font-semibold">{activePattern.hook}</p>
                      {activePattern.emotionalTrigger && (
                        <p className="text-sm text-blue-700">Trigger: {activePattern.emotionalTrigger}</p>
                      )}
                      {activePattern.contentStructure && (
                        <p className="text-sm text-blue-700">
                          Structure: {activePattern.contentStructure.replace(/\s+/g, ' ').trim()}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activePattern.platforms.map((platform) => (
                        <span
                          key={`pattern-platform-${platform}`}
                          className="px-3 py-1 text-xs font-medium bg-white text-blue-800 rounded-full border border-blue-200"
                        >
                          {PLATFORM_LABELS[platform] || platform}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleClearPattern}
                      className="text-sm font-medium text-blue-700 hover:text-blue-900"
                    >
                      Remove pattern
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="niche-select">
                    Niche
                  </label>
                  <select
                    id="niche-select"
                    value={selectedNicheId}
                    onChange={(e) => handleNicheChange(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loadingNiches}
                  >
                    <option value="">Select a niche...</option>
                    {niches.map((niche) => (
                      <option key={niche.id} value={niche.id}>
                        {niche.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 mb-2"
                    htmlFor="account-selection"
                  >
                    Accounts
                  </label>
                  <div
                    id="account-selection"
                    className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3"
                  >
                    {loadingAccounts ? (
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        <RefreshCcw className="w-4 h-4 animate-spin" />
                        Loading accounts...
                      </p>
                    ) : accounts.length === 0 ? (
                      <p className="text-sm text-gray-500">No accounts found for this niche.</p>
                    ) : (
                      accounts.map((account) => {
                        const label = `${account.name} (${PLATFORM_LABELS[account.platform] ?? account.platform})`;
                        return (
                          <label key={account.id} className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              value={account.id}
                              checked={selectedAccountIds.includes(account.id)}
                              onChange={(event) => {
                                const { checked, value } = event.target;
                                setSelectedAccountIds((prev) =>
                                  checked ? [...prev, value] : prev.filter((id) => id !== value)
                                );
                              }}
                              aria-label={label}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                            />
                            <span>{label}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="tone-select">
                    Tone
                  </label>
                  <select
                    id="tone-select"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="inspirational">Inspirational</option>
                    <option value="educational">Educational</option>
                    <option value="humorous">Humorous</option>
                  </select>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-semibold text-gray-800">Trend Research & Recency Guard</h4>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1" htmlFor="recent-trends">
                        Recent trends
                      </label>
                      <select
                        id="recent-trends"
                        value={selectedAutoTrendId}
                        onChange={(e) => setSelectedAutoTrendId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={loadingTrends || autoTrendTopics.length === 0}
                      >
                        <option value="">Select a discovered topic...</option>
                        {autoTrendTopics.map((topic) => (
                          <option key={topic.id} value={topic.id}>
                            {topic.topic}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAutoResearch}
                        className="mt-2 inline-flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700"
                        disabled={loadingTrends}
                      >
                        <RefreshCcw className={`w-4 h-4 ${loadingTrends ? 'animate-spin' : ''}`} />
                        Auto-research latest topics
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1" htmlFor="manual-trend">
                        Manual trend topic
                      </label>
                      <input
                        id="manual-trend"
                        type="text"
                        value={manualTrendTopic}
                        onChange={(e) => setManualTrendTopic(e.target.value)}
                        placeholder="e.g., Gemini Flash 2.5 adoption"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          type="button"
                          onClick={handleValidateTopic}
                          disabled={!manualTrendTopic || validatingTopic}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          {validatingTopic ? 'Validating...' : 'Validate Topic'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setManualTrendTopic('');
                            setValidationIssues([]);
                            setValidationSuggestions([]);
                          }}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Clear
                        </button>
                      </div>
                      {(validationIssues.length > 0 || validationSuggestions.length > 0) && (
                        <div className="mt-3 space-y-2">
                          {validationIssues.length > 0 && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                              <p className="font-semibold mb-1">Issues detected:</p>
                              <ul className="list-disc list-inside space-y-1">
                                {validationIssues.map((issue, index) => (
                                  <li key={index}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {validationSuggestions.length > 0 && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                              <p className="font-semibold mb-1">Suggestions:</p>
                              <ul className="list-disc list-inside space-y-1">
                                {validationSuggestions.map((suggestion, index) => (
                                  <li key={index}>{suggestion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Instructions (optional)
                  </label>
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Any specific requirements..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={generating || !selectedNicheId}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Content
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Generated Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Generated Content</h3>
                {activePreviewAccount && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    {copiedAccountId === activePreviewAccount ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>

              {generatedAccountList.length > 0 ? (
                <div>
                  <div role="tablist" className="flex flex-wrap gap-2 border-b border-gray-200 pb-2 mb-4">
                    {generatedAccountList.map(({ account }) => {
                      if (!account) return null;
                      const isActive = activePreviewAccount === account.id;
                      const tabId = `tab-${account.id}`;
                      const panelId = `panel-${account.id}`;
                      if (isActive) {
                        return (
                          <button
                            key={account.id}
                            role="tab"
                            id={tabId}
                            aria-selected="true"
                            aria-controls={panelId}
                            type="button"
                            onClick={() => setActivePreviewAccount(account.id)}
                            className="px-4 py-2 text-sm rounded-lg border border-blue-600 text-blue-600 bg-blue-50"
                          >
                            {account.name}
                          </button>
                        );
                      }

                      return (
                        <button
                          key={account.id}
                          role="tab"
                          id={tabId}
                          aria-selected="false"
                          aria-controls={panelId}
                          type="button"
                          onClick={() => setActivePreviewAccount(account.id)}
                          className="px-4 py-2 text-sm rounded-lg border border-transparent text-gray-600 hover:bg-gray-50 transition"
                        >
                          {account.name}
                        </button>
                      );
                    })}
                  </div>

                  {activePreviewAccount && generatedResults[activePreviewAccount] ? (
                    <div
                      role="tabpanel"
                      id={`panel-${activePreviewAccount}`}
                      aria-labelledby={`tab-${activePreviewAccount}`}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Last generated just now
                        </span>
                        <span className="font-medium text-blue-600">
                          Predicted Viral Score: {generatedResults[activePreviewAccount].content.predicted_viral_score}/100
                        </span>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-gray-800 whitespace-pre-wrap">
                          {generatedResults[activePreviewAccount].content.content}
                        </p>
                      </div>

                      {generatedResults[activePreviewAccount].content.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {generatedResults[activePreviewAccount].content.hashtags.map((tag, index) => (
                            <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {generatedResults[activePreviewAccount].content.reasoning && (
                        <div className="p-4 bg-yellow-50 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            {generatedResults[activePreviewAccount].content.reasoning}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                          onClick={handlePostNow}
                          disabled={postingNow}
                          className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                        >
                          <Send className="w-5 h-5" />
                          {postingNow ? 'Posting...' : 'Post Now'}
                        </button>
                        <button
                          className="flex items-center justify-center gap-2 px-6 py-3 border border-blue-200 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition"
                        >
                          <Calendar className="w-5 h-5" />
                          Schedule
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Select a platform tab to preview the generated content.</p>
                  )}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Generated content will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
