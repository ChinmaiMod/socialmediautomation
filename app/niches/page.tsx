'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Target,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  LayoutDashboard,
  Users,
  FileText,
  TrendingUp,
  Calendar,
  BarChart3,
  Settings,
  Zap,
  LogOut,
  AlertCircle,
  Tag,
  Users as Audience,
  Lightbulb
} from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';

interface Niche {
  id: string;
  name: string;
  description: string | null;
  keywords: string[];
  target_audience: string | null;
  content_themes: string[];
  created_at: string;
  updated_at: string;
}

interface NicheFormData {
  name: string;
  description: string;
  keywords: string;
  target_audience: string;
  content_themes: string;
}

const emptyFormData: NicheFormData = {
  name: '',
  description: '',
  keywords: '',
  target_audience: '',
  content_themes: '',
};

export default function NichesPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [niches, setNiches] = useState<Niche[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<NicheFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      fetchNiches();
    }
  }, [authLoading, user]);

  async function fetchNiches() {
    try {
      setLoading(true);
      const response = await fetch('/api/niches');
      const data = await response.json();
      if (data.success) {
        setNiches(data.data || []);
      } else {
        setError('Failed to load niches');
      }
    } catch (err) {
      setError('Failed to load niches');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!formData.name.trim()) {
      setError('Niche name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/niches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
          target_audience: formData.target_audience.trim() || null,
          content_themes: formData.content_themes.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNiches([...niches, data.data]);
        setShowCreateForm(false);
        setFormData(emptyFormData);
      } else {
        setError(data.error || 'Failed to create niche');
      }
    } catch (err) {
      setError('Failed to create niche');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!formData.name.trim()) {
      setError('Niche name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/niches?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
          target_audience: formData.target_audience.trim() || null,
          content_themes: formData.content_themes.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNiches(niches.map(n => n.id === id ? data.data : n));
        setEditingId(null);
        setFormData(emptyFormData);
      } else {
        setError(data.error || 'Failed to update niche');
      }
    } catch (err) {
      setError('Failed to update niche');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this niche?')) return;

    try {
      const response = await fetch(`/api/niches?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setNiches(niches.filter(n => n.id !== id));
      } else {
        setError(data.error || 'Failed to delete niche');
      }
    } catch (err) {
      setError('Failed to delete niche');
    }
  }

  function startEdit(niche: Niche) {
    setEditingId(niche.id);
    setFormData({
      name: niche.name,
      description: niche.description || '',
      keywords: niche.keywords.join(', '),
      target_audience: niche.target_audience || '',
      content_themes: niche.content_themes.join(', '),
    });
    setShowCreateForm(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setFormData(emptyFormData);
  }

  async function handleLogout() {
    await signOut();
    router.push('/login');
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen p-4">
          <div className="flex items-center gap-2 mb-8">
            <Zap className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">ViralPost AI</span>
          </div>
          
          <nav className="space-y-2">
            <Link href="/" className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </Link>
            <Link href="/accounts" className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <Users className="w-5 h-5" />
              Accounts
            </Link>
            <Link href="/niches" className="flex items-center gap-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg">
              <Target className="w-5 h-5" />
              Niches
            </Link>
            <Link href="/content" className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <FileText className="w-5 h-5" />
              Content
            </Link>
            <Link href="/patterns" className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <Lightbulb className="w-5 h-5" />
              Patterns
            </Link>
            <Link href="/trends" className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <TrendingUp className="w-5 h-5" />
              Trends
            </Link>
            <Link href="/schedule" className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <Calendar className="w-5 h-5" />
              Schedule
            </Link>
            <Link href="/history" className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <BarChart3 className="w-5 h-5" />
              History
            </Link>
            <Link href="/analytics" className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <BarChart3 className="w-5 h-5" />
              Analytics
            </Link>
            <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <Settings className="w-5 h-5" />
              Settings
            </Link>
          </nav>
          
          <div className="absolute bottom-4 left-4 right-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg w-full"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Niche Configuration</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your content niches and target audiences</p>
              </div>
              <button
                onClick={() => { setShowCreateForm(true); setEditingId(null); setFormData(emptyFormData); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-5 h-5" />
                Add Niche
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {/* Create Form */}
            {showCreateForm && (
              <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create New Niche</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., Tech Startups"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      rows={2}
                      placeholder="Brief description of this niche..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Keywords (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.keywords}
                      onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., AI, startup, tech, innovation"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Audience</label>
                    <input
                      type="text"
                      value={formData.target_audience}
                      onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., Entrepreneurs, Tech professionals"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content Themes (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.content_themes}
                      onChange={(e) => setFormData({ ...formData, content_themes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., Thought leadership, Product launches, Industry insights"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCreate}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Create'}
                    </button>
                    <button
                      onClick={() => { setShowCreateForm(false); setFormData(emptyFormData); }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Niches List */}
            <div className="space-y-4">
              {niches.length === 0 && !showCreateForm ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No niches configured</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Create your first niche to organize your content strategy</p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Add Your First Niche
                  </button>
                </div>
              ) : (
                niches.map((niche) => (
                  <div key={niche.id} className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    {editingId === niche.id ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Enter niche name"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                          <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Enter description"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            rows={2}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Keywords</label>
                          <input
                            type="text"
                            value={formData.keywords}
                            onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                            placeholder="Enter keywords separated by commas"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Audience</label>
                          <input
                            type="text"
                            value={formData.target_audience}
                            onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                            placeholder="Enter target audience"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content Themes</label>
                          <input
                            type="text"
                            value={formData.content_themes}
                            onChange={(e) => setFormData({ ...formData, content_themes: e.target.value })}
                            placeholder="Enter themes separated by commas"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleUpdate(niche.id)}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                          >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{niche.name}</h3>
                            {niche.description && (
                              <p className="text-gray-600 dark:text-gray-400 mt-1">{niche.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(niche)}
                              title="Edit niche"
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(niche.id)}
                              title="Delete niche"
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {niche.target_audience && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                            <Audience className="w-4 h-4" />
                            <span>{niche.target_audience}</span>
                          </div>
                        )}
                        
                        {niche.keywords.length > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                              <Tag className="w-4 h-4" />
                              <span>Keywords:</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {niche.keywords.map((keyword, idx) => (
                                <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded">
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {niche.content_themes.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                              <Lightbulb className="w-4 h-4" />
                              <span>Content Themes:</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {niche.content_themes.map((theme, idx) => (
                                <span key={idx} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded">
                                  {theme}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
