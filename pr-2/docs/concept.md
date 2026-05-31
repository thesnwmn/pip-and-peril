# Pip & Peril — Game Design Brief

> *Fortune Favors the Small*

A web-based, portrait-oriented roguelike dungeon crawler starring **Pip**, a mouse explorer. Dice-driven, turn-based, with procedural tile-based dungeon exploration.

---

## Concept Summary

The player controls Pip, a small mouse descending into procedurally generated dungeons. The dungeon is revealed tile-by-tile as Pip moves. Combat, puzzles, traps, and interactions are resolved through a **coloured dice pool system**, where pips (dots) are spent like a resource each turn. Between runs, the player upgrades their dice pool and unlocks passive skills.

---

## Core Pillars

- **Portrait/mobile-first** web layout
- **Top-down tile map** with fog-of-war revealed by movement
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
1. Player moves Pip (may reveal new tiles)
2. An event or enemy is triggered
3. Player rolls their full dice pool
4. Player spends pips on available actions to resolve the event

---

## Dungeon Exploration

- Map starts hidden (fog of war)
- Moving into an unknown tile **flips and reveals** it
- Tile types: corridors, rooms, traps, enemies, loot, puzzles, exits
- Some tiles require a pip cost to enter safely (e.g. dark passage costs 2 🔵)
- **Pip's small size is a mechanic** — certain narrow passages are only accessible to him, providing shortcuts or secret areas

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
- **Dice aesthetic:** Carved wooden blocks or acorn-shaped dice
- **HUD:** Pip's satchel at the bottom of the screen holds the dice tray and stats
- **Animation:** Pip cups and tosses dice with tiny paws during the roll phase
- **Tone:** Warm and characterful — Pip has expressions, reacts to events

---

## Requested POCs (Proof of Concepts)

The following POCs are requested for the repo. Each should be self-contained and runnable:

### POC 1 — Tile Map Renderer
- Top-down grid rendered in a portrait canvas (e.g. 9×16 ratio)
- Fog-of-war: tiles start hidden, reveal on player movement
- Tile types: floor, wall, door, unexplored
- Pip character token that can move with arrow keys / WASD
- No game logic needed — just rendering and movement

### POC 2 — Dice Pool Roller
- Display a set of coloured dice (Red, Blue, Green, Yellow)
- Roll button animates and reveals pip values per die
- Pips are displayed as spendable tokens
- Clicking an action button deducts the appropriate pip cost
- Show "insufficient pips" state if not enough

### POC 3 — Dungeon Tile Generator
- Procedural map generation (BSP or room-corridor approach)
- Output a 2D array of tile types
- Render on a canvas with the tile map renderer from POC 1
- Place Pip at a start tile, mark an exit tile

### POC 4 — Combat Resolution
- A simple enemy encounter screen
- Player rolls dice, chooses to spend 🔴 to attack or 🟢 to dodge
- Enemy has HP, player has HP
- Resolve one round, show result, loop until resolved
- No animation needed — just logic and basic UI

---

## Tech Suggestions

- **Framework:** Vanilla JS or React (your preference)
- **Canvas vs DOM:** Either works for the tile map; canvas recommended for the dungeon renderer
- **No backend needed** for POCs — all client-side
- **Portrait layout:** Target ~390×844px (iPhone 14 viewport) as base

---

## Notes for Claude Code

- Keep each POC in its own folder (e.g. `/poc/tilemap`, `/poc/dice`, etc.)
- Use simple, readable code — these are proofs of concept, not production
- Add a root `index.html` that links to each POC for easy browser testing
- The dice colour system is central — make sure colours are consistent across POCs
