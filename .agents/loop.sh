#!/usr/bin/env bash
# loop.sh — single-process round-table scheduler for the 4-role crew.
#
# Behavior per cycle, in order [lead, worker, verifier, advisory]:
#   - lead: ALWAYS runs (watchdog).
#   - others: run ONLY if they have a pending inbox issue.
# Sequential by construction → natural mutex, no nested copilot.
#
# Stops when:
#   - .agents/STOPPED file appears (lead writes it on GOAL completion)
#   - SIGINT / SIGTERM
#
# Usage:
#   bash .agents/loop.sh              # run forever
#   SLEEP_SECS=10 bash .agents/loop.sh
#   MAX_CYCLES=3 bash .agents/loop.sh # for smoke testing

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="$REPO_ROOT/.agents/log"
STOP_FILE="$REPO_ROOT/.agents/STOPPED"
SLEEP_SECS="${SLEEP_SECS:-30}"
MAX_CYCLES="${MAX_CYCLES:-0}"   # 0 = forever

ROLES=(lead worker verifier advisory)

ts() { date -u +'%Y-%m-%dT%H:%M:%SZ'; }
note() { echo "[loop $(ts)] $*" | tee -a "$LOG"; }

cleanup() { note "shutdown signal — exiting loop"; exit 0; }
trap cleanup INT TERM

cycle=0
note "scheduler started (sleep=${SLEEP_SECS}s, max_cycles=${MAX_CYCLES:-∞})"

while true; do
  cycle=$((cycle + 1))

  if [[ -f "$STOP_FILE" ]]; then
    note "STOPPED sentinel present — halting scheduler"
    cat "$STOP_FILE" | tee -a "$LOG"
    exit 0
  fi

  note "── cycle #${cycle} ──"

  for role in "${ROLES[@]}"; do
    if [[ "$role" == "lead" ]]; then
      should_run=1
      reason="watchdog (always)"
    elif [[ "$role" == "verifier" ]]; then
      # verifier inbox = pending issues OR open PRs needing review
      icount="$(gh issue list \
        --label "role:verifier" --label "status:pending" \
        --state open --json number --limit 1 2>/dev/null \
        | jq 'length' 2>/dev/null || echo 0)"
      pcount="$(gh pr list --state open \
        --json number,labels --limit 50 2>/dev/null \
        | jq '[.[] | select(.labels | map(.name) | any(. == "needs-verification" or . == "role:verifier"))] | length' 2>/dev/null || echo 0)"
      # Also catch PRs with no labels at all (lead may not have labeled yet)
      ucount="$(gh pr list --state open \
        --json number,labels --limit 50 2>/dev/null \
        | jq '[.[] | select(.labels | length == 0)] | length' 2>/dev/null || echo 0)"
      total=$(( ${icount:-0} + ${pcount:-0} + ${ucount:-0} ))
      if [[ "$total" -gt 0 ]]; then
        should_run=1
        reason="issues=${icount} prs=${pcount} unlabeled-prs=${ucount}"
      else
        should_run=0
        reason="empty inbox, skip"
      fi
    else
      count="$(gh issue list \
        --label "role:${role}" --label "status:pending" \
        --state open --json number --limit 1 2>/dev/null \
        | jq 'length' 2>/dev/null || echo 0)"
      if [[ "${count:-0}" -gt 0 ]]; then
        should_run=1
        reason="inbox=${count}"
      else
        should_run=0
        reason="empty inbox, skip"
      fi
    fi

    if [[ "$should_run" -eq 1 ]]; then
      note "▶ ${role} — ${reason}"
      bash "$REPO_ROOT/.agents/tick.sh" "$role" >>"$LOG" 2>&1
      rc=$?
      note "◀ ${role} done (rc=${rc})"
    else
      note "· ${role} — ${reason}"
    fi
  done

  if [[ "$MAX_CYCLES" -gt 0 && "$cycle" -ge "$MAX_CYCLES" ]]; then
    note "reached MAX_CYCLES=${MAX_CYCLES} — exiting"
    exit 0
  fi

  note "sleeping ${SLEEP_SECS}s"
  sleep "$SLEEP_SECS"
done
