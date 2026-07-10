'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Send, Loader2, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronUp, Zap, Shield, Target, Layers, FileCheck,
  Scale, Hash, Clock, ArrowRight, Paperclip, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FlowIcon } from '@/components/flow-logo';
import { cn } from '@/lib/utils';
import { STAGE_NAMES, INTENT_STATUS_CONFIG } from '@/lib/types';

interface StageResult {
  stage: number;
  stageName: string;
  status: 'processing' | 'completed' | 'failed';
  data?: any;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'system' | 'assistant' | 'pipeline';
  content: string;
  intentId?: string;
  dbId?: string;
  stages?: StageResult[];
  finalIntent?: any;
  error?: string;
  timestamp: string;
  needsClarification?: boolean;
  clarifyingQuestions?: string[];
  similarIntents?: any[];
}

const STAGE_ICONS: Record<number, any> = {
  1: Target,
  2: Layers,
  3: Zap,
  4: Zap,
  5: FileCheck,
  6: Scale,
  7: Hash,
};

export function ChatInterface() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const searchParams = useSearchParams();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [pendingClarificationId, setPendingClarificationId] = useState<string | null>(null);
  const [pendingClarificationQuestions, setPendingClarificationQuestions] = useState<string[]>([]);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const [showExecutionPayload, setShowExecutionPayload] = useState<Record<string, boolean>>({});
  const [activeFormat, setActiveFormat] = useState<Record<string, 'human' | 'json' | 'md' | 'okf'>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [parsedText, setParsedText] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachedFile(file);
    setIsParsing(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/intents/parse-document', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Failed to parse document');
      }

      const data = await res.json();
      setParsedText(data.content || '');
    } catch (err: any) {
      console.error(err);
      setMessages((prev: any) => [
        ...(prev ?? []),
        {
          id: `err-${Date.now()}`,
          type: 'system',
          content: `Error reading file "${file.name}": ${err.message || 'Unknown error'}`,
          timestamp: new Date().toISOString(),
        },
      ]);
      clearAttachment();
    } finally {
      setIsParsing(false);
    }
  };

  const clearAttachment = () => {
    setAttachedFile(null);
    setParsedText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, processing]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleStage = (messageId: string, stageNum: number) => {
    const key = `${messageId}-${stageNum}`;
    setExpandedStages((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const processIntentStream = async (dbId: string, systemMsgId: string) => {
    setProcessing(true);
    try {
      const processRes = await fetch(`/api/intents/${dbId}/process`, {
        method: 'POST',
      });

      if (!processRes.ok) {
        throw new Error('Failed to start processing');
      }

      const reader = processRes.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let partialRead = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        partialRead += decoder.decode(value, { stream: true });
        const lines = partialRead.split('\n');
        partialRead = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            try {
              const event = JSON.parse(dataStr);

              if (event?.type === 'stage_start') {
                setMessages((prev: any) => {
                  const msgs = [...(prev ?? [])];
                  const sysMsg = msgs.find((m: any) => m?.id === systemMsgId2);
                  if (sysMsg) {
                    const exists = sysMsg.stages?.some((s: any) => s?.stage === event?.stage);
                    if (!exists) {
                      sysMsg.stages = [
                        ...(sysMsg.stages ?? []),
                        { stage: event.stage, stageName: event.stageName, status: 'processing' as const },
                      ];
                    } else {
                      sysMsg.stages = sysMsg.stages?.map((s: any) =>
                        s?.stage === event?.stage ? { ...s, status: 'processing' as const } : s
                      );
                    }
                    sysMsg.content = event?.message ?? 'Processing...';
                  }
                  return msgs;
                });
              } else if (event?.type === 'stage_complete') {
                setMessages((prev: any) => {
                  const msgs = [...(prev ?? [])];
                  const sysMsg = msgs.find((m: any) => m?.id === systemMsgId2);
                  if (sysMsg) {
                    const stageIdx = sysMsg.stages?.findIndex((s: any) => s?.stage === event?.stage);
                    if (stageIdx !== undefined && stageIdx >= 0 && sysMsg.stages?.[stageIdx]) {
                      sysMsg.stages[stageIdx].status = 'completed';
                      sysMsg.stages[stageIdx].data = event?.data;
                    }
                  }
                  return msgs;
                });
                setExpandedStages((prev) => ({
                  ...prev,
                  [`${systemMsgId}-${event.stage}`]: true,
                }));
              } else if (event?.type === 'needs_clarification') {
                setMessages((prev: any) => {
                  const msgs = [...(prev ?? [])];
                  const sysMsg = msgs.find((m: any) => m?.id === systemMsgId2);
                  if (sysMsg) {
                    sysMsg.content = 'Ambiguity detected. Waiting for clarification.';
                  }
                  
                  const astMsg = {
                    id: `msg-ast-${Date.now()}`,
                    type: 'assistant',
                    content: 'I noticed some ambiguity in your request. Please clarify:\n' + (event.questions || []).map((q: string, i: number) => `${i+1}. ${q}`).join('\n'),
                    timestamp: new Date().toISOString(),
                    needsClarification: true,
                    clarifyingQuestions: event.questions,
                    similarIntents: event.similarIntents,
                    dbId: dbId
                  };
                  return [...msgs, astMsg];
                });
                setPendingClarificationId(dbId);
                setPendingClarificationQuestions(event.questions || []);
              } else if (event?.type === 'pipeline_complete') {
                setMessages((prev: any) => {
                  const msgs = [...(prev ?? [])];
                  const sysMsg = msgs.find((m: any) => m?.id === systemMsgId2);
                  if (sysMsg) {
                    sysMsg.content = 'Pipeline completed!';
                  }
                  
                  const astMsg = {
                    id: `msg-ast-${Date.now()}`,
                    type: 'assistant',
                    content: 'Your intent has been successfully processed and approved!',
                    finalIntent: event?.data,
                    intentId: event?.data?.id,
                    timestamp: new Date().toISOString()
                  };
                  return [...msgs, astMsg];
                });
                setExpandedStages({});
              } else if (event?.type === 'error') {
                setMessages((prev: any) => {
                  const msgs = [...(prev ?? [])];
                  const sysMsg = msgs.find((m: any) => m?.id === systemMsgId2);
                  if (sysMsg) {
                    sysMsg.error = event?.message ?? 'Processing error';
                    if (event?.stage) {
                      const stageIdx = sysMsg.stages?.findIndex((s: any) => s?.stage === event?.stage);
                      if (stageIdx !== undefined && stageIdx >= 0 && sysMsg.stages?.[stageIdx]) {
                        sysMsg.stages[stageIdx].status = 'failed';
                      }
                    }
                  }
                  return msgs;
                });
              }
            } catch (e) {
              // skip
            }
          }
        }
      }
    } catch (error: any) {
      setMessages((prev: any) => {
        const msgs = [...(prev ?? [])];
        const sysMsg = msgs.find((m: any) => m?.id === systemMsgId2);
        if (sysMsg) {
          sysMsg.error = error?.message ?? 'Failed to process intent';
        }
        return msgs;
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed && !parsedText) return;

    let rawInputText = trimmed;
    if (attachedFile && parsedText) {
      if (trimmed) {
        rawInputText = `Document: ${attachedFile.name}\n---\n${parsedText}\n---\n\nUser Request: ${trimmed}`;
      } else {
        rawInputText = `Document: ${attachedFile.name}\n---\n${parsedText}\n---`;
      }
    }

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: rawInputText,
      timestamp: new Date().toISOString(),
    };

    const systemMsgId = `msg-${Date.now() + 1}`;
    
    if (pendingClarificationId) {
      // Handle clarification
      const systemMsg: ChatMessage = {
      id: systemMsgId2,
      type: 'pipeline',
      content: 'Processing intent through the lifecycle pipeline...',
      stages: [{ stage: 1, stageName: 'Intent Capture', status: 'completed', data: { rawInput: rawInputText } }],
      timestamp: new Date().toISOString(),
    };

    setMessages((prev: any) => [...(prev ?? []), userMsg, systemMsg]);
    setInput('');
    clearAttachment();
    setProcessing(true);

    try {
      const createRes = await fetch('/api/intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: rawInputText }),
      });

      if (!createRes.ok) {
        throw new Error('Failed to create intent');
      }

      const intent = await createRes.json();
      setMessages((prev: any) => {
        const msgs = [...(prev ?? [])];
        const sysMsg = msgs.find((m: any) => m?.id === systemMsgId2);
        if (sysMsg) {
          sysMsg.dbId = intent?.id;
        }
        return msgs;
      });

      await processIntentStream(intent?.id, systemMsgId);
    } catch (error: any) {
      setMessages((prev: any) => {
        const msgs = [...(prev ?? [])];
        const sysMsg = msgs.find((m: any) => m?.id === systemMsgId2);
        if (sysMsg) {
          sysMsg.error = error?.message ?? 'Failed to process intent';
        }
        return msgs;
      });
      setProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const renderStageData = (data: any) => {
    if (!data) return null;
    return (
      <div className="space-y-2 text-sm">
        {Object.entries(data ?? {}).filter(([k]) => k !== 'similarIntents' && k !== 'similaritySummary').map(([key, value]: [string, any]) => (
          <div key={key} className="flex gap-2">
            <span className="text-gray-400 min-w-[120px] font-mono text-xs">{key}:</span>
            <span className="text-gray-700">
              {Array.isArray(value) ? (
                <span className="flex flex-wrap gap-1">
                  {(value ?? []).map((v: any, i: number) => (
                    <span key={i} className="bg-gray-100 px-2 py-0.5 rounded text-xs">{String(v ?? '')}</span>
                  ))}
                </span>
              ) : typeof value === 'object' && value !== null ? (
                <span className="font-mono text-xs">{JSON.stringify(value)}</span>
              ) : typeof value === 'boolean' ? (
                value ? <CheckCircle2 className="w-4 h-4 text-green-500 inline" /> : <XCircle className="w-4 h-4 text-red-500 inline" />
              ) : typeof value === 'number' ? (
                <span className="font-mono">{(value as number)?.toFixed?.(2) ?? '0'}</span>
              ) : (
                String(value ?? '')
              )}
            </span>
          </div>
        ))}
        {data.similarIntents && data.similarIntents.length > 0 && (
          <div className="mt-3 border-t border-gray-100 pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 block">Matching Past Intents:</span>
              {data.similaritySummary && (
                <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                  Found {data.similaritySummary.totalCount} ({data.similaritySummary.approvedCount} approved)
                </span>
              )}
            </div>

            {data.similaritySummary?.recommendation && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2.5 leading-relaxed font-sans">
                💡 <strong>LLM Recommendation:</strong> {data.similaritySummary.recommendation}
              </p>
            )}

            <div className="space-y-1.5 animate-fadeIn">
              {data.similarIntents.map((item: any) => (
                <div key={item.id} className="text-xs bg-gray-50 border border-gray-150 rounded px-2.5 py-1.5 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-blue-600 font-medium mr-1.5">{item.intentId || 'INT-NEW'}</span>
                    <span className="text-gray-700 truncate block sm:inline">{item.rawInput}</span>
                  </div>
                  <span className={cn(
                    'text-[10px] font-semibold ml-2 px-1.5 py-0.5 rounded',
                    item.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    item.status === 'NEEDS_CLARIFICATION' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  )}>{item.status.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <FlowIcon />
          <div>
            <h1 className="text-lg font-display font-semibold text-gray-900">Intent Processing</h1>
            <p className="text-xs text-gray-400">Submit natural language intents for automated lifecycle processing</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {(messages ?? []).length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-6">
                <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10">
                  <path d="M4 6C4 6 8 4 12 8C16 12 20 10 20 10" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                  <path d="M4 14C4 14 8 12 12 16C16 20 20 18 20 18" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
                </svg>
              </div>
              <h2 className="text-2xl font-display font-bold text-gray-900 mb-2 tracking-tight">Welcome to Flow</h2>
              <p className="text-gray-500 max-w-md mx-auto mb-8">
                Describe your intent in natural language. The system will process it through
                7 lifecycle stages — from capture to approved Intent ID.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
                {[
                  'Migrate customer database from legacy system to cloud',
                  'Generate quarterly sales performance report for Q2',
                  'Update access control policies for production servers',
                ].map((example: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setInput(example)}
                    className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-gray-800 transition-all text-left"
                  >
                    <ArrowRight className="w-3 h-3 text-blue-500 mb-1" />
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(messages ?? []).map((msg: ChatMessage) => (
            <div key={msg.id} className={cn('flex gap-3', msg.type === 'user' ? 'justify-end' : msg.type === 'pipeline' ? 'justify-center' : 'justify-start')}>
              {msg.type === 'assistant' && (
                <FlowIcon className="flex-shrink-0 mt-1" />
              )}
                    </div>

                    {/* Clarification is now handled as an assistant chat bubble */}
                    {/* Final result */}
                    {msg.finalIntent && (() => {
                      const payload = {
                        intentId: msg.finalIntent.intentId,
                        timestamp: msg.finalIntent.approvedAt || msg.finalIntent.createdAt,
                        action: msg.finalIntent.intentType || 'OTHER',
                        businessObjective: msg.finalIntent.businessObjective || '',
                        domain: msg.finalIntent.businessDomain || '',
                        scope: msg.finalIntent.normalizedScope || msg.finalIntent.scope || '',
                        entities: msg.finalIntent.entities || [],
                        actions: msg.finalIntent.actions || [],
                        parameters: msg.finalIntent.ontologyMappings || {},
                        detailedVision: msg.finalIntent.standardizedIntent || ''
                      };
                      const payloadStr = JSON.stringify(payload, null, 2);

                      const payloadMd = `# Intent Registration: ${msg.finalIntent.intentId}
- **Status**: ${msg.finalIntent.status}
- **Domain**: ${msg.finalIntent.businessDomain || 'N/A'}
- **Action Type**: ${msg.finalIntent.intentType || 'OTHER'}
- **Approved At**: ${msg.finalIntent.approvedAt ? new Date(msg.finalIntent.approvedAt).toLocaleString() : 'N/A'}

## Detailed Vision
${msg.finalIntent.standardizedIntent}

## Scope & Context
- **Scope**: ${msg.finalIntent.normalizedScope || msg.finalIntent.scope || 'N/A'}
- **Objective**: ${msg.finalIntent.businessObjective || 'N/A'}

## Entities
${(msg.finalIntent.entities || []).map((e: any) => `- ${e}`).join('\n')}`;

                      const payloadOkf = `[INTENT: ${msg.finalIntent.intentId}]
Domain    :: ${msg.finalIntent.businessDomain || 'N/A'}
Action    :: ${msg.finalIntent.intentType || 'OTHER'}
Objective :: ${msg.finalIntent.businessObjective || 'N/A'}
Scope     :: ${msg.finalIntent.normalizedScope || msg.finalIntent.scope || 'N/A'}
Entities  :: [${(msg.finalIntent.entities || []).join(', ')}]

[DETAILED VISION]
${msg.finalIntent.standardizedIntent}

[METADATA]
ApprovedAt:: ${msg.finalIntent.approvedAt || 'N/A'}
RiskLevel :: ${msg.finalIntent.riskLevel || 'N/A'}`;

                      const currentFormat = activeFormat[msg.id] ?? 'human';
                      const formattedText = currentFormat === 'json' ? payloadStr :
                                            currentFormat === 'md' ? payloadMd :
                                            currentFormat === 'okf' ? payloadOkf : '';

                      return (
                        <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-5 mt-4 space-y-4 animate-fadeIn">
                          <div className="flex items-center gap-2 pb-3 border-b border-blue-100/50">
                            <CheckCircle2 className="w-5 h-5 text-blue-600" />
                            <div>
                              <span className="font-semibold text-gray-900 text-sm block">Intent Approved & Registered</span>
                              <span className="text-[10px] text-gray-400">Created: {new Date(msg.finalIntent.createdAt).toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="space-y-3.5 text-sm">
                            {/* Intent ID */}
                            {msg.finalIntent.intentId && (
                              <div>
                                <span className="text-xs font-semibold text-gray-400 block uppercase tracking-wider">Intent ID</span>
                                <p className="font-mono text-blue-600 font-bold text-base mt-0.5">{msg.finalIntent.intentId}</p>
                              </div>
                            )}

                            {/* Detailed Vision & Format Tabs */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-400 block uppercase tracking-wider">Detailed Vision</span>
                              </div>

                              <div className="space-y-2">
                                {/* Format tabs */}
                                <div className="flex border-b border-gray-200">
                                  {([
                                    { id: 'human', label: 'Human Readable' },
                                    { id: 'json', label: 'JSON Payload' },
                                    { id: 'md', label: '.MD (Markdown)' },
                                    { id: 'okf', label: 'OKF (Ontology)' },
                                  ] as const).map((tab) => (
                                    <button
                                      key={tab.id}
                                      type="button"
                                      onClick={() => setActiveFormat(prev => ({ ...prev, [msg.id]: tab.id }))}
                                      className={cn(
                                        'px-3 py-1 text-xs font-medium border-b-2 transition-all -mb-[1px]',
                                        currentFormat === tab.id
                                          ? 'border-blue-600 text-blue-600'
                                          : 'border-transparent text-gray-400 hover:text-gray-600'
                                      )}
                                    >
                                      {tab.label}
                                    </button>
                                  ))}
                                </div>

                                {currentFormat === 'human' ? (
                                  <p className="text-gray-800 text-sm mt-0.5 leading-relaxed bg-white border border-gray-150 rounded-lg p-3 shadow-sm whitespace-pre-wrap">
                                    {msg.finalIntent.standardizedIntent}
                                  </p>
                                ) : (
                                  <div className="relative bg-gray-900 text-gray-100 rounded-lg p-3.5 font-mono text-xs overflow-x-auto shadow-sm">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(formattedText);
                                      }}
                                      className="absolute right-2.5 top-2.5 text-[10px] bg-gray-800 text-gray-300 hover:text-white px-2 py-1 rounded border border-gray-700 transition-colors"
                                    >
                                      Copy Payload
                                    </button>
                                    <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap">{formattedText}</pre>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              {/* Status & Approver */}
                              <div>
                                <span className="text-xs font-semibold text-gray-400 block uppercase tracking-wider">Status & Approver</span>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', INTENT_STATUS_CONFIG[msg.finalIntent.status as keyof typeof INTENT_STATUS_CONFIG]?.bgColor, INTENT_STATUS_CONFIG[msg.finalIntent.status as keyof typeof INTENT_STATUS_CONFIG]?.color)}>
                                    {INTENT_STATUS_CONFIG[msg.finalIntent.status as keyof typeof INTENT_STATUS_CONFIG]?.label ?? msg.finalIntent.status}
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    by {msg.finalIntent.decisionOutcome === 'AUTO_APPROVED' ? 'System (Auto-Approved)' : (msg.finalIntent.requester?.name || 'Authorized Reviewer')}
                                  </span>
                                </div>
                              </div>

                              {/* Approved At Timestamp */}
                              <div>
                                <span className="text-xs font-semibold text-gray-400 block uppercase tracking-wider">Approved At</span>
                                <span className="text-xs text-gray-700 block mt-1">
                                  {msg.finalIntent.approvedAt ? new Date(msg.finalIntent.approvedAt).toLocaleString() : 'N/A'}
                                </span>
                              </div>
                            </div>

                            {/* Linked Evidences */}
                            {msg.finalIntent.linkedEvidence && Object.keys(msg.finalIntent.linkedEvidence).length > 0 && (
                              <div>
                                <span className="text-xs font-semibold text-gray-400 block uppercase tracking-wider mb-1">Linked Evidences</span>
                                <div className="bg-white border border-gray-150 rounded-lg p-3 space-y-1 text-xs font-mono text-gray-600 shadow-sm max-h-32 overflow-y-auto">
                                  {Object.entries(msg.finalIntent.linkedEvidence).map(([key, value]: [string, any]) => (
                                    <div key={key} className="flex gap-2">
                                      <span className="text-gray-400 min-w-[120px]">{key}:</span>
                                      <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Interactive Next Steps and Follow-Up Group */}
                          <div className="flex flex-wrap gap-2 pt-3.5 border-t border-blue-100/50">
                            <span className="text-xs font-semibold text-gray-500 w-full block mb-1">🤖 Next Steps & Engagements:</span>
                            <button
                              type="button"
                              onClick={() => {
                                setInput(`Explain the approval reasoning and compliance checks for intent ${msg.finalIntent.intentId}.`);
                                inputRef.current?.focus();
                              }}
                              className="text-xs bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors font-medium shadow-sm"
                            >
                              💬 Ask to Explain Decision
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setInput(`Generate execution-ready code and deployment scripts for intent ${msg.finalIntent.intentId}.`);
                                inputRef.current?.focus();
                              }}
                              className="text-xs bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors font-medium shadow-sm"
                            >
                              ⚙️ Generate Execution Code
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setInput(`Suggest validation test cases and integration check policies for intent ${msg.finalIntent.intentId}.`);
                                inputRef.current?.focus();
                              }}
                              className="text-xs bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors font-medium shadow-sm"
                            >
                              🧪 Suggest Validation Checks
                            </button>
                          </div>

                          <div className="pt-2 flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/intent/${msg.finalIntent?.id}`)}
                              className="text-blue-600 hover:text-blue-700 font-semibold text-xs"
                            >
                              View Audit History & Comments <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </div>
                        </div>
                      );
                    })()}

                    {msg.error && (
                      <div className="rounded-xl bg-red-50 border border-red-100 p-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <p className="text-red-600 text-sm">{msg.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {msg.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0 mt-1 text-white text-xs font-bold">
                  {((session?.user as any)?.name ?? 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-white border border-gray-200 rounded-2xl shadow-sm focus-within:border-blue-400 focus-within:shadow-md transition-all">
            {attachedFile && (
              <div className="flex items-center gap-2 px-5 pt-3 text-xs text-gray-500">
                <span className="bg-gray-100 rounded-md px-2 py-1 flex items-center gap-1 border border-gray-200">
                  <Paperclip className="w-3 h-3 text-gray-400" />
                  <span className="truncate max-w-[200px]">{attachedFile.name}</span>
                  {isParsing ? (
                    <span className="text-blue-500 font-medium">(parsing...)</span>
                  ) : (
                    <button
                      type="button"
                      onClick={clearAttachment}
                      className="text-gray-400 hover:text-red-500 ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
              </div>
            )}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={attachedFile ? "Add details or submit the document intent..." : "Describe your intent in natural language or upload a document..."}
              rows={2}
              className={cn(
                "w-full bg-transparent text-gray-800 placeholder:text-gray-400 py-4 pr-14 resize-none focus:outline-none text-sm",
                attachedFile ? "px-5 pb-4 pt-2" : "pl-12 pr-14"
              )}
              disabled={processing}
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".txt,.md,.json,.csv,.pdf,.docx"
              className="hidden"
            />
            {!attachedFile && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={processing || isParsing}
                className="absolute left-3 bottom-3 text-gray-400 hover:text-gray-600 rounded-xl"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={(!input?.trim?.() && !parsedText) || processing || isParsing}
              size="icon"
              className="absolute right-3 bottom-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-30"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Every intent is traceable · Every decision is explainable · Every action is governed
          </p>
        </div>
      </div>
    </div>
  );
}

function ClarificationForm({
  intentId,
  questions,
  similarIntents,
  onClarified,
}: {
  intentId: string;
  questions: string[];
  similarIntents: any[];
  onClarified: (refinedRawInput: string) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/intents/${intentId}/clarify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          parentId: selectedParentId || undefined,
        }),
      });
      if (res.ok) {
        let addedString = '';
        for (const [q, a] of Object.entries(answers)) {
          if (a.trim()) {
            addedString += `\n- ${q}: ${a}`;
          }
        }
        onClarified(addedString);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 border border-orange-200 bg-orange-50/50 rounded-xl p-4 space-y-4 animate-fadeIn">
      <div className="flex items-center gap-2 text-orange-700 font-semibold text-sm">
        <AlertTriangle className="w-4 h-4 text-orange-500" />
        <span>Clarification Required to Resolve Ambiguity</span>
      </div>

      <div className="space-y-3">
        {questions.map((question, i) => (
          <div key={i} className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 block">{question}</label>
            <input
              type="text"
              required
              placeholder="Your answer..."
              value={answers[question] ?? ''}
              onChange={(e) => setAnswers({ ...answers, [question]: e.target.value })}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-gray-800"
            />
          </div>
        ))}
      </div>

      {/* Similar Intents Linkage */}
      {similarIntents.length > 0 && (
        <div className="space-y-1.5 border-t border-gray-150 pt-3">
          <label className="text-xs font-semibold text-gray-700 block">Link to a matching past intent? (Optional)</label>
          <select
            value={selectedParentId}
            onChange={(e) => setSelectedParentId(e.target.value)}
            className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-gray-700"
          >
            <option value="">-- Select intent to link --</option>
            {similarIntents.map((item) => (
              <option key={item.id} value={item.id}>
                {item.intentId || 'INT-NEW'} : {item.rawInput.slice(0, 50)}...
              </option>
            ))}
          </select>
        </div>
      )}

      <Button type="submit" disabled={submitting} className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs py-2 rounded-lg font-medium">
        {submitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
        Submit Clarifications & Resume Processing
      </Button>
    </form>
  );
}
