---
description: Multi-perspective code review of pending changes on the current branch. Spawns three momentum reviewer skills in parallel — security, QA, architecture — and consolidates findings into a single Critical/Important/Minor report. Use before completing a phase or opening a PR.
---

# review-code

### 1. Determine review scope

Default: the diff between the current branch and `main`. Run:

```bash
git diff main...HEAD --stat
git diff main...HEAD
```

User arguments override the default:
- `staged` → `git diff --cached`
- `working` → `git diff` (unstaged)
- `<commit-sha>` → `git diff <commit-sha>...HEAD`
- `<file-path>` → restrict to that path within default scope

If no diff exists, report "no changes to review" and stop.

### 2. Read project rules

Before dispatching reviewers, read:
- `AGENTS.md` (primary instructions)
- `specs/status.md` (current phase context)

This ensures each reviewer scores the diff against THIS project's rules, not generic best practices alone.

### 3. Dispatch three reviewer skills in parallel

Use Antigravity's native parallel subagent fan-out to spawn three reviewer subagents IN A SINGLE TURN, each loaded with one of the momentum reviewer skills installed at `.agents/skills/`:

- `momentum-reviewer-security` (OWASP/STRIDE lens)
- `momentum-reviewer-qa` (test coverage / edge cases / regressions)
- `momentum-reviewer-architecture` (rule compliance / pattern consistency)

Each subagent gets the diff + relevant project rules excerpt as input.

### 4. Consolidate findings

When all three return, merge findings into one report ordered:

```
## Code Review

### Critical (N)
- [security] <finding> (file:line)
- [arch] <finding> (file:line)

### Important (N)
- [qa] <finding> (file:line)

### Minor (N)
- [arch] <finding> (file:line)
```

Tag each finding with reviewer (`[security]`, `[qa]`, `[arch]`). De-duplicate findings raised by multiple reviewers; tag with all sources (`[security][arch]`). Surface conflicts (Critical vs Minor from different reviewers) and note the disagreement.

### 5. Surface to user via the task.md artifact

Update the active `task.md` artifact with each Critical and Important finding as a task entry. Then ask:

> "Which findings should I act on now? Options:
>   1. All Critical
>   2. All Critical + Important
>   3. Specific items (list IDs)
>   4. None — log all to backlog only
>   5. Cancel"

### 6. Act + verify

For findings the user acts on: implement each as a separate commit. For deferred findings: file each via `/track` at appropriate priority (Critical → P0/P1, Important → P1/P2, Minor → P2/P3).

After fixes, per Rule 12 (Verify Before Claim): run the relevant verification command (test, lint, typecheck) BEFORE marking done. Append the verification evidence to the active `walkthrough.md` artifact.

## Constraints

- Reviewer skills are READ-ONLY — they cannot modify the codebase.
- Dispatch all three reviewers in ONE turn using parallel fan-out — do not sequence them.
- The review NEVER auto-fixes findings. The user always decides what to act on.
- If a reviewer's output is malformed (missing severity headers), re-dispatch THAT single reviewer with a stricter format reminder. Do not silently reformat.
