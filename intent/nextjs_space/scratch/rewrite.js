const fs = require('fs');
const file = 'components/dashboard/chat-interface.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Update ChatMessage interface
code = code.replace(
  "type: 'user' | 'system';",
  "type: 'user' | 'system' | 'assistant' | 'pipeline';"
);

// 2. Add pendingClarificationId state
code = code.replace(
  "const [processing, setProcessing] = useState(false);",
  "const [processing, setProcessing] = useState(false);\n  const [pendingClarificationId, setPendingClarificationId] = useState<string | null>(null);\n  const [pendingClarificationQuestions, setPendingClarificationQuestions] = useState<string[]>([]);"
);

// 3. Update pipeline event handlers in processIntentStream
code = code.replace(
  /\} else if \(event\?\.type === 'needs_clarification'\) \{[\s\S]*?\} else if \(event\?\.type === 'pipeline_complete'\)/,
  `} else if (event?.type === 'needs_clarification') {
                setMessages((prev: any) => {
                  const msgs = [...(prev ?? [])];
                  const sysMsg = msgs.find((m: any) => m?.id === systemMsgId);
                  if (sysMsg) {
                    sysMsg.content = 'Ambiguity detected. Waiting for clarification.';
                  }
                  
                  const astMsg = {
                    id: \`msg-ast-\${Date.now()}\`,
                    type: 'assistant',
                    content: 'I noticed some ambiguity in your request. Please clarify:\\n' + (event.questions || []).map((q: string, i: number) => \`\${i+1}. \${q}\`).join('\\n'),
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
              } else if (event?.type === 'pipeline_complete')`
);

code = code.replace(
  /\} else if \(event\?\.type === 'pipeline_complete'\) \{[\s\S]*?\} else if \(event\?\.type === 'error'\)/,
  `} else if (event?.type === 'pipeline_complete') {
                setMessages((prev: any) => {
                  const msgs = [...(prev ?? [])];
                  const sysMsg = msgs.find((m: any) => m?.id === systemMsgId);
                  if (sysMsg) {
                    sysMsg.content = 'Pipeline completed!';
                  }
                  
                  const astMsg = {
                    id: \`msg-ast-\${Date.now()}\`,
                    type: 'assistant',
                    content: 'Your intent has been successfully processed and approved!',
                    finalIntent: event?.data,
                    intentId: event?.data?.id,
                    timestamp: new Date().toISOString()
                  };
                  return [...msgs, astMsg];
                });
                setExpandedStages({});
              } else if (event?.type === 'error')`
);

// 4. Update handleSubmit for clarification logic
code = code.replace(
  /const handleSubmit = async \(\) => \{[\s\S]*?const userMsg: ChatMessage = \{/,
  `const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed && !parsedText) return;

    let rawInputText = trimmed;
    if (attachedFile && parsedText) {
      if (trimmed) {
        rawInputText = \`Document: \${attachedFile.name}\\n---\\n\${parsedText}\\n---\\n\\nUser Request: \${trimmed}\`;
      } else {
        rawInputText = \`Document: \${attachedFile.name}\\n---\\n\${parsedText}\\n---\`;
      }
    }

    const userMsg: ChatMessage = {`
);

// Inject logic after userMsg creation
code = code.replace(
  /const systemMsgId = `msg-\$\{Date\.now\(\) \+ 1\}`;/,
  `const systemMsgId = \`msg-\${Date.now() + 1}\`;
    
    if (pendingClarificationId) {
      // Handle clarification
      const systemMsg: ChatMessage = {
        id: systemMsgId,
        type: 'pipeline',
        content: 'Resuming pipeline...',
        stages: [{ stage: 1, stageName: 'Intent Capture', status: 'completed', data: { rawInput: rawInputText } }],
        timestamp: new Date().toISOString(),
      };
      setMessages((prev: any) => {
        // Find the assistant message that asked the question and mark it no longer needs clarification
        const msgs = [...(prev ?? [])].map(m => m.needsClarification ? { ...m, needsClarification: false } : m);
        return [...msgs, userMsg, systemMsg];
      });
      setInput('');
      clearAttachment();
      setProcessing(true);
      
      try {
        // Naive mapping of all pending questions to the single user response for simplicity in this conversational model
        const answers: Record<string, string> = {};
        pendingClarificationQuestions.forEach(q => answers[q] = rawInputText);
        
        const res = await fetch(\`/api/intents/\${pendingClarificationId}/clarify\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers }),
        });
        
        setPendingClarificationId(null);
        setPendingClarificationQuestions([]);
        
        if (res.ok) {
          await processIntentStream(pendingClarificationId, systemMsgId);
        } else {
          throw new Error('Failed to submit clarification');
        }
      } catch (err: any) {
        setMessages((prev: any) => {
          const msgs = [...(prev ?? [])];
          const sysMsg = msgs.find((m: any) => m?.id === systemMsgId);
          if (sysMsg) sysMsg.error = err?.message || 'Error';
          return msgs;
        });
        setProcessing(false);
      }
      return;
    }

    // Normal submission
    const systemMsgId2 = systemMsgId;`
);

// We need to replace systemMsg instantiation
code = code.replace(
  /const systemMsg: ChatMessage = \{[\s\S]*?timestamp: new Date\(\)\.toISOString\(\),\n    \};/,
  `const systemMsg: ChatMessage = {
      id: systemMsgId2,
      type: 'pipeline',
      content: 'Processing intent through the lifecycle pipeline...',
      stages: [{ stage: 1, stageName: 'Intent Capture', status: 'completed', data: { rawInput: rawInputText } }],
      timestamp: new Date().toISOString(),
    };`
);

code = code.replace(
  /const sysMsg = msgs\.find\(\(m: any\) => m\?\.id === systemMsgId\);/g,
  `const sysMsg = msgs.find((m: any) => m?.id === systemMsgId2);`
);

// 5. Update render loop for WhatsApp style
code = code.replace(
  /msg\.type === 'user' \? 'justify-end' : 'justify-start'/g,
  `msg.type === 'user' ? 'justify-end' : msg.type === 'pipeline' ? 'justify-center' : 'justify-start'`
);

code = code.replace(
  /msg\.type === 'system' && \([\s\S]*?\}\)/,
  `msg.type === 'assistant' && (
                <FlowIcon className="flex-shrink-0 mt-1" />
              )`
);

code = code.replace(
  /msg\.type === 'user'[\s\S]*?\? 'bg-blue-50 border border-blue-100 px-5 py-3'[\s\S]*?: 'bg-gray-50 border border-gray-200 px-5 py-4 w-full'/,
  `msg.type === 'user'
                  ? 'bg-green-100 border border-green-200 px-5 py-3 text-green-900 shadow-sm'
                  : msg.type === 'pipeline'
                  ? 'bg-transparent border border-dashed border-gray-300 px-4 py-2 max-w-2xl text-center'
                  : 'bg-white border border-gray-200 px-5 py-4 w-full shadow-sm'`
);

// Remove the inline ClarificationForm
code = code.replace(
  /\{\/\* Clarification Form \*\/\}[\s\S]*?\{\/\* Final result \*\/\}/,
  `{/* Clarification is now handled as an assistant chat bubble */}
                    {/* Final result */}`
);

// Adjust rendering block to support pipeline (audit log) correctly
code = code.replace(
  /msg\.type === 'user' \? \([\s\S]*?\) : \([\s\S]*?<div className="space-y-3">/,
  `msg.type === 'user' ? (
                  <p className="text-sm font-medium">{msg.content}</p>
                ) : msg.type === 'pipeline' ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-2">
                       <Loader2 className={cn("w-3.5 h-3.5", processing ? "animate-spin text-blue-500" : "text-gray-400")} />
                       <span>{msg.content}</span>
                    </div>
`
);

// Fix the final bracket for pipeline rendering
// Wait, replacing JSX is tricky with regex. Let me do it cleanly.
// Let's rewrite the render block completely using a simpler match.

fs.writeFileSync('scratch/rewrite2.js', code);
console.log('done preliminary replacements');
