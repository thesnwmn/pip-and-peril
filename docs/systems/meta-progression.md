# Meta Progression — As Implemented

**Source:** `src/meta/`, `src/camp/`  
**Key files:** `src/meta/state.ts`, `src/meta/weapons.ts`, `src/camp/`  
**Last updated:** 2026-06-11 (features 029, 053, 090)

---

## Overview

Meta progression is the cross-run layer that persists between deaths and victories. It is stored
in `localStorage` as a versioned JSON blob. Between runs, Pip returns to the **camp screen**
where he selects a weapon and can access the workbench, notice board, and (eventually) visitors.

---

## MetaState

`MetaState` is the single cross-run data store, versioned for forward compatibility.

```ts
interface MetaState {
  version: 1;               // increment when schema changes; triggers migration
  scraps: number;           // currency earned from completed runs (1 scrap = 1 gold)
  permanentPool: PermanentDie[];  // permanent dice Pip always carries
  activeWeaponId: string;   // weapon chosen for the next run
  unlockedWeaponIds: string[];    // weapons available for selection
  runCount: number;         // total completed runs (incremented at run end)
}

interface PermanentDie {
  id: string;               // stable across sessions (e.g. 'r1', 'g1')
  colour: DiceColour;
  faces: DiceFaces;         // 'd4' | 'd6' | 'd8' | 'd10' | 'd12'
}
```

**Default state (new player):**
- `scraps: 0`
- `permanentPool`: `[{id:'r1', colour:'red', faces:'d6'}, {id:'g1', colour:'green', faces:'d6'}, {id:'y1', colour:'yellow', faces:'d4'}]`
- `activeWeaponId: 'dagger'`
- `unlockedWeaponIds: ['dagger', 'shortsword', 'broadsword', 'whisker-staff']`
- `runCount: 0`

---

## Persistence

**Storage key:** `pip-meta-v1`  
**Format:** JSON  
**Migration:** if a loaded blob has `version < current`, migration runs before the blob is used
and the migrated state is immediately re-persisted. Currently: missing `runCount` field defaults
to 0.

**Fallback:** if `localStorage` is unavailable (private browsing, storage quota exceeded, etc.),
the session runs with in-memory default MetaState. A console warning is emitted; no user-visible
error. Cross-run state is not persisted for that session.

---

## Dice Pool Composition

The run's active dice pool is:

```
activePool = MetaState.permanentPool + activeWeapon.addedDice
```

This is computed at the start of each run (on descent). The weapon's added dice are appended to
the permanent pool for the duration of that run only — they are not written back to MetaState.

---

## Weapon System

Four static weapon specs in `src/meta/weapons.ts`. All four are unlocked from the start.

| ID | Name | Added dice | Strike action |
|---|---|---|---|
| `dagger` | Dagger | 2× d4 Red | 1R — fast, low-damage, more actions per turn |
| `shortsword` | Shortsword | 1× d6 Red | 2R — standard |
| `broadsword` | Broadsword | 1× d8 Red | 3R — slow, high-damage, fewer actions |
| `whisker-staff` | Whisker Staff | 2× d4 Blue | No extra Strike; Blue-action-focused playstyle |

Weapon selection is mandatory before each run — there is no "skip" path on the weapon selection
panel. The current `activeWeaponId` is pre-selected when the panel opens; the player can choose
a different weapon or confirm the existing one.

The weapon selection panel shows a live pool preview: Pip's permanent dice + the weapon's added
dice rendered as coloured squares with face labels.

---

## Scraps

Scraps are the meta currency. Conversion rate: 1 gold earned in a run = 1 scrap awarded at
run end (one-to-one, regardless of run outcome). Scraps are awarded on both victory and defeat
as long as any gold was earned.

Currently scraps accumulate but are not spendable — the workbench (dice upgrades) is stubbed.
Feature 088 (Workbench — Dice Upgrades) will introduce spending.

---

## Run Flow

```
Camp Screen
    ↓ (Descend)
Weapon Selection Panel
    ↓ (Confirm)
Run (Floors 1–3)
    ↓ (Victory or Defeat)
Run Summary Screen
    ↓ (Begin Again)
Camp Screen
```

Both victory and defeat end at Run Summary before returning to camp. There is no direct route
from run end to main menu; camp is always the hub.

**At run end:**
1. `runCount` increments.
2. Gold earned during the run converts 1:1 to scraps and is added to `MetaState.scraps`.
3. MetaState is persisted.
4. Run Summary screen is shown (stats, dungeon sketch, outcome-specific header).
5. Tapping "Begin Again" navigates to the camp screen.

---

## Camp Screen

The camp screen is split into two fixed zones:

| Zone | Height fraction | Content |
|---|---|---|
| **Scene** | ≥ 55% | Animated campfire; Pip seated; weapon rack; workbench; dungeon arch. Non-interactive. |
| **Activity bar** | ≤ 45% | Four buttons (Weapons, Workbench, Notices, Visitor) + Descend CTA |

A non-moving 1px dividing line separates the zones. The scene is ambient — no tap targets.
All navigation flows through the activity bar.

### Activity bar buttons

| Button | Panel | Notes |
|---|---|---|
| Weapons | Weapon selection panel | Same panel used for pre-run selection |
| Workbench | Dice upgrade panel (stub) | Dimmed until Feature 088 ships |
| Notices | Dungeon notice board | Two generated notices; tap-outside to dismiss |
| Visitor | Visitor panel (stub) | Dimmed when no visitor present |
| **Descend** | — | Triggers weapon selection → run start |

### Sub-panel contract

All sub-panels in camp use the same animation and dismiss contract:
- Rise: 400ms ease-out
- Fall: 300ms ease-in
- Scene dims to 40% scrim while any panel is open
- Dismiss: ✕ button (44×44px, top-right corner of panel)
- Exception: Notices panel uses tap-outside dismiss (read-only, no actions)

---

## Notice Board

Two notices are generated at camp init (not persisted; regenerated each session).

Template banks by category:
- `enemy-activity` — creatures spotted near the dungeon entrance
- `merchant-sighting` — trader rumours (always available)
- `atmosphere` — weather, seasonal mood, world voice
- `past-run-echo` — references to previous runs (requires `runCount > 0`)

Two notices always from different categories. Variables resolved at generation:
- `{run_count}` → MetaState.runCount
- `{run_count_ordinal}` → "1st", "2nd", etc.
- `{comparative}` → "deeper", "further", etc.

`atmosphericLine` (the first notice's full text) is exposed as a named field on `NoticeState`
for future use in run-start transition flavour text.
