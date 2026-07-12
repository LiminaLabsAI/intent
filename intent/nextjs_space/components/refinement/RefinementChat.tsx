"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, AlertTriangle, CheckCircle, Database } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

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
         const textContent = [...messages, userMessage].map(m => `### ${m.role.toUpperCase()}\n${m.content}`).join('\n\n');
         
         const blob = new Blob([textContent], { type: 'text/plain' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = `intent-export.${format}`;
         a.click();
         URL.revokeObjectURL(url);
         
         setTimeout(() => {
           setMessages(prev => [...prev, { 
             id: (Date.now() + 1).toString(), 
             role: "agent", 
             content: `I have automatically downloaded the ${format.toUpperCase()} file for you. Let me know if you need anything else!` 
           }]);
           setIsTyping(false);
         }, 500);
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
                
                if (data.intentId && data.intentId !== intentId) {
                  setIntentId(data.intentId);
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

        if (isNewIntent) {
          // Force a router refresh so GlobalSidebar refetches the intent history
          router.refresh();
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white shadow-sm border border-gray-200 rounded-xl">
      {/* Header Area */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
         <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {intentId ? "Intent Refinement" : "New Intent"}
            </h2>
            <p className="text-sm text-gray-500">
              {intentId ? "Continue refining your business objective" : "Describe your objective to begin"}
            </p>
         </div>
      </div>

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
  );
}
