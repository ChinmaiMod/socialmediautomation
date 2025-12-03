'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  TrendingUp, 
  Search,
  RefreshCw,
  ExternalLink,
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  BarChart3,
  Settings,
  Zap,
  LogOut,
  AlertCircle,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';

interface TrendingTopic {
  topic: string;
  source_url: string | null;
  source_published_at: string | null;
  relevance_score: number;
  is_current_version: boolean;
  summary: string;
}

interface Niche {
  id: string;
  name: string;
  keywords: string[];
  target_audience: string;
}

export default function TrendsPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [niches, setNiches] = useState<Niche[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<string>('');
  const [trends, setTrends] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

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
      if (data.success && data.data.length > 0) {
        setNiches(data.data);
        setSelectedNiche(data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load niches:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleResearch() {
    if (!selectedNiche) {
      setError('Please select a niche first');
      return;
    }

    setSearching(true);
    setError('');
    setTrends([]);

    try {
      const niche = niches.find(n => n.id === selectedNiche);
      
      const response = await fetch('/api/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche,
          max_results: 10,
          recency_days: 7,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setTrends(data.data);
      } else {
        setError(data.error || 'Failed to research trends');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to research trends');
    } finally {
      setSearching(false);
    }
  }

  async function handleLogout() {
    await signOut();
    router.push('/login');
  }

  const navigationItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/accounts', icon: Users, label: 'Accounts' },
    { href: '/content', icon: FileText, label: 'Content' },
    { href: '/trends', icon: TrendingUp, label: 'Trends', active: true },
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
            <h2 className="text-3xl font-bold text-gray-900">Trend Research</h2>
            <p className="text-gray-600 mt-1">Discover trending topics for your niche (last 7 days)</p>
          </div>

          {/* Research Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Niche</label>
                <select
                  value={selectedNiche}
                  onChange={(e) => setSelectedNiche(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a niche...</option>
                  {niches.map((niche) => (
                    <option key={niche.id} value={niche.id}>{niche.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleResearch}
                  disabled={searching || !selectedNiche}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {searching ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Researching...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Research Trends
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Trends Results */}
          {trends.length > 0 ? (
            <div className="space-y-4">
              {trends.map((trend, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{trend.topic}</h3>
                        {trend.is_current_version && (
                          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Current
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mb-3">{trend.summary}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {trend.source_published_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(trend.source_published_at).toLocaleDateString()}
                          </span>
                        )}
                        {trend.source_url && (
                          <a
                            href={trend.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Source
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-2xl font-bold text-purple-600">{trend.relevance_score}</div>
                      <div className="text-xs text-gray-500">Relevance</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => router.push(`/content?topic=${encodeURIComponent(trend.topic)}`)}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Use this topic for content generation →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : !searching && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No trends yet</h3>
              <p className="text-gray-500">Select a niche and click "Research Trends" to discover what's trending</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
