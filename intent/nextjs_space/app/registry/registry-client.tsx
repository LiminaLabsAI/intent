'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive, Search, Filter, Download, ChevronLeft, ChevronRight,
  Calendar, Tag, User, ArrowUpRight, SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { INTENT_STATUS_CONFIG } from '@/lib/types';

const STATUS_FILTERS = ['ALL', 'DRAFT', 'IN_PROGRESS', 'NEEDS_CLARIFICATION', 'UNDER_REVIEW', 'APPROVED', 'CONDITIONAL_APPROVAL', 'REJECTED', 'ARCHIVED'];

export function RegistryClient() {
  const router = useRouter();
  const [intents, setIntents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchIntents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/intents?${params}`);
      if (res.ok) {
        const data = await res.json();
        setIntents(data?.intents ?? []);
        setTotal(data?.total ?? 0);
      }
    } catch (e) {
      console.error('Failed to fetch intents:', e);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchIntents();
  }, [fetchIntents]);

  const handleExport = () => {
    const csv = [
      ['Intent ID', 'Status', 'Type', 'Raw Input', 'Requester', 'Created', 'Domain'].join(','),
      ...(intents ?? []).map((i: any) => [
        i?.intentId ?? '',
        i?.status ?? '',
        i?.intentType ?? '',
        `"${(i?.rawInput ?? '').replace(/"/g, '""')}"`,
        i?.requester?.name ?? '',
        i?.createdAt ?? '',
        i?.businessDomain ?? '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'intent-registry.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / 15) || 1;

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Archive className="w-5 h-5 text-blue-500" />
            <div>
              <h1 className="text-lg font-display font-semibold text-gray-900">Intent Registry</h1>
              <p className="text-xs text-gray-400">Central repository of all intents with full lineage</p>
            </div>
          </div>
          <Button onClick={handleExport} variant="outline" size="sm" className="border-gray-200 text-gray-500 hover:text-gray-700">
            <Download className="w-3 h-3 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search intents..."
              className="pl-10 bg-white border-gray-200 text-gray-800 placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {STATUS_FILTERS.map((s: string) => {
              const config = s === 'ALL' ? null : INTENT_STATUS_CONFIG[s as keyof typeof INTENT_STATUS_CONFIG];
              return (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    statusFilter === s
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {config?.label ?? 'All'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-4">
          <div className="space-y-2">
            {(intents ?? []).map((intent: any) => {
              const sConfig = INTENT_STATUS_CONFIG[intent?.status as keyof typeof INTENT_STATUS_CONFIG];
              return (
                <button
                  key={intent?.id}
                  onClick={() => router.push(`/intent/${intent?.id}`)}
                  className="w-full text-left bg-white hover:bg-gray-50 border border-gray-200 hover:border-blue-200 rounded-xl p-4 transition-all group shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {intent?.intentId && (
                          <span className="font-mono text-blue-600 text-sm">{intent.intentId}</span>
                        )}
                        <span className={cn('px-2 py-0.5 rounded-full text-xs', sConfig?.bgColor, sConfig?.color)}>
                          {sConfig?.label ?? intent?.status}
                        </span>
                        {intent?.intentType && (
                          <Badge variant="outline" className="text-xs border-gray-200 text-gray-500">
                            {intent.intentType}
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-800 text-sm truncate pr-4">{intent?.rawInput}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {intent?.requester?.name}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(intent?.createdAt).toLocaleDateString('en-US', { timeZone: 'UTC' })}</span>
                        <span>Stage {intent?.currentStage ?? 1}/7</span>
                        {intent?.confidenceScore && <span>Confidence: {((intent.confidenceScore ?? 0) * 100).toFixed(0)}%</span>}
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1" />
                  </div>
                </button>
              );
            })}
            {(intents?.length ?? 0) === 0 && !loading && (
              <div className="text-center py-16">
                <Archive className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400">No intents found</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Pagination */}
      <div className="border-t border-gray-200 px-6 py-3 flex items-center justify-between">
        <p className="text-xs text-gray-400">{total} intent{total !== 1 ? 's' : ''}</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" disabled={page <= 1} onClick={() => setPage(page - 1)} className="text-gray-400">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
          <Button variant="ghost" size="icon-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="text-gray-400">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
