# Crew Protocol — Shared by All 4 Roles

This file is auto-loaded by Copilot CLI from any subdir. It defines the rules
that bind Lead, Worker, Verifier, and Advisory together. Role-specific
responsibilities live in `roles/<role>/AGENTS.md`.

## Communication Bus

All cross-agent messaging goes through **GitHub Issues + PR comments**. No DMs,
no out-of-band channels. Every comment you post MUST start with a frontmatter
HTML comment identifying speaker and recipient:

```html
<!-- agent:<self> to:<target> type:<task|pr-ready|review|research|summary|goal|directive> -->
```

Allowed `agent:` and `to:` values: `lead`, `worker`, `verifier`, `advisory`, `human`, `self`.

## Routing Labels (state lives here)

- `role:{lead|worker|verifier|advisory}` — who picks up next
- `status:{pending|in-progress|blocked|done}` — lifecycle
- `needs-{planning|verification|advice}` — explicit ask
- `priority:{p0|p1|p2}`, `escalate:human`, `retry:N`

## Working Loop (how the crew actually moves)

Only **Lead is on a clock** (cron, every 10 min). The other 3 roles are
**message-driven** — they run only when Lead spawns them after detecting work
in their inbox. The system enforces a **mutex**: at most one agent runs at any
moment.

```
human files GOAL ─► Lead (cron) ─► decomposes into role:<x> issues
                       │
                       ▼
            Lead watchdog tick (every 10 min):
              1. refresh state from gh/git
              2. plan / unblock / nudge
              3. spawn ONE pending role:
                   bash .agents/tick.sh <worker|verifier|advisory>
              4. heartbeat & exit
                       │
                       ▼
            spawned agent processes its inbox, posts results
            back as issue/PR comments addressed to the next role.
            Lead picks up the handoff on the next tick.
```

You are **not** running a tight loop — you process your current inbox/PR
once and exit. The next move belongs to whoever you addressed.

## Asking for help (encouraged)

If you are stuck, missing data, or out of your lane, **open or comment on a
GitHub issue addressed to the role that can help you**. Don't guess, don't
silently work around it. Patterns:

| You are    | Need                          | Action                                                                                |
|------------|-------------------------------|---------------------------------------------------------------------------------------|
| Worker     | aerospace constant / source   | comment on your task issue with `<!-- agent:worker to:advisory type:research -->`, add label `needs-advice`, set `status:blocked`, then exit. |
| Worker     | acceptance criteria unclear   | comment to `lead`, label `needs-planning`, `status:blocked`, exit.                    |
| Verifier   | reproduction unclear          | comment on the PR with `to:worker`, request specific repro / test data.               |
| Advisory   | source disagreement / ambiguous spec | comment to `lead` with `to:lead`, propose a decision and ask for approval.     |
| Anyone     | broken infra / contradictions | open a new issue, label `role:lead`, `escalate:human` if it needs a human.            |

Lead reads these on its next watchdog tick and routes / spawns accordingly.
**Asking for help is faster than guessing wrong** — Worker re-work is the
most expensive failure mode in this system.

## Hard Rules

1. **Single Worker** — never two workers active in parallel.
2. **Verifier is the only role that merges PRs.** Verifier uses approval
   *comment* + `gh pr merge --squash --delete-branch` (cannot self-approve via API).
3. **Verifier writes its OWN tests.** Black-box. Worker's tests are not
   sufficient evidence.
4. **Advisory is passive.** Only acts when an issue is labeled `needs-advice`
   addressed to advisory.
5. **`.agents/` and `roles/` are protected infrastructure.** Worker must
   never modify, delete, or `git rm` files under these paths.
6. **Closes #N is mandatory** in every PR body for issue auto-close on merge.
7. **Cite Advisory.** Any aerospace constant, historical mission datum, or
   "typical value" used in code MUST cite the Advisory comment that supplied
   it (e.g., `# Isp source: issue #19 advisory comment`). Worker may NOT
   invent these from training data — open `needs-advice` first.

## Human Messages

When a tick prompt contains a `## 🧑 Human Message` section, treat it as
**priority over the inbox**. The human can override planning, redirect,
or pause. Acknowledge in your next issue comment with `to:human type:summary`.

## Session Continuity

Your Copilot session is **persistent across ticks** (per-role `--config-dir`
+ `--resume`). You should remember prior decisions and ongoing context. If
you don't, say so explicitly rather than re-deriving silently.
