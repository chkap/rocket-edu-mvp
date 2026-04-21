#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROMPT_FILE="$REPO_ROOT/.agents/prompts/verifier.md"
cd "$REPO_ROOT"

PR_JSON="$(gh pr list --label needs-verification --state open --json number,title,headRefName,body --limit 1)"
NUM="$(echo "$PR_JSON" | jq -r '.[0].number // empty')"
TITLE="$(echo "$PR_JSON" | jq -r '.[0].title // empty')"
BODY="$(echo "$PR_JSON" | jq -r '.[0].body // empty')"
HEAD="$(echo "$PR_JSON" | jq -r '.[0].headRefName // empty')"

if [[ -z "$NUM" ]]; then
  echo "[verifier] no PRs awaiting verification."
  exit 0
fi

echo "[verifier] picked PR #${NUM}: ${TITLE} (branch ${HEAD})"

SYSTEM="$(cat "$PROMPT_FILE")"
FULL_PROMPT="$(printf '%s\n\n## Current PR to Verify\nPR #%s: %s\nBranch: %s\n\n%s\n\n---\nYou are operating inside the git repo at: %s\nUse `gh pr checkout %s` to get the branch. After verification, you MUST either approve+merge with `gh pr review --approve` then `gh pr merge --squash --delete-branch`, or request changes. Do not stop without making a decision.\n' \
  "$SYSTEM" "$NUM" "$TITLE" "$HEAD" "$BODY" "$REPO_ROOT" "$NUM")"

set +e
copilot --model claude-opus-4.7 --allow-all-tools --no-color -p "$FULL_PROMPT"
RC=$?
set -e

TS="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
gh pr comment "$NUM" --body "🤖 ticked by verifier (model=claude-opus-4.7) at ${TS} — copilot exit=${RC}" >/dev/null
echo "[verifier] tick complete (copilot rc=${RC})"
exit "$RC"
