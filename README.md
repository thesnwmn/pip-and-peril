# Pip & Peril

> *Fortune Favors the Small*

A web-based, portrait-oriented roguelike dungeon crawler starring **Pip**, a mouse explorer.
Dice-driven, turn-based, with procedural tile-based dungeon exploration resolved through a coloured
dice-pool system. See the full design brief in [`docs/concept.md`](docs/concept.md).

## Status

Early exploration. The repo currently holds a landing page (`index.html`) and a set of static-HTML
proof-of-concepts under [`poc/`](poc/):

| POC | What it shows |
|---|---|
| `poc/tilemap/` | Top-down tile renderer with fog-of-war and Pip movement |
| `poc/dice/` | Coloured dice-pool roller with spendable pips |
| `poc/dungeon/` | Procedural dungeon tile generation |
| `poc/combat/` | Combat resolution sketch |

There is no build system yet — open any `index.html` directly in a browser, or serve the folder
with `python3 -m http.server`.

## How this repo is built

Pip & Peril is developed with an **agentic harness**: a human manager directs the work, and Claude
takes on a defined role per session — Thinker, Designer, Planner, Engineer, Reviewer, or
Documenter. The harness, roles, and document structure are described in
[`CLAUDE.md`](CLAUDE.md).

Key documents:

- [`CLAUDE.md`](CLAUDE.md) — harness overview, commands, roles, document map
- [`IDEAS.md`](IDEAS.md) — idea pool (Thinker → Designer)
- [`BACKLOG.md`](BACKLOG.md) / [`BACKLOG_HISTORY.md`](BACKLOG_HISTORY.md) — features queued / shipped
- [`DECISION_REGISTER.md`](DECISION_REGISTER.md) — architectural & design decisions
- [`docs/`](docs/) — concept, feature specs, decision detail, and role instructions

## Deployment

Pushing to `main` publishes the repo to GitHub Pages; open PRs get a live preview. Changes land on
`main` via reviewed PRs — never pushed directly.
