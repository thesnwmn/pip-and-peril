# 081 · Interior Tile Archetypes

**Status:** READY
**Source idea:** Idea 008 (promoted to backlog 081); manager request 2026-06-11 (intra-archetype
variety + a tile-browsing run mode)
**Depends on:** feature 003 (Tile Map Core — renderer & `drawSingleTile`), decision D8 (procedural
canvas art with `BiomePalette`)

## Summary

Today every placed tile is the same square stone room — it varies only by colour tint and a
room-type icon. Walk ten steps and you have seen the whole dungeon, which quietly breaks the
exploration pillar. This feature adds the missing **interior archetype** layer (layer 2 of the
four-layer tile model in `docs/concept/tiles-and-props.md`): the *shape and substance between the
doorways*. A tile becomes "exit layout × **interior archetype** × room type". Crucially, each
archetype is not one drawing but a small **family of seeded variants**, so two chambers — or two
caverns — read as different places while a given tile stays visually stable. Ships as a pure visual
**skin**: no rules change, exit positions are untouched, and the snapping invariant is preserved.
It also adds a **Tile Gallery** dev run mode — a code-backed page that renders the whole catalogue
for review — built to host props (082) and biomes (084–087) as they land.

## Acceptance criteria

The contract. Each criterion is concrete and testable.

1. A tile carries an **interior archetype** drawn from this catalogue: `chamber`, `passage`,
   `cavern`, `pillared`, `rubble`, `bridge` (chasm), `well`, `pool` (magic), `squeeze`. `chamber`
   is the default and is what an existing tile with no archetype renders as (back-compatible).
2. Each archetype renders a recognisably different **interior shape** while leaving every doorway
   opening exactly where the exit layout puts it — standard width (`cw`), centred (`co`), flush to
   the tile edge. Pip can always walk from any exit to any other exit on floor (the snapping
   invariant, `docs/concept/tiles-and-props.md`).
3. Each archetype supports one or more **variants** per the table in *Design detail*. Core
   atmosphere archetypes (chamber, passage, cavern, pillared, rubble) ship **≥ 2 variants each**;
   landmark/feature archetypes (bridge, well, pool, squeeze) may ship with 1.
4. A tile's variant is chosen by a **pure, deterministic function of its grid position**
   (`variantFor(archetype, col, row)`): the same tile renders the same variant on every redraw, and
   the function distributes variants across positions (not all the same). It does not depend on
   `Math.random()`.
5. Interior archetype is **assigned when a tile is placed**, stored on the tile, and **weighted by
   room type and depth phase** (reusing the existing `getDepthPhase` machinery and a new weight
   table in `DUNGEON_TUNING`). Corridors lean `passage`; deeper enemy/chest tiles lean
   `cavern`/`rubble`; shop/npc/boss lean `chamber`/`pillared`; `well`/`pool`/`bridge`/`squeeze` are
   rare and depth-gated.
6. Both render paths honour the archetype: `drawMap` (the live dungeon viewport) and
   `drawSingleTile` (room-selection cards and the gallery).
7. A new **Tile Gallery** run mode exists as its own entry point (`gallery.html`, registered in
   `vite.config.ts` alongside `game.html`), reachable in dev at `/gallery.html` and included in the
   production build. It renders **every archetype × every variant**, labelled, using the real
   renderer (`drawSingleTile`) — not a re-implementation.
8. The gallery is organised into labelled sections (*Archetype Catalogue*, *Room-Type Layer*, *Exit
   Layouts*) with a visible, empty **"Props — coming soon"** placeholder section, so feature 082 can
   slot in without restructuring the page.
9. The gallery's archetype grid is **exhaustive and deterministic** (every catalogue entry shown,
   stable between loads), so a reviewer can confirm each specimen renders correctly.
10. No mechanics are added. `bridge`, `well`, `pool`, and `squeeze` are visual only — no checks, no
    traversal rules, no `TileCell` behaviour beyond the stored archetype.
11. The new run mode is documented (a line in `README.md` and/or `CLAUDE.md` Commands) so the manager
    knows how to open it.
12. `npm run typecheck`, `npm run test`, and `npm run build` all pass. A unit test covers
    `variantFor` (determinism + distribution) and archetype assignment/weighting.

## Scope / non-goals

- **No props.** The decor/feature prop layer is feature 082. This item only leaves a labelled
  placeholder section in the gallery and ensures the renderer signature can grow a prop pass later.
- **No new mechanics.** Feature archetypes ship as skins. Squeeze-as-shortcut is 083; chasm/well/
  pool interactions are future items. This is the concept doc's "flavour-first" recommendation.
- **Snapping, fog, camera, exit-layout, and `ExitMask` logic are unchanged.** An archetype may
  reshape only the area *inside* the walls.
- **Not biome art.** Archetypes are tinted by the existing `DUNGEON` palette; biome-specific
  archetypes (Flooded Chamber, Jar Room, etc.) belong to 084–087. New palette tokens are added in a
  forward-compatible way so biomes can re-tint them.
- **The POC (`public/poc/tiles/`) is not the deliverable.** It was the visual exploration; this
  feature productionises the archetype layer into the real renderer. Retiring or keeping the POC is
  the Engineer's call — it is out of scope here.
- Variant *counts* are a dial: shipping the minimums in criterion 3 satisfies the spec; richer
  variant sets are welcome but not required.

## Design detail

### Data / state

- **`TileCell.archetype?: Archetype`** — a new optional field (new `Archetype` union of the nine
  catalogue keys). Optional so existing tiles, tests, and the floor-entry/start tile keep working;
  absent ⇒ rendered as `chamber`.
- **Assignment seam:** tiles are constructed in `src/navigation/room-selection.ts` (the
  `const cell: TileCell = { roomType, exits }` line). Assign `archetype` here, weighted by
  `roomType` and `getDepthPhase(floor, floorTilesPlaced)`, drawing from a new
  `DUNGEON_TUNING.archetypeWeights` table. Keep the random draw isolated so it is easy to test.
- **Variant is *not* stored.** It is derived at render time by
  `variantFor(archetype, col, row): number` — a small pure hash of the grid position modulo the
  archetype's variant count. Storing nothing keeps `TileCell` lean and the variant purely cosmetic;
  the renderer already receives `mapCol`/`mapRow`, and `drawSingleTile` can take an optional
  `variant` (defaulting to 0 for cards, or position-derived in the gallery).
- **New palette tokens on `BiomePalette`** (so 084–087 biomes can re-tint), with `DUNGEON` defaults:

  | Token | Default | Used for |
  |---|---|---|
  | `voidDrop` | `#0a0a14` | Chasm interior (the dark pit) |
  | `chasmRim` | `#000000` | Jagged chasm lip |
  | `featureStone` | `#3a342c` | Well rim, structural feature stone |
  | `wellWater` | `#10202c` | Dark water in a well |
  | `magicGlow` | `rgba(150,90,230,0.55)` | Magic-pool arcane glow (hints the future 🟣 die) |

### The archetype catalogue & variants

Shapes follow `docs/concept/tiles-and-props.md` and are already proven in the POC
(`public/poc/tiles/index.html`) — port those interior renderers into `src/map/renderer.ts`. The
"variant" column is the manager's "a few types of each style"; seeded micro-jitter *within* a
variant (e.g. rubble scatter, cavern blob wobble) is allowed for texture but the named variant is
the headline.

| Archetype | Feel | Variants (≥) | Variant ideas |
|---|---|---|---|
| **chamber** | The square room of today. | 3 | plain flagstone · cracked floor · raised dais (central platform) |
| **passage** | A real corridor — you pass *through*. | 2 | clean flags · worn & cracked. (Straight/L/T/cross silhouette comes from the exits automatically.) |
| **cavern** | Rough, close, natural; narrower than a chamber. | 3 | round grotto · narrow winding · stalagmite-studded |
| **pillared** | Grand, ceremonial. | 2 | four columns (quadrants) · two columns + central aisle |
| **rubble** | Damaged, hazardous. | 2 | scattered piles · partial cave-in (one corner blocked, path still clear) |
| **bridge** | A held breath; a pit splits the room. | 1–2 | plank bridge · stone span |
| **well** | A landmark. | 1 | central stone well |
| **pool** | Eerie, inviting; arcane. | 1 | glowing magic pool |
| **squeeze** | *Only Pip fits.* | 1 | mouse-hole crack |

**Variant rules (load-bearing):**
- A variant changes only what is *inside* the doorway openings. It must never move, resize, or
  block a doorway, and must always leave a walkable floor connecting every exit.
- `variantFor` is deterministic and position-stable: redrawing the same tile (every animation frame)
  must not flicker between variants.
- Pillar / rubble / cave-in placements sit clear of the doorway corridors (the POC's `corridors()`
  carve guarantees the through-line; decorations key off the floor quadrants).

### Behaviour

- **Live map:** `drawCell` reads `cell.archetype ?? 'chamber'`, computes `variantFor(archetype,
  mapCol, mapRow)`, and dispatches to the matching interior renderer *between* the wall base and the
  doorway-landing punch-through (the POC's draw order: wall → interior → doorway landings → room-type
  icon/border → fog). Existing steps 6–8 (room accents, fog, trap/fled markers) are unchanged and
  layer on top.
- **Room-selection cards:** `drawSingleTile` takes the archetype (and an optional variant) so an
  offered tile previews its real interior.
- **Weighting** mirrors the existing room-weight pattern: a `Record<RoomType, Partial<Record<
  Archetype, number>>>`-shaped table biased by depth phase. Rough intent (engineer tunes exact
  numbers in `DUNGEON_TUNING`):

  ```
  corridor → passage heavy, occasional cavern/squeeze
  enemy    → chamber/cavern early; cavern/rubble late
  chest    → chamber early; rubble/cavern late (loot in ruins)
  shop/npc → chamber/pillared (clean, framed for an encounter)
  boss     → pillared heavy (frames the arena)
  item     → chamber/cavern; rare pool (arcane find)
  start    → chamber (or well, as a landmark hub)
  well / pool / bridge / squeeze → low weights, gated to mid/late depth as treats
  ```

### Edge cases

- **Start / floor-entry tile** is created in `dungeon-state.ts` without an archetype ⇒ renders as
  `chamber`. Fine, and intentional (a clean, legible home tile).
- **Existing saved/serialised tiles and all current tests** lack `archetype` ⇒ default `chamber`,
  so nothing breaks.
- **1-exit (dead-end) and odd layouts:** `passage`/`squeeze`/`bridge` must still deliver floor to
  the single doorway (a stub, not a through-run). The POC's `corridors()` already handles arbitrary
  exit masks including a lone exit.
- **Square integer maths:** archetype renderers must reuse the renderer's existing `wt/fi/fs/cw/co`
  derivation so flagstones and doorways stay pixel-aligned at `TILE_SIZE` and at card size.

## Visual design

### Tile Gallery — layout wireframe

A portrait, scrolling dev page (same visual language as the POC and the game). It is a **review
surface**, not a game screen — no Pip, no fog.

```
┌──────────────────────────────────────┐
│  PIP & PERIL — TILE GALLERY      dev  │   header
├──────────────────────────────────────┤
│  ARCHETYPE CATALOGUE                   │
│  every archetype × every variant       │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│  │chmb│ │chmb│ │chmb│ │pass│  …         │   labelled tile specimens
│  │ v0 │ │ v1 │ │ v2 │ │ v0 │           │   (drawSingleTile, real renderer)
│  └────┘ └────┘ └────┘ └────┘           │
│  cavern v0..v2 · pillared v0..v1 · …    │
├──────────────────────────────────────┤
│  ROOM-TYPE LAYER                        │
│  ┌────┐ ┌────┐ ┌────┐ …  (chamber base) │
│  │enmy│ │shop│ │ npc│                   │
│  └────┘ └────┘ └────┘                   │
├──────────────────────────────────────┤
│  EXIT LAYOUTS                           │
│  dead-end · straight · corner · T · X   │
├──────────────────────────────────────┤
│  PROPS — coming soon (feature 082)      │   empty placeholder section
└──────────────────────────────────────┘
```

- **Specimen:** a fixed-size canvas (reuse the room-card tile size) with a one-line caption
  (`chamber · v1`, `cavern · v2`, room-type name, layout name). Captions make every cell
  self-describing for review.
- **Archetype Catalogue** is exhaustive and deterministic (no randomness) so a reviewer can verify
  each variant. An optional *Random Floor Sampler* with a "Reroll" button (mirroring the POC) is
  welcome but not required.
- The page reuses the established palette (`--bg #0d0d1a`, `--surface`, `--gold #c8941e`,
  `--text-muted`); no new colour tokens for the chrome.

### Color tokens

New tokens are the five `BiomePalette` additions in *Data / state* above (`voidDrop`, `chasmRim`,
`featureStone`, `wellWater`, `magicGlow`). They extend the established `DUNGEON` palette and are
re-tintable per biome later. No new page-chrome tokens.

### Typography / sizing

- Gallery specimen captions: monospace, ~9–10px, `--text-muted` — matches the POC caption style.
- Section headers: ~12px, `--gold`, uppercase, 1px letter-spacing — matches existing POC headers.
- No new sizes inside tiles; archetype renderers work off the existing tile-size derivation.

## Open questions

None blocking — this is `READY`. Notes for the Engineer / future items:

- **Variant richness** is a dial. Ship the criterion-3 minimums first; growing variant sets later is
  cheap and needs no new structure.
- **Authored set-pieces** (a guaranteed well at the start, a chasm before the boss) are deferred —
  archetypes are emergent from the weighted composer for now. Hand-placement can hook the same
  stored field later (lands naturally with 058 authored floors).
- **Squeeze, chasm, well, pool interactions** are explicitly future (083 / later). They render here
  so the world shows them before they are mechanics — the concept doc's intent.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** YYYY-MM-DD · **PR:** #NN

### What was built

### Evidence

### Play-test
