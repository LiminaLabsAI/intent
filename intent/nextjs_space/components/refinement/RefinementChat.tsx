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
interface PersonaOption { id: string; name: string; low: number; high: number; currency: string; reasoningDepth: string; promptStyle: string; recommended: boolean }
interface Move { kind: string; slot?: string }
interface View {
  record: { id: string; version: number; intentType: string | null; state: string; rawInput?: string; risk?: string; complexity?: string | null; persona?: string | null; built?: boolean; actualCost?: number | null; slots: Record<string, Slot> };
  readiness: { readiness: "vague" | "actionable" | "ready"; required: number; requiredStrong: number; conflicts: string[] };
  schema: SlotSummary[];
  cost?: CostEstimate;
  personas?: PersonaOption[];
  selectedPersona?: string | null;
}

const PERSONA_BLURB: Record<string, string> = {
  fast: "Quick pass — light refinement, cheapest run",
  balanced: "Balanced — standard rigor and cost",
  thorough: "Deep dive — most rigorous, premium run",
};

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
  const [building, setBuilding] = useState(false);
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

  function exportMd() {
    if (!view) return;
    const r = view.record;
    const lines = [`# ${r.slots["objective"]?.value || r.rawInput || "Intent"}`, ""];
    for (const s of view.schema) {
      const slot = r.slots[s.key];
      if (slot?.value) lines.push(`## ${s.label}`, slot.value, "");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "intent.md"; a.click();
    URL.revokeObjectURL(url);
  }

  const r = view ? READINESS[view.readiness.readiness] : null;
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
        {r && <span className={`text-sm px-3 py-1 rounded-full border ${r.cls}`}>{r.label}</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-hidden">
        {/* Chat */}
        <div className="flex flex-col h-full overflow-hidden bg-white shadow-sm border border-gray-200 rounded-2xl">
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.length === 0 && (
              <div className="text-gray-400 text-sm mt-10 text-center">
                Try <button className="underline text-indigo-500" onClick={() => setInput("Migrate our auth to OAuth")}>“Migrate our auth to OAuth”</button>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                <div className={`inline-block px-4 py-2 rounded-2xl max-w-[85%] text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-800"}`}>{m.content}</div>
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
                        <span className="text-sm font-semibold text-gray-800 capitalize">{p.name}</span>
                        {p.recommended && <span className="text-[9px] uppercase tracking-wide text-indigo-600 bg-indigo-50 border border-indigo-200 rounded px-1 py-0.5">suggested</span>}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">{PERSONA_BLURB[p.name] ?? `${p.reasoningDepth} reasoning · ${p.promptStyle}`}</div>
                      <div className="text-[11px] font-mono text-indigo-700 mt-1">${p.low.toFixed(3)}–${p.high.toFixed(3)}</div>
                    </button>
                  ))}
                </div>
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

        {/* Record panel */}
        <div className="flex flex-col h-full gap-3 overflow-y-auto hidden lg:flex">
          <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800">Working memory</h2>
                <p className="text-xs text-gray-500">{view?.record.intentType ? `${view.record.intentType} intent` : "the record builds itself"}</p>
              </div>
              {view && (
                <div className="flex items-center gap-2">
                  {view.record.built && <button onClick={exportMd} title="Export markdown" className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> MD</button>}
                  {view.record.built && <button onClick={() => openArtifact("PRD")} className="px-2.5 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> {expanding === "PRD" ? "…" : "PRD"}</button>}
                  {view.record.built && artifacts.PRD && <button onClick={() => openArtifact("PLAN")} className="px-2.5 py-1.5 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> {expanding === "PLAN" ? "…" : "Plan"}</button>}
                </div>
              )}
            </div>
            <div className="p-3 space-y-2">
              {!view && <p className="text-gray-400 text-sm p-3">No intent yet — send a message to begin.</p>}
              {view && (
                <>
                  <div className="flex items-center gap-2 px-1">
                    <div className="text-xs text-gray-500">{view.readiness.requiredStrong}/{view.readiness.required} required slots strong</div>
                    {view.record.risk && <span className="text-[10px] uppercase tracking-wide text-gray-400">· {view.record.risk} risk{view.record.complexity ? ` · ${view.record.complexity}` : ""}</span>}
                  </div>
                  {view.cost && (
                    <div className="border border-indigo-100 bg-indigo-50/50 rounded-lg p-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-indigo-900 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> Est. execution cost</span>
                        <span className="font-mono text-indigo-800">${view.cost.low.toFixed(3)}–${view.cost.high.toFixed(3)}</span>
                      </div>
                      <div className="mt-1 text-indigo-700/80">Suggested persona: <span className="font-medium capitalize">{view.cost.persona}</span>{typeof view.cost.refineToSave === "number" && view.cost.refineToSave > 0 && <> · refining saves ~<span className="font-mono">${view.cost.refineToSave.toFixed(3)}</span> vs a frontier default</>}</div>
                      {view.cost.overflow && <div className="mt-1 text-[11px] text-amber-700">⚠ working memory exceeds the model's context window — will need compression or RAG</div>}
                      <div className="mt-1 text-[10px] text-indigo-400 leading-snug">{view.cost.assumptions.join(" · ")}</div>
                      {view.record.built && typeof view.record.actualCost === "number" && (
                        <div className="mt-1.5 pt-1.5 border-t border-indigo-100 text-emerald-700 font-medium">Actual (measured on build): <span className="font-mono">${view.record.actualCost.toFixed(5)}</span></div>
                      )}
                    </div>
                  )}
                  {/* Clarify phase (ADR-0002): the working memory is built on approval, not shown live */}
                  {!view.record.built && (
                    <div className="border border-dashed border-gray-200 rounded-lg p-3 text-center">
                      {awaitingBuild ? (
                        <>
                          <p className="text-xs text-gray-500 mb-2">Enough context gathered — build the working memory when you're ready.</p>
                          <button onClick={buildMemory} disabled={building}
                            className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1.5">
                            {building ? "Building…" : <><Sparkles className="w-4 h-4" /> Build working memory</>}
                          </button>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">The working memory builds once we've clarified enough — keep the conversation going.</p>
                      )}
                    </div>
                  )}
                  {view.record.built && view.schema.map((s) => {
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
            <div className="bg-white shadow-sm border border-gray-200 rounded-2xl min-h-[220px]">
              <MiniGraph intentData={graphData} />
            </div>
          )}

        </div>
      </div>

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
