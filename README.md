# rocket-edu-mvp

A small educational website that teaches the **Tsiolkovsky rocket equation**
to high-school students and curious learners — built end-to-end by a crew
of four AI agents that coordinate exclusively through GitHub issues and PRs.

> Δv = Isp · g₀ · ln(m₀ / m_f)

The finished site lives in [`docs/`](./docs) and is intended to deploy to
GitHub Pages with no build step (plain HTML, CSS, and JavaScript files).

## Features

The site intentionally ships three user-facing pages:

1. **Equation guide** with a Δv calculator, worked Falcon 9 example, and plain-language explanation of the Tsiolkovsky rocket equation.
2. **Multi-stage designer** for live per-stage Δv, TWR, capability labels, and a stage-burn velocity chart.
3. **Advanced designer** for realistic multi-stage rocket design with presets, mission analysis, glossary help, silhouette updates, and share links.

## Sources

- [Issue #23 advisory comment](https://github.com/chkap/rocket-edu-mvp/issues/23#issuecomment-4286980274)
  — Δv budget thresholds and capability-label assumptions.
- [Issue #24 advisory comment](https://github.com/chkap/rocket-edu-mvp/issues/24#issuecomment-4286980437)
  — launcher stage masses, Isp, thrust, and mission-reference comparisons.

## Development

```bash
npm install
npm test
npm run smoke
```

To preview the static site locally:

```bash
cd docs
python3 -m http.server
```

The designer-v2 smoke test uses Vitest + JSDOM, so it runs locally without
launching a browser:

```bash
npm run smoke
```

## Docs maintenance

- **Engine catalog:** add new engines in `docs/data/engines.json` with a unique
  `key`, the thrust/Isp/mass fields used by `docs/lib/designer_v2/physics.js`,
  and any fixed-mass metadata needed for blob-style models. Then add matching UI
  labels under `designer_v2.engine.<key>` in both `docs/i18n/en.json` and
  `docs/i18n/zh.json`.
- **i18n contract:** every user-facing string belongs in
  `docs/i18n/en.json` and `docs/i18n/zh.json`; pages and scripts should read
  them through `docs/lib/i18n.js` rather than hardcoding visible copy.

## The 4-role agent crew

| Role         | Model              | Responsibility                                                                 |
| ------------ | ------------------ | ------------------------------------------------------------------------------ |
| **Lead**     | claude-sonnet-4.5  | Plans. Breaks goals into worker tasks. Files issues. Never writes code.        |
| **Worker**   | gpt-5              | Implements one task at a time. Opens PRs. Never approves its own work.         |
| **Verifier** | claude-opus-4.7    | Independent black-box review. **Only** role allowed to approve / merge PRs.    |
| **Advisory** | gpt-5              | Passive researcher. Answers issues tagged `needs-advice`. Never writes code.   |

Worker and Verifier are intentionally **different model families** so the
reviewer can catch failure modes the implementer is blind to.

## How a tick works

Agents are invoked by a simple bash poller:

```bash
bash .agents/tick.sh lead       # let the Lead plan
bash .agents/tick.sh worker     # let a Worker pick up a task
bash .agents/tick.sh verifier   # let the Verifier review
bash .agents/tick.sh advisory   # let Advisory answer a research question
```

Each tick:

1. Looks for the oldest open issue with labels `role:<X>` + `status:pending`.
2. Loads the role's system prompt from [`.agents/prompts/`](./.agents/prompts).
3. Invokes `copilot --model <role-model> --allow-all-tools -p "<prompt+task>"`.
4. Posts a comment on the issue noting it was ticked.

For the MVP, ticks are run by hand. In production, point cron at them.

## Communication protocol

Every issue/PR body or comment authored by an agent **must** start with an
HTML-comment frontmatter so other agents can route it:

```
<!-- agent:<from> to:<to> type:<task|pr-ready|review|research|goal|status> -->
```

## Label schema

Run once: `bash .agents/setup-labels.sh`

- `role:lead`, `role:worker`, `role:verifier`, `role:advisory`
- `status:pending`, `status:in-progress`, `status:blocked`, `status:done`
- `needs-planning`, `needs-verification`, `needs-advice`
- `priority:p0`, `priority:p1`, `priority:p2`
- `escalate:human` — drop here when agents are stuck

## Repo layout

```
README.md
.agents/
  tick.sh
  setup-labels.sh
  prompts/{lead,worker,verifier,advisory}.md
docs/                 # the website itself (built by the Worker)
```

## Status

MVP scaffolding. The first goal issue has been filed for the Lead.
