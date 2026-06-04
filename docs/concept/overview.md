# Pip & Peril — Game Design Brief

> *Fortune Favors the Small*

A web-based, portrait-oriented roguelike dungeon crawler starring **Pip**, a mouse explorer. Dice-driven, turn-based, with tile-based dungeon exploration.

---

## Concept Summary

The player controls Pip, a small mouse descending into procedurally generated dungeons. The dungeon is built tile-by-tile as Pip moves through it — each step forward reveals the next room. Combat, puzzles, traps, and interactions are resolved through a **coloured dice pool system**, where pips (dots) are spent like a resource each turn. Between runs, the player upgrades their dice pool and unlocks passive skills.

---

## Core Pillars

- **Portrait/mobile-first** layout
- **Tile-based dungeon** built room by room through player choice
- **Turn-based** resolution — player rolls dice, then spends pips on actions
- **Roguelike** — permadeath, procedural maps, meta-progression between runs
- **Tone** — dungeon exploration with the feeling of D&D; the mouse gives it a fuzzy, whimsical edge but the underlying tension is real

---

## Game States

The game has two primary states.

### Navigation

The player is on the main dungeon map. They pick a direction from the exits available on their current tile. If the tile in that direction hasn't been placed yet, they choose from three offered room types before moving.

Moving into a room may **trigger an encounter**:

- **Forced** — the player must engage (e.g. an enemy blocks the room, a trap fires)
- **Optional** — the player can choose to interact or pass through (e.g. a shop, an NPC to talk to, an unlocked chest)

Corridors are safe passthrough with no encounter. The player can always backtrack through already-visited tiles.

### Encounter / Combat

A separate turn-based state triggered by entering a room. The player rolls their dice pool and spends pips on actions to resolve the encounter.

- **Combat** (enemy rooms, boss rooms) — attack, dodge, and special actions until one side is defeated
- **Non-combat encounters** (shops, NPCs, traps, puzzles) — these use the same dice mechanic but are flavoured differently. A shop is a menu. An NPC might be a short sequence of checks or questions. A trap might be a single agility check.

The encounter resolves and the player returns to navigation.

---

## The Dice Pool System

Each stat is represented by a **coloured die type**. At the start of each encounter turn, the player rolls their entire pool. The resulting pips are spent on actions.

| Colour | Stat | Example Uses |
|--------|------|--------------|
| 🔴 Red | Strength | Smash, shove, break |
| 🔵 Blue | Intellect | Solve puzzles, read runes, trick enemies |
| 🟢 Green | Agility | Dodge, sneak, dash |
| 🟡 Yellow | Luck | Wild card, bonus pips, rerolls |
| 🟣 Purple | Magic | Arcane abilities (later expansion) |

---

## Dungeon Navigation

The dungeon is a **grid of tiles**. Tiles are not pre-generated and then explored — they are **chosen as Pip moves**, giving the player agency over what they face.

### How movement works

1. **Pick a direction.** Pip's current tile has a set of exits (N/S/E/W) shown as physical openings in the walls. The player taps an adjacent tile to choose a direction. Only valid exits are available.

2. **Pick a room type** (if that tile is unknown). Three room tiles are offered as choices. Each is shown as a rendered tile with its exits and a colour-coded border indicating the encounter type. The player picks one.

3. **Pip moves.** The chosen tile is placed on the map and Pip steps into it. Any encounter triggers. Repeat.

If the adjacent tile has already been placed (backtracking), Pip simply moves there — no choice needed.

### Tile exit layout

Each tile has between one and four exits, shown as wall openings. The player can read the exit type at a glance:

| Layout | Exits | Notes |
|--------|-------|-------|
| Dead end | 1 | Only the entrance — forces backtrack |
| Straight | 2 (opposite) | Corridor passing through |
| Corner | 2 (adjacent) | Turns 90° |
| T-junction | 3 | Branch point |
| Crossroads | 4 | Full intersection |

Exit configurations for offered tiles are constrained by adjacent already-placed tiles, so doorways always align across the map.

### The map view

A viewport centred on Pip. Explored tiles show their full tile art. Unexplored tiles are dark — gold arrows appear on any reachable adjacent tile to indicate available moves.

> **Note:** Tile size, viewport dimensions, and grid counts in POC 5 are not final — they are sized for prototyping. The navigation mechanic is the thing to preserve.

---

## Room Types

Each room type has a distinct **colour-coded border** and tints the room's wall and floor. Rooms can occasionally surprise — a Shop might be sold out, a Chest empty, an Enemy already dead.

| Type | Colour | Encounter |
|------|--------|-----------|
> **Tile variety:** room *type* (this table) is only one of four layers that compose a tile. The
> interior *shape* (chamber, passage, cavern, chasm, well, magic pool…) and scattered *props*
> (torches, rubble, bones…) are explored in [`tiles-and-props.md`](tiles-and-props.md).

| Corridor | Steel grey | Safe passthrough, no encounter |
| Enemy | Red | Combat — forced |
| Shop | Gold | Merchant menu — optional |
| NPC | Blue | Dialogue, checks, hints — optional |
| Item | Green | Equipment or consumable — auto-collect or examine |
| Chest | Amber | Loot — may be locked or trapped |
| Boss | Dark crimson | Combat — forced, ends the floor |

---

## Dungeon Structure

A floor ends when an **end trigger** is reached. The most common is a **Boss room**, but other triggers are possible — a particular depth, a specific tile combination, an NPC quest resolution, or a timed pressure mechanic. Boss rooms are the primary end trigger but not the only one.

The depth of the dungeon affects what room types appear — shallower floors skew toward corridors, shops, and NPCs; deeper floors skew toward enemies, chests, and end triggers.

**Pip's small size is a mechanic** — certain narrow passages are only accessible to him, providing shortcuts or secret areas that larger enemies cannot follow.

---

## Meta Progression (Between Runs)

Players spend a currency (e.g. "shiny scraps") earned during runs to upgrade their dice pool:

- **Swap dice** — e.g. upgrade a d6 Red to a d8 Red (higher pip ceiling)
- **Add dice** — grow the pool size (more actions per turn)
- **Engrave dice** — permanently fix one face (e.g. always shows 2 🟡)
- **Unlock skills** — passive modifiers, e.g.:
  - *"Spend 3🔴 to hit twice"*
  - *"Whenever you roll a 1, gain a free reroll"*
  - *"Sneaking costs 1 less 🟢"*

---

## Aesthetic Direction

The game should feel like dungeon exploration — dark stone, a sense of danger, the texture of a tabletop RPG. The mouse protagonist softens this: there's warmth and character, but it shouldn't tip into pure cute. The dice are central to the feel of the game but how they are presented visually is still open.

### Established palette (from POCs)

The POCs have settled on a working palette that should be treated as the baseline:

| Token | Value | Role |
|---|---|---|
| `--bg` | `#0d0d1a` | Canvas / page background |
| `--surface` | `#14142a` | Card and panel backgrounds |
| `--surface-raised` | `#1c1c36` | Hover / active panels |
| `--border` | `#2a1f15` | Subtle borders |
| `--text-primary` | `#e8d5b0` | Main body text |
| `--text-muted` | `#8b7355` | Secondary text, labels |
| `--gold` | `#c8941e` | Accent — titles, highlights, CTAs |
| `--room-enemy` | `#7a1a1a` | Enemy room border / tint |
| `--room-shop` | `#7a6a00` | Shop room border / tint |
| `--room-npc` | `#1a2a7a` | NPC room border / tint |
| `--room-item` | `#1a6a2a` | Item room border / tint |
| `--room-boss` | `#3a0a0a` | Boss room border / tint |
| `--room-corridor` | `#2a2a3a` | Corridor border / tint |

Die colours (Red `#7a1a1a`, Blue `#1a2a7a`, Green `#1a6a2a`, Yellow `#7a6a00`) align with the
room-type palette deliberately — same dice as the same stat family.

### Open question — game art assets

The approach for sprite and tile art is **undecided**. This decision needs to be made before or
during the Tile Map Core (003) and Game Bootstrap (002) features. The options are:

- **Geometric / canvas-drawn** — tiles and characters drawn entirely with canvas primitives
  (rectangles, arcs, paths). No external assets; fully code-driven. Fastest to iterate; limited
  expressiveness.
- **AI-generated images** — sprites and tiles produced by an image-generation tool and committed
  as PNGs. Richer visuals; introduces an asset pipeline and external dependency; style
  consistency requires care.
- **Hand-crafted pixel art** — produced by a human artist outside this pipeline and committed as
  assets. Highest quality ceiling; requires a separate production step.
- **Hybrid** — geometric art for early features, with the option to swap in real sprites later
  (treat art as a skin layer over the logic).

The Designer should flag this as an open question in any feature spec that requires tile or
character art, and not commit to a visual approach until the manager has decided.

---

## Proof of Concepts

Each POC is self-contained in its own folder under `/poc/`.

### POC 1 — Tile Map Renderer
Top-down grid rendered in a portrait canvas. Fog-of-war: tiles start hidden, reveal on player movement. Pip character token moves with arrow keys / WASD.

### POC 2 — Dice Pool Roller
Coloured dice (Red, Blue, Green, Yellow) with animated roll. Pips displayed as spendable tokens. Action buttons deduct pip costs; shows insufficient-pips state.

### POC 3 — Dungeon Tile Generator
Procedural BSP map generation rendered on canvas. Pip placed at start tile, exit tile marked. Fog-of-war integrated.

### POC 4 — Combat Resolution
Enemy encounter screen. Player rolls dice, spends 🔴 to attack or 🟢 to dodge. HP bars, battle log, win/lose state.

### POC 5 — Room Selection
Direction-first navigation on a tile map. Pip stands on a tile with visible exits. Player taps a direction; three room-type choices are offered as rendered tile cards. Chosen tile is placed and Pip moves there. Demonstrates: tile exit layout, room type colour coding, map viewport following Pip, map consistency (doorways align across adjacent tiles).
