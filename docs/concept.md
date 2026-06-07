# Pip & Peril — Concept & Direction

The concept docs define what this game **is** and what it **feels like**. They are not feature
specs — they are the reference that all roles return to when making design decisions. The **Thinker**
owns and maintains them; the **Designer** reads the relevant docs before writing any spec.

## Start here

- [`concept/overview.md`](concept/overview.md) — the game design brief: pillars, game states, dice
  system, room types, dungeon structure, meta-progression, aesthetic direction, and POC inventory.
  Read this first.

## Expanded concept docs

- [`concept/tiles-and-props.md`](concept/tiles-and-props.md) — tile variety direction: the four
  layers of a tile (exit layout × interior archetype × room type × props), the snapping invariant,
  an archetype catalogue, and the props system.

- [`concept/in-run-items.md`](concept/in-run-items.md) — in-run item system direction: the two-layer
  philosophy (meta vs. in-run), persistence spectrum, usage registers, item categories, the encounter
  interaction model, and item classes from genre survey.

- [`concept/screen-layout-and-transitions.md`](concept/screen-layout-and-transitions.md) — UI/UX
  direction: how the screen organises itself across every game state, how the dungeon stays present
  during encounters, and how transitions should feel.

- [`concept/enemies-and-bosses.md`](concept/enemies-and-bosses.md) — creature and escalation
  direction: who the enemies are, what they feel like to fight, how they escalate across a run, and
  how the dungeon responds to Pip over multiple runs.

- [`concept/combat-system.md`](concept/combat-system.md) — combat mechanics direction: the
  attack/defence binary, enemy intents, turn structure, colour roles in combat, die-type risk
  profiles, item interjection points, emotional states (Rattled/Emboldened), and how combat
  scales within a run and across the meta.

- [`concept/meta-progression.md`](concept/meta-progression.md) — the between-runs layer:
  currency (shiny scraps and Marks of Descent), what the player upgrades (dice pool, weapons,
  skills, colour unlocks), scaling restraint, the camp hub, the visitor system, the dungeon
  notice board, and the full screen flow for the next iteration.

- [`concept/biomes.md`](concept/biomes.md) — run destinations beyond the dungeon: the structural
  model (biomes as distinct run destinations unlocked through Marks of Descent), the mouse-scale
  design rule, and direction for five environments — The Dungeon (baseline), The Wildwood, The
  Ancient Halls, The Larder, and The Winter Fields — covering enemies, bosses, tile archetypes,
  art palette, traps, NPCs, and reward specialisation per biome.
