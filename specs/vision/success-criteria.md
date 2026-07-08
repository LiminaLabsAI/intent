---
type: Vision
---

# Success Criteria

> Measurable targets. When all are met, the project has achieved its goals.

## Phase 0 Targets
| Criterion | Target | How to Measure |
|-----------|--------|----------------|
| Build Success | 0 errors, clean production bundle | `npm run build` |
| DB Setup | Prisma schemas generate and migrate successfully | `npx prisma db push` / `npx prisma generate` |
| Seed Accounts | Pre-seeded user accounts match specifications | Check database for admin, reviewer, and user |

## Long-Term Targets
| Criterion | Target | How to Measure |
|-----------|--------|----------------|
| Audit Completeness | 100% of state-changing operations recorded | Audit logs table count matches transition count |
| Role Enforcements | Zero unprivileged route access | Attempt unauthorized requests, expect 403/redirect |
