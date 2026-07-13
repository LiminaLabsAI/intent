# Phase 9 History — Studio on the Trunk

### [DECISION] 2026-07-14 — Standalone `/studio` outside the auth matcher
Topics: studio, auth, infra
Affects-phases: phase-9-studio-on-trunk
Affects-specs: specs/vision/product-design.md#5.1
Detail: The middleware matcher gates /dashboard, /intent, /reviews, /registry, /admin, /refine, /settings — not /studio or /api/agent. So the working agent experience ships at `/studio` with `/api/agent/*`, over the in-memory store + HfLLM, requiring no login or DB. This delivers a usable product now; DB persistence (Prisma adapter already built in Phase 7) and the full `/refine` re-point are documented follow-ons.

---

### [DECISION] 2026-07-14 — In-memory persistence for the demo; Prisma swap deferred
Topics: persistence, store
Affects-phases: phase-9-studio-on-trunk
Affects-specs: none
Detail: `agentStore` is a process-singleton InMemoryEventStore (globalThis-cached to survive HMR). State survives the dev-server session. `defaultStore()` (Phase 7) already switches to `PrismaEventStore` when DATABASE_URL is set — the swap is one line once a Postgres DB is stood up.

---

### [SCOPE_CHANGE] 2026-07-14 — BUG-001 fix scoped to resilience
Topics: bug, refine-ui
Affects-phases: phase-9-studio-on-trunk
Affects-specs: none
Detail: BUG-001 root cause (Phase 7 triage) is `/refine` hard-depending on Prisma + NextAuth at render. Phase 9 makes it render resiliently (guarded), stopping the 500. A full re-point of `/refine` onto the new record/agent loop needs the DB/auth stack and is a follow-on; the working agent lives at `/studio`.

---

### [NOTE] 2026-07-14 — Browser-verified end to end
Topics: verification, studio, working-product
Affects-phases: phase-9-studio-on-trunk
Affects-specs: none
Detail: Ran `next dev` and drove `/studio` in a real browser. "Migrate our auth to OAuth" → agent classified CHANGE, replied with a natural infer-confirm question, and the live "Working memory" panel showed the record building (Objective/Entities weak, CHANGE template slots surfaced), readiness 🔴 Vague. A second rich answer drove all 8 required slots strong → readiness 🟢 Ready, every slot green with real values. `/refine` returns 307 (redirect to login, no 500); `/studio` 200; 46/46 tests green. The `.ts`-extension agent-core imports resolve cleanly in Next 14 (tsconfig `allowImportingTsExtensions`).

---
