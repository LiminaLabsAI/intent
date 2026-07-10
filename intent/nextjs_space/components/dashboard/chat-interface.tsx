"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  Target,
  Layers,
  FileCheck,
  Scale,
  Hash,
  Clock,
  ArrowRight,
  Paperclip,
  X,
  Check,
  Download,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FlowIcon } from "@/components/flow-logo";
import { cn } from "@/lib/utils";
import { STAGE_NAMES, INTENT_STATUS_CONFIG } from "@/lib/types";

interface StageResult {
  stage: number;
  stageName: string;
  status: "processing" | "completed" | "failed";
  data?: any;
}

interface ChatMessage {
  id: string;
  type: "user" | "assistant" | "pipeline";
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
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [processing, setProcessing] = useState(false);

  // Interactive clarification state
  const [liveIntentDraft, setLiveIntentDraft] = useState<any>({});
  const [pendingClarificationId, setPendingClarificationId] = useState<
    string | null
  >(null);
  const [pendingClarificationQuestions, setPendingClarificationQuestions] =
    useState<string[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>("");

  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>(
    {},
  );
  const [activeFormat, setActiveFormat] = useState<
    Record<string, "human" | "json" | "md" | "okf">
  >({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [parsedText, setParsedText] = useState<string>("");
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachedFile(file);
    setIsParsing(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/intents/parse-document", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to parse document");
      const data = await res.json();
      setParsedText(data.content || "");
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...(prev ?? []),
        {
          id: `err-${Date.now()}`,
          type: "assistant",
          content: `Error reading file "${file.name}": ${err.message || "Unknown error"}`,
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
    setParsedText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, processing]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleStage = (messageId: string, stageNum: number) => {
    const key = `${messageId}-${stageNum}`;
    setExpandedStages((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const processIntentStream = async (dbId: string, pipelineMsgId: string) => {
    setProcessing(true);
    try {
      const processRes = await fetch(`/api/intents/${dbId}/process`, {
        method: "POST",
      });
      if (!processRes.ok) throw new Error("Failed to start processing");

      const reader = processRes.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let partialRead = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        partialRead += decoder.decode(value, { stream: true });
        const lines = partialRead.split("\n");
        partialRead = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            try {
              const event = JSON.parse(dataStr);

              if (event?.type === "stage_start") {
                setMessages((prev) => {
                  const msgs = [...(prev ?? [])];
                  const pipeMsg = msgs.find((m) => m?.id === pipelineMsgId);
                  if (pipeMsg) {
                    const exists = pipeMsg.stages?.some(
                      (s) => s?.stage === event?.stage,
                    );
                    if (!exists) {
                      pipeMsg.stages = [
                        ...(pipeMsg.stages ?? []),
                        {
                          stage: event.stage,
                          stageName: event.stageName,
                          status: "processing",
                        },
                      ];
                    } else {
                      pipeMsg.stages = pipeMsg.stages?.map((s) =>
                        s?.stage === event?.stage
                          ? { ...s, status: "processing" }
                          : s,
                      );
                    }
                    pipeMsg.content = event?.message ?? "Processing...";
                  }
                  return msgs;
                });
              } else if (event?.type === "stage_complete") {
                setMessages((prev) => {
                  const msgs = [...(prev ?? [])];
                  const pipeMsg = msgs.find((m) => m?.id === pipelineMsgId);
                  if (pipeMsg) {
                    const stageIdx = pipeMsg.stages?.findIndex(
                      (s) => s?.stage === event?.stage,
                    );
                    if (
                      stageIdx !== undefined &&
                      stageIdx >= 0 &&
                      pipeMsg.stages?.[stageIdx]
                    ) {
                      pipeMsg.stages[stageIdx].status = "completed";
                      pipeMsg.stages[stageIdx].data = event?.data;
                    }
                  }

                  // HYDRATE LIVE INTENT DRAFT
                  setLiveIntentDraft((prevDraft: any) => ({
                    ...prevDraft,
                    ...(event?.stage === 2 && event?.data?.entities
                      ? { entities: event.data.entities }
                      : {}),
                    ...(event?.stage === 3 && event?.data?.businessObjective
                      ? {
                          businessObjective: event.data.businessObjective,
                          intentType: event.data.intentType,
                        }
                      : {}),
                    ...(event?.stage === 4 && event?.data?.normalizedScope
                      ? { normalizedScope: event.data.normalizedScope }
                      : {}),
                    ...(event?.stage === 6 && event?.data?.reasoning
                      ? { reasoning: event.data.reasoning }
                      : {}),
                  }));

                  return msgs;
                });
              } else if (event?.type === "needs_clarification") {
                setMessages((prev) => {
                  const msgs = [...(prev ?? [])];
                  const pipeMsg = msgs.find((m) => m?.id === pipelineMsgId);
                  if (pipeMsg)
                    pipeMsg.content = "Pipeline paused for clarification.";

                  const astMsg: ChatMessage = {
                    id: `ast-${Date.now()}`,
                    type: "assistant",
                    content:
                      event.conversationalReply ||
                      "I noticed some ambiguity in your request. Please clarify the following so I can proceed:\n\n" +
                        (event.questions || [])
                          .map((q: string, i: number) => `${i + 1}. ${q}`)
                          .join("\n\n"),
                    needsClarification: true,
                    similarIntents: event.similarIntents,
                    timestamp: new Date().toISOString(),
                  };
                  return [...msgs, astMsg];
                });
                setPendingClarificationId(dbId);
                setPendingClarificationQuestions(event.questions || []);
              } else if (event?.type === "pipeline_complete") {
                setMessages((prev) => {
                  const msgs = [...(prev ?? [])];
                  const pipeMsg = msgs.find((m) => m?.id === pipelineMsgId);
                  if (pipeMsg)
                    pipeMsg.content = "Pipeline completed successfully!";

                  const astMsg: ChatMessage = {
                    id: `ast-${Date.now()}`,
                    type: "assistant",
                    content:
                      "Your intent is ready. Would you like to save it now, or clarify it further?",
                    finalIntent: event?.data,
                    intentId: event?.data?.id,
                    timestamp: new Date().toISOString(),
                  };
                  return [...msgs, astMsg];
                });
                setExpandedStages({});
              } else if (event?.type === "error") {
                setMessages((prev) => {
                  const msgs = [...(prev ?? [])];
                  const pipeMsg = msgs.find((m) => m?.id === pipelineMsgId);
                  if (pipeMsg) {
                    pipeMsg.error = event?.message ?? "Processing error";
                    if (event?.stage) {
                      const stageIdx = pipeMsg.stages?.findIndex(
                        (s) => s?.stage === event?.stage,
                      );
                      if (
                        stageIdx !== undefined &&
                        stageIdx >= 0 &&
                        pipeMsg.stages?.[stageIdx]
                      ) {
                        pipeMsg.stages[stageIdx].status = "failed";
                      }
                    }
                  }
                  return msgs;
                });
              }
            } catch (e) {
              // skip parse error
            }
          }
        }
      }
    } catch (error: any) {
      setMessages((prev) => {
        const msgs = [...(prev ?? [])];
        const pipeMsg = msgs.find((m) => m?.id === pipelineMsgId);
        if (pipeMsg)
          pipeMsg.error = error?.message ?? "Failed to process intent";
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
      rawInputText = trimmed
        ? `Document: ${attachedFile.name}\n---\n${parsedText}\n---\n\nUser Request: ${trimmed}`
        : `Document: ${attachedFile.name}\n---\n${parsedText}\n---`;
    }

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      type: "user",
      content: rawInputText,
      timestamp: new Date().toISOString(),
    };

    const pipelineMsgId = `pipe-${Date.now() + 1}`;
    const pipelineMsg: ChatMessage = {
      id: pipelineMsgId,
      type: "pipeline",
      content: pendingClarificationId
        ? "Resuming pipeline..."
        : "Processing intent through the lifecycle pipeline...",
      stages: [
        {
          stage: 1,
          stageName: "Intent Capture",
          status: "completed",
          data: { rawInput: rawInputText },
        },
      ],
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => {
      const updatedMsgs = [...(prev ?? [])].map((m) =>
        m.needsClarification ? { ...m, needsClarification: false } : m,
      );
      return [...updatedMsgs, userMsg, pipelineMsg];
    });

    setInput("");
    clearAttachment();
    setProcessing(true);

    try {
      if (pendingClarificationId) {
        const answers: Record<string, string> = {};
        pendingClarificationQuestions.forEach(
          (q) => (answers[q] = rawInputText),
        );

        const res = await fetch(
          `/api/intents/${pendingClarificationId}/clarify`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              answers,
              parentId: selectedParentId || undefined,
            }),
          },
        );

        const currentId = pendingClarificationId;
        setPendingClarificationId(null);
        setPendingClarificationQuestions([]);
        setSelectedParentId("");

        if (!res.ok) throw new Error("Failed to submit clarification");
        await processIntentStream(currentId, pipelineMsgId);
      } else {
        const createRes = await fetch("/api/intents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawInput: rawInputText }),
        });

        if (!createRes.ok) throw new Error("Failed to create intent");
        const intent = await createRes.json();
        setMessages((prev) => {
          const msgs = [...(prev ?? [])];
          const pipeMsg = msgs.find((m) => m?.id === pipelineMsgId);
          if (pipeMsg) pipeMsg.dbId = intent?.id;
          return msgs;
        });
        await processIntentStream(intent?.id, pipelineMsgId);
      }
    } catch (error: any) {
      setMessages((prev) => {
        const msgs = [...(prev ?? [])];
        const pipeMsg = msgs.find((m) => m?.id === pipelineMsgId);
        if (pipeMsg)
          pipeMsg.error = error?.message ?? "Failed to process intent";
        return msgs;
      });
      setProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const renderStageData = (data: any) => {
    if (!data) return null;
    return (
      <div className="space-y-2 text-sm text-left">
        {Object.entries(data ?? {})
          .filter(([k]) => k !== "similarIntents" && k !== "similaritySummary")
          .map(([key, value]: [string, any]) => (
            <div key={key} className="flex gap-2">
              <span className="text-gray-400 min-w-[120px] font-mono text-xs">
                {key}:
              </span>
              <span className="text-gray-700">
                {Array.isArray(value) ? (
                  <span className="flex flex-wrap gap-1">
                    {(value ?? []).map((v: any, i: number) => (
                      <span
                        key={i}
                        className="bg-gray-100 px-2 py-0.5 rounded text-xs"
                      >
                        {String(v ?? "")}
                      </span>
                    ))}
                  </span>
                ) : typeof value === "object" && value !== null ? (
                  <span className="font-mono text-xs">
                    {JSON.stringify(value)}
                  </span>
                ) : typeof value === "boolean" ? (
                  value ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 inline" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 inline" />
                  )
                ) : typeof value === "number" ? (
                  <span className="font-mono">
                    {(value as number)?.toFixed?.(2) ?? "0"}
                  </span>
                ) : (
                  String(value ?? "")
                )}
              </span>
            </div>
          ))}
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-gray-50/50 overflow-hidden">
      {/* LEFT PANE: Conversation */}
      <div className="flex-1 flex flex-col relative border-r border-gray-200 bg-white shadow-sm z-10 overflow-hidden">
        <div className="border-b border-gray-200 bg-white px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <FlowIcon />
            <div>
              <h1 className="text-lg font-display font-semibold text-gray-900">
                Studio — refine the intent
              </h1>
              <p className="text-xs text-gray-400">
                Interactive Intent Processing
              </p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {(messages ?? []).length === 0 && (
              <div className="text-center py-20 animate-fadeIn">
                <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-6">
                  <FlowIcon className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-display font-bold text-gray-900 mb-2 tracking-tight">
                  How can I help you?
                </h2>
                <p className="text-gray-500 max-w-md mx-auto mb-8">
                  I am your Flow Assistant. Tell me what you want to achieve,
                  and I will process your intent, clarify any ambiguities, and
                  generate a standardized payload.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                  {[
                    "Migrate customer database to cloud",
                    "Generate quarterly sales report for Q2",
                  ].map((example: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setInput(example)}
                      className="p-3 rounded-xl bg-white border border-gray-200 text-sm text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-gray-800 transition-all text-left shadow-sm"
                    >
                      <ArrowRight className="w-3 h-3 text-blue-500 mb-1" />
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(messages ?? []).map((msg: ChatMessage) => {
              const isUser = msg.type === "user";
              const isPipeline = msg.type === "pipeline";
              const isAssistant = msg.type === "assistant";

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex w-full",
                    isUser
                      ? "justify-end"
                      : isPipeline
                        ? "justify-center"
                        : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "flex max-w-3xl gap-3 animate-fadeIn",
                      isUser ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    {isUser && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 mt-auto text-white text-xs font-bold shadow-sm">
                        {((session?.user as any)?.name ?? "U")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                    {isAssistant && (
                      <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 mt-auto shadow-sm p-1.5">
                        <FlowIcon />
                      </div>
                    )}

                    {isPipeline ? (
                      <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm text-center flex flex-col items-center">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                          {processing &&
                          !msg.error &&
                          msg.stages?.some((s) => s.status === "processing") ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                          ) : msg.error ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          )}
                          <span>{msg.content}</span>
                          {msg.stages && msg.stages.length > 0 && (
                            <button
                              onClick={() =>
                                setExpandedStages((prev) => ({
                                  ...prev,
                                  [msg.id]: !prev[msg.id],
                                }))
                              }
                              className="text-blue-600 hover:underline ml-1 focus:outline-none flex items-center"
                            >
                              {expandedStages[msg.id]
                                ? "Hide Audit Log"
                                : "View Audit Log"}
                              {expandedStages[msg.id] ? (
                                <ChevronUp className="w-3 h-3 ml-0.5" />
                              ) : (
                                <ChevronDown className="w-3 h-3 ml-0.5" />
                              )}
                            </button>
                          )}
                        </div>

                        {expandedStages[msg.id] && msg.stages && (
                          <div className="mt-3 w-full max-w-lg space-y-1.5 border-t border-gray-100 pt-3">
                            {msg.stages.map((stage) => {
                              const StageIcon =
                                STAGE_ICONS[stage?.stage ?? 1] ?? Target;
                              const isStageExpanded =
                                expandedStages[`${msg.id}-${stage?.stage}`];
                              return (
                                <div
                                  key={stage?.stage}
                                  className="rounded-lg bg-gray-50 border border-gray-150 overflow-hidden text-left"
                                >
                                  <button
                                    onClick={() =>
                                      toggleStage(msg.id, stage?.stage ?? 0)
                                    }
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 transition-colors"
                                  >
                                    <div
                                      className={cn(
                                        "w-5 h-5 rounded flex items-center justify-center flex-shrink-0",
                                        stage?.status === "completed"
                                          ? "bg-green-100 text-green-600"
                                          : stage?.status === "failed"
                                            ? "bg-red-100 text-red-600"
                                            : "bg-blue-100 text-blue-600",
                                      )}
                                    >
                                      {stage?.status === "processing" ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : stage?.status === "completed" ? (
                                        <CheckCircle2 className="w-3 h-3" />
                                      ) : (
                                        <XCircle className="w-3 h-3" />
                                      )}
                                    </div>
                                    <StageIcon className="w-3 h-3 text-gray-500" />
                                    <span className="text-xs font-medium text-gray-700 flex-1">
                                      Stage {stage?.stage}: {stage?.stageName}
                                    </span>
                                    {stage?.data &&
                                      (isStageExpanded ? (
                                        <ChevronUp className="w-3 h-3 text-gray-400" />
                                      ) : (
                                        <ChevronDown className="w-3 h-3 text-gray-400" />
                                      ))}
                                  </button>
                                  {isStageExpanded && stage?.data && (
                                    <div className="px-3 pb-2 border-t border-gray-150 pt-2 bg-white">
                                      {renderStageData(stage.data)}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {msg.error && (
                          <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded w-full text-left font-mono">
                            {msg.error}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "rounded-2xl px-5 py-3.5 shadow-sm text-sm whitespace-pre-wrap",
                          isUser
                            ? "bg-green-100 text-green-900 border border-green-200 rounded-br-sm"
                            : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm",
                        )}
                      >
                        {msg.content}

                        {msg.needsClarification &&
                          msg.similarIntents &&
                          msg.similarIntents.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                              <label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                <Layers className="w-3 h-3" /> Found matching past intents
                              </label>
                              <div className="space-y-2 mt-2">
                                {msg.similarIntents.map((item) => (
                                  <div key={item.id} className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-sm">
                                    <div className="flex justify-between items-start mb-1">
                                      <span className="font-semibold text-blue-900">{item.intentId || "INT-NEW"}</span>
                                      <button 
                                        onClick={() => setSelectedParentId(item.id)}
                                        className={cn("text-[10px] px-2 py-1 rounded transition-colors", selectedParentId === item.id ? "bg-blue-600 text-white" : "bg-white text-blue-600 border border-blue-200 hover:bg-blue-50")}
                                      >
                                        {selectedParentId === item.id ? "Selected" : "Link to this"}
                                      </button>
                                    </div>
                                    <p className="text-gray-700 text-xs mt-1">{item.rawInput}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        {msg.finalIntent &&
                          (() => {
                            const payloadMd = `# Intent Registration: ${msg.finalIntent.intentId}\n- **Status**: ${msg.finalIntent.status}\n- **Domain**: ${msg.finalIntent.businessDomain || "N/A"}\n- **Action Type**: ${msg.finalIntent.intentType || "OTHER"}\n- **Approved At**: ${msg.finalIntent.approvedAt ? new Date(msg.finalIntent.approvedAt).toLocaleString() : "N/A"}\n\n## Detailed Vision\n${msg.finalIntent.standardizedIntent}\n\n## Scope & Context\n- **Scope**: ${msg.finalIntent.normalizedScope || msg.finalIntent.scope || "N/A"}\n- **Objective**: ${msg.finalIntent.businessObjective || "N/A"}\n\n## Entities\n${(msg.finalIntent.entities || []).map((e: any) => `- ${e}`).join("\n")}`;
                            const payloadOkf = `[INTENT: ${msg.finalIntent.intentId}]\nDomain    :: ${msg.finalIntent.businessDomain || "N/A"}\nAction    :: ${msg.finalIntent.intentType || "OTHER"}\nObjective :: ${msg.finalIntent.businessObjective || "N/A"}\nScope     :: ${msg.finalIntent.normalizedScope || msg.finalIntent.scope || "N/A"}\nEntities  :: [${(msg.finalIntent.entities || []).join(", ")}]\n\n[DETAILED VISION]\n${msg.finalIntent.standardizedIntent}\n\n[METADATA]\nApprovedAt:: ${msg.finalIntent.approvedAt || "N/A"}\nRiskLevel :: ${msg.finalIntent.riskLevel || "N/A"}`;

                            return (
                              <div className="mt-4 pt-4 border-t border-gray-100">
                                <div className="space-y-3 relative">
                                  <div className="absolute -top-3 right-0 flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => navigator.clipboard.writeText(payloadMd)}
                                      className="text-gray-400 hover:text-blue-500 transition-colors group relative flex items-center gap-1"
                                      title="Copy Markdown"
                                    >
                                      <Download className="w-3.5 h-3.5" /> <span className="text-[10px] font-medium hidden group-hover:inline">MD</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => navigator.clipboard.writeText(payloadOkf)}
                                      className="text-gray-400 hover:text-blue-500 transition-colors group relative flex items-center gap-1 ml-1"
                                      title="Copy OKF"
                                    >
                                      <FileCheck className="w-3.5 h-3.5" /> <span className="text-[10px] font-medium hidden group-hover:inline">OKF</span>
                                    </button>
                                  </div>

                                  <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                    <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block mb-1">
                                      Detailed Vision
                                    </span>
                                    <p className="text-sm text-gray-800 leading-relaxed">
                                      {msg.finalIntent.standardizedIntent}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-4 mt-2">
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/intent/${msg.finalIntent.id || msg.finalIntent.intentId}`)}
                                    className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full transition-colors font-medium shadow-sm"
                                  >
                                    <Save className="w-3.5 h-3.5" /> Save Intent
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => inputRef.current?.focus()}
                                    className="flex items-center gap-1.5 text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-full transition-colors font-medium shadow-sm"
                                  >
                                    Clarify Further
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-white border border-gray-200 rounded-2xl shadow-sm focus-within:border-green-400 focus-within:shadow-md transition-all">
              {attachedFile && (
                <div className="flex items-center gap-2 px-5 pt-3 text-xs text-gray-500">
                  <span className="bg-gray-100 rounded-md px-2 py-1 flex items-center gap-1 border border-gray-200">
                    <Paperclip className="w-3 h-3 text-gray-400" />
                    <span className="truncate max-w-[200px]">
                      {attachedFile.name}
                    </span>
                    {isParsing ? (
                      <span className="text-blue-500 font-medium">
                        (parsing...)
                      </span>
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
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  pendingClarificationId
                    ? "Type your clarification here to resume..."
                    : attachedFile
                      ? "Add details or submit the document intent..."
                      : "Message Flow Assistant..."
                }
                rows={1}
                style={{ minHeight: "56px" }}
                className={cn(
                  "w-full bg-transparent text-gray-800 placeholder:text-gray-400 py-4 pr-14 resize-none focus:outline-none text-sm",
                  attachedFile ? "px-5 pb-4 pt-2" : "pl-12 pr-14",
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
                disabled={
                  (!input?.trim?.() && !parsedText) || processing || isParsing
                }
                size="icon"
                className={cn(
                  "absolute right-3 bottom-3 text-white rounded-xl disabled:opacity-30 transition-colors",
                  pendingClarificationId
                    ? "bg-orange-500 hover:bg-orange-600"
                    : "bg-green-500 hover:bg-green-600",
                )}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center font-medium">
              Flow Assistant processes intents in real-time. All actions are
              traced in the audit log.
            </p>
          </div>
        </div>
      </div>{" "}
      {/* End Left Pane */}
      {/* RIGHT PANE: Live Intent Card */}
      <div className="w-96 flex-shrink-0 bg-gray-50/50 overflow-y-auto hidden lg:block">
        <div className="p-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm sticky top-6">
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 rounded-t-lg">
              <h3 className="font-semibold text-sm text-gray-800">Intent</h3>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                Filled from conversation
              </span>
            </div>
            <div className="p-4 space-y-5">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Goal
                  </h4>
                  {liveIntentDraft?.businessObjective && (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  )}
                </div>
                <p className="text-sm text-gray-800">
                  {liveIntentDraft?.businessObjective || (
                    <span className="text-gray-300 italic">Discovering...</span>
                  )}
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Scope
                  </h4>
                  {liveIntentDraft?.normalizedScope && (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  )}
                </div>
                <p className="text-sm text-gray-800">
                  {liveIntentDraft?.normalizedScope || (
                    <span className="text-gray-300 italic">Discovering...</span>
                  )}
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Delivered To
                  </h4>
                  {liveIntentDraft?.intentType && (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  )}
                </div>
                <p className="text-sm text-gray-800">
                  {liveIntentDraft?.intentType ? (
                    `${liveIntentDraft.intentType} · via Flow`
                  ) : (
                    <span className="text-gray-300 italic">Discovering...</span>
                  )}
                </p>
              </div>

              {liveIntentDraft?.reasoning && (
                <div className="bg-yellow-50/50 -mx-4 px-4 py-3 border-y border-yellow-100">
                  <h4 className="text-[10px] font-semibold text-yellow-800 uppercase tracking-wider mb-1">
                    What Good Looks Like · Assumed
                  </h4>
                  <p className="text-sm text-yellow-900">
                    {liveIntentDraft.reasoning}
                  </p>
                </div>
              )}

              <div>
                <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Sources
                </h4>
                <div className="flex flex-wrap gap-2">
                  {liveIntentDraft?.entities?.length ? (
                    liveIntentDraft.entities.map((ent: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-50 border border-gray-200 text-gray-600 rounded-full text-[11px] font-medium"
                      >
                        {ent}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-300 italic text-sm">
                      Discovering...
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
