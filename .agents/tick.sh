#!/usr/bin/env bash
# tick.sh v2 — one polling step for a single agent role.
#
# Usage:
#   bash .agents/tick.sh <role>                  # auto: read inbox
#   bash .agents/tick.sh <role> "extra prompt"   # inject human message
#   bash .agents/tick.sh <role> -                # read human message from stdin
#   bash .agents/tick.sh broadcast "msg"         # send same message to all 4
#
# Each role runs in its own COPILOT_CONFIG_DIR with --continue (or new
# session on first run). Role-specific instructions auto-load from
# roles/<role>/AGENTS.md; shared protocol from repo-root AGENTS.md.

set -euo pipefail

ROLE="${1:-}"; shift || true

if [[ "$ROLE" == "broadcast" ]]; then
  MSG="${*:-}"
  [[ -z "$MSG" ]] && { echo "broadcast needs a message" >&2; exit 2; }
  for r in lead worker verifier advisory; do
    echo "=== broadcast → $r ==="
    bash "$0" "$r" "$MSG" || true
  done
  exit 0
fi

case "$ROLE" in
  lead)     MODEL="claude-sonnet-4.5" ;;
  worker)   MODEL="gpt-5.2" ;;
  verifier) MODEL="claude-opus-4.7" ;;
  advisory) MODEL="gpt-5.2" ;;
  *) echo "usage: $0 <lead|worker|verifier|advisory|broadcast> [prompt|-]" >&2; exit 2 ;;
esac

# Optional human prompt
HUMAN=""
if [[ "${1:-}" == "-" ]]; then
  HUMAN="$(cat)"
elif [[ -n "${1:-}" ]]; then
  HUMAN="$*"
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROLE_DIR="$REPO_ROOT/roles/$ROLE"
CFG="$REPO_ROOT/.agents/cfg/$ROLE"
mkdir -p "$CFG"

cd "$REPO_ROOT"

# Pull this role's inbox (oldest pending first)
TASK_JSON="$(gh issue list \
  --label "role:${ROLE}" --label "status:pending" \
  --state open --json number,title,body,labels --limit 50 \
  | jq 'sort_by(.number)')"

INBOX_COUNT="$(echo "$TASK_JSON" | jq 'length')"

if [[ "$INBOX_COUNT" -eq 0 && -z "$HUMAN" ]]; then
  echo "[$ROLE] no pending tasks, no human input. exiting clean."
  exit 0
fi

# Compose inbox section
if [[ "$INBOX_COUNT" -gt 0 ]]; then
  INBOX="$(echo "$TASK_JSON" | jq -r '.[] | "### Issue #\(.number): \(.title)\nLabels: \([.labels[].name] | join(\", \"))\n\n\(.body)\n"')"
else
  INBOX="(empty inbox)"
fi

# Build prompt
PROMPT="## Inbox
$INBOX"

if [[ -n "$HUMAN" ]]; then
  PROMPT="$PROMPT

## 🧑 Human Message (priority over inbox)
<!-- agent:human to:$ROLE type:directive -->
$HUMAN"
fi

# Resume session if we have one, else start fresh
RESUME_FLAG="--continue"
# .copilot/session-state may not exist yet on first run
if [[ ! -d "$CFG/session-state" ]] && [[ ! -d "$CFG/sessions" ]]; then
  RESUME_FLAG=""
  echo "[$ROLE] no prior session, starting fresh"
fi

echo "[$ROLE] inbox=$INBOX_COUNT human=$([ -n "$HUMAN" ] && echo yes || echo no) cfg=$CFG"

# Run from role dir so Copilot auto-loads roles/$ROLE/AGENTS.md and root AGENTS.md
cd "$ROLE_DIR"
set +e
copilot \
  --config-dir "$CFG" \
  --add-dir "$REPO_ROOT" \
  --model "$MODEL" \
  --allow-all-tools \
  --no-color \
  $RESUME_FLAG \
  -p "$PROMPT"
RC=$?
set -e
cd "$REPO_ROOT"

# Breadcrumb on the first inbox issue (if any)
FIRST_NUM="$(echo "$TASK_JSON" | jq -r '.[0].number // empty')"
if [[ -n "$FIRST_NUM" ]]; then
  TS="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  gh issue comment "$FIRST_NUM" \
    --body "🤖 ticked by ${ROLE} (model=${MODEL}) at ${TS} — copilot exit=${RC}" \
    >/dev/null || true
fi

echo "[$ROLE] tick complete (rc=${RC})"
exit "$RC"
