"use client";

import React, { useEffect, useRef, useState } from "react";
import { Send, Download, Sparkles, Cpu, Pencil, Check, X, GitBranch, RotateCw, Copy, Tag, Archive } from "lucide-react";
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

// Phase 14 — bundle types
interface ConceptDiff { path: string; status: "added" | "changed" | "unchanged" | "removed" }
interface BundleVersionView {
  id: string; versionNo: number | null; state: string; parentVersionId: string | null;
  label: string; outcome: string | null; personaLabel: string | null;
  costActual: { amount: number; currency: string } | null;
  understandingSnapshot: Record<string, string>;
  builtAt: string; publishedAt: string | null; supersededByVersionId: string | null;
  concepts: { path: string; contentHash: string; frontmatter: Record<string, string>; body: string; okfType: string }[];
}
interface BundleView {
  id: string; intentId: string;
  draftHeadVersionId: string | null;
  latestPublishedVersionId: string | null;
  versions: BundleVersionView[]; drafts: BundleVersionView[]; published: BundleVersionView[];
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
  const [bundle, setBundle] = useState<BundleView | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [publishName, setPublishName] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [versionDetail, setVersionDetail] = useState<string | null>(null);
  const [versionDiff, setVersionDiff] = useState<ConceptDiff[] | null>(null);
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
      const data = await safeJson(res);
      if (!res.ok) { console.error("send failed:", data); setError(typeof data?.error === "string" ? data.error : "Couldn't reach the agent. Please try again."); return; }
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
      console.error("send error:", e);
      setError("Couldn't reach the agent. Please try again.");
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
      const data = await safeJson(res);
      if (!res.ok) { console.error("selectPersona failed:", data); setError(typeof data?.error === "string" ? data.error : "Couldn't set the mode. Please try again."); return; }
      setView(data.view);
      setMessages((m) => [...m, { role: "agent", content: data.reply }]);
      setAwaitingPersona(Array.isArray(data.moves) && data.moves.some((mv: Move) => mv.kind === "select_persona"));
      setAwaitingBuild(Array.isArray(data.moves) && data.moves.some((mv: Move) => mv.kind === "offer_build"));
      setAwaitingOutcome(Array.isArray(data.moves) && data.moves.some((mv: Move) => mv.kind === "ask_outcome"));
    } catch (e) {
      console.error("selectPersona error:", e);
      setError("Couldn't set the mode. Please try again.");
    } finally { setLoading(false); }
  }

  // The user approved building the working memory (ADR-0002) — the one run.
  async function buildMemory() {
    if (!intentId || building) return;
    const rebuild = view?.record.built === true;
    setError(null);
    setBuilding(true);
    setAwaitingBuild(false);
    setMessages((m) => [...m, { role: "user", content: rebuild ? "Rebuild the plan." : "Build the working memory." }]);
    try {
      const res = await fetch("/api/agent/turn", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: intentId, build: true, rebuild, history: messages }),
      });
      const data = await safeJson(res);
      if (!res.ok) { console.error("build failed:", data); setError(typeof data?.error === "string" ? data.error : "The build didn't finish. Please try again."); return; }
      setView(data.view);
      setMessages((m) => [...m, { role: "agent", content: data.reply }]);
    } catch (e) {
      console.error("build error:", e);
      setError("The build didn't finish. Please try again.");
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
      const data = await safeJson(res);
      if (!res.ok) { console.error("answerOutcome failed:", data); setError(typeof data?.error === "string" ? data.error : "Couldn't send that. Please try again."); return; }
      setView(data.view);
      setMessages((m) => [...m, { role: "agent", content: data.reply }]);
      setAwaitingBuild(Array.isArray(data.moves) && data.moves.some((mv: Move) => mv.kind === "offer_build"));
      setAwaitingOutcome(Array.isArray(data.moves) && data.moves.some((mv: Move) => mv.kind === "ask_outcome"));
    } catch (e) {
      console.error("answerOutcome error:", e);
      setError("Couldn't send that. Please try again.");
    } finally { setLoading(false); }
  }

  // Parse a response body without ever throwing on the client — a truncated or
  // non-JSON body must not become a raw "Unexpected end of JSON input" in the UI.
  async function safeJson(res: Response): Promise<any> {
    try { return await res.json(); } catch { return {}; }
  }

  function downloadFile(name: string, content: string) {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  // Split an OKF file's YAML front-matter from its markdown body so the viewer
  // can render the metadata as a clean key/value header instead of a run-on blob
  // (ReactMarkdown would otherwise mis-parse `--- … ---` as a setext heading).
  function splitOkf(content: string): { meta: [string, string][]; body: string } {
    const m = content.match(/^﻿?---\s*\n([\s\S]*?)\n---\s*\n?/);
    if (!m) return { meta: [], body: content };
    const meta: [string, string][] = [];
    for (const line of m[1].split("\n")) {
      const i = line.indexOf(":");
      if (i === -1) continue;
      const key = line.slice(0, i).trim();
      const val = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      if (key) meta.push([key, val]);
    }
    return { meta, body: content.slice(m[0].length) };
  }

  // Phase 14 — load the bundle (drafts + published versions) after a build/refine
  async function loadBundle() {
    if (!intentId || !view?.record?.built) return;
    try {
      const res = await fetch(`/api/bundle/${intentId}`);
      if (res.ok) setBundle(await res.json());
    } catch { /* ignore */ }
  }

  useEffect(() => { loadBundle(); }, [intentId, view?.record?.built]);

  async function publish() {
    if (!intentId || publishing) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/bundle/${intentId}/publish`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: publishName || undefined }),
      });
      if (res.ok) { setPublishName(""); await loadBundle(); }
    } catch { /* ignore */ } finally { setPublishing(false); }
  }

  async function regenerateConcept(path: string) {
    if (!intentId || regenerating) return;
    setRegenerating(path);
    try {
      const res = await fetch(`/api/bundle/${intentId}/regenerate-concept`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptPath: path }),
      });
      const data = await safeJson(res);
      if (res.ok) { setView(data.view); await loadBundle(); }
    } catch { /* ignore */ } finally { setRegenerating(null); }
  }

  async function restoreVersion(versionId: string) {
    try {
      const res = await fetch(`/api/bundle/versions/${versionId}/restore-as-draft`, { method: "POST" });
      if (res.ok) await loadBundle();
    } catch { /* ignore */ }
  }

  async function deprecateVersion(versionId: string) {
    try {
      const res = await fetch(`/api/bundle/versions/${versionId}/deprecate`, { method: "POST" });
      if (res.ok) await loadBundle();
    } catch { /* ignore */ }
  }

  async function archiveVersion(versionId: string) {
    try {
      const res = await fetch(`/api/bundle/versions/${versionId}/archive`, { method: "POST" });
      if (res.ok) await loadBundle();
    } catch { /* ignore */ }
  }

  function copyVersionLink(versionNo: number | null) {
    if (!intentId || versionNo == null) return;
    navigator.clipboard.writeText(`${window.location.origin}/i/${intentId}/v${versionNo}`).catch(() => {});
  }

  async function loadVersionDetail(versionId: string) {
    try {
      const res = await fetch(`/api/bundle/versions/${versionId}`);
      if (res.ok) {
        const v = await res.json();
        setVersionDetail(versionId);
        if (v.parentVersionId) {
          fetch(`/api/bundle/${intentId}`).then(r => r.json()).then((b: BundleView) => {
            const parent = b.versions.find((x) => x.id === v.parentVersionId);
            if (parent) {
              const parentMap = new Map(parent.concepts.map((c: any) => [c.path, c.contentHash]));
              const childMap = new Map((v.concepts as any[]).map((c: any) => [c.path, c.contentHash]));
              const allPaths = new Set([...parentMap.keys(), ...childMap.keys()]);
              const diff: ConceptDiff[] = [];
              for (const path of allPaths) {
                const ph = parentMap.get(path), ch = childMap.get(path);
                if (ch && !ph) diff.push({ path, status: "added" });
                else if (!ch && ph) diff.push({ path, status: "removed" });
                else if (ch && ph && ch !== ph) diff.push({ path, status: "changed" });
                else diff.push({ path, status: "unchanged" });
              }
              setVersionDiff(diff.sort((a, b) => a.path.localeCompare(b.path)));
            }
          });
        } else {
          setVersionDiff(null);
        }
      }
    } catch { /* ignore */ }
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
                <span className="shrink-0 flex items-center gap-2 whitespace-nowrap">
                  <span title="Estimated cost of the build run, before it runs" className="text-gray-500">
                    Est. <span className="font-mono text-gray-700">${view.cost.high.toFixed(3)}</span>
                  </span>
                  {view.record.built && typeof view.record.actualCost === "number" && (
                    <span title="Actual cost, measured after the build ran" className="text-emerald-700">
                      · Actual <span className="font-mono">${view.record.actualCost.toFixed(5)}</span>
                    </span>
                  )}
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
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span className="shrink-0">⚠</span>
                <span className="flex-1">{error}</span>
                <button onClick={() => setError(null)} className="shrink-0 text-red-400 hover:text-red-600" title="Dismiss"><X className="w-4 h-4" /></button>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="border-t border-gray-100">
            {/* Build — always visible when a mode is chosen; the user decides whether the context is full enough (point 5) */}
            {view?.selectedPersona && !awaitingPersona && !awaitingOutcome && (
              <div className="px-3 pt-3 flex items-center gap-2">
                <button onClick={buildMemory} disabled={building}
                  className={`px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0 ${view.readiness.readiness === "ready" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-500 hover:bg-amber-600"}`}>
                  {building ? "Building…" : <><Sparkles className="w-4 h-4" /> {view.record.built ? "Rebuild" : view.readiness.readiness === "ready" ? "Build the plan" : "Build anyway"}</>}
                </button>
                <span className="text-[11px] text-gray-400 leading-snug">
                  {view.record.built
                    ? "Edit any field, then rebuild to regenerate the files."
                    : view.readiness.readiness === "ready"
                      ? "Ready — build the deliverable whenever you like."
                      : "Still gathering context — build now, or answer a bit more first."}
                </span>
              </div>
            )}
            <div className="p-3 flex gap-2">
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
        </div>

        {/* Right column — three distinct cards, independent scroll (point 4) */}
        <div className="flex flex-col h-full gap-3 overflow-hidden hidden lg:flex">
          {/* 1 · Artifacts — the deliverable files only */}
          <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden shrink-0 flex flex-col max-h-[42%]">
            <div className="px-4 py-3 border-b border-gray-100 shrink-0 flex items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold text-gray-800">Artifacts</h2>
                <p className="text-xs text-gray-400">the deliverable — open or download</p>
              </div>
              {bundle && (bundle.drafts.length > 0 || bundle.published.length > 0) && (
                <button onClick={() => setShowVersions(true)} className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:border-indigo-300 text-gray-600 hover:text-indigo-700 inline-flex items-center gap-1 shrink-0">
                  <GitBranch className="w-3.5 h-3.5" /> {bundle.published.length > 0 ? `v${bundle.published.find((v) => v.id === bundle.latestPublishedVersionId)?.versionNo ?? 0}` : "Drafts"} ({bundle.versions.length})
                </button>
              )}
            </div>
            <div className="p-3 space-y-2 overflow-y-auto">
              {!view ? (
                <p className="text-gray-400 text-sm px-1 py-1.5">No intent yet — send a message to begin.</p>
              ) : view.record.files && view.record.files.length > 0 ? (
                <>
                  <div className="text-[11px] text-gray-400 px-1 flex items-center gap-1"><Download className="w-3 h-3" /> Files · OKF</div>
                  {view.record.files.map((f) => (
                    <div key={f.name} className="border border-indigo-100 rounded-lg p-2 flex items-center gap-2 group">
                      <button onClick={() => setFileView({ name: f.name, content: f.content })} className="text-sm text-indigo-700 font-mono flex-1 text-left hover:underline">{f.name}</button>
                      <button onClick={() => regenerateConcept(f.name)} title="Regenerate this file" disabled={!!regenerating}
                        className="text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition disabled:opacity-30">
                        {regenerating === f.name ? <span className="text-[10px] animate-pulse">…</span> : <RotateCw className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => downloadFile(f.name, f.content)} title="Download" className="text-gray-400 hover:text-gray-700"><Download className="w-4 h-4" /></button>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-xs text-gray-400 px-1 py-1.5">Files appear here once you Build — the plan / diagram / doc for your intent.</div>
              )}
            </div>
          </div>

          {/* 2 · Understanding — the reasoning behind the deliverable, fills live */}
          {view && (
            <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden flex-1 min-h-0 flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100 shrink-0 flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-gray-800">Understanding</h2>
                  <p className="text-xs text-gray-400">how the agent reads your intent — updates live</p>
                </div>
                <span className="text-[11px] font-mono text-gray-400 shrink-0">{view.readiness.requiredStrong}/{view.readiness.required} strong</span>
              </div>
              <div className="p-3 space-y-2 overflow-y-auto">
                {view.schema.map((s) => {
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
              </div>
            </div>
          )}

          {/* 3 · Context Graph — its own card */}
          {view?.record.built && graphData && (graphData.topics.length > 0 || graphData.contexts.length > 0) && (
            <div className="bg-white shadow-sm border border-gray-200 rounded-2xl h-[240px] shrink-0 overflow-hidden">
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
            <div className="flex-1 overflow-y-auto px-7 py-6">
              {(() => {
                const { meta, body } = splitOkf(fileView.content);
                return (
                  <>
                    {meta.length > 0 && (
                      <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3">
                        <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-2">Open Knowledge Format</div>
                        <div className="space-y-1">
                          {meta.map(([k, v]) => (
                            <div key={k} className="flex gap-3 text-xs">
                              <span className="text-gray-400 font-mono w-24 shrink-0">{k}</span>
                              <span className="text-gray-700 font-mono break-all">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="prose prose-sm max-w-none prose-pre:bg-gray-50 prose-pre:text-gray-800 prose-pre:border prose-pre:border-gray-100">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
                    </div>
                  </>
                );
              })()}
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
    {/* Phase 14 — Versions & Drafts drawer */}
      {showVersions && bundle && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" onClick={() => { setShowVersions(false); setVersionDetail(null); setVersionDiff(null); }} />
          <div className="relative z-50 w-full max-w-xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-semibold text-gray-800">Drafts & Versions</h2>
              </div>
              <button onClick={() => { setShowVersions(false); setVersionDetail(null); setVersionDiff(null); }} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Publish section — visible when a draftHead exists */}
              {bundle.draftHeadVersionId && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                  <div className="text-sm font-medium text-emerald-900 mb-2">Publish this draft as a version</div>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                      placeholder="Version name (optional — defaults to the latest refine label)"
                      value={publishName} onChange={(e) => setPublishName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") publish(); }}
                    />
                    <button onClick={publish} disabled={publishing}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shrink-0">
                      {publishing ? "Publishing…" : "Publish"}
                    </button>
                  </div>
                </div>
              )}

              {/* Published versions */}
              {bundle.published.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">Published</h3>
                  <div className="space-y-2">
                    {bundle.published.slice().reverse().map((v) => {
                      const isLatest = v.id === bundle.latestPublishedVersionId;
                      const isOpen = versionDetail === v.id;
                      return (
                        <div key={v.id} className={`rounded-lg border p-3 ${isLatest ? "border-indigo-200 bg-indigo-50/30" : "border-gray-200"}`}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium text-gray-800">v{v.versionNo}</span>
                            {isLatest && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">latest</span>}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${v.state === "SUPERSEDED" ? "bg-gray-100 text-gray-500" : v.state === "DEPRECATED" ? "bg-amber-100 text-amber-700" : v.state === "ARCHIVED" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}>{v.state.toLowerCase()}</span>
                            <span className="text-xs text-gray-500 truncate flex-1">{v.label}</span>
                            <span className="text-[10px] text-gray-400 shrink-0">{new Date(v.publishedAt ?? v.builtAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <button onClick={() => isOpen ? (setVersionDetail(null), setVersionDiff(null)) : loadVersionDetail(v.id)} className="text-xs text-indigo-600 hover:underline">
                              {isOpen ? "Hide" : "View"}
                            </button>
                            <button onClick={() => copyVersionLink(v.versionNo)} className="text-xs text-gray-500 hover:text-indigo-600 inline-flex items-center gap-1"><Copy className="w-3 h-3" /> Link</button>
                            <button onClick={() => restoreVersion(v.id)} className="text-xs text-gray-500 hover:text-indigo-600">Restore</button>
                            {isLatest && <button onClick={() => deprecateVersion(v.id)} className="text-xs text-gray-500 hover:text-amber-600 inline-flex items-center gap-1"><Tag className="w-3 h-3" /> Deprecate</button>}
                            <button onClick={() => archiveVersion(v.id)} className="text-xs text-gray-500 hover:text-red-600 inline-flex items-center gap-1"><Archive className="w-3 h-3" /> Archive</button>
                          </div>
                          {isOpen && versionDiff && (
                            <div className="mt-2 border-t border-gray-100 pt-2">
                              <div className="text-[10px] uppercase text-gray-400 mb-1">What changed vs parent</div>
                              <div className="space-y-0.5">
                                {versionDiff.map((d) => (
                                  <div key={d.path} className="flex items-center gap-2 text-xs">
                                    <span className={`w-1.5 h-1.5 rounded-full ${d.status === "changed" ? "bg-amber-400" : d.status === "added" ? "bg-emerald-400" : d.status === "removed" ? "bg-red-400" : "bg-gray-300"}`} />
                                    <span className="font-mono text-gray-600">{d.path}</span>
                                    <span className="text-gray-400">{d.status}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Draft trail */}
              {bundle.drafts.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">Drafts</h3>
                  <div className="space-y-1.5">
                    {bundle.drafts.slice(0, 10).map((d) => (
                      <div key={d.id} className={`rounded-lg border px-3 py-2 flex items-center gap-2 ${d.id === bundle.draftHeadVersionId ? "border-indigo-200 bg-indigo-50/20" : "border-gray-100"}`}>
                        {d.id === bundle.draftHeadVersionId && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">current</span>}
                        <span className="text-xs text-gray-700 truncate flex-1">{d.label}</span>
                        <span className="text-[10px] text-gray-400 shrink-0">{new Date(d.builtAt).toLocaleString()}</span>
                        <button onClick={() => restoreVersion(d.id)} className="text-xs text-gray-500 hover:text-indigo-600 shrink-0">Restore</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bundle.versions.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No versions yet — build or refine, then publish.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
