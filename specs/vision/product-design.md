---
type: Vision
---

# Flow — Product Design (Detailed Vision)

> **Status**: Product-vision / pre-build discussion · **Last Updated**: 2026-07-14
> **Companion to**: [`project-charter.md`](./project-charter.md) — the charter is the concise *why*; this is the in-detail *what* and *how*.
>
> **This is a vision-stage reference, not a build artifact.** It captures the full
> product discussion so we can reference it and pick features from it. When we
> actually start building, its pieces **graduate into momentum's native homes**:
> load-bearing calls → `decisions/` (ADRs), sequenced work → `phases/` (via
> `/brainstorm-phase` → `/start-phase`), features → `backlog/` (via `/track`),
> live build-status → `status.md`. Nothing here is a committed decision yet.

---

## 1. The one idea

Flow turns vague human-or-machine intent into a **governed, evidence-backed, execution-ready working memory** — *before* an expensive agent runs. It is the clarity-and-control layer between intent and execution. It **prepares the payload; the agent runs it.**

Three pillars run through everything (from the Intent Lifecycle):

- **Evidence First** — every decision links to verifiable evidence.
- **Governance Always** — org-level policy on every intent, whoever raised it; the gate never bypasses.
- **Progressive Autonomy** — automation is earned, measured, and widened over time.

**Terminology note.** "Working memory" here means *Flow's refined, portable intent artifact* — **not** the LLM sense of "context window = working memory." The term is overloaded; we keep it because it's the team's language, but the naming collision is an open item (§9).

---

## 2. The trunk: the canonical intent record

Everything hangs off one load-bearing structure. Get it right and the rest is cheap; get it wrong and everything is a rewrite.

- **Canonical** — one source of truth. Not a lossy guess extracted from a chat transcript.
- **Structured (slots)** — Objective · Scope · Out-of-Scope · Context · Entities · Acceptance Criteria, plus **intent-type-specific slots** chosen after classification. The slots *are* the Quality Gate checks made continuous.
- **Event-sourced** — every change (typed by the user or proposed by the model) is a **versioned event**. Immutability, version history, and the audit trail then *fall out for free* instead of being bolted on.
- **Evidence-bearing** — evidence is a **first-class linked object** on the record (cited context, retrieved docs, prior intents, the critic's reasoning), not a side effect.
- **Readiness, not a raw score** — 🔴 Vague → 🟡 Actionable → 🟢 Ready (internal 0–100, gate threshold 80).

**Design rule:** the record exists from **message one**. The current "save only at score ≥ 80" behaviour is wrong for a governance product — it makes the messy middle (where risk lives) ephemeral and un-auditable.

*(Open: the full field list beyond the six core slots — Priority, Requestor, Domain, Affected Assets, Intent Type, Expected Outcome, Confidence Score — needs pinning down; see §9.)*

---

## 3. The Studio — how it should (and shouldn't) be

The Studio is the human capture/refine surface. It is **not** "a chat UI." It is an **elicitation engine** whose output is the canonical record, serving two masters that pull against each other:

- **The human** wants speed, low friction, a smart collaborator → *delight*.
- **The backbone (and buyer)** wants structure, completeness, evidence, risk-legibility → *rigor*.

The whole art is **extracting governance-grade structure from a conversation that still feels effortless.**

### 3.1 Chosen shape: O2 × O3, with O4 as a fast lane

Four candidate shapes were considered (labels kept for reference):

| Shape | What it is | Verdict |
|---|---|---|
| **O1** Transcript-extraction | Chat is truth; a background LLM mirrors it into the doc | **Rejected as mechanism** — lossy, non-deterministic, fake audit. This is ~what exists today. |
| **O2** Slot-driven interrogation | The record's empty/weak/ambiguous slots drive the questions | **Skeleton** — deterministic completeness |
| **O3** Adversarial critic | A critic attacks the draft; its objections *become* the questions | **Engine** — the "smart enough to question the intent itself" part; emits evidence |
| **O4** Single-pass + inline flags | One pass → working memory with ⚠️ gaps → edit inline, optional "interview me" | **Fast lane / mode** over the same core |

**The direction:** O2 defines the target (what must exist), O3 drives toward it and shows its work (audit-gold), O4 is the impatient path. **Keep O1's conversational *surface*, but invert its data flow** — chat *mutates* the record; the record is not *extracted from* the chat.

### 3.2 How it SHOULD be
- Record is source of truth; chat is one editor; direct slot editing is another.
- Every change is a versioned event.
- The critic asks the **1–2 highest-risk gaps** per turn, not all of them; slots fill silently from free text; questions only for what can't be inferred.
- Critic is **grounded in the slot schema + retrieved context** (constrained critique), so it doesn't hallucinate gaps.
- Cheap/fast models run the loop; big models reserved for artifact expansion.
- Universal core slots + **intent-type-specific** slots after classification (a bug-fix ≠ a content-calendar).

### 3.3 How it should NOT be
- ❌ Chat-as-source-of-truth with post-hoc extraction (O1 as mechanism).
- ❌ "Save only at ≥ 80" — the record must exist from message one.
- ❌ A form / interrogation firing every question at once.
- ❌ Big models in the refinement loop (burns the tokens it's trying to save).
- ❌ Rigid one-size slots for every intent type.

*(Open alignment: the charter's original three-stage session — High-Level → Details → Deep Discussion — vs. the O2×O3 loop. Candidate reconciliation: the three stages become how the critic paces itself. Undecided; see §9.)*

---

## 4. The governed backbone

### 4.1 Pipeline (7 stages, rehabilitated)
Capture → Parsing → Semantic Understanding → Normalization → Quality Gate → Approval Decision → Intent ID & Hand-off. The Studio's O2×O3 loop drives stages 1–5. **Stages 3–4 get a real job: classify the intent (Change / Create / Analyze / Report) and pick + populate the right slot template** — replacing today's leftover e-commerce prompts.

### 4.2 Quality Gate
Five checks — Completeness · Clarity · Unambiguous Scope · Valid Domain · Sufficient Context — plus a **confidence score** (distinct from the quality score). Below threshold → `NEEDS_CLARIFICATION` with generated questions. **Invariant: nothing executes without passing the gate + approval engine.**

### 4.3 Approval Decision Engine
Evaluates **six** inputs → **five** outcomes:

- Inputs: Evidence Quality & Sufficiency · Policy & Compliance · **Semantic Conflicts** · Risk & Impact · **Delegation (EACI)** · **Autonomy Eligibility**.
- Outcomes: Auto-Approved · Needs Clarification · Human Review Required · **Conditional Approval** (conditions/constraints + monitor compliance) · Rejected.
- Auto-approve fires only for high-quality, low-risk intents **within delegated authority**.

### 4.4 Human Review Workflow
Escalations route to an owner/**SME** with context + evidence + an **SLA**. Reviewer: Review & Evaluate (analyze, check evidence, validate context, assess impact) → Decision (approve / request changes / reject) → Provide Reason (comments, conditions, constraints).

### 4.5 Lifecycle state machine
Draft → In Progress → Needs Clarification → Under Review → Approved / Rejected / Archived. Transitions are **guarded** and logged; illegal transitions are impossible. (No state machine exists in code today — see §7.)

### 4.6 Intent Registry
System of record: versioned, **immutable**, full lineage, linked evidence & decisions, audit trail & history. INT-XXXXX IDs on approval.

---

## 5. Handoff & pre-execution advisory (Flow's edge, and its line)

**Flow's line — three runtimes.** "Execution" means three different things; Flow owns two of them:

| Runtime | What it does | Flow? |
|---|---|---|
| **Refinement** | Flow runs cheap models to sharpen the intent (the Studio) | ✅ owns |
| **Pre-execution advisory** | Estimates run cost + recommends a persona/config — **without running** | ✅ owns |
| **Task execution** | Runs the model to *do* the task (temperature, provider routing, retries) | ❌ the agent's |

*(Explicitly NOT Flow, from the senior's engine: memory-architecture selection (RAG/fine-tune), temperature, provider/API routing, circuit breaker, auto-retry, actual run-cost. These are task-execution — the agent's job.)*

### 5.1 Working-memory export
Markdown / OKF / other formats. **Canonical record = always the full source of truth. Compression = a derived, provenance-tagged *projection*** sized to a target's context window — never a mutation of the source. On overflow, split semantically (never mid-sentence / mid-code). Full or compressed is the user's choice. **Artifact expansion:** optionally generate a PRD or Implementation Plan from a ready intent.

### 5.2 Pre-execution advisory (cost)
Reuses the cost machine from the senior's Gemini design, but fed **Flow's inputs** (intent-aware, not payload-blind):

> **cost = (input_tokens × price_in) + (output_tokens × price_out)**, with a per-tier model catalog + prompt-caching discount + a budget auto-pick.

| Step | Senior (intent-blind) | Flow (intent-aware) |
|---|---|---|
| input_tokens | `context_window × budget_ratio` (a guess) | **measure the actual working memory** (tiktoken) |
| output_tokens | fixed constant per style | **estimate from scope + acceptance criteria + artifact type** |
| price catalog | per-tier $/1M + caching | reuse |
| overflow → RAG | fallback when too big | reuse (→ wired to §5.1 compression) |
| persona matrix + budget auto-pick | choice UX | reuse (this *is* the advisory UI) |
| complexity / refine-to-save | — (absent) | **add** — "tighten scope → ~$X less per run" |

**Personas** = pre-sets of {model tier, prompt style, temperature, retrieval strategy}. In Flow they are *recommendations attached to the handoff* — the agent applies them when it runs. Flow suggests; the agent executes.

**Trap to avoid:** false precision. Never print `$0.03512` from a hardcoded output guess. Show **ranges/bands**, surface assumptions, lean on **relative** comparisons (persona A vs B; before-refine vs after) which stay robust when the absolute number is fuzzy. Flow's cost output is a **governance signal at the gate**, not a bill.

---

## 6. Cross-cutting

- **Capture surfaces (4):** Studio (human) · Applications/APIs · Agents/Automation · Documents/Emails. The Studio is one path; headless capture writes to the same record.
- **Guardrails / invariants:** every intent traceable · every decision explainable · every action governed · every outcome improves the system · PII scrubbed before storing · "Break Glass" human-review release valve · never promise certainty.
- **Progressive autonomy flywheel:** Outcomes → Patterns & Insights → Quality & Process → Models & Policies → Autonomy (widen the auto-approve envelope). The moat; built last (needs volume).
- **RBAC:** ADMIN · REVIEWER · END_USER, enforced at the API layer.
- **Business:** buyer = VP IT / Dir Eng; ROIs = risk firewall · compute saved ($) · last mile of AI adoption; enterprise-first, governance always-on.

---

## 7. Current-state snapshot (for discussion)

> Point-in-time map from session exploration — **unverified against live code**; graduates to `status.md` at build time. One line: **the surface is real; the governed backbone is mostly a costume.** There are two parallel, contradictory implementations — a legacy per-stage pipeline (`app/api/intents/[id]/process/route.ts`) and the newer Studio flow (`/refine`, `/api/refine|evaluate|expand`). Zero tests.

| Component | Status | Notes |
|---|---|---|
| Intent Capture | ✅ Built | API, chat, `parse-document` |
| Parsing | ❌ Broken | prompt returns e-commerce fields; persistence expects `entities/scope` → saves null |
| Semantic Understanding | 🟡 Partial | real in `/refine` (pgvector); legacy stage returns `PURCHASE/SUBSCRIBE` → `intentType` always `OTHER` |
| Normalization | ❌ Not built | no ontology / synonym resolution anywhere |
| Quality Gate | ✅ Built | Studio `/evaluate`, 80 threshold — the one real gate |
| Approval Decision Engine | ❌ Theater | returns `READY_FOR_CHECKOUT`; defaults to `HUMAN_REVIEW`; no governance/risk/autonomy engine |
| Intent ID Creation | ✅ Built | INT-XXXXX; `version` never increments |
| Intent Registry | 🟡 Partial | audit log real; **not immutable** — `IntentVersion` never written; `clarify` mutates `rawInput` in place |
| Lifecycle state machine | ❌ Not built | scattered inline updates; illegal transitions possible |
| Human Review Workflow | 🟡 Partial | assigns to *first reviewer*; SLA stored, never enforced |
| Studio UI | ✅ Built | most complete area (RefinementChat, LiveDocument, MiniGraph, PRD/Plan via `/expand`) |
| Knowledge graph / pgvector | 🟡 Partial | graph + embeddings real; conflict/duplicate detection thin |
| Handoff / export | ❌ Fake | `/api/export` is a `setTimeout` simulation |
| Pre-execution advisory | ❌ Not built | "Compute Saved" = `score/100 × 15` (a made-up constant) |
| Feedback / learning loop | ❌ Not built | no outcome capture or model/policy update |

---

## 8. Candidate build order (a proposal, not a committed plan)

> Becomes `phases/` + `planning/roadmap.md` when we start building. Trunk before branches.

1. **Lay the trunk** — canonical record + event model (versioned, immutable) + the lifecycle state machine. Kill "save-at-80"; record exists from message one. *Everything else gets cheap after this.*
2. **Invert the Studio onto the trunk** — `LiveDocument` → editable source of truth; chat mutates the record via events; the critic (O3) drives slot-filling (O2). **Reuse the working code, re-point it.**
3. **Make the gate + evidence real** — slots = the 5 checks; the critic emits evidence objects. Retire the e-commerce stages; give Semantic/Normalization the "pick the slot template" job.
4. **One governance thread, end-to-end** — a real approval decision (rule-based first is fine) + one human-review path + conditional approval. Not all six inputs at once.
5. **Handoff + advisory** — working-memory export (OKF/MD) + the pre-execution cost/persona advisory (his cost machine, Flow's measured inputs, shown as ranges).
6. **Feedback flywheel + progressive autonomy** — capture outcomes, widen the envelope. Last, because it needs volume.

**Sequencing principle:** trunk before branches · one thread real end-to-end before breadth · reuse the Studio, don't rebuild.

---

## 9. Open threads (resolve as we build; some become ADRs / backlog items)

- **Three-stage session vs O2×O3** — keep, fold in (stages = critic pacing), or drop? Needs a call.
- **Full record schema** — pin the field list beyond the six core slots (Priority, Requestor, Domain, Affected Assets, Intent Type, Expected Outcome, Confidence Score).
- **Define EACI** — the delegation/authority index (who may approve/execute which intents). Letters TBD.
- **"Working memory" naming** — collides with the LLM "context window" sense; decide whether to rename.
- **Ontology / normalization** — genuinely absent; needs a real model before stage 4 means anything.
- **Full 6-input approval engine** — start with policy + risk + a delegation stub; grow the rest.
- **Compression tuning** — semantic chunking thresholds, format adapters; a branch, not the trunk.
- **Multi-source capture** — start Studio-only; add API/agent/doc paths once the record is stable.
- **Real ML learning** — the flywheel starts as heuristics over captured outcomes, not a trained model.
- **Two-pipeline cleanup** — the legacy `process` route and the Studio flow must converge on the one record.
