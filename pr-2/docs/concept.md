# Pip & Peril — Game Design Brief

> *Fortune Favors the Small*

A web-based, portrait-oriented roguelike dungeon crawler starring **Pip**, a mouse explorer. Dice-driven, turn-based, with procedural tile-based dungeon exploration.

---

## Concept Summary

The player controls Pip, a small mouse descending into procedurally generated dungeons. The dungeon is built tile-by-tile as Pip moves through it — each step forward reveals the next room. Combat, puzzles, traps, and interactions are resolved through a **coloured dice pool system**, where pips (dots) are spent like a resource each turn. Between runs, the player upgrades their dice pool and unlocks passive skills.

---

## Core Pillars

- **Portrait/mobile-first** web layout
- **Tile-based dungeon** built room by room through player choice
- **Turn-based** resolution — player rolls dice, then spends pips on actions
- **Roguelike** — permadeath, procedural maps, meta-progression between runs
- **Whimsical tone** — *Redwall* meets *Hades*; charming surface, tense underneath

---

## The Dice Pool System

Each stat is represented by a **coloured die type**. At the start of each turn, the player rolls their entire pool. The resulting pips are spent on actions.

| Colour | Stat | Example Uses |
|--------|------|--------------|
| 🔴 Red | Strength | Smash, shove, break |
| 🔵 Blue | Intellect | Solve puzzles, read runes, trick enemies |
| 🟢 Green | Agility | Dodge, sneak, dash |
| 🟡 Yellow | Luck | Wild card, bonus pips, rerolls |
| 🟣 Purple | Magic | Arcane abilities (later expansion) |

**Turn flow:**
1. Player navigates Pip (picks direction, then room type — see below)
2. The room is revealed and its encounter triggered
3. Player rolls their full dice pool
4. Player spends pips on available actions to resolve the event

---

## Dungeon Navigation

The dungeon is a **grid of tiles**, each representing a room or encounter. Tiles are not pre-generated and then explored — they are **chosen as Pip moves**, giving the player agency over what they face.

### How movement works

1. **Pick a direction.** Pip's current tile has a set of exits (N/S/E/W) shown as physical openings in the walls. The player taps an adjacent tile (or uses WASD/arrows) to choose a direction. Only valid exits are available.

2. **Pick a room type.** Three room tiles are offered as choices for what lies in that direction. Each is shown as a rendered tile with its exits and a colour-coded border indicating the encounter type. The player picks one.

3. **Pip moves.** The chosen tile is placed on the map and Pip steps into it. The encounter resolves. Repeat.

### Tile exit layout

Each tile has between one and four exits. The exit configuration is visible as wall openings, so the player can plan routes at a glance:

| Layout | Exits | Notes |
|--------|-------|-------|
| Dead end | 1 | Only the entrance — forces backtrack |
| Straight | 2 (opposite) | Corridor passing through |
| Corner | 2 (adjacent) | Turns 90° |
| T-junction | 3 | Branch point |
| Crossroads | 4 | Full intersection |

Exit configurations for offered tiles are constrained by adjacent already-placed tiles, so doorways always align and the map stays consistent.

### The map view

The map is rendered as a viewport centred on Pip. Explored tiles show their full tile art. Unexplored tiles show as dark stone — with a gold arrow drawn on any tile reachable by a valid exit, indicating where Pip can move next.

> **Note:** The exact tile size, viewport dimensions, and grid counts used in POC 5 are not final — they are sized for prototyping. The navigation *mechanic* is the thing to preserve.

---

## Room Types

Each room type has a distinct **colour-coded border** and tints the room's wall and floor so the whole space feels thematically right. Rooms can occasionally surprise — a Shop might be sold out, a Chest might be empty, an Enemy might flee.

| Type | Colour | Encounter |
|------|--------|-----------|
| Corridor | Steel grey | Safe passthrough, no encounter |
| Enemy | Red | Combat encounter |
| Shop | Gold | Merchant — buy items, upgrades |
| NPC | Blue | Character interaction, hints, side quests |
| Item | Green | Equipment or consumable found |
| Chest | Amber | Loot — may be locked or trapped |
| Boss | Dark crimson | End-of-floor boss fight |

---

## Dungeon Structure

A floor is complete when Pip reaches a **Boss** room. The depth of the dungeon affects what room types appear — shallower floors skew toward corridors, shops, and NPCs; deeper floors skew toward enemies, chests, and eventually the boss.

**Pip's small size is a mechanic** — certain narrow passages (dead ends, tight corners) are only accessible to him, providing shortcuts or secret areas that larger enemies cannot follow.

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

- **Visual style:** Cosy hand-drawn or pixel art; warm dungeon tones
- **Tile art:** Stone walls with visible brick courses, flagstone floors, physical doorway openings — each room type tints the palette
- **Dice aesthetic:** Carved wooden blocks or acorn-shaped dice
- **HUD:** Pip's satchel at the bottom of the screen holds the dice tray and stats
- **Animation:** Pip cups and tosses dice with tiny paws during the roll phase
- **Tone:** Warm and characterful — Pip has expressions, reacts to events

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

---

## Tech

- **Stack:** Vanilla JS, HTML5 Canvas, no dependencies
- **Canvas vs DOM:** Canvas for the tile map; DOM for dice and UI overlays
- **No backend** — all client-side
- **Portrait layout:** Target ~390px wide (iPhone-class viewport) as base
- **Folders:** Each POC in `/poc/<name>/index.html`; root `index.html` links all POCs
