#!/usr/bin/env bash
# setup-labels.sh — idempotently create the multi-agent label schema.
# Safe to re-run; --force updates color/description if they change.

set -euo pipefail

# role:* — who the issue/PR is addressed to
gh label create "role:lead"     --color "1f6feb" --description "For the Lead planning agent"     --force
gh label create "role:worker"   --color "0e8a16" --description "For a Worker implementation agent" --force
gh label create "role:verifier" --color "8957e5" --description "For the Verifier review agent"   --force
gh label create "role:advisory" --color "fbca04" --description "For the Advisory research agent" --force

# status:* — task lifecycle
gh label create "status:pending"     --color "ededed" --description "Waiting to be picked up by its role"          --force
gh label create "status:in-progress" --color "fbca04" --description "An agent is actively working on it"           --force
gh label create "status:blocked"     --color "b60205" --description "Cannot proceed; needs input or a decision"    --force
gh label create "status:done"        --color "0e8a16" --description "Completed and verified"                       --force

# needs:* — explicit asks
gh label create "needs-planning"     --color "1d76db" --description "Lead must break this down into worker tasks"  --force
gh label create "needs-verification" --color "8957e5" --description "Worker has finished; Verifier should review"  --force
gh label create "needs-advice"       --color "fbca04" --description "Advisory agent should weigh in"               --force

# priority:* — Lead sets these
gh label create "priority:p0" --color "b60205" --description "Critical / blocks the MVP"     --force
gh label create "priority:p1" --color "d93f0b" --description "Important but not blocking"    --force
gh label create "priority:p2" --color "fef2c0" --description "Nice to have"                   --force

# escalation
gh label create "escalate:human" --color "000000" --description "Agents are stuck; a human should intervene" --force

echo "Label schema applied."
