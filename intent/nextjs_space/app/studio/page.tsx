'use client';

import { useEffect, useRef, useState } from 'react';

type SlotState = 'empty' | 'weak' | 'ambiguous' | 'conflicting' | 'strong';
interface Slot { key: string; value: string | null; state: SlotState; reason?: string }
interface SlotSummary { key: string; label: string; layer: string; requiredness: string; describe: string }
interface View {
  record: { id: string; version: number; intentType: string | null; state: string; slots: Record<string, Slot> };
  readiness: { readiness: 'vague' | 'actionable' | 'ready'; required: number; requiredStrong: number; conflicts: string[] };
  schema: SlotSummary[];
}
interface Msg { role: 'user' | 'agent'; content: string }

const STATE_COLOR: Record<SlotState, string> = {
  empty: 'bg-gray-300', weak: 'bg-amber-400', ambiguous: 'bg-orange-500', conflicting: 'bg-red-500', strong: 'bg-emerald-500',
};
const READINESS: Record<string, { label: string; dot: string; cls: string }> = {
  vague: { label: 'Vague', dot: '🔴', cls: 'text-red-700 bg-red-50 border-red-200' },
  actionable: { label: 'Actionable', dot: '🟡', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  ready: { label: 'Ready', dot: '🟢', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
};

export default function StudioPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [id, setId] = useState<string | undefined>();
  const [view, setView] = useState<View | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  async function send() {
    const message = input.trim();
    if (!message || loading) return;
    const history = messages; // conversation so far (before this turn) — for agent memory
    setInput('');
    setError(null);
    setMessages((m) => [...m, { role: 'user', content: message }]);
    setLoading(true);
    try {
      const res = await fetch('/api/agent/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, message, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'turn failed');
      setId(data.id);
      setView(data.view);
      setMessages((m) => [...m, { role: 'agent', content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const r = view ? READINESS[view.readiness.readiness] : null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] gap-4 p-4 bg-gray-50">
      {/* Conversation */}
      <div className="flex-1 flex flex-col rounded-xl border bg-white overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-lg">Intent Studio</h1>
            <p className="text-xs text-gray-500">Describe what you want — the agent drives it to a governed, execution-ready record.</p>
          </div>
          {r && <span className={`text-sm px-3 py-1 rounded-full border ${r.cls}`}>{r.dot} {r.label}</span>}
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {messages.length === 0 && (
            <div className="text-gray-400 text-sm mt-10 text-center">
              Try:{' '}
              <button className="underline text-indigo-500" onClick={() => setInput('Migrate our auth to OAuth')}>
                “Migrate our auth to OAuth”
              </button>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              <div className={`inline-block px-4 py-2 rounded-2xl max-w-[80%] text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-left">
              <div className="inline-block px-4 py-2 rounded-2xl bg-gray-100 text-gray-400 text-sm">thinking…</div>
            </div>
          )}
          {error && <div className="text-red-600 text-sm">⚠ {error}</div>}
          <div ref={endRef} />
        </div>
        <div className="p-3 border-t flex gap-2">
          <input
            className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="Describe your intent…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            disabled={loading}
          />
          <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-50" onClick={send} disabled={loading}>
            Send
          </button>
        </div>
      </div>

      {/* Live record */}
      <div className="w-96 flex flex-col rounded-xl border bg-white overflow-hidden">
        <div className="px-5 py-3 border-b">
          <h2 className="font-semibold">Working memory</h2>
          <p className="text-xs text-gray-500">{view?.record.intentType ? `${view.record.intentType} intent` : 'the record builds itself'}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {!view && <p className="text-gray-400 text-sm">No intent yet — send a message to begin.</p>}
          {view && (
            <>
              <div className="text-xs text-gray-500 mb-2">
                {view.readiness.requiredStrong}/{view.readiness.required} required slots strong
              </div>
              {view.schema.map((s) => {
                const slot = view.record.slots[s.key];
                const state: SlotState = slot?.state ?? 'empty';
                return (
                  <div key={s.key} className="border rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${STATE_COLOR[state]}`} />
                      <span className="text-sm font-medium">{s.label}</span>
                      <span className="text-[10px] uppercase text-gray-400 ml-auto">{s.requiredness}</span>
                    </div>
                    <div className="text-xs mt-1 pl-4">
                      {slot?.value ? <span className="text-gray-700">{slot.value}</span> : <span className="text-gray-300">{s.describe}</span>}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
