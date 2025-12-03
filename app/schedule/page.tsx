'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar, 
  Clock,
  Plus,
  Trash2,
  Edit2,
  LayoutDashboard,
  Users,
  FileText,
  TrendingUp,
  BarChart3,
  Settings,
  Zap,
  LogOut,
  AlertCircle,
  Linkedin,
  Facebook,
  Instagram,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';

interface ScheduledPost {
  id: string;
  content: string;
  platform: string;
  scheduled_time: string;
  status: 'pending' | 'posted' | 'failed';
  created_at: string;
}

export default function SchedulePage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      fetchScheduledPosts();
    }
  }, [authLoading, user]);

  async function fetchScheduledPosts() {
    try {
      const response = await fetch('/api/posts?status=pending');
      const data = await response.json();
      if (data.success) {
        setPosts(data.data || []);
      }
    } catch (err) {
      setError('Failed to load scheduled posts');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(postId: string) {
    if (!confirm('Are you sure you want to delete this scheduled post?')) return;
    
    try {
      const response = await fetch(`/api/posts?id=${postId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setPosts(posts.filter(p => p.id !== postId));
      }
    } catch (err) {
      setError('Failed to delete post');
    }
  }

  async function handleLogout() {
    await signOut();
    router.push('/login');
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'linkedin': return <Linkedin className="w-4 h-4" />;
      case 'facebook': return <Facebook className="w-4 h-4" />;
      case 'instagram': return <Instagram className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'posted': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const navigationItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/accounts', icon: Users, label: 'Accounts' },
    { href: '/content', icon: FileText, label: 'Content' },
    { href: '/trends', icon: TrendingUp, label: 'Trends' },
    { href: '/schedule', icon: Calendar, label: 'Schedule', active: true },
    { href: '/analytics', icon: BarChart3, label: 'Analytics' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ];

  // Group posts by date
  const groupedPosts = posts.reduce((acc: Record<string, ScheduledPost[]>, post) => {
    const date = new Date(post.scheduled_time).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(post);
    return acc;
  }, {});

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading schedule...</p>
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Post Schedule</h2>
              <p className="text-gray-600 mt-1">Manage your scheduled social media posts</p>
            </div>
            <button
              onClick={() => router.push('/content')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Post
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Posting Schedule Info */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white mb-8">
            <h3 className="text-lg font-semibold mb-2">Automated Posting Schedule</h3>
            <p className="text-blue-100 mb-4">Posts are automatically published at these times daily:</p>
            <div className="flex gap-4">
              <div className="bg-white/20 rounded-lg px-4 py-2">
                <span className="text-sm font-medium">8:00 AM</span>
              </div>
              <div className="bg-white/20 rounded-lg px-4 py-2">
                <span className="text-sm font-medium">2:00 PM</span>
              </div>
              <div className="bg-white/20 rounded-lg px-4 py-2">
                <span className="text-sm font-medium">7:00 PM</span>
              </div>
            </div>
          </div>

          {posts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No posts scheduled</h3>
              <p className="text-gray-500 mb-6">Create content and schedule it for posting</p>
              <button
                onClick={() => router.push('/content')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Your First Post
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPosts).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime()).map(([date, datePosts]) => (
                <div key={date}>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{date}</h3>
                  <div className="space-y-3">
                    {datePosts.map((post) => (
                      <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              {getPlatformIcon(post.platform)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900 capitalize">{post.platform}</span>
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                {getStatusIcon(post.status)}
                                {post.status}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm line-clamp-2">{post.content}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              {new Date(post.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/content?edit=${post.id}`)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(post.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
