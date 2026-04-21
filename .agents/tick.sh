#!/usr/bin/env bash
# tick.sh v3 — one polling step for a single agent role.
#
# Usage:
#   bash .agents/tick.sh <role>                  # auto: read inbox
#   bash .agents/tick.sh <role> "extra prompt"   # inject human message
#   bash .agents/tick.sh <role> -                # read human message from stdin
#   bash .agents/tick.sh broadcast "msg"         # send same message to all 4
#
# Layout:
#   <repo>/agents/<role>.agent.md     — role definition (Copilot custom agent)
#   <repo>/AGENTS.md                  — shared crew protocol
#   <repo>/.agents/cfg/<role>/        — per-role COPILOT_CONFIG_DIR (session state)
#   <repo>/.agents/log                — append-only stdout log
#
# Each role uses --continue to keep memory across ticks, but agent files
# include a mandatory "always re-read state" rule to defeat staleness.

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
  lead)     MODEL="claude-opus-4.7" ;;
  worker)   MODEL="gpt-5.4" ;;
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

# Custom instructions auto-load: Copilot reads AGENTS.md from cwd walking up.
# We cd into roles/<role>/ so role-specific AGENTS.md loads first, then
# repo-root AGENTS.md (shared crew protocol) loads as parent.
cd "$ROLE_DIR"

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

# Compose inbox section (use jq map+join to avoid shell quoting issues)
if [[ "$INBOX_COUNT" -gt 0 ]]; then
  INBOX="$(echo "$TASK_JSON" | jq -r 'map("### Issue #\(.number): \(.title)\nLabels: " + ([.labels[].name] | join(", ")) + "\n\n" + .body + "\n") | join("\n---\n")')"
else
  INBOX="(empty inbox)"
fi

PROMPT="## Inbox (live, fetched at tick time)
$INBOX"

if [[ -n "$HUMAN" ]]; then
  PROMPT="$PROMPT

## 🧑 Human Message (priority over inbox)
<!-- agent:human to:$ROLE type:directive -->
$HUMAN"
fi

# Resume session if we have one, else start fresh
RESUME_FLAG="--continue"
if [[ ! -d "$CFG/session-state" ]] && [[ ! -d "$CFG/sessions" ]]; then
  RESUME_FLAG=""
  echo "[$ROLE] no prior session, starting fresh"
fi

echo "[$ROLE] inbox=$INBOX_COUNT human=$([ -n "$HUMAN" ] && echo yes || echo no) cfg=$CFG model=$MODEL"

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
