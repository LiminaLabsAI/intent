"use client";

import React, { useEffect, useRef, useState } from "react";
import { Send, Download, Sparkles, Cpu, Pencil, Check, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MiniGraph from "./MiniGraph";

type Msg = { role: "user" | "agent"; content: string };
type SlotState = "empty" | "weak" | "ambiguous" | "conflicting" | "strong";
interface Slot { key: string; value: string | null; state: SlotState; reason?: string; inferred?: boolean }
interface SlotSummary { key: string; label: string; layer: string; requiredness: string; describe: string }
interface CostEstimate { low: number; high: number; currency: string; persona: string; assumptions: string[]; refineToSave?: number; overflow?: boolean }
interface PersonaOption { id: string; name: string; label: string; low: number; high: number; currency: string; reasoningDepth: string; promptStyle: string; recommended: boolean }
interface Move { kind: string; slot?: string }
interface View {
  record: { id: string; version: number; intentType: string | null; state: string; rawInput?: string; risk?: string; complexity?: string | null; persona?: string | null; built?: boolean; actualCost?: number | null; outcome?: string | null; files?: { name: string; format: string; content: string }[]; slots: Record<string, Slot> };
  readiness: { readiness: "vague" | "actionable" | "ready"; required: number; requiredStrong: number; conflicts: string[] };
  schema: SlotSummary[];
  cost?: CostEstimate;
  personas?: PersonaOption[];
  selectedPersona?: string | null;
}

const PERSONA_BLURB: Record<string, string> = {
  quick: "Light pass — fewest questions, cheapest run",
  balanced: "Standard rigor and cost",
  deep: "Deepest analysis — asks the most, premium run",
};
const OUTCOMES: { key: string; label: string }[] = [
  { key: "a full plan", label: "Plan" },
  { key: "a diagram", label: "Diagram" },
  { key: "a script or code", label: "Script" },
  { key: "a document", label: "Document" },
];

const STATE_COLOR: Record<SlotState, string> = {
  empty: "bg-gray-300", weak: "bg-amber-400", ambiguous: "bg-orange-500", conflicting: "bg-red-500", strong: "bg-emerald-500",
};
const READINESS: Record<string, { label: string; cls: string }> = {
  vague: { label: "🔴 Vague", cls: "bg-red-50 text-red-700 border-red-200" },
  actionable: { label: "🟡 Actionable", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  ready: { label: "🟢 Ready", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export default function RefinementChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ key: string; value: string } | null>(null);
  const [expanding, setExpanding] = useState<"PRD" | "PLAN" | null>(null);
  const [artifacts, setArtifacts] = useState<{ PRD?: string; PLAN?: string }>({});
  const [drawer, setDrawer] = useState<"PRD" | "PLAN" | null>(null);
  const [awaitingPersona, setAwaitingPersona] = useState(false);
  const [awaitingBuild, setAwaitingBuild] = useState(false);
  const [awaitingOutcome, setAwaitingOutcome] = useState(false);
  const [building, setBuilding] = useState(false);
  const [fileView, setFileView] = useState<{ name: string; content: string } | null>(null);
  const [showUnderstanding, setShowUnderstanding] = useState(true);
  const searchParams = useSearchParams();
  const idFromUrl = searchParams?.get("id") ?? null;
  const [intentId, setIntentId] = useState<string | null>(idFromUrl);
  const router = useRouter();
  const endRef = useRef<HTMLDivElement>(null);
  // The conversation currently on screen. We only load-from-server when the URL
  // points at a DIFFERENT intent — never wipe a live transcript (the id we just
  // minted, or a re-render/nav to the same id, is a no-op).
  const shownId = useRef<string | null>(null);

  useEffect(() => {
    if (idFromUrl === shownId.current) return; // already showing this conversation
    if (!idFromUrl) {
      shownId.current = null;
      setIntentId(null); setView(null); setMessages([]); setArtifacts({}); setInput("");
      return;
    }
    // Genuine navigation to a different, existing intent → load it. Fetch the
    // record (view) and the header (transcript + artifacts) together, then set
    // messages ONCE — prefer the saved transcript (FEAT-001), fall back to the
    // opening line — so the two fetches never race to overwrite each other.
    shownId.current = idFromUrl;
    setIntentId(idFromUrl);
    Promise.all([
      fetch(`/api/agent/record/${idFromUrl}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/intents/${idFromUrl}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([v, d]) => {
      if (v) setView(v);
      if (d?.artifacts) setArtifacts(d.artifacts);
      const transcript = Array.isArray(d?.transcript) ? (d.transcript as Msg[]) : null;
      if (transcript && transcript.length) setMessages(transcript);
      else if (v?.record?.rawInput) setMessages([{ role: "user", content: v.record.rawInput }]);
      // Reopened at the gate (classified, no mode chosen yet) → show the picker.
      setAwaitingPersona(!!v && !v.selectedPersona && v.record?.intentType != null);
      // Reopened at 🟢 with a mode chosen but not yet built → show the Build button.
      setAwaitingBuild(!!v && !v.record?.built && v.readiness?.readiness === "ready" && v.selectedPersona != null);
    });
  }, [idFromUrl]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function send() {
    const message = input.trim();
    if (!message || loading) return;
    const history = messages;
    setInput(""); setError(null);
    setMessages((m) => [...m, { role: "user", content: message }]);
    setLoading(true);
    try {
      const res = await fetch("/api/agent/turn", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: intentId, message, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "turn failed");
      setView(data.view);
      setMessages((m) => [...m, { role: "agent", content: data.reply }]);
      setAwaitingPersona(Array.isArray(data.moves) && data.moves.some((mv: Move) => mv.kind === "select_persona"));
      setAwaitingBuild(Array.isArray(data.moves) && data.moves.some((mv: Move) => mv.kind === "offer_build"));
      setAwaitingOutcome(Array.isArray(data.moves) && data.moves.some((mv: Move) => mv.kind === "ask_outcome"));
      if (data.id && data.id !== intentId) {
        // Mark as shown BEFORE the URL changes so the effect no-ops (keeps the transcript).
        shownId.current = data.id; setIntentId(data.id); router.replace(`/refine?id=${data.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  // The user picked a mode in the in-chat picker (§5.2 choice UX).
  async function selectPersona(name: string) {
    if (!intentId || loading) return;
    const history = messages;
    setError(null);
    setMessages((m) => [...m, { role: "user", content: `Selected the ${name} mode.` }]);
    setAwaitingPersona(false);
    setLoading(true);
    try {
      const res = await fetch("/api/agent/turn", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: intentId, personaSelection: name, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "selection failed");
      setView(data.view);
      setMessages((m) => [...m, { role: "agent", content: data.reply }]);
      setAwaitingPersona(Array.isArray(data.moves) && data.moves.some((mv: Move) => mv.kind === "select_persona"));
      setAwaitingBuild(Array.isArray(data.moves) && data.moves.some((mv: Move) => mv.kind === "offer_build"));
      setAwaitingOutcome(Array.isArray(data.moves) && data.moves.some((mv: Move) => mv.kind === "ask_outcome"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  // The user approved building the working memory (ADR-0002) — the one run.
  async function buildMemory() {
    if (!intentId || building) return;
    setError(null);
    setBuilding(true);
    setAwaitingBuild(false);
    setMessages((m) => [...m, { role: "user", content: "Build the working memory." }]);
    try {
      const res = await fetch("/api/agent/turn", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: intentId, build: true, history: messages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "build failed");
      setView(data.view);
      setMessages((m) => [...m, { role: "agent", content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBuilding(false); }
  }

  // The user picked the deliverable via the outcome chips — send it as a reply.
  async function answerOutcome(key: string) {
    if (!intentId || loading) return;
    const message = `I'd like ${key}.`;
    const history = messages;
    setAwaitingOutcome(false); setError(null);
    setMessages((m) => [...m, { role: "user", content: message }]);
    setLoading(true);
    try {
      const res = await fetch("/api/agent/turn", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: intentId, message, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "turn failed");
      setView(data.view);
      setMessages((m) => [...m, { role: "agent", content: data.reply }]);
      setAwaitingBuild(Array.isArray(data.moves) && data.moves.some((mv: Move) => mv.kind === "offer_build"));
      setAwaitingOutcome(Array.isArray(data.moves) && data.moves.some((mv: Move) => mv.kind === "ask_outcome"));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }

  function downloadFile(name: string, content: string) {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  async function saveSlot(key: string, value: string) {
    if (!intentId) { setEditing(null); return; }
    try {
      const res = await fetch(`/api/agent/record/${intentId}/slot`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (res.ok) setView(data);
    } catch (e) { /* ignore */ } finally { setEditing(null); }
  }

  async function expand(type: "PRD" | "PLAN") {
    if (!intentId) return;
    setExpanding(type);
    try {
      const res = await fetch("/api/expand", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentId, type }),
      });
      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      let text = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        text += dec.decode(value, { stream: true });
        setArtifacts((a) => ({ ...a, [type]: text }));
      }
    } catch (e) { /* ignore */ } finally { setExpanding(null); }
  }

  // Open the artifact drawer; generate on first open, otherwise just reveal it.
  function openArtifact(type: "PRD" | "PLAN") {
    setDrawer(type);
    if (!artifacts[type]) expand(type);
  }

  function downloadArtifact(type: "PRD" | "PLAN") {
    const md = artifacts[type];
    if (!md) return;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${type.toLowerCase()}.md`; a.click();
    URL.revokeObjectURL(url);
  }

  const r = view ? READINESS[view.readiness.readiness] : null;
  const modeLabel = view?.personas?.find((p) => p.name === view.selectedPersona)?.label ?? view?.selectedPersona ?? null;
  const graphData = view ? {
    topics: (view.record.slots["entities"]?.value || "").split(/[,;]/).map((s) => s.trim()).filter(Boolean).slice(0, 6).map((n, i) => ({ topic: { id: "e" + i, name: n } })),
    contexts: (view.record.slots["context"]?.value || "").split(/[,;]/).map((s) => s.trim()).filter(Boolean).slice(0, 4).map((n, i) => ({ context: { id: "c" + i, name: n } })),
  } : null;

  return (
    <div className="flex flex-col h-full overflow-hidden gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-gray-100 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Intent Studio</h1>
          <p className="text-sm text-gray-500 mt-0.5">Describe what you want — the agent drives it to a governed, execution-ready record.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-hidden">
        {/* Chat */}
        <div className="flex flex-col h-full overflow-hidden bg-white shadow-sm border border-gray-200 rounded-2xl">
          {/* Status · mode · cost — next to the conversation + Build (not in Artifacts) */}
          {view && (
            <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-gray-100 text-xs shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {r && <span className={`px-2 py-0.5 rounded-full border ${r.cls}`}>{r.label}</span>}
                {modeLabel && <span className="text-gray-500 truncate capitalize">{modeLabel} mode</span>}
              </div>
              {view.cost && (
                <span className="font-mono text-gray-600 shrink-0">
                  ${view.cost.low.toFixed(3)}–${view.cost.high.toFixed(3)}
                  {view.record.built && typeof view.record.actualCost === "number" && <span className="text-emerald-600"> · ${view.record.actualCost.toFixed(5)}</span>}
                </span>
              )}
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.length === 0 && (
              <div className="text-gray-400 text-sm mt-10 text-center">
                Try <button className="underline text-indigo-500" onClick={() => setInput("Migrate our auth to OAuth")}>“Migrate our auth to OAuth”</button>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                <div className={`inline-block px-4 py-2 rounded-2xl max-w-[85%] text-sm ${m.role === "user" ? "bg-indigo-600 text-white whitespace-pre-wrap" : "bg-gray-100 text-gray-800 text-left prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-1"}`}>{m.role === "agent" ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown> : m.content}</div>
              </div>
            ))}
            {loading && <div className="text-left"><div className="inline-block px-4 py-2 rounded-2xl bg-gray-100 text-gray-400 text-sm">thinking…</div></div>}
            {/* Persona/mode picker — the §5.2 choice UX, in the conversation */}
            {awaitingPersona && view?.personas && view.personas.length > 0 && !loading && (
              <div className="border border-indigo-100 bg-indigo-50/40 rounded-2xl p-3">
                <div className="text-xs font-medium text-indigo-900 mb-2">Choose how thorough I should be — this drives the analysis and the run cost:</div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {view.personas.map((p) => (
                    <button key={p.id} onClick={() => selectPersona(p.name)}
                      className={`text-left rounded-xl border p-2.5 transition hover:shadow-sm ${p.recommended ? "border-indigo-300 bg-white ring-1 ring-indigo-200" : "border-gray-200 bg-white hover:border-indigo-200"}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800">{p.label}</span>
                        {p.recommended && <span className="text-[9px] uppercase tracking-wide text-indigo-600 bg-indigo-50 border border-indigo-200 rounded px-1 py-0.5">suggested</span>}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">{PERSONA_BLURB[p.name] ?? `${p.reasoningDepth} reasoning · ${p.promptStyle}`}</div>
                      <div className="text-[11px] font-mono text-indigo-700 mt-1">${p.low.toFixed(3)}–${p.high.toFixed(3)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Outcome picker — what should the build produce (ADR-0002 amendment) */}
            {awaitingOutcome && !loading && (
              <div className="border border-indigo-100 bg-indigo-50/40 rounded-2xl p-3">
                <div className="text-xs font-medium text-indigo-900 mb-2">What should I produce for you?</div>
                <div className="flex flex-wrap gap-2">
                  {OUTCOMES.map((o) => (
                    <button key={o.key} onClick={() => answerOutcome(o.key)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white hover:border-indigo-300">{o.label}</button>
                  ))}
                </div>
              </div>
            )}
            {/* Build — in the conversation, always on, status-coloured (ADR-0002 amendment) */}
            {view && !view.record.built && view.selectedPersona && !awaitingPersona && !awaitingOutcome && !loading && (
              <div className="text-center pt-1">
                <button onClick={buildMemory} disabled={building}
                  className={`px-5 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 inline-flex items-center gap-1.5 ${view.readiness.readiness === "ready" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-500 hover:bg-amber-600"}`}>
                  {building ? "Building…" : <><Sparkles className="w-4 h-4" /> Build {view.readiness.readiness === "ready" ? "the plan" : "anyway"}</>}
                </button>
                {view.readiness.readiness !== "ready" && <div className="text-[11px] text-gray-400 mt-1">Still gathering context — build now, or answer a bit more first.</div>}
              </div>
            )}
            {error && <div className="text-red-600 text-sm">⚠ {error}</div>}
            <div ref={endRef} />
          </div>
          <div className="p-3 border-t border-gray-100 flex gap-2">
            <textarea
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
              rows={1} placeholder="Describe your intent…" value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              disabled={loading}
            />
            <button className="px-4 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-50" onClick={send} disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right column — Artifacts and Graph scroll independently */}
        <div className="flex flex-col h-full gap-3 overflow-hidden hidden lg:flex">
          <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-semibold text-gray-800">Artifacts</h2>
                <p className="text-xs text-gray-400">the deliverable + the understanding behind it</p>
              </div>
            </div>
            <div className="p-3 space-y-2 flex-1 min-h-0 overflow-y-auto">
              {!view && <p className="text-gray-400 text-sm p-3">No intent yet — send a message to begin.</p>}
              {view && (
                <>
                  {/* Files — the built deliverable, primary (ADR-0002 amendment) */}
                  {view.record.files && view.record.files.length > 0 ? (
                    <>
                      <div className="text-[11px] text-gray-400 px-1 flex items-center gap-1"><Download className="w-3 h-3" /> Files · OKF</div>
                      {view.record.files.map((f) => (
                        <div key={f.name} className="border border-indigo-100 rounded-lg p-2 flex items-center gap-2">
                          <button onClick={() => setFileView({ name: f.name, content: f.content })} className="text-sm text-indigo-700 font-mono flex-1 text-left hover:underline">{f.name}</button>
                          <button onClick={() => downloadFile(f.name, f.content)} title="Download" className="text-gray-400 hover:text-gray-700"><Download className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="text-xs text-gray-400 px-1 py-1.5">Files appear here once you Build.</div>
                  )}
                  {/* Understanding — collapsible; fills live during clarify */}
                  <button onClick={() => setShowUnderstanding((v) => !v)} className="w-full flex items-center gap-1 text-[11px] text-gray-400 px-1 pt-2 hover:text-gray-600">
                    <span className={showUnderstanding ? "inline-block" : "-rotate-90 inline-block"}>▾</span> Understanding · {view.readiness.requiredStrong}/{view.readiness.required} strong · updates live
                  </button>
                  {showUnderstanding && view.schema.map((s) => {
                    const slot = view.record.slots[s.key];
                    const state: SlotState = slot?.state ?? "empty";
                    const isEditing = editing?.key === s.key;
                    return (
                      <div key={s.key} className="border border-gray-100 rounded-lg p-2 group">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${STATE_COLOR[state]}`} />
                          <span className="text-sm font-medium text-gray-800">{s.label}</span>
                          <span className="text-[10px] uppercase text-gray-400">{s.requiredness}</span>
                          {slot?.inferred && <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 border border-sky-200" title="Agent inferred this — edit to correct">inferred</span>}
                          <button className="ml-auto opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700" onClick={() => setEditing({ key: s.key, value: slot?.value ?? "" })} title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {isEditing ? (
                          <div className="flex gap-1 mt-1 pl-4">
                            <input autoFocus className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs" value={editing!.value}
                              onChange={(e) => setEditing({ key: s.key, value: e.target.value })}
                              onKeyDown={(e) => { if (e.key === "Enter") saveSlot(s.key, editing!.value); if (e.key === "Escape") setEditing(null); }} />
                            <button className="text-emerald-600" onClick={() => saveSlot(s.key, editing!.value)}><Check className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <div className="text-xs mt-1 pl-4">
                            {slot?.value ? <span className="text-gray-700">{slot.value}</span> : <span className="text-gray-300">{s.describe}</span>}
                            {slot?.reason && slot.state !== "strong" && <div className="text-[11px] text-gray-400 italic mt-0.5">{slot.reason}</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {view?.record.built && graphData && (graphData.topics.length > 0 || graphData.contexts.length > 0) && (
            <div className="bg-white shadow-sm border border-gray-200 rounded-2xl h-[260px] shrink-0 overflow-hidden">
              <MiniGraph intentData={graphData} />
            </div>
          )}

        </div>
      </div>

      {/* File viewer — slides over to show an OKF file's content */}
      {fileView && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" onClick={() => setFileView(null)} />
          <div className="relative z-50 w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <span className="text-sm font-mono text-gray-800">{fileView.name}</span>
              <div className="flex items-center gap-3">
                <button onClick={() => downloadFile(fileView.name, fileView.content)} title="Download" className="text-gray-400 hover:text-gray-700"><Download className="w-4 h-4" /></button>
                <button onClick={() => setFileView(null)} title="Close" className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-7 py-6 prose prose-sm max-w-none prose-pre:bg-gray-50 prose-pre:text-gray-800 prose-pre:border prose-pre:border-gray-100">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{fileView.content}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Artifact drawer — slides over the studio so the working memory stays put */}
      {drawer && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" onClick={() => setDrawer(null)} />
          <div className="relative z-50 w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-1.5">
                {(["PRD", "PLAN"] as const).map((t) =>
                  (artifacts[t] || t === drawer) ? (
                    <button key={t} onClick={() => openArtifact(t)}
                      className={`px-3 py-1.5 text-sm rounded-lg font-medium ${drawer === t ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
                      {t === "PRD" ? "PRD" : "Plan"}
                    </button>
                  ) : null,
                )}
                {expanding === drawer && <span className="text-xs text-gray-400 ml-1 animate-pulse">generating…</span>}
              </div>
              <div className="flex items-center gap-3">
                {artifacts[drawer] && <button onClick={() => downloadArtifact(drawer)} title="Download markdown" className="text-gray-400 hover:text-gray-700"><Download className="w-4 h-4" /></button>}
                <button onClick={() => setDrawer(null)} title="Close" className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-7 py-6">
              {artifacts[drawer] ? (
                <div className="prose prose-sm max-w-none prose-headings:scroll-mt-4 prose-pre:bg-gray-50 prose-pre:text-gray-800 prose-pre:border prose-pre:border-gray-100">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{artifacts[drawer]}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-400 text-sm mt-6"><span className="inline-block w-3 h-3 rounded-full bg-indigo-400 animate-pulse" /> Generating {drawer === "PRD" ? "the PRD" : "the implementation plan"}…</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
