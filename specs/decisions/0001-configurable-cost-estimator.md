---
type: Decision
---

# 0001 — Configurable, deterministic pre-execution cost estimator

> **Status**: accepted
> **Date**: 2026-07-14
> **Deciders**: er.mayank000@gmail.com (product), agent (design via FORGE)

## Context

§5.2 of the product design fixes the cost formula for the pre-execution advisory:

> **cost = (input_tokens × price_in) + (output_tokens × price_out)** — per-tier catalog + prompt-caching discount + budget auto-pick.

Flow's line (§5, three-runtimes table): Flow **measures** inputs, **estimates** output, and **recommends** a persona — it never runs the model. `temperature`, `retrieval`, provider routing, retries, and actual billing are the downstream executor's job. Personas bundle those as *recommendations attached to the handoff*.

The Phase-11 first cut (`lib/agent/cost.ts`) hardcoded three tiers, approximated tokens as `chars/4`, and computed only `in×price_in + out×price_out`. Product review surfaced three requirements it fails:

1. **Nothing volatile may be hardcoded.** The model is a *variable* — today one model (DeepSeek), but the system must be configurable to different models, **providers**, and per-persona settings (temperature, reasoning depth, prompt style, retrieval). When a provider re-prices, the advisory must reflect it *without a code change*.
2. **The cost function must stay deterministic** — pure over its arguments, `node --test`-friendly.
3. **The estimate must be as accurate as a proven method allows** — not a hand-wavy constant, and never false-precise.

**The load-bearing risk (from Triage):** of the four inputs, exactly one is uncertain — `output_tokens`, the only value Flow *estimates*. `input_tokens` is measured; prices/context/caps are config lookups. The design's real job is to **quarantine that one uncertainty** behind a clean interface and make everything else exact config + measurement.

## Options Considered

### Config storage

#### Option A — Code constants (the Phase-11 cut)
**Pros:** trivial. **Cons:** changing a price needs a redeploy; violates requirement 1.

#### Option B — Versioned config file (TS/JSON in repo)
**Pros:** deterministic, git-audited, reviewable via PR. **Cons:** still a deploy to change a price; no runtime/admin edit.

#### Option C — DB tables (Prisma)
**Pros:** runtime-editable, auditable. **Cons:** nothing works until seeded; no git-versioned baseline.

#### Option D — Hybrid: DB source-of-truth, seeded from a versioned default — **chosen**
**Pros:** live/admin edits (no deploy), auditable, and a git-versioned default so a fresh DB is never empty. Matches the enterprise/admin-config vision. **Cons:** most upfront wiring (tables + seed + a config-load service).

### Output-token estimation method

#### Option A — Flat heuristic (`base(complexity) + scope-length`)
**Pros:** simplest. **Cons:** systematically wrong per artifact type; looks authoritative while being a guess.

#### Option B — Reference-class forecasting, seeded priors — **chosen**
Bucket by `(artifact_type × complexity)`; seed each bucket with a **measured** prior band `[low, high]`; multiply by the persona's `reasoning_depth` multiplier; **calibrate the buckets from real runs** over time (the Phase-18 flywheel feeding Phase-11). Band width is a function of the bucket's variance, not a flat ±.
**Pros:** deterministic (pure over priors + measurements), empirically grounded and calibratable (the *proven* method — Flyvbjerg/Kahneman reference-class forecasting), honest (band encodes real uncertainty). **Cons:** only rigorous if priors are seeded from real measurement and the calibration hook is actually wired — otherwise it degrades to a fancy constant.

#### Option C — Structural (sections × tokens/section)
**Pros:** explainable per artifact. **Cons:** still needs per-type priors; more code for marginal gain now.

## Decision

**Hybrid DB config (D) + reference-class estimator (B)**, structured as three layers with one hard rule: **config flows *in* as arguments; the math never queries.**

**Three config catalogs (Prisma, seeded from a versioned default):**

| Table | Key fields | Role |
|---|---|---|
| `CostModel` | provider, priceIn, priceOut, contextWindow, maxOutput, tokenizerId, cacheDiscount, **reasoningMultiplier**, updatedAt, sourceNote | every volatile model/provider-dependent variable, as data |
| `Persona` | name, **modelRef**→CostModel, temperature, reasoningDepth, promptStyle, retrieval, budgetCeiling, visibleToUser=false | references a model; nothing duplicated; backgrounded from users |
| `EstimationPrior` | refClass=(artifactType×complexity), outLow, outHigh, sampleSize, updatedAt | the reference classes; `sampleSize` grows as calibration feeds it |

**Measurement layer (dynamic, per intent):** `buildWorkingMemory(record) → text` · `tokenize(text, tokenizerId) → inputTokens` (real per-model tokenizer behind an interface; `chars/4` fallback impl now) · `classifyRefClass(record) → bucketKey`.

**Pure cost function (deterministic):** `estimateCost(measurements, model, persona, priors) → { low, high, persona, assumptions[], refineToSave?, overflow }`. No I/O. Caller loads config at the edge and passes it in.

**Honesty commitments (what earns the "reference-class" upgrade over a flat heuristic):**
- Priors are **seeded from real measurement** — generate sample PRDs/Plans via `/api/expand`, count actual output tokens per bucket.
- **Log estimated-vs-actual from day one**, before the calibration loop exists, so a corpus accumulates.
- Each `CostModel` row carries `updatedAt` + `sourceNote`; the advisory's assumptions surface *"price last verified N days ago."*
- `reasoning_depth` is a **first-class output multiplier** (reasoning models emit premium, invisible reasoning tokens — the biggest per-persona cost driver), not a cosmetic setting.

## Consequences

**Easier:** swap a model/provider or re-price by editing one `CostModel` row → every persona on it re-costs, live. The math is a pure deterministic rail (testable, reproducible). The uncertain quantity is isolated and independently improvable. Multi-model/multi-provider is supported by construction.

**Harder / cost accepted:** three new tables + a seed + a config-load service is real upfront wiring — consciously bought for the runtime-configurable, auditable, provider-change-reflecting property. The **Prisma schema is the sticky (one-way) door** — shapes must be right before migrating; the function signature and file-seed are two-way doors.

**Deliberately deferred** (architecture supports; not built now): multi-model/provider *active* use (seed one model now) · the calibration *loop* (but wire the logging now) · a real WASM tokenizer (interface + approx impl now) · caching + retrieval-token modeling (config fields exist, default off).

**Risk if commitments lapse:** if priors stay invented and calibration never lands, reference-class becomes a dressed-up constant — worse than a flat heuristic because it looks rigorous. The logging + measured-seed commitments are what prevent that.

## Amendment — 2026-07-14: persona is a user-facing CHOICE, not a silent auto-pick

The original decision backgrounded personas (`visibleToUser: false`, "Flow suggests, the executor runs"). Product review corrected this: §5.2's *"persona matrix + budget auto-pick | **choice UX**"* means the user **picks the mode in the conversation**. Implemented as a **DECIDE gate**: once the intent is classified, `decide()` returns `select_persona` (pre-empting refinement) and the turn surfaces the mode options with per-record cost bands + the recommended default. The user's pick emits a `persona_selected` event; the chosen persona then drives **refinement rigor** (`personaToRigor`: fast→low, balanced→medium, thorough→high — reusing the risk-weighted requiredness matrix) **and** the downstream/cost. Auto-assessment (risk/complexity) now *recommends* the default; the user's choice governs. The pure cost function is unchanged — the persona is still just an argument.
