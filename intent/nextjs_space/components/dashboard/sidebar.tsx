'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import {
  MessageSquarePlus, LayoutDashboard, FileSearch, ClipboardCheck,
  Shield, LogOut, ChevronLeft, ChevronRight, Archive, User, Settings,
  Key, Copy, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FlowLogo } from '@/components/flow-logo';
import { INTENT_STATUS_CONFIG } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SidebarIntent {
  id: string;
  rawInput: string;
  status: string;
  intentId: string | null;
  createdAt: string;
}

export function Sidebar() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [intents, setIntents] = useState<SidebarIntent[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const user = session?.user as any;
  const role = user?.role ?? 'END_USER';

  useEffect(() => {
    fetchIntents();
    fetchProfile();
  }, [pathname]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setApiKey(data?.user?.apiKey ?? '');
      }
    } catch (e) {
      console.error('Failed to fetch user profile:', e);
    }
  };

  const handleCopyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchIntents = async () => {
    try {
      const res = await fetch('/api/intents?limit=20');
      if (res.ok) {
        const data = await res.json();
        setIntents(data?.intents ?? []);
      }
    } catch (e) {
      console.error('Failed to fetch intents:', e);
    }
  };

  const navItems = [
    { icon: MessageSquarePlus, label: 'New Intent', href: '/dashboard', roles: ['ADMIN', 'REVIEWER', 'END_USER'] },
  ];

  const filteredNav = navItems.filter((item: any) => (item?.roles ?? []).includes(role));

  return (
    <div className={cn(
      'h-screen flex flex-col bg-gray-50 border-r border-gray-200 transition-all duration-300',
      collapsed ? 'w-16' : 'w-72'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && <FlowLogo size="md" />}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-gray-700 hover:bg-gray-100"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Nav */}
      <nav className="p-2 space-y-1">
        {filteredNav.map((item: any) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/dashboard');
          return (
            <Button
              key={item.href}
              variant="ghost"
              onClick={() => router.push(item.href)}
              className={cn(
                'w-full justify-start gap-3 text-sm font-medium',
                isActive
                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Button>
          );
        })}
      </nav>

      {/* Recent Intents */}
      {!collapsed && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Recent Intents</p>
          </div>
          <ScrollArea className="flex-1 px-2">
            <div className="space-y-1">
              {(intents ?? []).map((intent: SidebarIntent) => {
                const statusConfig = INTENT_STATUS_CONFIG[intent?.status as keyof typeof INTENT_STATUS_CONFIG];
                return (
                  <button
                    key={intent.id}
                    onClick={() => router.push(`/intent/${intent.id}`)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                      pathname === `/intent/${intent.id}`
                        ? 'bg-blue-50 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                    )}
                  >
                    <p className="truncate text-xs">
                      {intent?.intentId ? (
                        <span className="font-mono text-blue-600 mr-1">{intent.intentId}</span>
                      ) : null}
                      {(intent?.rawInput ?? '').substring(0, 40)}{(intent?.rawInput?.length ?? 0) > 40 ? '...' : ''}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={cn('inline-block w-1.5 h-1.5 rounded-full', {
                        'bg-gray-400': intent?.status === 'DRAFT',
                        'bg-blue-400': intent?.status === 'IN_PROGRESS',
                        'bg-amber-400': intent?.status === 'NEEDS_CLARIFICATION',
                        'bg-orange-400': intent?.status === 'UNDER_REVIEW',
                        'bg-green-500': intent?.status === 'APPROVED',
                        'bg-teal-500': intent?.status === 'CONDITIONAL_APPROVAL',
                        'bg-red-400': intent?.status === 'REJECTED',
                        'bg-gray-300': intent?.status === 'ARCHIVED',
                      })} />
                      <span className="text-xs text-gray-400">{statusConfig?.label ?? intent?.status}</span>
                    </div>
                  </button>
                );
              })}
              {(intents?.length ?? 0) === 0 && (
                <p className="text-xs text-gray-400 px-3 py-4 text-center">No intents yet</p>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* User section */}
      <div className="p-3 border-t border-gray-200 relative">
        {/* Profile Menu Popover */}
        {profileMenuOpen && (
          <div className="absolute bottom-16 left-3 right-3 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-50 space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
            {/* Header info */}
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Account</p>
              <p className="text-sm font-medium text-gray-900 truncate mt-1">{user?.name ?? 'User'}</p>
              <p className="text-xs text-gray-400">{role === 'END_USER' ? 'End User' : role === 'REVIEWER' ? 'Reviewer' : 'Admin'}</p>
            </div>

            {/* Registry link */}
            <button
              onClick={() => {
                router.push('/registry');
                setProfileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <Archive className="w-4 h-4 text-gray-400" />
              <span>Intent Registry</span>
            </button>

            {/* Review Queue link */}
            {(role === 'ADMIN' || role === 'REVIEWER') && (
              <button
                onClick={() => {
                  router.push('/reviews');
                  setProfileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <ClipboardCheck className="w-4 h-4 text-gray-400" />
                <span>Review Queue</span>
              </button>
            )}

            {/* Admin Panel link */}
            {role === 'ADMIN' && (
              <button
                onClick={() => {
                  router.push('/admin');
                  setProfileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <Shield className="w-4 h-4 text-gray-400" />
                <span>Admin Panel</span>
              </button>
            )}

            {/* API Key Copy */}
            {apiKey && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyKey();
                }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-gray-400" />
                  <span>Copy API Key</span>
                </div>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                    {apiKey.substring(0, 8)}...
                  </span>
                )}
              </button>
            )}

            {/* Separator */}
            <div className="border-t border-gray-100 my-1" />

            {/* Sign Out */}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* Footer click target */}
        <div
          onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          className={cn(
            'flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-gray-200 transition-colors',
            profileMenuOpen && 'bg-gray-200',
            collapsed && 'justify-center'
          )}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {(user?.name ?? 'U').charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 font-medium truncate">{user?.name ?? 'User'}</p>
              <p className="text-xs text-gray-400">{role === 'END_USER' ? 'End User' : role === 'REVIEWER' ? 'Reviewer' : 'Admin'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
