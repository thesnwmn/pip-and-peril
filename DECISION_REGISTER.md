# Decision Register

A quick-reference index of every architectural and design decision for **Pip & Peril**. Read this
first; pull a detail file from `docs/decisions/` only when you need the full rationale for an area.

Maintained by the **Documenter**. Decisions are **append-and-supersede** — when a choice is
replaced, mark the old row *superseded* and link forward rather than deleting it.

## Detail files

| Area | File | Covers |
|---|---|---|
| _(none yet)_ | — | Detail files are added under `docs/decisions/` when a decision needs more than a one-line rationale. |

## Decision log

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D1 | Platform & orientation | Portrait-first web (browser), ~9:16 | Designed mobile-first; one-handed phone play suits a dice-tray UI. See `docs/concept.md`. |
| D2 | Core resolution system | Coloured dice-pool; pips spent as a per-turn resource | Defining mechanic of the game; tense, expressive, expandable. See `docs/concept.md`. |
| D3 | Current build tooling | None yet — plain static HTML POCs + landing page | Keep early exploration friction-free; introduce a toolchain only when a feature needs it. |
| D4 | Hosting & previews | GitHub Pages from repo root on `main`; PR previews to `pr-<n>/` | Zero-config static hosting; previews let the manager play-test PRs before merge. |
| D5 | Development model | Agentic role-based harness; human manager directs, Claude takes one role per session | Lets the manager steer while Claude does the bulk of the work with a clear paper trail. See `CLAUDE.md`. |
| D6 | Numbering convention | Zero-padded sequential IDs (`001`…) shared across ideas/features; never reused | Stable references across ideas, specs, backlog, and history. |
| D7 | File naming | kebab-case for files and folders | Consistency; matches likely future TypeScript module conventions. |

> When the first build/test toolchain is introduced, record it here (and update `CLAUDE.md`
> Commands), superseding **D3**.
