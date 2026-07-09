'use client';

import { useState, useEffect } from 'react';
import {
  Shield, Users, BarChart3, FileText, Clock, AlertTriangle,
  CheckCircle2, XCircle, TrendingUp, Loader2, UserCog, Code, Cpu
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

type TabType = 'status' | 'users' | 'intents' | 'settings' | 'api';

export function AdminClient() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('status');

  // LLM Settings State
  const [provider, setProvider] = useState<string>('abacusai');
  const [apiKey, setApiKey] = useState<string>('');
  const [endpoint, setEndpoint] = useState<string>('');
  const [modelId, setModelId] = useState<string>('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    Promise.all([fetchStats(), fetchUsers(), fetchSettings()]).finally(() => setLoading(false));
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

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setProvider(data?.settings?.provider ?? 'abacusai');
        setApiKey(data?.settings?.apiKey ?? '');
        setEndpoint(data?.settings?.endpoint ?? '');
        setModelId(data?.settings?.modelId ?? '');
      }
    } catch (e) {
      console.error('Settings error:', e);
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsSaved(false);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, endpoint, modelId }),
      });
      if (res.ok) {
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2000);
      }
    } catch (e) {
      console.error('Save settings error:', e);
    } finally {
      setSettingsSaving(false);
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
      {/* Header */}
      <div className="border-b border-gray-200 px-6 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-indigo-500" />
          <div>
            <h1 className="text-lg font-display font-semibold text-gray-900">Administration</h1>
            <p className="text-xs text-gray-400">System overview and user management</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-gray-200 -mx-6 px-6">
          <button
            onClick={() => setActiveTab('status')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-[2px]',
              activeTab === 'status'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <BarChart3 className="w-4 h-4" />
            Status Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-[2px]',
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <UserCog className="w-4 h-4" />
            User Management
          </button>
          <button
            onClick={() => setActiveTab('intents')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-[2px]',
              activeTab === 'intents'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <TrendingUp className="w-4 h-4" />
            Recent Intents
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-[2px]',
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <Cpu className="w-4 h-4" />
            LLM Settings
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-[2px]',
              activeTab === 'api'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <Code className="w-4 h-4" />
            API Reference
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {activeTab === 'status' && (
            <div className="space-y-6 max-w-5xl">
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
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm max-w-5xl">
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
          )}

          {activeTab === 'intents' && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm max-w-5xl">
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
          )}

          {activeTab === 'settings' && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Cpu className="w-5 h-5 text-blue-500" />
                <div>
                  <h2 className="text-gray-900 font-semibold text-base">LLM Provider Configuration</h2>
                  <p className="text-xs text-gray-400">Configure global model pipeline integration settings</p>
                </div>
              </div>

              <form onSubmit={saveSettings} className="space-y-5">
                {/* Select Provider */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">LLM Provider</label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger className="w-full bg-white border-gray-200 text-gray-700 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="abacusai" className="text-gray-700">AbacusAI completions API</SelectItem>
                      <SelectItem value="huggingface" className="text-gray-700">Hugging Face Serverless / Inference Endpoints</SelectItem>
                      <SelectItem value="ollama" className="text-gray-700">Local Ollama API (Offline)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* API Token / Key */}
                {provider !== 'ollama' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      {provider === 'abacusai' ? 'AbacusAI API Key' : 'Hugging Face API Token'}
                    </label>
                    <input
                      type="password"
                      placeholder={provider === 'abacusai' ? 's2_...' : 'hf_...'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                    />
                  </div>
                )}

                {/* Model ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    {provider === 'ollama' ? 'Ollama Model Name' : 'Hugging Face Model ID'}
                  </label>
                  <input
                    type="text"
                    placeholder={provider === 'ollama' ? 'llama3.1' : 'meta-llama/Llama-3.1-8B-Instruct'}
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  />
                  <p className="text-[10px] text-gray-400">
                    {provider === 'ollama' ? 'The model installed locally (e.g. llama3.1, qwen2.5:7b).' : 'Ensure the specified repository exists on HF Hub.'}
                  </p>
                </div>

                {/* Custom Endpoint URL */}
                {provider !== 'abacusai' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Custom Endpoint URL (Optional)</label>
                    <input
                      type="text"
                      placeholder={provider === 'ollama' ? 'http://localhost:11434/v1/chat/completions' : 'https://api-inference.huggingface.co/models/...'}
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                    />
                    <p className="text-[10px] text-gray-400">Leave blank to default to standard service endpoints.</p>
                  </div>
                )}

                {/* Submit button */}
                <div className="flex items-center gap-3 pt-3">
                  <Button type="submit" disabled={settingsSaving} className="bg-blue-600 hover:bg-blue-700 text-white text-sm">
                    {settingsSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Configuration
                  </Button>

                  {settingsSaved && (
                    <div className="flex items-center gap-1.5 text-green-600 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      Settings Saved successfully
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm max-w-5xl">
              <div className="flex items-center gap-2 mb-4">
                <Code className="w-4 h-4 text-indigo-500" />
                <h2 className="text-gray-900 font-medium">API Integration Reference</h2>
              </div>
              <div className="prose prose-sm max-w-none text-gray-600 space-y-4">
                <p className="text-sm">
                  Expose REST endpoints to programmatically manage and submit intents from external services or agents.
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <p className="font-semibold text-xs text-gray-700 mb-2">Authentication Headers</p>
                  <code className="block bg-gray-900 text-gray-100 rounded p-2 text-xs font-mono">
                    Authorization: Bearer key_admin_sarah
                  </code>
                  <span className="text-[10px] text-gray-400 mt-1 block">Or use the <code className="font-mono text-gray-600 bg-gray-150 px-1 rounded">x-api-key</code> header directly.</span>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 space-y-2">
                  <p className="font-semibold text-xs text-gray-700">1. Submit a New Intent</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">POST</span>
                    <span className="font-mono text-gray-800">/api/intents</span>
                  </div>
                  <pre className="bg-gray-900 text-gray-100 rounded p-3 text-xs font-mono overflow-x-auto">
{`curl -X POST http://localhost:3000/api/intents \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: key_admin_sarah" \\
  -d '{"rawInput": "Provision a new S3 bucket named dev-uploads", "priority": "MEDIUM"}'`}
                  </pre>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 space-y-2">
                  <p className="font-semibold text-xs text-gray-700">2. Trigger Processing Pipeline (Streams SSE)</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">POST</span>
                    <span className="font-mono text-gray-800">/api/intents/[id]/process</span>
                  </div>
                  <pre className="bg-gray-900 text-gray-100 rounded p-3 text-xs font-mono overflow-x-auto">
{`curl -X POST http://localhost:3000/api/intents/[id]/process \\
  -H "x-api-key: key_admin_sarah"`}
                  </pre>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 space-y-2">
                  <p className="font-semibold text-xs text-gray-700">3. Document Parsing Endpoint</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">POST</span>
                    <span className="font-mono text-gray-800">/api/intents/parse-document</span>
                  </div>
                  <pre className="bg-gray-900 text-gray-100 rounded p-3 text-xs font-mono overflow-x-auto">
{`curl -X POST http://localhost:3000/api/intents/parse-document \\
  -H "x-api-key: key_admin_sarah" \\
  -F "file=@requirements.pdf"`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
