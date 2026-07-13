"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, AlertTriangle, CheckCircle, Database, Activity, Download, FileText, Cpu } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import LiveDocument from "./LiveDocument";
import MiniGraph from "./MiniGraph";

type Message = {
  id: string;
  role: "user" | "agent";
  content: string;
  isStreaming?: boolean;
};

export default function RefinementChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [score, setScore] = useState<number>(0);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [intentData, setIntentData] = useState<any>(null);
  const [isExpandingPRD, setIsExpandingPRD] = useState<boolean>(false);
  const [isExpandingPLAN, setIsExpandingPLAN] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const idFromUrl = searchParams?.get('id');
  const [intentId, setIntentId] = useState<string | null>(idFromUrl || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (idFromUrl) {
      setIntentId(idFromUrl);
      fetch(`/api/intents/${idFromUrl}`)
        .then(res => res.json())
        .then(data => {
          setIntentData(data);
          if (data && data.processingLog && data.processingLog.messages) {
            setMessages(data.processingLog.messages.map((m: any, idx: number) => ({
              id: idx.toString(),
              role: m.role === 'assistant' ? 'agent' : m.role,
              content: m.content
            })));
          } else if (data && data.rawInput) {
            setMessages([{ id: "0", role: "user", content: data.rawInput }]);
          }
        })
        .catch(console.error);
    } else {
      // User clicked New Intent and URL cleared the ID
      setIntentId(null);
      setIntentData(null);
      setMessages([]);
      setInput("");
    }
  }, [idFromUrl]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll for execution updates from webhook
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (intentId) {
      interval = setInterval(() => {
        fetch(`/api/intents/${intentId}`)
          .then(res => res.json())
          .then(data => {
            if (data?.comments?.length > 0) {
              const executionComments = data.comments.filter((c: any) => c.content.startsWith('Execution Update'));
              setMessages(prev => {
                const newMessages = [...prev];
                let changed = false;
                for (const c of executionComments) {
                  if (!prev.find(m => m.id === c.id || m.content.includes(c.content))) {
                    newMessages.push({ id: c.id, role: "agent", content: `🤖 **Update from Execution Agent:**\n\n${c.content}` });
                    changed = true;
                  }
                }
                return changed ? newMessages : prev;
              });
              
              // Refresh intentData to ensure we have latest artifacts if needed
              fetch(`/api/intents/${intentId}`).then(r => r.json()).then(d => setIntentData(d)).catch(console.error);
            }
          })
          .catch(console.error);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [intentId]);

  // Background evaluation hook
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "agent" && !lastMessage.isStreaming) {
      setIsEvaluating(true);
      fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, intentId })
      })
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.score === 'number') {
          setScore(data.score);
          if (intentId) {
            fetch(`/api/intents/${intentId}`).then(r => r.json()).then(d => setIntentData(d)).catch(console.error);
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsEvaluating(false));
    }
  }, [messages]);

  const getReadiness = () => {
    if (score === 0) return { label: "🔴 Vague", color: "text-red-600" };
    if (score < 50) return { label: "🔴 Needs Context", color: "text-red-500" };
    if (score < 80) return { label: "🟡 Actionable", color: "text-amber-600" };
    return { label: "🟢 Ready for Dispatch", color: "text-emerald-600" };
  };

  const readiness = getReadiness();
  const computeSaved = `$${((score / 100) * 15).toFixed(2)}`;

  const handleDispatch = async () => {
    if (!intentId) return;
    setIsDispatching(true);
    try {
      const res = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentId })
      });
      if (!res.ok) {
         const errData = await res.json();
         throw new Error(errData.error || "Dispatch failed");
      }
      
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: "agent", 
        content: `🚀 **Intent successfully dispatched!**\n\nThe Execution Agent has accepted the payload and is currently working on it. I will monitor the execution progress and update you here.` 
      }]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: "agent", 
        content: `❌ **Dispatch Failed**\n\n${err.message}` 
      }]);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleDownload = async (format: 'md' | 'okf') => {
    setIsDownloading(true);
    try {
      const evalResponse = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages })
      });
      if (!evalResponse.ok) throw new Error("Evaluation request failed");
      const evalData = await evalResponse.json();
      
      const blob = new Blob([evalData.formattedExport || ""], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `intent-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExpand = async (type: 'PRD' | 'PLAN') => {
    if (type === 'PRD') setIsExpandingPRD(true);
    if (type === 'PLAN') setIsExpandingPLAN(true);
    
    try {
      const response = await fetch("/api/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentId, type })
      });
      
      if (!response.ok) throw new Error("Expand request failed");
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let text = "";
      
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const content = JSON.parse(line.substring(2));
              text += content;
              
              setIntentData((prev: any) => {
                const currentArtifacts = prev?.artifacts || {};
                return {
                  ...prev,
                  artifacts: { ...currentArtifacts, [type]: text }
                };
              });
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (type === 'PRD') setIsExpandingPRD(false);
      if (type === 'PLAN') setIsExpandingPLAN(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // 0. Intercept conversational download requests
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes("download") || lowerInput.includes("export")) {
      const isMd = lowerInput.includes("md") || lowerInput.includes("markdown");
      const isOkf = lowerInput.includes("okf");
      
      if (isMd || isOkf) {
         const format = isOkf ? 'okf' : 'md';
         
         try {
           const evalResponse = await fetch("/api/evaluate", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ messages: [...messages, userMessage] })
           });
           
           if (!evalResponse.ok) throw new Error("Evaluation request failed");
           
           const evalData = await evalResponse.json();
           
           if (evalData.score >= 80) {
             const blob = new Blob([evalData.formattedExport], { type: 'text/plain' });
             const url = URL.createObjectURL(blob);
             const a = document.createElement('a');
             a.href = url;
             a.download = `intent-export.${format}`;
             a.click();
             URL.revokeObjectURL(url);
             
             setMessages(prev => [...prev, { 
               id: (Date.now() + 1).toString(), 
               role: "agent", 
               content: `✅ Quality Gate Passed (Score: ${evalData.score}/100).\nI have automatically downloaded the ${format.toUpperCase()} file for you. Let me know if you need anything else!` 
             }]);
           } else {
             const missingPoints = evalData.missingDetails.map((d: string) => `- ${d}`).join('\n');
             setMessages(prev => [...prev, { 
               id: (Date.now() + 1).toString(), 
               role: "agent", 
               content: `❌ **Quality Gate Failed (Score: ${evalData.score}/100)**\n\nYour intent is not yet ready for execution. Please provide the following missing details:\n\n${missingPoints}\n\n**Reasoning:** ${evalData.reasoning}` 
             }]);
           }
         } catch (err) {
           console.error(err);
           setMessages(prev => [...prev, { id: Date.now().toString(), role: "agent", content: "Error evaluating intent." }]);
         } finally {
           setIsTyping(false);
         }
         return;
      }
    }

    // 1. Send the message to the API route
    try {
      const response = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage], stage: "HIGH_LEVEL", intentId }),
      });

      if (!response.ok) {
        // Guardrail rejection or error
        const errorData = await response.json();
        setMessages((prev) => [
          ...prev, 
          { id: Date.now().toString(), role: "agent", content: `[GUARDRAIL BLOCKED] ${errorData.reason || "Request denied."}` }
        ]);
        setIsTyping(false);
        return;
      }

      // 2. Read the SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      const agentMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, { id: agentMessageId, role: "agent", content: "", isStreaming: true }]);
      setIsTyping(false);

      if (reader) {
        let agentText = "";
        let isNewIntent = false;
        let newIntentId = intentId;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6));
                agentText += data.text;
                
                if (data.intentId && data.intentId !== newIntentId) {
                  setIntentId(data.intentId);
                  newIntentId = data.intentId;
                  isNewIntent = true;
                }

                // Update the specific agent message
                setMessages((prev) => 
                  prev.map(msg => msg.id === agentMessageId ? { ...msg, content: agentText } : msg)
                );
              } catch (e) {
                console.error("Error parsing SSE JSON", e);
              }
            }
          }
        }
        
        // Finalize streaming state
        setMessages((prev) => 
          prev.map(msg => msg.id === agentMessageId ? { ...msg, isStreaming: false } : msg)
        );

        if (isNewIntent && newIntentId) {
          router.replace(`/refine?id=${newIntentId}`);
          router.refresh();
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden gap-4">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Intent Studio</h1>
          <p className="text-sm text-gray-500 mt-1">Refine and structure your business objectives with Flow AI</p>
        </div>
        {messages.length > 0 && (
          <div className="text-right bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100">
            <div className="text-xs text-emerald-600 uppercase tracking-wider font-bold">Compute Saved</div>
            <div className="text-lg font-bold text-emerald-700">+{computeSaved}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-hidden">
        {/* Left Panel: Chat Interface */}
        <div className="flex flex-col h-full overflow-hidden bg-white shadow-md border border-gray-200 rounded-2xl">
        {/* Chat Header */}
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                {intentId ? "Refinement Session" : "New Session"}
              </h2>
           </div>
           {messages.length > 0 && (
             <div className="flex items-center gap-4">
               <div className="text-right">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-0.5 flex items-center justify-end gap-1">
                    Readiness {isEvaluating && <Activity className="w-3 h-3 animate-spin text-blue-500" />}
                  </div>
                  <div className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    score >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    score >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-red-50 text-red-700 border-red-200"
                  }`}>{readiness.label}</div>
               </div>
             </div>
           )}
        </div>
             {score >= 80 && (
                <div className="flex items-center gap-2 px-5 py-2 bg-gray-50 border-b border-gray-100">
                  <button
                    onClick={() => handleDownload('md')}
                    disabled={isDownloading}
                    className="px-3 py-1 bg-white text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1.5 transition-colors border border-gray-200 shadow-sm"
                    title="Download as Markdown"
                  >
                    <Download className="w-3.5 h-3.5" />
                    MD
                  </button>
                  <button
                    onClick={() => handleDownload('okf')}
                    disabled={isDownloading}
                    className="px-3 py-1 bg-white text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1.5 transition-colors border border-gray-200 shadow-sm"
                    title="Download as OKF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    OKF
                  </button>
                </div>
             )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
            <Database className="w-12 h-12 opacity-20" />
            <p>Describe what you want to achieve...</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl p-3 ${msg.role === "user" ? "bg-blue-600 text-white rounded-br-none" : "bg-gray-100 text-gray-800 rounded-bl-none"}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {msg.isStreaming && <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1 align-middle" />}
              </div>
            </div>
          ))
        )}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl p-4 rounded-bl-none flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white">
        <div className="relative flex items-center">
          <textarea
            className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={1}
            placeholder="Type your intent..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 text-xs text-center text-gray-400">
          Powered by Flow Refinement Engine (Fast Model)
        </div>
      </div>
      </div>
      
      {/* Right Panel: Studio Artifacts */}
      <div className="flex flex-col h-full gap-6 overflow-hidden hidden lg:flex">
         <div className="flex-1 overflow-hidden bg-white shadow-md border border-gray-200 rounded-2xl">
           <LiveDocument 
             intentData={intentData} 
             onExpand={handleExpand}
             isExpandingPRD={isExpandingPRD}
             isExpandingPLAN={isExpandingPLAN}
           />
         </div>
         <div className="h-[30%] min-h-[200px] bg-white shadow-md border border-gray-200 rounded-2xl">
           <MiniGraph intentData={intentData} />
         </div>
      </div>
    </div>
    </div>
  );
}
