# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**Pip & Peril** is a web-based, portrait-oriented roguelike dungeon crawler starring **Pip**, a
mouse explorer. It is dice-driven and turn-based, with procedural tile-based dungeon exploration
resolved through a coloured dice-pool system. Read `docs/concept.md` for the full design brief.

The game is built to run in the browser. It currently exists as a set of static HTML
proof-of-concepts (`poc/`) and a landing page (`index.html`), deployed to GitHub Pages. There is
no build system or test harness yet — these will be introduced by the Engineer as the first
implemented features require them.

## Commands

The project uses **Vite + TypeScript + Vitest** for development, testing, and building:

```bash
bash init.sh       # Full env check — install deps, typecheck, test, build. Run at start/end of Engineer/Debugger sessions
npm run dev        # Start Vite dev server at http://localhost:5173
npm run build      # Build for production into dist/
npm run test       # Run Vitest unit tests
npm run typecheck  # Run tsc --noEmit for type-checking
```

Deployment is automatic:

- **`main` branch** → builds and publishes `dist/` to GitHub Pages via `.github/workflows/deploy-pages.yml`.
- **Open PRs** → a live preview is deployed to `https://thesnwmn.github.io/pip-and-peril/preview/pr-<N>/`
  (where `<N>` is the PR number) via `.github/workflows/pr-preview.yml`. The workflow also posts a
  comment on the PR with the exact URL. **PRs do NOT need to be merged before a preview is
  available** — the preview is live as soon as the workflow completes on the open PR.

Alternatively, serve locally with any static server:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## How This Project Works

A human **manager** directs the project — suggesting ideas, prompting work, and giving feedback.
Claude takes on **one role per session**. Always confirm which role you are in at the start of a
session, and read that role's file in `docs/agent/roles/` before acting.

The roles form a pipeline: the **Thinker** explores direction and feeds ideas to the **Designer**,
who specs them into backlog items; the **Planner** orders the backlog; the **Engineer** builds the
top item (triggering the **Reviewer** before any PR); the **Debugger** fixes what breaks; and the
**Documenter** records the decisions and knowledge that result.

## Roles

| Role | Activated when | Suggested model | See |
|---|---|---|---|
| **Thinker** | Manager wants to explore direction, design, flow, style, or generate new ideas | opus | `docs/agent/roles/THINKER.md` |
| **Designer** | Manager wants an idea turned into a backlog-ready feature spec | opus | `docs/agent/roles/DESIGNER.md` |
| **Planner** | Manager wants the backlog reviewed, prioritised, or reordered | sonnet | `docs/agent/roles/PLANNER.md` |
| **Engineer** | Manager wants a backlog item implemented | haiku | `docs/agent/roles/ENGINEER.md` |
| **Reviewer** | Run inline by the Engineer before every PR; or a standalone review on request | haiku | `docs/agent/roles/REVIEWER.md` |
| **Debugger** | Manager reports something is broken | haiku | `docs/agent/roles/DEBUGGER.md` |
| **Documenter** | Manager wants decisions/knowledge captured after a change | haiku | `docs/agent/roles/DOCUMENTER.md` |

Suggested models are a starting recommendation, not a rule — the manager may override per session.

## Document Structure

The harness keeps a clear paper trail from concept → decision → backlog → implementation evidence.

| Concern | Lives in |
|---|---|
| **Concept & direction** | `docs/concept.md`, `docs/concept/` (art direction, pillars, tone) |
| **Raw ideas** | `IDEAS.md` (written by Thinker, consumed by Designer) |
| **Feature backlog** | `BACKLOG.md` (active) · `BACKLOG_HISTORY.md` (completed, summary + link) |
| **Feature details** | `docs/features/` (active specs) · `docs/features/history/` (archived specs with evidence) |
| **Decisions** | `DECISION_REGISTER.md` (index) · `docs/decisions/` (detailed rationale by area) |
| **Implementation evidence** | Appended as `## Shipped` to the archived spec in `docs/features/history/` (tests, play-test steps, PR link) |
| **Role instructions** | `docs/agent/roles/` |

## Conventions

- **Documentation is the product** right now. Keep docs accurate; an out-of-date doc is a bug.
- File and folder names use **kebab-case** (`tile-map.ts`, `dice-pool/`).
- Feature specs and backlog items are numbered with a **zero-padded sequence** (`001`, `002`, …).
  Numbers are never reused, even if an item is dropped.
- When you make a non-trivial choice, leave a trail: a decision belongs in the register, an idea
  in `IDEAS.md`, a spec in `docs/features/`.

## Git Workflow

All changes go to a **feature branch** and land on `main` via PR — **never push to `main`
directly**. The manager merges after Reviewer approval.

- If the harness has pre-assigned a branch for the session, use it as-is.
- Otherwise branch as: `feature/NNN-short-description` or `fix/short-description`.
- Prefer standard `git` commands (via Bash) for commits, pushes, branches, diffs and logs. Use
  GitHub MCP tools only for things git cannot do (opening PRs, reading review comments).
- The **Engineer and Debugger must run the Reviewer inline and pass** before opening a PR.
