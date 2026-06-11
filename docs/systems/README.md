# System Documentation

This folder describes **Pip & Peril's major systems as they are actually implemented** — not
as they were designed to be. It is the implemented-reality counterpart to `docs/concept/`.

## Concept docs vs. System docs

| `docs/concept/` | `docs/systems/` |
|---|---|
| Design direction and intent | Actual behaviour as built |
| Written by Thinker / Designer | Written by Documenter after features ship |
| May be ahead of implementation | Always behind or current with implementation |
| Aspirational; includes open questions | Descriptive; records what exists |

When concept and system docs conflict, **system docs are authoritative for what the code does**.
Update system docs when a feature ships; update concept docs when design direction changes.

## Files

| File | System | Last updated |
|---|---|---|
| `combat.md` | Turn-based combat loop, intents, dice actions, active defence | 2026-06-11 |
| `dungeon-generation.md` | Floor generation, room placement, weight system, tile types | 2026-06-11 |
| `item-system.md` | Item data model, interjection windows, Luck interrupt, charges | 2026-06-11 |
| `meta-progression.md` | MetaState, persistence, weapon system, camp screen, run flow | 2026-06-11 |

## Who should read this

- **Engineers** — before working on a system, read its doc to understand the current shape.
  Do not extend a system in a way that contradicts the invariants listed here.
- **Designers / Thinker** — when speccing features that touch an existing system, check here
  to understand what hooks and patterns already exist.
- **Documenter** — update the relevant file after a feature ships that changes a system's
  behaviour or data model.
