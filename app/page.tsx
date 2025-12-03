'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  Settings as SettingsIcon,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';

interface DashboardStats {
  totalAccounts: number;
  scheduledPosts: number;
  publishedToday: number;
  avgEngagement: number;
}

interface RecentPost {
  id: string;
  content: string;
  platform: string;
  status: 'published' | 'scheduled' | 'failed';
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalAccounts: 0,
    scheduledPosts: 0,
    publishedToday: 0,
    avgEngagement: 0,
  });
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [loading, setLoading] = useState(true);

  async function handleLogout() {
    await signOut();
    router.push('/login');
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // Fetch stats from API
      const [accountsRes, postsRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/posts?limit=5'),
      ]);

      const accountsData = await accountsRes.json();
      const postsData = await postsRes.json();

      if (accountsData.success) {
        setStats({
          totalAccounts: accountsData.data.length,
          scheduledPosts: 0, // TODO: Implement scheduled posts count
          publishedToday: 0, // TODO: Implement today's published count
          avgEngagement: 0, // TODO: Implement engagement calculation
        });
      }

      if (postsData.success) {
        setRecentPosts(postsData.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const navigationItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard', active: true },
    { href: '/accounts', icon: Users, label: 'Accounts' },
    { href: '/content', icon: FileText, label: 'Content' },
    { href: '/trends', icon: TrendingUp, label: 'Trends' },
    { href: '/schedule', icon: Calendar, label: 'Schedule' },
    { href: '/analytics', icon: BarChart3, label: 'Analytics' },
    { href: '/settings', icon: SettingsIcon, label: 'Settings' },
  ];

  const statCards = [
    { title: 'Connected Accounts', value: stats.totalAccounts, icon: Users, color: 'bg-blue-500' },
    { title: 'Scheduled Posts', value: stats.scheduledPosts, icon: Calendar, color: 'bg-green-500' },
    { title: 'Published Today', value: stats.publishedToday, icon: Zap, color: 'bg-purple-500' },
    { title: 'Avg Engagement', value: `${stats.avgEngagement}%`, icon: TrendingUp, color: 'bg-orange-500' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'scheduled':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'linkedin':
        return 'bg-blue-600';
      case 'facebook':
        return 'bg-blue-500';
      case 'instagram':
        return 'bg-pink-500';
      case 'pinterest':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
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
          {/* Logo */}
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

          {/* Navigation */}
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

          {/* User info and logout */}
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
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-600 mt-1">Welcome back! Here's your overview</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Posts</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {recentPosts.length > 0 ? (
                recentPosts.map((post) => (
                  <div key={post.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${getPlatformColor(post.platform)}`}>
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900 capitalize">{post.platform}</span>
                          {getStatusIcon(post.status)}
                          <span className="text-xs text-gray-500 capitalize">{post.status}</span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(post.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No posts yet</p>
                  <Link
                    href="/content"
                    className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Your First Post
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/content"
              className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white hover:shadow-lg transition-shadow"
            >
              <FileText className="w-8 h-8 mb-3" />
              <h4 className="text-lg font-semibold">Generate Content</h4>
              <p className="text-blue-100 text-sm mt-1">Create AI-powered posts</p>
            </Link>
            <Link
              href="/trends"
              className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white hover:shadow-lg transition-shadow"
            >
              <TrendingUp className="w-8 h-8 mb-3" />
              <h4 className="text-lg font-semibold">Research Trends</h4>
              <p className="text-purple-100 text-sm mt-1">Discover viral topics</p>
            </Link>
            <Link
              href="/accounts"
              className="p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white hover:shadow-lg transition-shadow"
            >
              <Users className="w-8 h-8 mb-3" />
              <h4 className="text-lg font-semibold">Connect Accounts</h4>
              <p className="text-green-100 text-sm mt-1">Add social media profiles</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
