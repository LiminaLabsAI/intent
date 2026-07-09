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
  type: 'user' | 'system';
  content: string;
  intentId?: string;
  stages?: StageResult[];
  finalIntent?: any;
  error?: string;
  timestamp: string;
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
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
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
    setParsedText('');

    const extension = file.name.split('.').pop()?.toLowerCase();

    try {
      if (['txt', 'md', 'json', 'csv'].includes(extension ?? '')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setParsedText(event.target?.result as string);
          setIsParsing(false);
        };
        reader.onerror = () => {
          alert('Failed to read file');
          setAttachedFile(null);
          setIsParsing(false);
        };
        reader.readAsText(file);
      } else {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/intents/parse-document', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to parse file');
        }

        const data = await res.json();
        setParsedText(data.text);
        setIsParsing(false);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error occurred during file parsing');
      setAttachedFile(null);
      setIsParsing(false);
    }
  };

  const clearAttachment = () => {
    setAttachedFile(null);
    setParsedText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  useEffect(() => {
    messagesEndRef?.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (searchParams?.get('new') === 'true') {
      inputRef?.current?.focus?.();
    }
  }, [searchParams]);

  const toggleStage = (messageId: string, stage: number) => {
    const key = `${messageId}-${stage}`;
    setExpandedStages((prev: any) => ({ ...(prev ?? {}), [key]: !prev?.[key] }));
  };

  const handleSubmit = async () => {
    const trimmed = input?.trim?.() ?? '';
    if ((!trimmed && !parsedText) || processing || isParsing) return;

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
    const systemMsg: ChatMessage = {
      id: systemMsgId,
      type: 'system',
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

      const processRes = await fetch(`/api/intents/${intent?.id}/process`, {
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
                  const sysMsg = msgs.find((m: any) => m?.id === systemMsgId);
                  if (sysMsg) {
                    sysMsg.stages = [
                      ...(sysMsg.stages ?? []),
                      { stage: event.stage, stageName: event.stageName, status: 'processing' as const },
                    ];
                    sysMsg.content = event?.message ?? 'Processing...';
                  }
                  return msgs;
                });
              } else if (event?.type === 'stage_complete') {
                setMessages((prev: any) => {
                  const msgs = [...(prev ?? [])];
                  const sysMsg = msgs.find((m: any) => m?.id === systemMsgId);
                  if (sysMsg) {
                    const stageIdx = sysMsg.stages?.findIndex((s: any) => s?.stage === event?.stage);
                    if (stageIdx !== undefined && stageIdx >= 0 && sysMsg.stages?.[stageIdx]) {
                      sysMsg.stages[stageIdx].status = 'completed';
                      sysMsg.stages[stageIdx].data = event?.data;
                    }
                  }
                  return msgs;
                });
              } else if (event?.type === 'pipeline_complete') {
                setMessages((prev: any) => {
                  const msgs = [...(prev ?? [])];
                  const sysMsg = msgs.find((m: any) => m?.id === systemMsgId);
                  if (sysMsg) {
                    sysMsg.finalIntent = event?.data;
                    sysMsg.intentId = event?.data?.id;
                    sysMsg.content = 'Pipeline completed!';
                  }
                  return msgs;
                });
              } else if (event?.type === 'error') {
                setMessages((prev: any) => {
                  const msgs = [...(prev ?? [])];
                  const sysMsg = msgs.find((m: any) => m?.id === systemMsgId);
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
        const sysMsg = msgs.find((m: any) => m?.id === systemMsgId);
        if (sysMsg) {
          sysMsg.error = error?.message ?? 'Failed to process intent';
        }
        return msgs;
      });
    } finally {
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
        {Object.entries(data ?? {}).map(([key, value]: [string, any]) => (
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
          {(messages?.length ?? 0) === 0 && (
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
            <div key={msg.id} className={cn('flex gap-3', msg.type === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.type === 'system' && (
                <FlowIcon className="flex-shrink-0 mt-1" />
              )}
              <div className={cn(
                'max-w-3xl rounded-2xl',
                msg.type === 'user'
                  ? 'bg-blue-50 border border-blue-100 px-5 py-3'
                  : 'bg-gray-50 border border-gray-200 px-5 py-4 w-full'
              )}>
                {msg.type === 'user' ? (
                  <p className="text-gray-800 text-sm">{msg.content}</p>
                ) : (
                  <div className="space-y-3">
                    {/* Stage pipeline */}
                    <div className="space-y-2">
                      {(msg.stages ?? []).map((stage: StageResult) => {
                        const StageIcon = STAGE_ICONS[stage?.stage ?? 1] ?? Target;
                        const isExpanded = expandedStages?.[`${msg.id}-${stage?.stage}`];
                        return (
                          <div key={stage?.stage} className="rounded-xl bg-white border border-gray-100 overflow-hidden">
                            <button
                              onClick={() => toggleStage(msg.id, stage?.stage ?? 0)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className={cn(
                                'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                                stage?.status === 'completed' ? 'bg-green-50' :
                                stage?.status === 'failed' ? 'bg-red-50' :
                                'bg-blue-50'
                              )}>
                                {stage?.status === 'processing' ? (
                                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                ) : stage?.status === 'completed' ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                              </div>
                              <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                  <StageIcon className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="text-sm font-medium text-gray-800">Stage {stage?.stage}: {stage?.stageName}</span>
                                </div>
                              </div>
                              {stage?.data && (
                                isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                            {isExpanded && stage?.data && (
                              <div className="px-4 pb-3 border-t border-gray-100 pt-3">
                                {renderStageData(stage.data)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Final result */}
                    {msg.finalIntent && (
                      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold text-gray-900">Pipeline Complete</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Status</span>
                            <p className={cn('font-medium', INTENT_STATUS_CONFIG[msg.finalIntent?.status as keyof typeof INTENT_STATUS_CONFIG]?.color ?? 'text-gray-900')}>
                              {INTENT_STATUS_CONFIG[msg.finalIntent?.status as keyof typeof INTENT_STATUS_CONFIG]?.label ?? msg.finalIntent?.status}
                            </p>
                          </div>
                          {msg.finalIntent?.intentId && (
                            <div>
                              <span className="text-gray-500">Intent ID</span>
                              <p className="font-mono text-blue-600">{msg.finalIntent.intentId}</p>
                            </div>
                          )}
                          {msg.finalIntent?.decisionOutcome && (
                            <div>
                              <span className="text-gray-500">Decision</span>
                              <p className="text-gray-800">{(msg.finalIntent.decisionOutcome ?? '').replace(/_/g, ' ')}</p>
                            </div>
                          )}
                          {msg.finalIntent?.riskLevel && (
                            <div>
                              <span className="text-gray-500">Risk Level</span>
                              <p className={cn(
                                msg.finalIntent.riskLevel === 'LOW' ? 'text-green-600' :
                                msg.finalIntent.riskLevel === 'MEDIUM' ? 'text-amber-600' : 'text-red-600'
                              )}>{msg.finalIntent.riskLevel}</p>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/intent/${msg.finalIntent?.id}`)}
                          className="mt-3 text-blue-600 hover:text-blue-700"
                        >
                          View Full Details <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    )}

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
