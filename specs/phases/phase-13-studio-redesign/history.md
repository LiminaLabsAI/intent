# Phase 13 History — Studio Experience Redesign

### [NOTE] 2026-07-15 — Group 0 (contracts + real values) landed
Topics: contracts, personas, cost, okf, schema-labels
Affects-phases: phase-13-studio-redesign
Affects-specs: none
Detail: Plain-language schema labels (entities → "What's involved", acceptance_criteria → "How we'll know it's done", blast_radius → "What could be affected", migration_path → "How to move over"); keys unchanged. Personas renamed quick/balanced/deep with a `label` field (Quick/Balanced/Deep-dive) — DB Persona table got a `label` column, stale cost rows cleared + re-seeded. Real DeepInfra DeepSeek-V4-Flash values seeded: $0.10 in / $0.20 out per 1M, 1M context, 0.8 cache discount (was placeholder $0.1/$0.3/128k/0). Added `PlanFile` type, record `outcome`/`files`, and `outcome_set`/`plan_built` events. Tests updated for the rename + reprice; 71/71, tsc 0.

---

### [NOTE] 2026-07-15 — UI refinement from live feedback
Topics: ui, ux, layout, formatting
Affects-phases: phase-13-studio-redesign
Affects-specs: none
Detail: Live review surfaced misses: status·mode·cost were still in Artifacts (and "Suggested persona" showed after selection), the two right panels shared one scroll, and Files were buried under the tall Understanding list. Fixed: status · mode · cost (est→actual) moved to a bar at the top of the conversation column (next to Build), out of Artifacts (top-right badge removed; FEAT-004 resolved); Artifacts now shows Files first (primary) with Understanding collapsible below; Artifacts and the graph scroll independently (Artifacts flex-1 internal scroll, graph fixed 260px); agent messages render as markdown for readability. tsc 0, 73/73.

---

### [DISCOVERY] 2026-07-15 — Build JSON truncation (BUG-007) + no raw errors on the UI
Topics: build, llm, tokens, json, error-handling, ux
Affects-phases: phase-13-studio-redesign
Affects-specs: none
Detail: Live build showed a raw "Unexpected end of JSON input". Root cause: `HfLLM.chat` hard-coded `max_tokens: 900` for EVERY call, so a full build (Deep-Dive: CRUD + auth + responsive) truncated its JSON mid-body → `JSON.parse` threw, and the raw message rendered in the studio. Fixes: (1) per-call `maxTokens` via `GenOpts`; the build asks for 8000. (2) `extractJson` now strips code fences/prose, best-effort repairs a truncated object (close open string/brackets), and throws a clean `MODEL_OUTPUT_UNPARSEABLE` marker rather than a raw parse message — exported + unit-tested. (3) `build` retries generation once and guards against recording an empty "built". (4) The API and client only ever surface friendly text (raw → console); the client parses responses via `safeJson` so a bad body can't itself throw. Error notice restyled + dismissable. 80/80, tsc 0; live-verified on DeepSeek (plan.md, OKF header, ~14s, $0.00015). Design note: the 900-token default stays for clarify turns (cheap); only the build lifts it.

---

### [DISCOVERY] 2026-07-15 — Live UX batch: cost clarity, OKF header, split cards, always-on Build; + two deferrals
Topics: ui, ux, cost, okf, build, rebuild, layout, backlog
Affects-phases: phase-13-studio-redesign
Affects-specs: none
Detail: Second live review produced a batch. Done now: (ENH-001) top-bar cost shows the max estimate as "Est. $X" + "Actual $Y" once built (labeled/tooltipped, no cryptic range); (BUG-004) the OKF file viewer parses YAML front-matter into a clean key/value header (ReactMarkdown was mis-parsing `--- … ---` as a setext heading); (ENH-002) the right column is now three distinct cards — Artifacts (files) / Understanding (live reasoning) / Context Graph — instead of Files+Understanding clubbed together; (BUG-005) the Build button is always visible (pinned above the input when a mode is chosen; was gated on !built so it vanished) and becomes "Rebuild" after a build — `runBuild` gained a `force` flag, the turn route honors a `rebuild` flag, +1 test (74/74). Labels (user's call): acceptance_criteria "How we'll know it's done" → "Outcome"; entities "What's involved" → "Key items" → "Entities" (keeps the Understanding panel consistent with the section heading in the built plan.md). Deferred to a FUTURE phase (logged, not built): FEAT-005 publish a built artifact as a versioned v1 (registry); FEAT-006 cyclical conversational refinement (review → ask agent to update → another run) — distinct from the now-shipped Rebuild, which regenerates from edited Understanding fields.

---

### [DISCOVERY] 2026-07-15 — Download consistency (BUG-003) + label rename
Topics: ui, download, files, schema-labels
Affects-phases: phase-13-studio-redesign
Affects-specs: none
Detail: Live testing surfaced two things. (1) BUG-003: the Artifacts header "MD" button exported the *understanding fields* as `intent.md`, which a user naturally read as "download the plan" — so the download name (`intent.md`) and content (schema export) mismatched the viewer (`plan.md`, OKF). The real deliverable files already download correctly by their own name (`downloadFile(f.name, f.content)`) from the file row and viewer; the export button was a redundant leftover. Removed it (+ dead `exportMd`) so the only download path is the actual file. (2) Renamed the `entities` spine slot label "What's involved" → "Key items" (clearer for business users; "How we'll know it's done" kept as-is). tsc 0, 73/73.

---

### [EVALUATOR] 2026-07-15 — Phase 13 verified (Groups 1–4)
Topics: verification, ask-to-enrich, okf, ui
Affects-phases: phase-13-studio-redesign
Affects-specs: none
Detail: G1 — ask-to-enrich (verify → grounded question) + outcome gate (ask_outcome; perceive detects outcome→outcome_set). G2 — build writes OKF files by outcome (okf.ts + runBuild → plan_built). G3 — Understanding un-gated (live), panel → "Artifacts" + mode badge, Build in-conversation always-on status-coloured, outcome chips, Files (view+download), PRD/Plan removed. G4 — 73/73, tsc 0; live backend on DeepSeek: Quick/Balanced/Deep-dive, outcome detected ("just a plan"→plan), Build → plan.md with OKF front-matter + actual cost $0.00017 (real DeepInfra pricing). Deferred: top-strip relocation (FEAT-004), ask_outcome live re-verify (BUG-002, Next-dev stale-lib), browser click-through (auth-gated → user).

---

### [DECISION] 2026-07-15 — Ask-to-enrich replaces assume-then-verify
Topics: agent-behavior, clarify, hallucination
Affects-phases: phase-13-studio-redesign
Affects-specs: specs/decisions/0002-working-memory-build-flow-and-cost.md
Detail: Live testing of Phase 12 showed the agent claiming "I've got everything" and assuming fields, which confuses a business user and risks hallucination. Corrected: the agent's job is to CLARIFY — proactively ask grounded questions that fill gaps and make intent+context richer; assumption is the last resort. The `verify` move becomes a gap-filling question. Grounds the plan to the user's real requirement.

---

### [DECISION] 2026-07-15 — Live fields, always-on build, build-writes-files (reverses Phase 12)
Topics: ux, build, layout
Affects-phases: phase-13-studio-redesign
Affects-specs: specs/decisions/0002-working-memory-build-flow-and-cost.md
Detail: Three Phase-12 decisions reversed from live UX feedback: (1) Understanding fields update LIVE during the conversation (not empty-until-build) so the user watches the intent form; (2) Build is ALWAYS available (not gated at 🟢), status-coloured amber→green — user keeps control; (3) Build writes the deliverable as 1+ OKF markdown files named by the outcome (not "materialize the fields"), removing the separate PRD/Plan buttons. Recorded in the ADR-0002 amendment.

---

### [DECISION] 2026-07-15 — Plain language, enterprise persona names, real model values
Topics: naming, personas, business-users, cost
Affects-phases: phase-13-studio-redesign
Affects-specs: specs/decisions/0002-working-memory-build-flow-and-cost.md
Detail: The layered schema is kept but relabeled in plain language (entities → "what's involved", acceptance_criteria → "how we'll know it's done") — jargon confuses business users. Personas renamed for enterprise legibility: Quick / Balanced / Deep-dive (was fast/balanced/thorough; "thorough" was rejected as unclear). CostModel to be seeded with real DeepInfra / DeepSeek V4 Flash values so the estimate is directional and the actual = measured usage × real prices.

---

### [DECISION] 2026-07-15 — Deliverable = OKF files named by outcome; agent asks the outcome early
Topics: okf, outcome, files, generalization
Affects-phases: phase-13-studio-redesign
Affects-specs: specs/decisions/0002-working-memory-build-flow-and-cost.md
Detail: Build produces the deliverable as full-spec Open Knowledge Format (Google, versioned) markdown files, 1+ per the scenario, NAMED BY THE OUTCOME (diagram.md / plan.md / script.md …) — not hard-bound to "plan". The agent asks early what outcome/format the user wants (full plan / diagram / script / doc) so the files match. Generalized for any business use case, not code. Selected mode persists visibly the whole session (top strip).

---

### [NOTE] 2026-07-15 — Phase 13 revises Phase 12 (both on feat/intent-agent)
Topics: planning, phase-12, phase-13
Affects-phases: phase-13-studio-redesign
Affects-specs: specs/planning/roadmap.md
Detail: Phase 12 (build flow) shipped, then live UX testing produced the reversals above. Rather than retro-edit a completed phase, Phase 13 captures the redesign; the roadmap inserts it and renumbers the governance arc 13–21 → 14–22. Foundation (persona gate, cost engine, build run) is reused.

---
