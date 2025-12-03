'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Linkedin, 
  Facebook, 
  Instagram, 
  LayoutDashboard,
  FileText,
  TrendingUp,
  Calendar,
  BarChart3,
  Settings,
  Zap,
  LogOut,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';

interface Account {
  id: string;
  platform: string;
  username: string;
  profile_url: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AccountsPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      fetchAccounts();
    }
  }, [authLoading, user]);

  async function fetchAccounts() {
    try {
      const response = await fetch('/api/accounts');
      const data = await response.json();
      if (data.success) {
        setAccounts(data.data);
      }
    } catch (err) {
      setError('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(accountId: string) {
    if (!confirm('Are you sure you want to delete this account?')) return;
    
    try {
      const response = await fetch(`/api/accounts?id=${accountId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setAccounts(accounts.filter(a => a.id !== accountId));
      }
    } catch (err) {
      setError('Failed to delete account');
    }
  }

  async function handleLogout() {
    await signOut();
    router.push('/login');
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'linkedin': return <Linkedin className="w-5 h-5" />;
      case 'facebook': return <Facebook className="w-5 h-5" />;
      case 'instagram': return <Instagram className="w-5 h-5" />;
      default: return <Users className="w-5 h-5" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'linkedin': return 'bg-blue-600';
      case 'facebook': return 'bg-blue-500';
      case 'instagram': return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case 'pinterest': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  const navigationItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/accounts', icon: Users, label: 'Accounts', active: true },
    { href: '/content', icon: FileText, label: 'Content' },
    { href: '/trends', icon: TrendingUp, label: 'Trends' },
    { href: '/schedule', icon: Calendar, label: 'Schedule' },
    { href: '/analytics', icon: BarChart3, label: 'Analytics' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading accounts...</p>
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
              <h2 className="text-3xl font-bold text-gray-900">Connected Accounts</h2>
              <p className="text-gray-600 mt-1">Manage your social media accounts</p>
            </div>
            <button
              onClick={() => router.push('/accounts/connect')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Connect Account
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {accounts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts connected</h3>
              <p className="text-gray-500 mb-6">Connect your social media accounts to start posting</p>
              <button
                onClick={() => router.push('/accounts/connect')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Connect Your First Account
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map((account) => (
                <div key={account.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className={`h-2 ${getPlatformColor(account.platform)}`} />
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${getPlatformColor(account.platform)} text-white`}>
                          {getPlatformIcon(account.platform)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{account.username}</h3>
                          <p className="text-sm text-gray-500 capitalize">{account.platform}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {account.is_active ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                            <AlertCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        Connected {new Date(account.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => fetchAccounts()}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Refresh"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(account.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
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
