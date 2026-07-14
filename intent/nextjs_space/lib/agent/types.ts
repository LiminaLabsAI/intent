/**
 * Phase 7 — The Deterministic Trunk: core contracts.
 *
 * Pure, DB-agnostic, LLM-agnostic types the deterministic rails operate on.
 * Refs: specs/vision/product-design.md §3.6 (primitives), §3.8 (layered schema),
 * §3.9 (strength function), §4.5 (lifecycle).
 *
 * No `enum` on purpose — union types keep this file erasable, so it runs under
 * Node's native TypeScript type-stripping (zero-dep `node --test`). Prisma enums
 * are mapped at the persistence boundary only.
 */

// ── Intent classification (§3.8) ─────────────────────────────────────────────
/** The governed intent types; classification selects a slot template. */
export type IntentType = 'CHANGE' | 'CREATE' | 'ANALYZE' | 'REPORT';
export const INTENT_TYPES: readonly IntentType[] = ['CHANGE', 'CREATE', 'ANALYZE', 'REPORT'];

// ── Slot states & gaps (§3.6) ────────────────────────────────────────────────
/** A slot's assessed state. Any non-`strong` state IS a typed gap. */
export type SlotState = 'empty' | 'weak' | 'ambiguous' | 'conflicting' | 'strong';

/** The typed gap that drives the DECIDE policy (§3.5). */
export type GapType = 'missing' | 'vague' | 'ambiguous' | 'conflicting' | 'unverified';

/** Coarse state → primary gap type. The judge may refine 'weak' → 'unverified'. */
export function gapForState(state: SlotState): GapType | null {
  switch (state) {
    case 'empty': return 'missing';
    case 'weak': return 'vague';
    case 'ambiguous': return 'ambiguous';
    case 'conflicting': return 'conflicting';
    case 'strong': return null;
  }
}

// ── Readiness (§3.9) ─────────────────────────────────────────────────────────
/** User-facing readiness band. Derived purely from slot states. 🔴 🟡 🟢 */
export type Readiness = 'vague' | 'actionable' | 'ready';

// ── Risk & requiredness (§3.9 requiredness matrix) ───────────────────────────
export type Risk = 'low' | 'medium' | 'high';
/** Whether a slot must be `strong` for readiness. Varies by intent-type × risk. */
export type Requiredness = 'required' | 'recommended' | 'optional';

/** How much work the intent implies — drives right-sized rigor (§3.11). */
export type Complexity = 'trivial' | 'moderate' | 'complex';

/** The cheap up-front sizing of an intent (§3.11 step 1). */
export interface ComplexityAssessment {
  risk: Risk;
  complexity: Complexity;
  rationale?: string;
}

/** A built deliverable file (ADR-0002 amendment) — OKF markdown, named by the outcome. */
export interface PlanFile {
  name: string;    // 'plan.md' | 'diagram.md' | 'script.md' … — named by the outcome
  content: string; // OKF markdown (full spec)
  format: string;  // 'plan' | 'diagram' | 'script' | 'doc'
}

/** Pre-execution cost advisory — a RANGE, never a bill (§5.2). */
export interface CostEstimate {
  low: number;
  high: number;
  currency: string;
  persona: string;
  assumptions: string[];
  refineToSave?: number;
  /** Working memory exceeds the model's context window → recommend compress/RAG (§5.1). */
  overflow?: boolean;
}

// ── Schema (§3.8 layered: spine · template · emergent) ───────────────────────
export type SlotLayer = 'spine' | 'template' | 'emergent';

/** The universal spine slot keys (§3.9). Templates/emergent add more keys. */
export type SpineSlotKey =
  | 'objective' | 'scope' | 'out_of_scope' | 'context' | 'entities' | 'acceptance_criteria';

export type SlotKey = string;

/** A slot definition in the schema registry — the governed artifact. */
export interface SlotDef {
  key: SlotKey;
  label: string;
  layer: SlotLayer;
  /** One line: what this slot captures. */
  describe: string;
  /** The rubric: what makes this slot `strong` (§3.9, governed). */
  rubric: string;
  /** Requiredness by risk (the requiredness matrix lookup). */
  requiredness: Record<Risk, Requiredness>;
}

/** A concrete slot instance on a record: value + assessed state + evidence. */
export interface Slot {
  key: SlotKey;
  value: string | null;
  state: SlotState;
  /** Why the judge assigned this state (first-class evidence, §3.9). */
  reason?: string;
  evidence?: string[];
  /** The agent inferred this value (user didn't state it) — badge it, invite a correction. */
  inferred?: boolean;
}

// ── Lifecycle (§4.5) — maps to Prisma IntentStatus at the persistence boundary ─
export type LifecycleState =
  | 'DRAFT' | 'IN_PROGRESS' | 'NEEDS_CLARIFICATION'
  | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';

// ── Events (event-sourced record, §2 / §3.4) ─────────────────────────────────
/** Common fields on every event. `at` is an ISO timestamp; `by` is user|agent id. */
export interface EventBase {
  at: string;
  by: string;
}

/** The append-only event log is the source of truth; the record is materialized. */
export type IntentEvent =
  | (EventBase & { kind: 'created'; rawInput: string })
  | (EventBase & { kind: 'classified'; intentType: IntentType })
  | (EventBase & { kind: 'slot_added'; def: SlotDef })
  | (EventBase & { kind: 'slot_valued'; key: SlotKey; value: string; inferred?: boolean })
  | (EventBase & { kind: 'slot_assessed'; key: SlotKey; state: SlotState; reason?: string; evidence?: string[] })
  | (EventBase & { kind: 'transitioned'; to: LifecycleState })
  | (EventBase & { kind: 'sized'; risk: Risk; complexity: Complexity; rationale?: string })
  | (EventBase & { kind: 'persona_selected'; persona: string })
  | (EventBase & { kind: 'outcome_set'; outcome: string })
  | (EventBase & { kind: 'built'; actualCost: number; currency: string })
  | (EventBase & { kind: 'plan_built'; files: PlanFile[]; actualCost: number; currency: string });

export type EventKind = IntentEvent['kind'];

/** A conversational turn — recent history passed to Perceive/Narrate for context. */
export interface ChatTurn {
  role: 'user' | 'agent';
  content: string;
}

// ── Materialized record ──────────────────────────────────────────────────────
/** The current-state view, derived deterministically by replaying the event log. */
export interface IntentRecord {
  id: string;
  version: number;
  rawInput: string;
  intentType: IntentType | null;
  /** Right-sizing inputs (§3.11) — default medium/null until Perceive sizes it. */
  risk: Risk;
  complexity: Complexity | null;
  /** The user-chosen mode/persona that governs refinement rigor + downstream run.
   *  null until the user picks it (the agent recommends one and gates on the choice). */
  persona: string | null;
  /** The working memory has been BUILT (ADR-0002) — the one run that materializes it. */
  built: boolean;
  /** Measured cost of the build run (USD), null until built. */
  actualCost: number | null;
  /** What the user wants built — plan/diagram/script/doc (ADR-0002 amendment). null until asked. */
  outcome: string | null;
  /** The built deliverable files (OKF markdown). Empty until built. */
  files: PlanFile[];
  state: LifecycleState;
  /** Materialized slots, keyed by slot key. */
  slots: Record<SlotKey, Slot>;
}
