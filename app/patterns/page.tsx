'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';

interface ViralPattern {
  id: string;
  hook_example: string;
  content_structure: string | null;
  emotional_trigger: string | null;
  success_rate: number;
  usage_count: number;
  platforms: string[];
  niches: string[];
  is_custom: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface Niche {
  id: string;
  name: string;
}

interface PatternFormData {
  hook_example: string;
  content_structure: string;
  emotional_trigger: string;
  platforms: string[];
  niches: string[];
  success_rate: number;
}

interface PatternPreset {
  patternId: string;
  hook: string;
  contentStructure: string | null;
  emotionalTrigger: string | null;
  platforms: string[];
  niches: string[];
}

const PLATFORM_FILTERS = ['all', 'linkedin', 'facebook', 'instagram', 'pinterest', 'twitter'];
const PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
  pinterest: 'Pinterest',
  twitter: 'Twitter',
};

const DEFAULT_SUCCESS_RATE = 70;

const inlineStructure = (value: string | null): string => {
  if (!value) return 'Not provided yet';
  return value.replace(/\s+/g, ' ').trim();
};

const buildPatternPreset = (pattern: ViralPattern): PatternPreset => ({
  patternId: pattern.id,
  hook: pattern.hook_example,
  contentStructure: pattern.content_structure,
  emotionalTrigger: pattern.emotional_trigger,
  platforms: pattern.platforms,
  niches: pattern.niches,
});

export default function PatternsPage() {
  const router = useRouter();
  const [patterns, setPatterns] = useState<ViralPattern[]>([]);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedNiche, setSelectedNiche] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<ViralPattern | null>(null);

  const [formData, setFormData] = useState<PatternFormData>({
    hook_example: '',
    content_structure: '',
    emotional_trigger: '',
    platforms: ['linkedin'],
    niches: [],
    success_rate: DEFAULT_SUCCESS_RATE,
  });

  useEffect(() => {
    const fetchNiches = async () => {
      try {
        const response = await fetch('/api/niches');
        const payload = await response.json();
        if (response.ok && payload.success) {
          setNiches(payload.data ?? []);
        }
      } catch (err) {
        console.error('Failed to load niches', err);
      }
    };
    fetchNiches();
  }, []);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    const fetchPatterns = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (selectedPlatform !== 'all') params.append('platform', selectedPlatform);
        if (selectedNiche !== 'all') params.append('niche_id', selectedNiche);
        if (searchQuery.trim()) params.append('search', searchQuery.trim());

        const response = await fetch(`/api/patterns?${params.toString()}`);
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || 'Failed to fetch viral patterns');
        }
        setPatterns(payload.data ?? []);
      } catch (err) {
        setPatterns([]);
        setError(err instanceof Error ? err.message : 'Failed to load viral patterns');
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchPatterns, 300);
    return () => clearTimeout(debounce);
  }, [selectedPlatform, selectedNiche, searchQuery]);

  const openAddModal = () => {
    setFormData({
      hook_example: '',
      content_structure: '',
      emotional_trigger: '',
      platforms: ['linkedin'],
      niches: niches.length ? [niches[0].id] : [],
      success_rate: DEFAULT_SUCCESS_RATE,
    });
    setIsModalOpen(true);
  };

  const openDetailModal = (pattern: ViralPattern) => {
    setSelectedPattern(pattern);
    setIsDetailModalOpen(true);
  };

  const togglePlatform = (platform: string) => {
    setFormData((prev) => {
      const exists = prev.platforms.includes(platform);
      const platforms = exists ? prev.platforms.filter((item) => item !== platform) : [...prev.platforms, platform];
      return { ...prev, platforms };
    });
  };

  const toggleNiche = (nicheId: string) => {
    setFormData((prev) => {
      const exists = prev.niches.includes(nicheId);
      const nichesList = exists ? prev.niches.filter((item) => item !== nicheId) : [...prev.niches, nicheId];
      return { ...prev, niches: nichesList };
    });
  };

  const getNicheName = (nicheId: string): string => {
    const match = niches.find((niche) => niche.id === nicheId);
    return match?.name ?? 'General';
  };

  const platformTags = useMemo(() => PLATFORM_FILTERS.filter((item) => item !== 'all'), []);

  const handleSave = async () => {
    if (!formData.hook_example.trim()) {
      setError('Hook example is required');
      return;
    }

    if (formData.platforms.length === 0) {
      setError('Select at least one platform');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hook_example: formData.hook_example.trim(),
          content_structure: formData.content_structure.trim() || null,
          emotional_trigger: formData.emotional_trigger.trim() || null,
          platforms: formData.platforms,
          niches: formData.niches,
          success_rate: formData.success_rate,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to create viral pattern');
      }

      setPatterns((prev) => [payload.data as ViralPattern, ...prev]);
      setIsModalOpen(false);
      setSuccess('Pattern created successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create viral pattern');
    } finally {
      setSaving(false);
    }
  };

  const handleUsePattern = async (pattern: ViralPattern) => {
    try {
      const response = await fetch(`/api/patterns?id=${pattern.id}`, {
        method: 'PATCH',
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to update pattern usage');
      }

      setPatterns((prev) =>
        prev.map((item) =>
          item.id === pattern.id ? { ...item, usage_count: (item.usage_count || 0) + 1 } : item,
        ),
      );
    } catch (err) {
      console.error('Failed to increment usage count', err);
    }

    const preset = buildPatternPreset(pattern);
    sessionStorage.setItem('patternPreset', JSON.stringify(preset));

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(pattern.hook_example);
      } catch (clipboardError) {
        console.warn('Failed to copy hook example', clipboardError);
      }
    }

    setSuccess('Pattern sent to the content generator');
    router.push(`/content?patternId=${pattern.id}`);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Viral Patterns Library</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Search, test, and deploy proven viral frameworks across every platform.
              </p>
            </div>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Pattern
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <p className="text-green-700 dark:text-green-400">{success}</p>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search hook examples, structures, or triggers"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform</label>
                <select
                  value={selectedPlatform}
                  onChange={(event) => setSelectedPlatform(event.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  title="Filter by platform"
                >
                  {PLATFORM_FILTERS.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform === 'all' ? 'All platforms' : PLATFORM_LABELS[platform] || platform}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Niche</label>
                <select
                  value={selectedNiche}
                  onChange={(event) => setSelectedNiche(event.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  title="Filter by niche"
                >
                  <option value="all">All niches</option>
                  {niches.map((niche) => (
                    <option key={niche.id} value={niche.id}>
                      {niche.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : patterns.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No patterns found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchQuery.trim()
                  ? 'Try widening your filters or updating your search keywords.'
                  : 'Build your viral library by adding your first pattern.'}
              </p>
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Add your first pattern
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {patterns.map((pattern) => {
                const structureText = inlineStructure(pattern.content_structure);
                const triggerText = pattern.emotional_trigger?.trim() || 'Not specified yet';
                return (
                  <div
                    key={pattern.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition"
                  >
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">
                        Hook example
                      </p>
                      <p className="text-gray-900 dark:text-white text-base font-semibold">
                        {pattern.hook_example}
                      </p>
                    </div>

                    <div className="p-4 space-y-3">
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-medium text-gray-700 dark:text-gray-100">Structure:</span> {structureText}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-medium text-gray-700 dark:text-gray-100">Trigger:</span> {triggerText}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300 pt-2">
                        <p>Success rate: {Math.round(pattern.success_rate)}%</p>
                        <p>Usage count: {pattern.usage_count} uses</p>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {pattern.platforms.map((platform) => (
                          <span
                            key={`${pattern.id}-${platform}`}
                            className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 rounded-full"
                          >
                            {PLATFORM_LABELS[platform] || platform}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {pattern.niches.length > 0 ? (
                          pattern.niches.map((nicheId) => (
                            <span
                              key={`${pattern.id}-${nicheId}`}
                              className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                            >
                              #{getNicheName(nicheId)}
                            </span>
                          ))
                        ) : (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                            #General
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                      <button
                        onClick={() => openDetailModal(pattern)}
                        className="flex-1 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                      >
                        View details
                      </button>
                      <button
                        onClick={() => handleUsePattern(pattern)}
                        className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        Use this pattern
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add custom pattern</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Document a winning hook, structure, and trigger so the team can reuse it instantly.
              </p>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hook example *</label>
                <textarea
                  value={formData.hook_example}
                  onChange={(event) => setFormData({ ...formData, hook_example: event.target.value })}
                  placeholder="e.g., Stop doing this in your SaaS demos..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content structure</label>
                  <textarea
                    value={formData.content_structure}
                    onChange={(event) => setFormData({ ...formData, content_structure: event.target.value })}
                    placeholder="Outline the sequence. Example: 1) Hook 2) Mistake 3) Framework"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Emotional trigger</label>
                  <textarea
                    value={formData.emotional_trigger}
                    onChange={(event) => setFormData({ ...formData, emotional_trigger: event.target.value })}
                    placeholder="e.g., Urgency, Curiosity, FOMO, Authority"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={4}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Platforms *</p>
                  <div className="flex flex-wrap gap-2">
                    {platformTags.map((platform) => (
                      <label
                        key={platform}
                        className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200"
                      >
                        <input
                          type="checkbox"
                          checked={formData.platforms.includes(platform)}
                          onChange={() => togglePlatform(platform)}
                        />
                        {PLATFORM_LABELS[platform] || platform}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Niches</p>
                  {niches.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Create a niche to tag patterns.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {niches.map((niche) => (
                        <label
                          key={niche.id}
                          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200"
                        >
                          <input
                            type="checkbox"
                            checked={formData.niches.includes(niche.id)}
                            onChange={() => toggleNiche(niche.id)}
                          />
                          {niche.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="pattern-success-rate"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Expected success rate (%)
                </label>
                <input
                  id="pattern-success-rate"
                  type="number"
                  min={0}
                  max={100}
                  value={formData.success_rate}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (!Number.isNaN(value)) {
                      const clamped = Math.max(0, Math.min(100, value));
                      setFormData({ ...formData, success_rate: clamped });
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Create pattern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDetailModalOpen && selectedPattern && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">Hook example</p>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedPattern.hook_example}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedPattern.platforms.map((platform) => (
                    <span
                      key={`${selectedPattern.id}-modal-${platform}`}
                      className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 rounded-full"
                    >
                      {PLATFORM_LABELS[platform] || platform}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                title="Close modal"
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content structure</h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                    {selectedPattern.content_structure || 'Not provided yet'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Emotional trigger</h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-900 dark:text-white">
                    {selectedPattern.emotional_trigger || 'Not provided yet'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(selectedPattern.success_rate)}%</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Success rate</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedPattern.usage_count}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Times used</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedPattern.niches.length}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tagged niches</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Niche tags</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPattern.niches.length > 0 ? (
                    selectedPattern.niches.map((nicheId) => (
                      <span
                        key={`${selectedPattern.id}-modal-${nicheId}`}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                      >
                        #{getNicheName(nicheId)}
                      </span>
                    ))
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                      #General
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleUsePattern(selectedPattern);
                  setIsDetailModalOpen(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Use this pattern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
