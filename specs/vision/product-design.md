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
- **Structured (slots)** — Objective · Scope · Out-of-Scope · Context · Entities · Acceptance Criteria, plus **intent-type-specific slots** chosen after classification. The slots *are* the Quality Gate checks made continuous. (The schema is **layered** — universal spine + selected templates + promotable emergent slots, §3.8; strength = the gate per-slot, §3.9.)
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

### 3.4 The agent's reasoning loop (behavioral spec)

> **Why this section exists:** §3.1 describes the Studio's *shape* (O2×O3); this describes the agent's *behavior* — the turn-by-turn decision procedure that makes it an **intent agent**, not "an LLM with a sidebar." The distinction the product rests on: an LLM **responds** (text → text); an agent **pursues** a goal over a persistent state.

The agent has four things a chat model lacks, and the design must supply all four:

| | A chat model | The intent agent |
|---|---|---|
| **Goal** | "respond helpfully" | drive *this record* to Ready — it owns an outcome |
| **State** | the raw transcript | the record's **slot-states** (empty / weak / ambiguous / conflicting / strong) |
| **Policy** | "keep talking" | given the state, pick the **single highest-value move** |
| **Gradient** | open-ended | every turn measurably closes a gap — felt progress |

**The loop — perceive → decide → act:**
- **Perceive** — read the record's slot-states + the new message + relevant precedent (prior intents *and their outcomes*, §3.7) + governance/user context.
- **Decide** — rank the gaps, pick the 1–2 highest-value moves via the policy (§3.5). Never fire all questions at once.
- **Act** — mutate the record as a versioned event, then *narrate the consequence* ("I set Scope to X, still fuzzy on the date range — Q2 calendar or fiscal?").

**Design rule:** the record is the **shared state** the loop reads and writes. Today's build splits this into two disconnected brains — a chat model with no structure and a background scorer with no voice (§7) — which is the mechanical reason it "feels like an LLM." Collapsing them into one loop over the record *is* the fix. The conversation is the **narration of record mutations**, not a separate channel that gets scored afterward.

**Termination:** the loop runs until the record is Ready **and** the user is satisfied, then the agent stops driving and hands off. *The agent knows when to stop* — an LLM never does. (Open: what happens when the user is satisfied but the record is sub-threshold — see §9, the spine decision.)

### 3.5 The DECIDE policy (priority-ordered move selection)

"Behavior" reduces to one question: *given everything perceived, what is the one move this turn?* The policy is a strict priority order — first applicable move wins; the agent makes 1–2 per turn, never a barrage:

| # | Trigger | Move |
|---|---|---|
| 1 | Intent violates policy / exceeds the user's authority | **Governance stop** — explain + offer human-review valve (pre-empts all) |
| 2 | Close match to a prior intent in memory | **Recommend from precedent** — duplicate → *offer reuse*; a similar one that failed / was ambiguous → *load its lesson as a priority gap*. Cite + ask; never auto-apply. |
| 3 | New info in the message | **Fold** it silently into slots |
| 4 | Two slots now contradict | **Surface the conflict** — force a choice |
| 5 | Two objectives detected | **Split** into two intents (one intent = one objective) |
| 6 | Open gaps remain | **Close the highest-risk gap** (1–2): prefer *infer-and-confirm*, then *ask* only what can't be inferred |
| 7 | All required slots strong | **Close** — stop driving, present the working memory |

Priorities **1** and **7** are what make it "not open-ended chat": a **spine** at the top, a **terminus** at the bottom. Today's Studio has neither.

**Move taxonomy** (what a single move can be): fold · infer-and-confirm · ask · disambiguate · surface-conflict · recommend-from-precedent · offer-reuse · split · close.

### 3.6 Agent primitives (the vocabulary the behavior operates on)

| Primitive | Definition |
|---|---|
| **Intent** | the whole governed unit; one record, one thing dispatched. **Rule: one intent = one objective** (two objectives → split). |
| **Objective** | the core slot everything else serves — "what does *done* look like?" |
| **Slot** | a typed field (Objective · Scope · Out-of-Scope · Context · Entities · Acceptance Criteria + type-specific). Each carries a **state**: empty · weak · ambiguous · conflicting · strong. |
| **Gap** | any slot below `strong`. **Typed** — missing / vague / ambiguous / conflicting / unverified — and the type dictates the move (§3.5). |
| **Evidence** | the *why* behind any slot value or flag; first-class, linked; a by-product of the agent doing its job. |
| **Readiness** | `f(slot states)` — deterministic. 🔴 → 🟡 → 🟢. Not a chat vibe, not a mystery number. |
| **Outcome** | the terminal state of a *past* intent (handed-off / failed-at-gate / abandoned-ambiguous) **plus the reason** (which gaps). What makes memory *teach*. |
| **Precedent** | a prior intent surfaced as relevant, *carrying its outcome*; a first-class input to the policy (§3.5 row 2). |
| **Working memory** | the saved intent record itself — the deliverable the user takes (resolves the §9 naming collision: *working memory = the record*, not the LLM context window). |

### 3.7 Precedent-aware behavior (the "smart" half)

The agent reasons over one record **in the context of every intent this user/org has run before, and how each turned out.** This is the difference between *structured* and *smart*.

- **Every intent is saved from message one — including the failed and mediocre ones.** A failed intent is the single most valuable precedent for the next similar one. This is the near-term, buildable learning loop (contrast the aspirational ML flywheel, §6).
- **Outcomes are the teacher.** Memory keyed on similarity alone yields "you've seen this before"; keyed on similarity **+ outcome** it yields "the last three like this bounced because Scope was unbounded — let's not repeat that."
- **Transparency invariant:** the agent *cites* the precedent and *asks* permission; it never silently auto-applies (charter principle 2). The current `/api/refine` RAG block already encodes this instinct — build on it.
- **Confidence floor + cold-start (open, §9):** precedent only helps if "similar" is real; below a similarity threshold the agent says nothing rather than assert a false match. The first-ever intent has no precedent — the agent must degrade gracefully to pure slot-driving and *know* it is flying blind.

### 3.8 The schema is layered, not monolithic (spine · templates · emergent)

> **The tension resolved:** a single rigid schema fails across intent types (a bug-fix ≠ a report); but letting the LLM *invent* structure per-intent destroys the governance premise — no stable "done", non-deterministic audit (the O1 trap, §3.1), and precedent/memory (§3.7) collapses without comparable structure. A schema isn't a form the user fills — **it is the agent's perception model**; remove it and the agent goes blind (= the open-ended LLM of §7). The answer is **layers, not a monolith.**

| Layer | Contents | Who defines it | Governed |
|---|---|---|---|
| **Universal spine** | the six core slots (§3.9) | fixed, curated | ✅ **hard** — the gate checks this |
| **Type templates** | + slots per intent-type — **Change**: rollback · cutover window · migration path · blast radius · dependencies; **Report**: audience · data sources · metrics · period & cadence · format · distribution | *selected* from a catalog after classification | ✅ curated |
| **Emergent slots** | slots the agent *proposes* for this intent that no template covers ("healthcare → added `HIPAA-compliance`") | LLM, per-intent, **with evidence** | 🟡 additive · surfaced · promotable |

**Promotion loop (progressive structure):** an emergent slot that recurs is *promoted* into a type template; a template pattern that proves universal rises toward the spine. The schema **learns without losing governance** — the mirror of the Progressive Autonomy pillar. Dynamism is **additive and promotable, never foundational.** (Same shape as Postgres columns + JSONB, the modern data stack's warehouse + semantic layer + ad-hoc, schema.org core + extensions.)

### 3.9 The spine + the strength function (the gate, made continuous)

The universal spine and the bar for each slot to be `strong`:

| Slot | Is (one line) | `strong` when… |
|---|---|---|
| **Objective** | the one outcome that = done | a concrete end-state (not an activity), **single** (not blended), verifiable in principle |
| **Scope** | the boundary of what's in | enumerated · bounded · **decidable** (you can tell if something is in or out) |
| **Out-of-Scope** | explicit exclusions | names the tempting-but-excluded, esp. risk-adjacent — *emptiness on a risky intent is itself a gap* |
| **Context** | environment, prereqs, constraints | covers what the objective depends on; states hard constraints (deadline/budget/tech/policy); grounded where possible |
| **Entities** | the specific things it touches | named specifically (`users` table, not "the database"); **resolvable** to real assets (Knowledge-Graph link); no dangling refs |
| **Acceptance Criteria** | how we verify done | **type-parameterized** (below) |

**Acceptance Criteria is the one place classification reaches into *strength* (not the slot set):** deterministic-output types (Change/Create/Report) → "the output has these checkable properties"; **Analyze** → "the *investigation* meets an evidentiary bar (data-backed, alternatives ruled out, confidence stated)."

**The strength function = the Quality Gate's five checks, applied per-slot and continuously.** One mechanism, three scopes:
- **slot** → its **state** (empty · weak · ambiguous · conflicting · strong) — which *is* its gap-type (§3.6), which drives DECIDE (§3.5).
- **required set** → the gate PASS/FAIL.
- **whole record** → **Readiness** 🔴🟡🟢.

So **Readiness = f(slot states)** literally — no separate "confidence"/"quality" score, no magic 80.

**Computation — hybrid, rubric-anchored:** a deterministic layer (presence · entity-resolution · cross-slot contradiction · structural checks) **+** a cheap constrained LLM-judge that scores the semantic axes *against each slot's rubric* and returns `(state, reason, evidence)`, its reasoning stored as evidence (auditable). **The rubric is the governed artifact; the judgment is the flexible one** — the spine/emergent split, one level down.

**Requiredness is risk-weighted (deferred lever):** which slots must be `strong` varies by intent-type × risk (`Out-of-Scope` mandatory for a high-risk Change, optional for a low-risk Report). The requiredness matrix is a tuning surface built after the mechanism works.

### 3.10 Turn architecture — deterministic spine, thin LLM edges

> **"One brain or two" is the wrong question — the real one is *where the control flow lives*.** For a governance product, behavior must be predictable and auditable, so the **DECIDE policy (§3.5) is deterministic code, not an LLM decision.** The LLM is used only where semantics genuinely require it — understanding, judging, phrasing. The §7 failure was never "two calls"; it was two calls that *didn't share state* and ran in the *wrong order* (talk-then-score). The fix: the record as shared state, **structure-then-narrate**, over a coded spine.

A turn is a short deterministic pipeline with two cheap LLM calls at the edges:
1. **[code] Load** — record + new message + retrieved precedent.
2. **[LLM · Perceive]** — fold the message into slot deltas + judge strength (§3.9); returns `(slot, value, state, reason, evidence)`. Classifies intent-type on turn 1 → selects the template.
3. **[code] Decide** — apply deltas as versioned events · deterministic checks (contradiction · entity-resolution · requiredness · readiness) · rank the gaps via the priority policy (§3.5). *Behavior provably follows the policy.*
4. **[LLM · Narrate]** — verbalize the *chosen* move humanely. The narrator speaks **from** the record; it never invents structure.

**Accepted tradeoffs:** two cheap/fast calls per turn over one — bought for separability, per-component evals (Rule 11), and swappable models. More orchestration code than a single-prompt agent — *that code is the governance guarantee.* **Deliberately not** a ReAct / autonomous tool-loop where the LLM owns control flow: predictable beats clever in a governed loop.

**Reuse (not rebuild):** the existing `/api/refine` (→ Narrate) and `/api/evaluate` (→ Perceive/structure) become these two edges, *re-pointed*: run Perceive **first** (mutating the record), insert the coded DECIDE between them, and make Narrate speak from the record + chosen move instead of free-chatting.

---

## 4. The governed backbone

### 4.1 Pipeline (7 stages, rehabilitated)
Capture → Parsing → Semantic Understanding → Normalization → Quality Gate → Approval Decision → Intent ID & Hand-off. The Studio's O2×O3 loop drives stages 1–5. **Stages 3–4 get a real job: classify the intent (Change / Create / Analyze / Report) and pick + populate the right slot template** — replacing today's leftover e-commerce prompts.

**Design rule — the arrow is the lie.** The 7 stages are drawn as a left-to-right waterfall; read that way they produce *exactly* today's broken batch pipeline. The stages are **dimensions of completeness the record accumulates, not steps in time.** The agent's loop (§3.4) re-runs stages 2–5 *partially and continuously* every turn — you never "finish parsing" before "starting understanding." Concretely:
- **Stages 1–5 are the agent's territory.** Box 1 (Capture) *is* the whole conversation, not an instant; box 5 (Quality Gate) is a **live readout every turn, not a checkpoint**.
- **Stages 2–4 collapse into one act** — "understand the message into slots." The three-way split is legacy pre-LLM NLP; one extraction yields objective + scope + entities + type together. (Stage 4 / ontology stays deferred — §9.)
- **Stage 6 (Approval Engine) is the turnstile the agent hands off *to*** — not the agent's job; the agent only *previews* it as its Governance-stop move (§3.5 row 1).
- **Record vs Intent ID are different births.** The record is born at capture (Draft, versioned); the human `INT-XXXXX` ID is minted only at approval (stage 7). Today's code conflates them (mints an ID, never versions).

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

**The conversational agent, diagnosed (why it "feels like an LLM").** The Studio chat is a stateless chat model driven by a *single* instruction — "ask ONE clarifying question about the high-level objective" — run every turn, forever. Three stage prompts (`HIGH_LEVEL` / `DETAILS` / `DEEP_DIVE`) exist but only `HIGH_LEVEL` is wired; the `stage` param is dead code. The chat has **no slot list, no goal, no notion of "done."** The *structure* (objective/scope/entities) is reverse-engineered by a **separate** background call (`/api/evaluate`) that scores the transcript and writes fields only at ≥ 80 — i.e. the O1 transcript-extraction mechanism this doc rejects (§3.1). Net: **two disconnected brains — a talker with no structure and a scorer with no voice.** That split, not model quality, is why it behaves like plain chat. The redesign (§3.4–3.7) collapses them into one loop over the record.

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

- **Three-stage session vs O2×O3** — **resolved (proposed):** the three stages fold into the agent's loop as *critic pacing*, not temporal phases (§3.4). Confirm.
- **Full record schema** — pin the field list beyond the six core slots (Priority, Requestor, Domain, Affected Assets, Intent Type, Expected Outcome, Confidence Score).
- **Define EACI** — the delegation/authority index (who may approve/execute which intents). Letters TBD.
- **"Working memory" naming** — **resolved (proposed):** keep the term; *working memory = the intent record* (§3.6); disambiguate in UI copy rather than rename.
- **Ontology / normalization** — genuinely absent; needs a real model before stage 4 means anything.
- **Full 6-input approval engine** — start with policy + risk + a delegation stub; grow the rest.
- **Compression tuning** — semantic chunking thresholds, format adapters; a branch, not the trunk.
- **Multi-source capture** — start Studio-only; add API/agent/doc paths once the record is stable.
- **Real ML learning** — the flywheel starts as heuristics over captured outcomes, not a trained model.
- **Two-pipeline cleanup** — the legacy `process` route and the Studio flow must converge on the one record.
- **The spine decision (highest-priority open)** — when the user is satisfied but the record is sub-threshold, does the gate hold (rigor + human-review valve) or is there an "export anyway, stamped Not-Ready" path (delight)? The source lifecycle's invariant says the gate never bypasses. Needs the buyer's call; blocks §3.4 termination + §3.5 row 7.
- **Confidence vs quality vs readiness** — **resolved (§3.9):** one thing — slot-state, aggregated. **Readiness = f(slot states)**; no separate confidence/quality score, no magic 80.
- **How Readiness / slot-strength is computed** — **resolved (§3.9):** hybrid, rubric-anchored — a deterministic layer + a constrained LLM-judge scoring each slot against its rubric, emitting `(state, reason, evidence)`. The rubric is the governed artifact.
- **Slot schema per intent-type** — **approach resolved (§3.8, layered):** universal spine + selected templates + promotable emergent slots; classification reshapes strength rubrics, not the slot set. **Still open:** enumerating the full template catalog beyond the Change/Report examples, and the **requiredness matrix** (slot × type × risk, §3.9).
- **Precedent confidence floor + cold-start** — the similarity threshold below which the agent stays silent, and graceful degradation to slot-only driving when memory is empty (§3.7). Current embeddings (padded to 1536, crude nearest-neighbor) will surface false matches.
- **One brain or two** — **resolved (§3.10):** neither — a deterministic spine (control flow + DECIDE in code) with two thin LLM edges (Perceive, Narrate) over the shared record. Reuses `/refine` + `/evaluate`, re-pointed.
