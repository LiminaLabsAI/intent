---
description: Parallel multi-repo fan-out + synthesis. Spawns one subagent per listed repo with auto-tailored prompts, waits for all, synthesizes their findings into a single consolidated report. Use for cross-repo investigations or audits.
---

# dispatch

### 1. Resolve targets and the dispatch prompt

Identify the list of target ecosystem members (member ids or `--all` for every member) and the dispatch prompt from the user's input. If either is missing, ask for it and stop until they answer.

### 2. Tailor the prompt per target

For each target, build a per-repo prompt that:

- States the dispatch question explicitly
- Tells the subagent to read `specs/status.md` + relevant rules first
- Asks for a structured response: findings, blockers, recommended action
- Names the repo so the subagent knows its context

### 3. Fan out subagents in parallel

Use Antigravity's native parallel subagent capability to spawn one subagent per target in a single turn. Each subagent receives its tailored prompt and the target repo path as the working directory.

### 4. Wait + collect

Wait until all subagents return. If any subagent errors or times out, record the failure but do not block the synthesis on the survivors.

### 5. Synthesize

Produce a single consolidated report with these sections:

- **Mode**: parallel (N targets)
- **Findings**: per-target structured summary, with consistent fields per repo
- **Cross-cutting patterns**: themes that appeared in ≥2 targets
- **Recommended next action**: 1–3 concrete proposals, ranked

### 6. Write the dispatch artifact

Append the full synthesis to `.momentum/runs/dispatch-<NNN>.md` so the result is durable across sessions.

### 7. Return to user

Present the synthesis. Note any subagent failures explicitly. If the user wants to act on a finding, route them to `/initiative create` (for cross-repo work) or to file a per-repo backlog item.

## Constraints

- Subagents are dispatched in PARALLEL, not sequentially.
- If only one target is given, suggest `/scout` instead and ask the user to confirm.
- Synthesis must clearly attribute findings to source repos (one repo can't speak for the others).
