'use client';

import { useState, useEffect } from 'react';
import {
  Shield, Users, BarChart3, FileText, Clock, AlertTriangle,
  CheckCircle2, XCircle, TrendingUp, Loader2, UserCog
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { INTENT_STATUS_CONFIG } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function AdminClient() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchStats(), fetchUsers()]).finally(() => setLoading(false));
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Stats error:', e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data ?? []);
      }
    } catch (e) {
      console.error('Users error:', e);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingUser(userId);
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      fetchUsers();
    } catch (e) {
      console.error('Role update error:', e);
    } finally {
      setUpdatingUser(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Intents', value: stats?.totalIntents ?? 0, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { label: 'Pending Reviews', value: stats?.pendingReviews ?? 0, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Approved', value: stats?.statusMap?.APPROVED ?? 0, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
  ];

  return (
    <div className="h-screen bg-white flex flex-col">
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-indigo-500" />
          <div>
            <h1 className="text-lg font-display font-semibold text-gray-900">Administration</h1>
            <p className="text-xs text-gray-400">System overview and user management</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card: any) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', card.bg)}>
                      <Icon className={cn('w-5 h-5', card.color)} />
                    </div>
                  </div>
                  <p className="text-2xl font-display font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{card.label}</p>
                </div>
              );
            })}
          </div>

          {/* Status Breakdown */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              <h2 className="text-gray-900 font-medium">Status Distribution</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(stats?.statusMap ?? {}).map(([status, count]: [string, any]) => {
                const config = INTENT_STATUS_CONFIG[status as keyof typeof INTENT_STATUS_CONFIG];
                return (
                  <div key={status} className={cn('rounded-lg p-3 bg-gray-50')}>
                    <p className={cn('text-lg font-bold', config?.color ?? 'text-gray-900')}>{count}</p>
                    <p className="text-xs text-gray-500">{config?.label ?? status}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Management */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <UserCog className="w-4 h-4 text-indigo-500" />
              <h2 className="text-gray-900 font-medium">User Management</h2>
            </div>
            <div className="space-y-3">
              {(users ?? []).map((u: any) => (
                <div key={u?.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                      {(u?.name ?? 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-gray-900">{u?.name}</p>
                      <p className="text-xs text-gray-400">{u?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-400">
                      {u?._count?.intents ?? 0} intents · {u?._count?.reviewTasks ?? 0} reviews
                    </div>
                    <Select
                      value={u?.role ?? 'END_USER'}
                      onValueChange={(val: string) => handleRoleChange(u?.id, val)}
                    >
                      <SelectTrigger className="w-32 bg-white border-gray-200 text-gray-700 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="END_USER" className="text-gray-700">End User</SelectItem>
                        <SelectItem value="REVIEWER" className="text-gray-700">Reviewer</SelectItem>
                        <SelectItem value="ADMIN" className="text-gray-700">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <h2 className="text-gray-900 font-medium">Recent Intents</h2>
            </div>
            <div className="space-y-2">
              {(stats?.recentIntents ?? []).map((intent: any) => {
                const config = INTENT_STATUS_CONFIG[intent?.status as keyof typeof INTENT_STATUS_CONFIG];
                return (
                  <div key={intent?.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{intent?.rawInput}</p>
                      <p className="text-xs text-gray-400">{intent?.requester?.name} · {new Date(intent?.createdAt).toLocaleDateString('en-US', { timeZone: 'UTC' })}</p>
                    </div>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs ml-4', config?.bgColor, config?.color)}>
                      {config?.label ?? intent?.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
