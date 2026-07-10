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

  const activityFeed = [
    ...(intent?.comments || []).map((c: any) => ({ ...c, type: 'COMMENT' })),
    ...(intent?.auditLogs || []).map((a: any) => ({ ...a, type: 'AUDIT' }))
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon-sm" onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-700">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-display font-semibold text-gray-900">
                  {intent?.intentId ? <span className="font-mono text-blue-600 mr-2">{intent.intentId}</span> : null}
                  Intent Discussion
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

      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Activity Feed (Chat) */}
        <div className="flex-1 flex flex-col border-r border-gray-200 bg-gray-50/50">
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6 max-w-3xl mx-auto w-full">
              {/* Initial Prompt Bubble */}
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">{intent?.requester?.name ?? 'User'}</span>
                    <span className="text-xs text-gray-400">{new Date(intent?.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 shadow-sm inline-block">
                    {intent?.rawInput}
                  </div>
                </div>
              </div>

              {activityFeed.map((item: any) => {
                if (item.type === 'AUDIT') {
                  return (
                    <div key={item.id} className="flex justify-center my-4">
                      <div className="bg-white border border-gray-100 shadow-sm rounded-full px-4 py-1.5 flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        <span>{(item.action ?? '').replace(/_/g, ' ')}</span>
                        {item.stage && <span className="text-gray-400 ml-1">(Stage {item.stage})</span>}
                        <span className="text-gray-300 ml-2">{new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  );
                }

                // Chat Comment
                const isSystem = item.user?.role === 'SYSTEM' || !item.user;
                return (
                  <div key={item.id} className="flex gap-4">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", isSystem ? "bg-indigo-100" : "bg-blue-100")}>
                      {isSystem ? <FlowIcon className="w-4 h-4 text-indigo-600" /> : <User className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">{item.user?.name ?? 'System'}</span>
                        <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <div className={cn("border rounded-2xl rounded-tl-sm px-4 py-3 text-sm shadow-sm inline-block",
                        isSystem ? "bg-indigo-50/50 border-indigo-100 text-indigo-900" : "bg-white border-gray-200 text-gray-800"
                      )}>
                        {item.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          
          {/* Chat Input */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="max-w-3xl mx-auto flex gap-3">
              <Input
                placeholder="Type a message or clarify the intent..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}
                className="flex-1 rounded-full bg-gray-50 border-gray-200 focus-visible:ring-blue-500"
                disabled={submittingComment}
              />
              <Button 
                size="icon" 
                className="rounded-full bg-blue-600 hover:bg-blue-700 h-10 w-10 flex-shrink-0"
                onClick={handleAddComment}
                disabled={submittingComment || !comment.trim()}
              >
                {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar Data */}
        <div className="w-[400px] flex flex-col bg-white overflow-hidden flex-shrink-0">
          <ScrollArea className="flex-1 p-5">
            <div className="space-y-6">
              
              {/* Metadata */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider text-xs">Intent Context</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{new Date(intent?.createdAt).toLocaleDateString('en-US', { timeZone: 'UTC' })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <span>{intent?.priority ?? 'MEDIUM'} Priority</span>
                  </div>
                  {intent?.businessDomain && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span>{intent.businessDomain}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Review Tasks */}
              {(intent?.reviewTasks?.length ?? 0) > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider text-xs">Review Tasks</h3>
                  <div className="space-y-3">
                    {(intent.reviewTasks ?? []).map((task: any) => (
                      <div key={task?.id} className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-gray-800">{task?.assignee?.name ?? 'Unassigned'}</p>
                          {task?.decision ? (
                            <Badge variant={task.decision === 'APPROVE' ? 'default' : 'destructive'} className="text-[10px] px-1.5 py-0">
                              {task.decision}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-orange-500 border-orange-300 text-[10px] px-1.5 py-0">Pending</Badge>
                          )}
                        </div>
                        {task?.reason && <p className="text-xs text-gray-500">{task.reason}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lifecycle Stages */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider text-xs">Lifecycle Data</h3>
                  <button onClick={() => toggleSection('stages')} className="text-gray-400 hover:text-gray-600">
                    {expandedSections?.stages ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
                
                {expandedSections?.stages && (
                  <div className="space-y-3">
                    {stageData.map((stage: any) => {
                      const Icon = STAGE_ICONS[stage?.stage ?? 1];
                      const hasData = stage?.completed && stage?.data && Object.values(stage.data ?? {}).some((v: any) => v !== null && v !== undefined);
                      
                      return (
                        <div key={stage.stage} className={cn(
                          'rounded-lg border p-3',
                          stage.completed ? 'border-gray-200 bg-gray-50' : 'border-gray-100 bg-transparent opacity-40'
                        )}>
                          <div className="flex items-center gap-2">
                            <Icon className={cn('w-4 h-4', stage.completed ? 'text-blue-500' : 'text-gray-300')} />
                            <span className="text-xs font-medium text-gray-800 flex-1">{stage.name}</span>
                            {stage.completed && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                          </div>
                          
                          {hasData && (
                            <div className="mt-2 pl-6 space-y-1 border-l-2 border-gray-100 ml-2">
                              {Object.entries(stage.data ?? {}).filter(([_, v]: [string, any]) => v !== null && v !== undefined).map(([key, value]: [string, any]) => (
                                <div key={key} className="text-xs">
                                  <span className="text-gray-400 font-mono text-[10px] block mb-0.5">{key}</span>
                                  <span className="text-gray-700 break-words">
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

            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
