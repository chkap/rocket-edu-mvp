#!/usr/bin/env bash
# tick.sh — one polling step for a single agent role.
#
# Usage:  bash .agents/tick.sh <lead|worker|verifier|advisory>
#
# Picks the oldest open issue labelled role:<ROLE> + status:pending,
# loads the role's system prompt, and hands the task to `copilot` in
# non-interactive mode. Posts a tick-receipt comment on the issue.
# Exits 0 cleanly if no task is waiting.

set -euo pipefail

ROLE="${1:-}"
case "$ROLE" in
  lead)     MODEL="claude-sonnet-4.5" ;;
  worker)   MODEL="gpt-5.2" ;;
  verifier) MODEL="claude-opus-4.7" ;;
  advisory) MODEL="gpt-5.2" ;;
  *) echo "usage: $0 <lead|worker|verifier|advisory>" >&2; exit 2 ;;
esac

# Resolve repo root (script lives in .agents/ at the repo root).
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROMPT_FILE="$REPO_ROOT/.agents/prompts/${ROLE}.md"
[[ -f "$PROMPT_FILE" ]] || { echo "missing prompt: $PROMPT_FILE" >&2; exit 1; }

cd "$REPO_ROOT"

# Grab the next pending task for this role (oldest first; --limit 1 returns
# the most recently-updated by default, but for MVP that's fine).
TASK_JSON="$(gh issue list \
  --label "role:${ROLE}" --label "status:pending" \
  --state open --json number,title,body --limit 50 \
  | jq 'sort_by(.number) | .[0:1]')"

NUM="$(echo "$TASK_JSON"   | jq -r '.[0].number // empty')"
TITLE="$(echo "$TASK_JSON" | jq -r '.[0].title  // empty')"
BODY="$(echo "$TASK_JSON"  | jq -r '.[0].body   // empty')"

if [[ -z "$NUM" ]]; then
  echo "[$ROLE] no pending tasks. exiting clean."
  exit 0
fi

echo "[$ROLE] picked issue #${NUM}: ${TITLE}"

# Compose the full prompt: role system prompt + the task block.
SYSTEM="$(cat "$PROMPT_FILE")"
FULL_PROMPT="$(printf '%s\n\n## Current Task\nIssue #%s: %s\n\n%s\n\n---\nYou are operating inside the git repo at: %s\nUse the `gh` CLI for all GitHub interactions. Cite the issue number in any comments or PRs you create.\n' \
  "$SYSTEM" "$NUM" "$TITLE" "$BODY" "$REPO_ROOT")"

# Hand off to copilot. --allow-all-tools is required for non-interactive runs.
# We capture both streams so the parent tick caller can inspect what happened.
set +e
copilot --model "$MODEL" --allow-all-tools --no-color -p "$FULL_PROMPT"
RC=$?
set -e

# Always leave a breadcrumb on the issue, even if copilot errored.
TS="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
gh issue comment "$NUM" \
  --body "🤖 ticked by ${ROLE} (model=${MODEL}) at ${TS} — copilot exit=${RC}" \
  >/dev/null

echo "[$ROLE] tick complete (copilot rc=${RC})"
exit "$RC"
