'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard,
  Users,
  FileText,
  TrendingUp,
  Calendar,
  BarChart3,
  Settings,
  Zap,
  LogOut,
  LucideIcon
} from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';

interface NavigationItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

const navigationItems: NavigationItem[] = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/accounts', icon: Users, label: 'Accounts' },
  { href: '/content', icon: FileText, label: 'Content' },
  { href: '/trends', icon: TrendingUp, label: 'Trends' },
  { href: '/schedule', icon: Calendar, label: 'Schedule' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  async function handleLogout() {
    await signOut();
    router.push('/login');
  }

  return (
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
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname?.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
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
  );
}
