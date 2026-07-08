#!/usr/bin/env bash
# antigravity-hook-adapter.sh — Antigravity 2.x payload/response boundary shim.
#
# Phase 22b (ADR-0006). Antigravity's hook contract differs from Claude
# Code/Codex in payload shape (camelCase protojson, toolCall.args.*), response
# channel (stdout decision JSON, ALWAYS exit 0), hook CWD (the directory
# containing hooks.json — i.e. .agents/), and event set (five events, no
# SessionStart; PreInvocation injectSteps is the session-start mechanism).
# Contract source: specs/phases/phase-22b-antigravity-2-adoption/evidence/
# fact-sheet.md §5 (locked live against agy 1.0.16).
#
# This shim translates at the boundary and delegates to the shared core
# scripts UNCHANGED, so Claude Code + Codex behavior stays byte-identical:
#
#   pre-tool        → brainstorm-gate.sh        exit 2/stderr → {"decision":"deny",...}
#   post-tool       → check-history-reminder.sh stdout → queued (PostToolUse
#                     has no message channel), respond {}
#   pre-invocation  → sessionstart-handoff.sh at invocationNum 0 + drain the
#                     queue → {"injectSteps":[{"ephemeralMessage": ...}]}
#
# Every failure path fails OPEN (allow / {}), and the script always exits 0 —
# non-zero is treated as hook infrastructure failure by the vendor runner.

set -u

MODE="${1:-}"
INPUT=$(cat 2>/dev/null || true)

respond_neutral() {
  case "$MODE" in
    pre-tool) printf '{"decision":"allow"}' ;;
    *)        printf '{}' ;;
  esac
  exit 0
}

[ -n "$MODE" ] || respond_neutral
command -v python3 >/dev/null 2>&1 || respond_neutral

# ── Parse the camelCase payload once ────────────────────────────────────────
eval "$(printf '%s' "$INPUT" | python3 -c '
import sys, json, shlex
try:
    d = json.load(sys.stdin)
except Exception:
    d = {}
ws = (d.get("workspacePaths") or [""])[0] or ""
tc = d.get("toolCall") or {}
args = tc.get("args") or {}
path = args.get("TargetFile") or args.get("AbsolutePath") or args.get("FilePath") or ""
cmd = args.get("CommandLine") or ""
print("AG_ROOT=%s" % shlex.quote(ws))
print("AG_TOOL=%s" % shlex.quote(tc.get("name") or ""))
print("AG_PATH=%s" % shlex.quote(path))
print("AG_CMD=%s" % shlex.quote(cmd))
print("AG_INVOCATION=%s" % shlex.quote(str(d.get("invocationNum", ""))))
' 2>/dev/null)" 2>/dev/null || respond_neutral

# Hook CWD is .agents/ — fall back to its parent when the payload lacks
# workspacePaths (fail-open if neither resolves to a directory).
if [ -z "${AG_ROOT:-}" ] || [ ! -d "${AG_ROOT:-}" ]; then
  AG_ROOT=$(cd .. 2>/dev/null && pwd || true)
fi
[ -n "${AG_ROOT:-}" ] && [ -d "$AG_ROOT" ] || respond_neutral

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
NOTICES="$AG_ROOT/.momentum/antigravity-notices"

# Relativize the tool path against the project root — the shared scripts
# match relative patterns like specs/status.md.
rel_path="${AG_PATH:-}"
case "$rel_path" in
  "$AG_ROOT"/*) rel_path="${rel_path#"$AG_ROOT"/}" ;;
esac

# Legacy-shape payload for the shared scripts. run_command maps to Bash so
# the reminder script's session-append branch (git commit detection) works.
legacy_payload() {
  python3 -c '
import json, sys
tool, path, cmd = sys.argv[1], sys.argv[2], sys.argv[3]
if tool == "run_command":
    tool = "Bash"
elif tool and any(k in tool for k in ("write", "edit", "replace")):
    # Normalize the whole Antigravity write-tool family to the canonical
    # name the shared scripts already match — keeps core scripts untouched
    # (byte-identical for Claude Code/Codex, ADR-0006).
    tool = "write_to_file"
ti = {}
if path:
    ti["file_path"] = path
if cmd:
    ti["command"] = cmd
print(json.dumps({"tool_name": tool, "tool_input": ti}))
' "${AG_TOOL:-}" "$rel_path" "${AG_CMD:-}"
}

case "$MODE" in
  pre-tool)
    err=$( { legacy_payload | MOMENTUM_PROJECT_DIR="$AG_ROOT" \
        bash "$SCRIPT_DIR/brainstorm-gate.sh" >/dev/null; } 2>&1 )
    rc=$?
    if [ "$rc" -eq 2 ]; then
      printf '%s' "$err" | python3 -c \
        'import json,sys; print(json.dumps({"decision":"deny","reason":sys.stdin.read()[:1000]}))'
    else
      printf '{"decision":"allow"}'
    fi
    ;;

  post-tool)
    out=$( { legacy_payload | ( cd "$AG_ROOT" && \
        bash "$SCRIPT_DIR/check-history-reminder.sh" ); } 2>/dev/null || true )
    if [ -n "$out" ]; then
      mkdir -p "$AG_ROOT/.momentum" 2>/dev/null || true
      printf '%s\n' "$out" >> "$NOTICES" 2>/dev/null || true
    fi
    printf '{}'
    ;;

  pre-invocation)
    banner=""
    if [ "${AG_INVOCATION:-}" = "0" ]; then
      # Banner mode: non-TTY stdin → the handoff script prints to stderr and
      # exits 0 without the interactive prompt.
      banner=$( ( cd "$AG_ROOT" && \
        bash "$SCRIPT_DIR/sessionstart-handoff.sh" </dev/null ) 2>&1 >/dev/null || true )
    fi
    notices=""
    if [ -s "$NOTICES" ]; then
      notices=$(cat "$NOTICES" 2>/dev/null || true)
      : > "$NOTICES" 2>/dev/null || true
    fi
    python3 -c '
import json, sys
banner, notices = sys.argv[1], sys.argv[2]
msg = "\n".join(x for x in (banner.strip(), notices.strip()) if x)
print(json.dumps({"injectSteps": [{"ephemeralMessage": msg}]}) if msg else "{}")
' "$banner" "$notices"
    ;;

  *)
    respond_neutral
    ;;
esac

exit 0
