# Backlog History

Completed features for **Pip & Peril**, newest first. Each entry is the original backlog summary
kept for reference. Full implementation evidence — what was built, how it was verified, how to
play-test it, and the PR it landed in — lives in the archived spec in `docs/features/history/`.

## Entry format

```
### NNN · Short Title

**Shipped:** YYYY-MM-DD · **PR:** #NN · **Spec:** [docs/features/history/NNN-short-title.md](docs/features/history/NNN-short-title.md)

Original one- or two-sentence summary from the backlog.
```

---

### 025 · Trap Encounter

**Shipped:** 2026-06-06 · **PR:** (pending) · **Spec:** [docs/features/history/025-trap-encounter.md](docs/features/history/025-trap-encounter.md)

A **forced** encounter: stepping onto a trapped tile fires a single agility check (snap-camera, no-Leave panel). Enough Green pips — Pip slips clear; too few — HP loss scaled to the tile's `trapDifficulty`. Tile is spent after one trigger; never fires again on re-entry.

---

### 027 · Shop Encounter

**Shipped:** 2026-06-06 · **PR:** (pending) · **Spec:** [docs/features/history/027-shop-encounter.md](docs/features/history/027-shop-encounter.md)

The gold **Shop**: a warm merchant panel where Pip spends earned gold on items — the *sink* that
gives currency a purpose. Optional encounter (a "Leave" exit), browse-and-buy. Up to 3 items
stocked at placement; purchased items removed permanently. Merchant names, item prices, and
parchment-warm panel styling all specced.

---

### 023 · Boss Encounter & Run Completion

**Shipped:** 2026-06-06 · **PR:** #TBD · **Spec:** [docs/features/history/023-boss-encounter.md](docs/features/history/023-boss-encounter.md)

The cinematic boss fight and run-completion flow. Intro sequence (camera pull-back, title card, camera tighten), then the **Rat King** combat: a 4-intent Phase 1 cycle (Attack → Guard → Empower → Attack×2) giving way at 50% HP to a brutal 3-intent Phase 2 (Attack → Lunge → Attack). Encoded as a `BossSpec` in the enemy roster; bosses are enemies with fixed intent cycles, enrage thresholds, and intro sequences.

---

### 038 · Enemy Roster Expansion

**Shipped:** 2026-06-05 · **PR:** (pending merge) · **Spec:** [docs/features/history/038-enemy-roster.md](docs/features/history/038-enemy-roster.md)

Fills the 12-creature roster across three tiers with distinct personalities, weighted intent pools, and accurate stat distributions. Enemies are now selected by tier during room placement and spawned correctly at combat entry. Battle log uses personality-specific lines for immersion.

---

### 047 · Combat Panel Layout Redesign

**Shipped:** 2026-06-05 · **PR:** #TBD · **Spec:** [docs/features/history/047-combat-panel-layout.md](docs/features/history/047-combat-panel-layout.md)

Restructure the combat panel to fix button cramping and align with the "bottom quarter is thumb country" design principle. Move ROLL/END TURN and secondary controls (Flee, Item) to the screen bottom in a single row; repurpose pip-counter badges as clickable buttons that open submenus; create a clear middle zone for submenu or enemy action display. Improves usability without changing any combat mechanics.

---

### 046 · Combat Depth: Blue & Yellow, Full Intents & Advanced Actions

**Shipped:** 2026-06-05 · **PR:** #TBD · **Spec:** [docs/features/history/046-combat-depth.md](docs/features/history/046-combat-depth.md)

The second combat layer. Adds the four remaining enemy intents (💢 Empower, 😴 Recover, 🕸️ Status/Poison, ☠️ Lunge) and the two-turn telegraph revealed via Analyse; the Blue category (Analyse, Exploit, Resist, Identify) and Yellow (Convert 2:1, Lucky Shot); extra spend actions (Shove 3🔴; Feint 2🟢, Disengage 3🟢); and the Tenacity post-spend window. After 046, combat is mechanically complete at the base layer.

---

### 022 · Dungeon Structure: Multi-Floor, Pacing & Boss Gate

**Shipped:** 2026-06-05 · **PR:** (link to be added after merge) · **Spec:** [docs/features/history/022-dungeon-structure.md](docs/features/history/022-dungeon-structure.md)

Three floors replace the endless map. Room offers are **depth-and-floor weighted** from a tuning config (corridors and shops shallow, enemies and traps deep). A **Stairwell** room type unlocks at a per-floor tile threshold and descends one-way. On Floor 3 the **Boss room** is the only exit — its offer weight is a product of a tiles-explored factor and a Manhattan-distance tier factor, so it lurks far from where Pip arrived. Exactly one Shop is guaranteed per floor via a debt mechanism. Trap tiles carry a `trapDifficulty` value scaled to floor and depth. All constants live in `src/dungeon/tuning.ts`.

---

### 037 · Combat Overhaul: Intents, Active Defence & Panel Redesign

**Shipped:** 2026-06-05 · **PR:** [#77](https://github.com/thesnwmn/pip-and-peril/pull/77) · **Spec:** [docs/features/history/037-combat-overhaul.md](docs/features/history/037-combat-overhaul.md)

The combat keystone. Replaces "spend everything every turn" with a real decision: the enemy **telegraphs an intent** (⚔️ Attack N or 🛡 Guard N) before Pip rolls, and **defence is active** — Pip *reserves* Green pips (2G fully dodges, 1G shaves 1). HP bars and the intent telegraph move onto the **map as overlays**, freeing the panel to be pure controls: the **dice pool** plus **category buttons** (Red/Green/Item/Flee) with submenus. Folds in **Raw Flee** (one free enemy hit, Pip retreats to entry tile, room left fled).

---

### 021 · Item Room Encounter

**Shipped:** 2026-06-04 · **PR:** [#61](https://github.com/thesnwmn/pip-and-peril/pull/61) · **Spec:** [docs/features/history/021-item-room-encounter.md](docs/features/history/021-item-room-encounter.md)

The green **Item** room type: Pip enters, finds a single item on a stone pedestal, and taps to
take it. Item is fixed to the tile at placement time (same item on re-entry). Panel rises briefly,
shows icon/name/description, "Take" and "Leave" options. Taking it calls `acquireItem` and marks
the room cleared.

---

### 020 · Item System: Consumables & Use

**Shipped:** 2026-06-04 · **PR:** [#59](https://github.com/thesnwmn/pip-and-peril/pull/59) · **Spec:** [docs/features/history/020-item-system-consumables.md](docs/features/history/020-item-system-consumables.md)

The engine for items as *objects Pip carries and uses*, not just inventory rows. Defines the
consumable item category, a shared `acquireItem` function, five starting items (Crumb of Cheese,
Wedge of Gouda, Lucky Acorn, Smoke Pellet, Glowstone Dust), and the act of **using** one — both
from the Satchel during navigation and from a new ITEM action button in the combat panel (free
action, once per turn). Introduces the fled tile state for the Smoke Pellet escape mechanic.

---

### 034 · Encounter Registry

**Shipped:** 2026-06-04 · **PR:** [#56](https://github.com/thesnwmn/pip-and-peril/pull/56) · **Spec:** [docs/features/history/034-encounter-registry.md](docs/features/history/034-encounter-registry.md)

Defines what an encounter panel *is* — a full-canvas module that can draw anywhere (including
over the map zone), declare a map-view configuration (zoom, pip centering), and signal outcomes
— and builds the encounter registry that manages trigger detection, rise/fall transitions, and
outcome routing. Combat is refactored as the reference implementation. After this, new encounter
types (021, 023, 025–028) plug in as panel modules without touching `game.ts`.

---

### 035 · Navigation Panel Content Modes & Direction Buttons

**Shipped:** 2026-06-04 · **PR:** (link added after merge) · **Spec:** [docs/features/history/035-nav-panel-content-modes.md](docs/features/history/035-nav-panel-content-modes.md)

The nav panel becomes a permanent, always-visible layer with three content modes — IDLE (a cross of four directional buttons), CHOOSING (room selection cards), and WHISPER (room text) — that cross-fade as play progresses. Direction input moves from map-zone arrows into touch-friendly panel buttons, improving one-handed thumb reach. Fog exits are marked with a low-contrast "?" glyph on the map; backtrack exits have no map marker. The situated whisper moves from the map zone into the top of the panel zone so it is covered last when an encounter panel rises over it.

---

### 033 · Navigation Panel Extract

**Shipped:** 2026-06-04 · **PR:** [#51](https://github.com/thesnwmn/pip-and-peril/pull/51) · **Spec:** [docs/features/history/033-navigation-panel-extract.md](docs/features/history/033-navigation-panel-extract.md)

Pure file-organisation refactor — no behaviour change. Extracts canvas layout constants into a dedicated module and pulls all navigation-mode UI (status bar, nav arrows, whisper overlay, room selection cards) out of `screens/game.ts` into `navigation/panel.ts`, following the established panel factory pattern. `game.ts` drops from 822 lines to under 500.

---

### 032 · Map Zone Stability

**Shipped:** 2026-06-03 · **PR:** [#47](https://github.com/thesnwmn/pip-and-peril/pull/47) · **Spec:** [docs/features/history/032-map-zone-stability.md](docs/features/history/032-map-zone-stability.md)

The map canvas clip region currently shrinks when an encounter panel rises — navigation uses the full screen height, combat squishes it to ~45%. This fix makes the map zone a constant: the clip is always `MAP_Y` to `LOGICAL_H`. Encounter panels overlay the lower portion of the map rather than compressing it, so the dungeon feels spatially stable across all states.

---

### 031 · Log View Redesign

**Shipped:** 2026-06-03 · **PR:** [#45](https://github.com/thesnwmn/pip-and-peril/pull/45) · **Spec:** [docs/features/history/031-log-view-redesign.md](docs/features/history/031-log-view-redesign.md)

Replace the three-line navigation log strip with two correctly-scoped layers: a **situated whisper** (ephemeral single-line overlay on the map canvas for world narration, fading in ~2.5 s) and a **per-encounter log zone** (up to 3 fading lines at the base of the encounter panel). The navigation map reclaims the strip's height; the combat panel grows slightly to hold the richer zone.

---

### 030 · Elastic Canvas & Combat Immersion

**Shipped:** 2026-06-03 · **PR:** [#42](https://github.com/thesnwmn/pip-and-peril/pull/42) · **Spec:** [docs/features/history/030-elastic-canvas-combat-immersion.md](docs/features/history/030-elastic-canvas-combat-immersion.md)

Establishes the **elastic canvas** as the game's structural architecture — the dungeon map is always present, encounter panels **rise from the screen bottom** while the camera adjusts above, both simultaneous at 200–350ms. Combat is retrofitted as the first consumer: Pip entering an enemy room now triggers an animated panel rise and a smooth medium-close camera zoom, making the dungeon the stage for every encounter. The panel API this feature introduces is the foundation all subsequent encounter types (021, 023, 025–028) plug into.

---

### 019 · Combat Victory Rewards

**Shipped:** 2026-06-03 · **PR:** [#41](https://github.com/thesnwmn/pip-and-peril/pull/41) · **Spec:** [docs/features/history/019-combat-victory-rewards.md](docs/features/history/019-combat-victory-rewards.md)

Winning a combat grants **gold** (random roll within the enemy's reward range), giving the player
their first source of currency and making the Satchel's Pouch real rather than always-zero. Each
enemy carries a gold reward range; the existing victory banner (006) gains a `+ N gold ◈` line.

---

### 017 · Soft Camera Follow

**Shipped:** 2026-06-03 · **PR:** [#36](https://github.com/thesnwmn/pip-and-peril/pull/36) · **Spec:** [docs/features/history/017-soft-camera-follow.md](docs/features/history/017-soft-camera-follow.md)

Decouples the viewport from Pip's exact position: the camera follows through a configurable dead
zone (default 3×3 tiles) so Pip can roam freely within the central band without the map scrolling.
The camera only catches up when Pip exits the zone. Near the dungeon boundary the camera clamps,
letting Pip walk toward the visible edge. Makes each step feel more alive — the world shifts in
the direction of travel instead of pinning Pip like a crosshair.

---

### 016 · Pip's Satchel

**Shipped:** 2026-06-03 · **PR:** [#35](https://github.com/thesnwmn/pip-and-peril/pull/35) · **Spec:** [docs/features/history/016-pip-satchel.md](docs/features/history/016-pip-satchel.md)

Full-screen in-world overlay opened by a persistent bottom-right button: Pip's worn leather
satchel with four compartments — Pouch (gold + items), Journal (stub), Tally (live run stats),
Map (stub). Establishes the inventory data model (gold + Item list) and pauses navigation while
open; greyed and blocked during combat. Opens with a ≈300 ms buckle-unfasten animation.

---

### 008 · Menu Button & Pause Modal

**Shipped:** 2026-06-02 · **PR:** [#31](https://github.com/thesnwmn/pip-and-peril/pull/31) · **Spec:** [docs/features/history/008-menu-button-pause-modal.md](docs/features/history/008-menu-button-pause-modal.md)

Replaces the raw text back-links on the Home and Game screens with a proper MENU button in the
status bar. Tapping it opens a modal with meta actions: Settings (stub) and a context-labelled
End Run / Back to Menu. End Run requires a confirmation step. All in-game info (stats, map,
inventory) belongs to the future Satchel — this menu is deliberately administrative only.

---

### 006 · Combat Encounter

**Shipped:** 2026-06-02 · **PR:** [#25](https://github.com/thesnwmn/pip-and-peril/pull/25) · **Spec:** [docs/features/history/006-combat-encounter.md](docs/features/history/006-combat-encounter.md)

Turn-based encounter loop: roll dice pool, spend pips on Strike/Evade/Focus, track HP for Pip and
one enemy (Goblin), resolve win/lose. First complete playable game moment. Enemy rooms cleared on
victory; Pip's HP persists between rooms. Defeat returns to main menu.

---

### 005 · Dice Pool System

**Shipped:** 2026-06-02 · **PR:** [#24](https://github.com/thesnwmn/pip-and-peril/pull/24) · **Spec:** [docs/features/history/005-dice-pool-system.md](docs/features/history/005-dice-pool-system.md)

`DicePool` data model (roll, spend, canAfford, reset) and a dice panel UI rendered in the Game
screen's bottom zone: coloured die faces, pip total badges, ROLL button with ~500 ms animation,
and three placeholder action buttons (Strike, Evade, Focus) that demonstrate the full
roll-to-spend flow. The data API and panel component are ready for 006 to integrate into the
combat encounter loop.

---

### 004 · Navigation & Room Selection

**Shipped:** 2026-06-02 · **PR:** [#21](https://github.com/thesnwmn/pip-and-peril/pull/21) · **Spec:** [docs/features/history/004-navigation-room-selection.md](docs/features/history/004-navigation-room-selection.md)

Direction-first movement: player picks an exit on Pip's current tile; if the destination is
unknown, three playing-card-style room choice cards are offered (room name, tile preview, flavour
tease); chosen tile is placed and Pip moves. Event log records notable room entries; corridors and
backtracking are silent. Status bar shows floor label and depth.

---

### 003 · Tile Map Core

**Shipped:** 2026-06-01 · **PR:** (pending) · **Spec:** [docs/features/history/003-tile-map-core.md](docs/features/history/003-tile-map-core.md)

Grid data model (`TileCell`, sparse `GameMap`, `FogState`) and a canvas renderer using the Dungeon
biome: staggered brick walls, flagstone floors with per-stone tonal variation, room-type accent
overlays, and fog-of-war. No movement logic. Depends on: 002.

---

### 007 · Build Stamp

**Shipped:** 2026-06-01 · **PR:** (pending) · **Spec:** [docs/features/history/007-build-stamp.md](docs/features/history/007-build-stamp.md)

Inject a short Git SHA at build time and surface it as a subtle label on the Main Menu screen and
a console log on startup. Makes it trivial to confirm which exact commit is running in any deployed
environment (including PR previews).

---

### 002 · Game Bootstrap

**Shipped:** 2026-06-01 · **PR:** (pending) · **Spec:** [docs/features/history/002-game-bootstrap.md](docs/features/history/002-game-bootstrap.md)

Three-screen state machine (Main Menu → Home → Game) with canvas-based rendering and a continuous
RAF loop. Establishes the top-level screen architecture that all subsequent gameplay features
render into.

---

### 001 · Project Scaffolding — Vite + TypeScript + Vitest

**Shipped:** 2026-06-01 · **PR:** (pending merge) · **Spec:** [docs/features/history/001-project-scaffolding.md](docs/features/history/001-project-scaffolding.md)

Complete TypeScript + Vite + Vitest scaffolding replacing the POC-only approach. Enables typed
modules, imports across files, and unit tests — the baseline workflow every subsequent feature
depends on.
