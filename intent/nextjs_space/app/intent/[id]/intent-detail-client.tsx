'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Target, Layers, Zap, FileCheck, Scale, Hash, Clock,
  CheckCircle2, XCircle, AlertTriangle, MessageSquare, Send,
  ChevronDown, ChevronUp, ArrowLeft, Shield, BarChart3,
  User, Calendar, Tag, Globe, Loader2, Archive, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FlowIcon } from '@/components/flow-logo';
import { cn } from '@/lib/utils';
import { INTENT_STATUS_CONFIG, STAGE_NAMES } from '@/lib/types';

const STAGE_ICONS: Record<number, any> = {
  1: Target, 2: Layers, 3: Zap, 4: Zap, 5: FileCheck, 6: Scale, 7: Hash,
};

export function IntentDetailClient({ intentId }: { intentId: string }) {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [intent, setIntent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ stages: true, audit: false, comments: true });
  const [reprocessing, setReprocessing] = useState(false);

  useEffect(() => {
    if (intentId) fetchIntent();
  }, [intentId]);

  const fetchIntent = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/intents/${intentId}`);
      if (res.ok) {
        const data = await res.json();
        setIntent(data);
      }
    } catch (e) {
      console.error('Failed to fetch intent:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment?.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/intents/${intentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: comment }),
      });
      if (res.ok) {
        setComment('');
        fetchIntent();
      }
    } catch (e) {
      console.error('Failed to add comment:', e);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReprocess = async () => {
    setReprocessing(true);
    try {
      await fetch(`/api/intents/${intentId}/process`, { method: 'POST' });
      await fetchIntent();
    } catch (e) {
      console.error('Reprocess error:', e);
    } finally {
      setReprocessing(false);
    }
  };

  const handleArchive = async () => {
    try {
      await fetch(`/api/intents/${intentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARCHIVED' }),
      });
      fetchIntent();
    } catch (e) {
      console.error('Archive error:', e);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev: any) => ({ ...(prev ?? {}), [section]: !prev?.[section] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!intent) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white">
        <XCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-gray-900 text-lg">Intent not found</p>
        <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mt-4 text-blue-600">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  const statusConfig = INTENT_STATUS_CONFIG[intent?.status as keyof typeof INTENT_STATUS_CONFIG];
  const user = session?.user as any;

  const stageData = [
    { stage: 1, name: 'Intent Capture', data: { rawInput: intent?.rawInput }, completed: (intent?.currentStage ?? 0) >= 1 },
    { stage: 2, name: 'Intent Parsing', data: { entities: intent?.entities, actions: intent?.actions, scope: intent?.scope, businessDomain: intent?.businessDomain, initialContext: intent?.initialContext }, completed: (intent?.currentStage ?? 0) >= 2 },
    { stage: 3, name: 'Semantic Understanding', data: { businessObjective: intent?.businessObjective, intentType: intent?.intentType, affectedAssets: intent?.affectedAssets, confidenceScore: intent?.confidenceScore }, completed: (intent?.currentStage ?? 0) >= 3 },
    { stage: 4, name: 'Intent Normalization', data: { standardizedIntent: intent?.standardizedIntent, ontologyMappings: intent?.ontologyMappings, domainAlignment: intent?.domainAlignment, normalizedScope: intent?.normalizedScope }, completed: (intent?.currentStage ?? 0) >= 4 },
    { stage: 5, name: 'Intent Quality Gate', data: { completenessScore: intent?.completenessScore, clarityScore: intent?.clarityScore, consistencyScore: intent?.consistencyScore, qualityGateResult: intent?.qualityGateResult, qualityGateDetails: intent?.qualityGateDetails }, completed: (intent?.currentStage ?? 0) >= 5 },
    { stage: 6, name: 'Approval Decision', data: { decisionOutcome: intent?.decisionOutcome, evidenceQuality: intent?.evidenceQuality, policyCompliance: intent?.policyCompliance, riskLevel: intent?.riskLevel, delegationPolicy: intent?.delegationPolicy, autonomyEligible: intent?.autonomyEligible, decisionDetails: intent?.decisionDetails }, completed: (intent?.currentStage ?? 0) >= 6 },
    { stage: 7, name: 'Intent ID Creation', data: { intentId: intent?.intentId, approvedAt: intent?.approvedAt, linkedEvidence: intent?.linkedEvidence }, completed: (intent?.currentStage ?? 0) >= 7 },
  ];

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon-sm" onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-700">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-display font-semibold text-gray-900">
                  {intent?.intentId ? <span className="font-mono text-blue-600 mr-2">{intent.intentId}</span> : null}
                  Intent Detail
                </h1>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusConfig?.bgColor, statusConfig?.color)}>
                  {statusConfig?.label}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Version {intent?.version ?? 1} · Stage {intent?.currentStage ?? 1}/7</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {intent?.status === 'DRAFT' && (
              <Button onClick={handleReprocess} disabled={reprocessing} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                {reprocessing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
                Process
              </Button>
            )}
            {['APPROVED', 'REJECTED', 'CONDITIONAL_APPROVAL'].includes(intent?.status) && (
              <Button onClick={handleArchive} variant="outline" size="sm" className="border-gray-200 text-gray-500 hover:text-gray-700">
                <Archive className="w-3 h-3 mr-1" /> Archive
              </Button>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          {/* Raw Input */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-400 mb-1">Original Intent</p>
                <p className="text-gray-900">{intent?.rawInput}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><User className="w-3 h-3" /> {intent?.requester?.name}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(intent?.createdAt).toLocaleDateString('en-US', { timeZone: 'UTC' })}</span>
              <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {intent?.priority ?? 'MEDIUM'}</span>
              {intent?.businessDomain && <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {intent.businessDomain}</span>}
            </div>
          </div>

          {/* Stage Progress */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => toggleSection('stages')} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <span className="text-gray-900 font-medium">Lifecycle Stages</span>
              </div>
              {expandedSections?.stages ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {expandedSections?.stages && (
              <div className="px-5 pb-5 space-y-3">
                {/* Progress bar */}
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5, 6, 7].map((s: number) => (
                    <div key={s} className={cn(
                      'h-1.5 flex-1 rounded-full transition-colors',
                      s <= (intent?.currentStage ?? 0) ? 'bg-blue-500' : 'bg-gray-100'
                    )} />
                  ))}
                </div>
                {stageData.map((stage: any) => {
                  const Icon = STAGE_ICONS[stage?.stage ?? 1];
                  const hasData = stage?.completed && stage?.data && Object.values(stage.data ?? {}).some((v: any) => v !== null && v !== undefined);
                  return (
                    <div key={stage.stage} className={cn(
                      'rounded-lg border p-4',
                      stage.completed ? 'border-gray-200 bg-gray-50' : 'border-gray-100 bg-transparent opacity-40'
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center',
                          stage.completed ? 'bg-blue-50' : 'bg-gray-100'
                        )}>
                          <Icon className={cn('w-4 h-4', stage.completed ? 'text-blue-500' : 'text-gray-300')} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-800">Stage {stage.stage}: {stage.name}</span>
                            {stage.completed && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                          </div>
                        </div>
                      </div>
                      {hasData && (
                        <div className="mt-3 ml-11 space-y-1.5">
                          {Object.entries(stage.data ?? {}).filter(([_, v]: [string, any]) => v !== null && v !== undefined).map(([key, value]: [string, any]) => (
                            <div key={key} className="flex gap-2 text-sm">
                              <span className="text-gray-400 font-mono text-xs min-w-[140px]">{key}:</span>
                              <span className="text-gray-600 text-xs">
                                {Array.isArray(value) ? (value ?? []).map((v: any) => String(v ?? '')).join(', ') :
                                 typeof value === 'object' && value !== null ? JSON.stringify(value) :
                                 typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
                                 typeof value === 'number' ? (value as number)?.toFixed?.(2) ?? '0' :
                                 String(value ?? '')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Review Tasks */}
          {(intent?.reviewTasks?.length ?? 0) > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-orange-500" />
                <span className="text-gray-900 font-medium">Review Tasks</span>
              </div>
              <div className="space-y-3">
                {(intent.reviewTasks ?? []).map((task: any) => (
                  <div key={task?.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-800">Assigned to: {task?.assignee?.name ?? 'Unassigned'}</p>
                        <p className="text-xs text-gray-400">SLA: {task?.slaDeadline ? new Date(task.slaDeadline).toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'N/A'}</p>
                      </div>
                      {task?.decision ? (
                        <Badge variant={task.decision === 'APPROVE' ? 'default' : 'destructive'}>
                          {task.decision}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-500 border-orange-300">Pending</Badge>
                      )}
                    </div>
                    {task?.reason && <p className="text-sm text-gray-500 mt-2">{task.reason}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => toggleSection('comments')} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <span className="text-gray-900 font-medium">Comments ({intent?.comments?.length ?? 0})</span>
              </div>
              {expandedSections?.comments ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {expandedSections?.comments && (
              <div className="px-5 pb-5">
                <div className="space-y-3 mb-4">
                  {(intent?.comments ?? []).map((c: any) => (
                    <div key={c?.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-800">{c?.user?.name ?? 'Unknown'}</span>
                        <span className="text-xs text-gray-400">{c?.user?.role}</span>
                        <span className="text-xs text-gray-300">{new Date(c?.createdAt).toLocaleDateString('en-US', { timeZone: 'UTC' })}</span>
                      </div>
                      <p className="text-sm text-gray-600">{c?.content}</p>
                    </div>
                  ))}
                  {(intent?.comments?.length ?? 0) === 0 && (
                    <p className="text-sm text-gray-400 text-center py-3">No comments yet</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={comment}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="bg-white border-gray-200 text-gray-800 placeholder:text-gray-400"
                    onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') handleAddComment(); }}
                  />
                  <Button onClick={handleAddComment} disabled={submittingComment || !comment?.trim()} size="icon" className="bg-blue-600 hover:bg-blue-700 text-white">
                    {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Audit Log */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => toggleSection('audit')} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span className="text-gray-900 font-medium">Audit Trail ({intent?.auditLogs?.length ?? 0})</span>
              </div>
              {expandedSections?.audit ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {expandedSections?.audit && (
              <div className="px-5 pb-5">
                <div className="space-y-2">
                  {(intent?.auditLogs ?? []).map((log: any) => (
                    <div key={log?.id} className="flex items-center gap-3 text-sm py-2 border-b border-gray-100 last:border-0">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-gray-700">{(log?.action ?? '').replace(/_/g, ' ')}</span>
                        {log?.stage && <span className="text-gray-400 ml-2">Stage {log.stage}</span>}
                      </div>
                      <span className="text-xs text-gray-300">{new Date(log?.createdAt).toLocaleDateString('en-US', { timeZone: 'UTC' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
