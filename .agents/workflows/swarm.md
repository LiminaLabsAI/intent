---
description: Sustained parallel multi-project feature delivery. Spawns one supervisor agent per impacted repo via Antigravity's Agent Manager, each pinned to that repo's cwd. The user's session becomes the conductor. Use for cross-repo features with dependency ordering.
---

# swarm

> Phase 18 / v0.20.4 — Antigravity parity of the Phase 17 + 17.5 swarm
> surface that originally shipped Claude Code only. All 13 subcommands
> work through the Antigravity `adapter.spawn(directive)` dispatch
> (`adapters/antigravity/adapter.js`), which shells `agy` via the Agent
> Manager primitive.

A **swarm** is a declared cross-repo work unit driven from ONE user session. Your session becomes the **conductor**. The conductor spawns one **supervisor** Antigravity session per impacted repo via the Agent Manager, each pinned to that repo's working directory. Each supervisor BECOMES the `swarm-supervisor` skill (loaded from `.agents/skills/swarm-supervisor/SKILL.md`) and runs momentum's normal `/start-phase` → implement → `/sync-docs` → `/complete-phase` loop INSIDE its repo.

Agents are stateless across turns; **state lives in files**. A swarm survives session boundaries the same way a phase does — every state-changing action writes to disk; `/swarm resume` reconstitutes from disk.

## When to use

- A feature spans **two or more momentum-installed repos** AND has dependency ordering (frontend depends on backend depends on shared-types).
- The user wants ONE session driving the whole feature, not three serial sessions.
- An initiative exists or is about to exist at `<eco>/initiatives/<slug>.md`.

Do NOT use `/swarm` for:
- Read-only cross-repo audits — use `/dispatch`.
- Single-repo phases — use `/start-phase` directly.
- Pure context transfer — use `/handoff`.

## Antigravity specifics

- **Supervisor skill**: `.agents/skills/swarm-supervisor/SKILL.md`. Each supervisor BECOMES this skill on spawn.
- **Spawn dispatch**: the CLI floor (`momentum swarm start --spawn …`) dispatches each spawn directive through `adapters/antigravity/adapter.js::spawn()`. The adapter shells `agy` with the supervisor skill as the persona and the directive's `repoPath` as the cwd, exploiting Antigravity's native `parallelSubagents: true` capability.
- **Hook integration**: `.agents/hooks.json` PreToolUse matchers (`run_command|view_file|.*write.*|apply_patch`) apply uniformly inside each supervisor — the brainstorm gate keeps supervisors from drifting into spec edits during phase implementation.

## Subcommands

The slash command form mirrors the CLI: `/swarm <sub> [args]`. The CLI floor is `momentum swarm <sub> [args]` — pick whichever door fits the moment. Both produce the same on-disk artifacts.

### 1. `/swarm start <slug> --initiative <slug> --repos r1,r2,... --phase <phase-slug> [--mode checkpoint|autopilot]`

Plan + spawn Wave 1.

Compute the wave plan in-process (no spawn yet) by calling the CLI floor in dry-run:

```bash
momentum swarm start <slug> --initiative <slug> --repos r1,r2,... --phase <phase-slug> --mode <mode> --json
```

Read the JSON. Render the wave plan to the user and WAIT for approval. After approval, run with `--spawn`:

```bash
momentum swarm start <slug> --initiative <slug> --repos ... --phase <phase-slug> --mode <mode> --spawn
```

`bin/swarm.js` dispatches each directive through `adapters/antigravity/adapter.js::spawn()`, which shells `agy` with the supervisor skill loaded and the repo path as cwd. If `agy` is not on PATH, the CLI surfaces the spawn directives and exits non-zero — degrade by reporting the directives to the user (they can launch sessions manually) and continue with conductor polling on the existing manifest.

### 2. `/swarm status <swarm-id>`

Render the materialized board cache. Read-only — no manifest mutation. Conductor reads ONLY `board.json` (~3KB).

```bash
momentum swarm status <swarm-id>
```

Default output is a rendered ANSI table. Pass `--json` for machine-readable.

### 3. `/swarm tell <swarm-id> <repo> "<text>"`

Push a one-shot context note to a specific supervisor. The text lands at `specs/phases/<phase-slug>/swarm-context.md` inside the target repo.

```bash
momentum swarm tell <swarm-id> <repo> "<text>"
```

### 4. `/swarm broadcast <swarm-id> "<text>"`

Push context to every supervisor in the swarm.

```bash
momentum swarm broadcast <swarm-id> "<text>"
```

Use sparingly — broadcast costs each supervisor a context-fetch turn.

### 5. `/swarm verify <swarm-id>`

Run the contract verifier + manifest+brief drift check. Read-only. Exits non-zero if any drift surfaces.

```bash
momentum swarm verify <swarm-id>
```

### 6. `/swarm complete <swarm-id>`

Synthesize the cross-repo changeset and finalize the swarm.

```bash
momentum swarm complete <swarm-id>
```

### 7. `/swarm resume <swarm-id> [--session <id>]`

Re-attach the current session to an existing swarm; renews leases this session owns.

```bash
momentum swarm resume <swarm-id> [--session <id>]
```

### 8. `/swarm cancel <swarm-id> [--reason "<text>"]`

Graceful halt. Halts every supervisor, marks the swarm `cancelled` in the manifest, preserves all artifacts for forensics. **Confirm with the user before running.**

```bash
momentum swarm cancel <swarm-id> --reason "<text>"
```

### 9. `/swarm budget <swarm-id> <repo> +N | -N`

Adjust the per-repo token budget.

```bash
momentum swarm budget <swarm-id> <repo> +100000
```

### 10. `/swarm claim <swarm-id> <repo> [--session <id>] [--lease-hours 24]`

> Phase 17.5 / v0.20.2 — multi-session ownership primitive.

Claim ownership of `<repo>` inside `<swarm-id>` for the current session.

```bash
momentum swarm claim <swarm-id> <repo> [--session <id>] [--lease-hours 24]
```

### 11. `/swarm release <swarm-id> <repo> [--session <id>]`

> Phase 17.5 / v0.20.2 — multi-session ownership primitive.

Release the current session's ownership of `<repo>`. Idempotent.

```bash
momentum swarm release <swarm-id> <repo> [--session <id>]
```

### 12. `/swarm focus <swarm-id> <repo> [--session <id>] [--expires-min 60]`

> Phase 17.5 / v0.20.2 — split one repo off the swarm into a side-session.

Issue a single-use focus token and hand control to a second Antigravity session.

```bash
momentum swarm focus <swarm-id> <repo> [--session <id>] [--expires-min 60]
```

### 13. `/swarm join <swarm-id> [--token <token>] [--claim <repo>] [--session <id>]`

> Phase 17.5 / v0.20.2 — register a session with an existing swarm.

Attach the current Antigravity session to `<swarm-id>` as a co-conductor.

```bash
momentum swarm join <swarm-id> [--token <token>] [--claim <repo>] [--session <id>]
```

### 14. `/swarm absorb <target-swarm-id> <source-swarm-id> [--yes] [--session <id>]`

> Phase 17.5 / v0.20.2 — converge two swarms back into one.

Merge `<source-swarm-id>` into `<target-swarm-id>`.

```bash
momentum swarm absorb <target-swarm-id> <source-swarm-id> [--yes] [--session <id>]
```

### 15. `/swarm inbox list|write|resolve <swarm-id> …`

Supervisor → conductor questions.

```bash
momentum swarm inbox list <swarm-id>
momentum swarm inbox write <swarm-id> --repo <r> --slug <s> --question "<text>"
momentum swarm inbox resolve <swarm-id> <id> --answer "<text>"
```

### 16. `/swarm preview-merge <swarm-id>`

Dry-run `git merge --no-commit --no-ff` for every supervisor branch against `main`. Always aborts.

```bash
momentum swarm preview-merge <swarm-id>
```

## Tracking contract

- **Auto every time:** `manifest.json` writes via the conductor library; `board.json` regenerated on each write.
- **Auto only when meaningful:** `[SWARM]` entry in each supervisor's repo `history.md` after wave completion; `[NOTE]` in the originating session log on wave transitions.
- **Native artifacts**: keep `task.md` synced with `tasks.md` and `implementation_plan.md` with `plan.md` — same pattern as standalone phase work.

## Errors

- Ecosystem root not found → suggest `--ecosystem <path>` or running from inside an ecosystem.
- Repo arg not a member → list valid members and abort.
- Initiative does not exist → suggest `momentum ecosystem initiative create <slug>` and abort.
- `agy` CLI not on PATH → degrade to dry-run + manual spawn instructions.
