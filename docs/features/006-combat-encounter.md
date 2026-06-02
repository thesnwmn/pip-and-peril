# 006 · Combat Encounter

**Status:** READY
**Source idea:** manager request (backlog item)
**Depends on:** 004 (Navigation & Room Selection), 005 (Dice Pool System)

## Summary

Delivers the first fully playable game moment in Pip & Peril. When Pip enters an enemy room the
game switches into a turn-based combat encounter: the player rolls their dice pool each turn,
spends coloured pips on Strike, Evade, and Focus actions to damage the enemy or protect Pip, and
the enemy retaliates at the start of each new turn. Pip's HP persists across rooms during a run.
Defeating an enemy clears the room and returns Pip to the dungeon; Pip's HP reaching zero ends
the run and returns to the main menu.

## Acceptance criteria

### Trigger

1. When Pip moves into a tile whose `roomType` is `'enemy'`, a combat encounter starts
   immediately. A `CombatState` is initialised with the room's enemy (a **Goblin**: 6 HP,
   2 attack damage per turn) and the encounter phase set to `'awaiting-roll'`.
2. Entering a tile whose `roomType` is `'boss'` does **not** trigger combat in this feature
   (boss combat is a future feature). Boss room entry is silent — Pip simply stands in the room.
3. Once an enemy room is cleared, backtracking through it or re-entering it does **not** trigger
   a new encounter. `TileCell` gains an optional `cleared` flag to record this.

### State machine

4. On encounter entry, the dice pool is in `'idle'` state. The panel shows the ROLL button
   enabled and action buttons disabled, awaiting the player's first roll.
5. The player taps **ROLL** from `'awaiting-roll'`:
   - No enemy attack fires on the very first roll of a combat.
   - Dice animate normally (~500 ms); pool transitions to `'rolled'`; phase becomes
     `'player-turn'`.
6. The player taps **ROLL** from `'player-turn'` (ending their turn):
   - Enemy attack fires **before** the new roll animation: `damage = max(0, enemy.attack − evadeBuffer)`.
   - `evadeBuffer` resets to 0.
   - Log entry added: `"Goblin strikes — −N HP! (Pip: X→Y)"` using `'enemy'` log style.
   - If Pip HP drops to 0 or below after the attack, phase becomes `'defeat'`; no new roll plays.
   - Otherwise, new roll animation plays; phase becomes `'player-turn'` with the fresh pips.
7. If victory or defeat is reached mid-turn, the ROLL button and action buttons are disabled
   immediately and the result banner is shown (see Visual design).

### Actions

8. **Strike** (cost: 2 🔴) — deals 2 damage to the enemy. Enemy HP is updated immediately.
   Log: `"Strike — 2 damage! (Goblin: X→Y)"` (`'enemy'` style).
   If the enemy HP reaches 0, phase becomes `'victory'` immediately.
9. **Evade** (cost: 2 🟢) — sets `evadeBuffer = 2` for the current turn. Using Evade a second
   time in the same turn replaces the buffer (does not stack). Log: `"Evade — incoming damage
   reduced."` (`'normal'` style).
10. **Focus** (cost: 1 🔵) — restores 1 HP to Pip, capped at `pipMaxHp`. Log: `"Focus — +1 HP
    (Pip: X→Y)"` (`'normal'` style).
11. All three actions follow the existing pip-deduction and button-enable logic from 005 (AC 13–14
    in the 005 spec). Combat effects are wired in addition to, not instead of, the pip deduction.

### HP persistence and run state

12. Pip starts each run at full HP: `pipHp = pipMaxHp = 10`. This is set when navigation is
    initialised.
13. Pip's HP is part of the run state managed by `game.ts` and persists across rooms and combats
    within a run.
14. On victory, Pip's HP is **not** restored — it carries the value it held at the end of
    the encounter.

### Victory and defeat

15. On **victory** (enemy HP = 0):
    - Phase becomes `'victory'`.
    - The enemy room is marked `cleared = true`.
    - A victory banner covers the panel zone (see Visual design).
    - After 1.5 s, **or** on a tap anywhere in the panel zone, combat ends: `CombatState` is
      cleared, the dice pool resets to `'idle'`, and navigation resumes (`'idle'` uiState).
16. On **defeat** (Pip HP ≤ 0):
    - Phase becomes `'defeat'`.
    - A defeat banner covers the panel zone (see Visual design).
    - After 2 s, **or** on a tap anywhere in the panel zone, the screen transitions to the
      Main Menu.

### Navigation and UI gating

17. The dice panel is **only** visible when a combat encounter is active (`CombatState` is
    non-null). It does not appear during navigation idle or choosing states. The idle navigation
    hint ("Tap an exit to move.") is restored post-combat.
18. Navigation arrows and room-selection cards are not interactive while a combat encounter is
    active.
19. The "← Quit Run" back link in the status bar remains active during combat. Using it during
    an active encounter discards the run and returns to Home (same behaviour as during navigation).

### Quality

20. `npm run typecheck` exits zero errors.
21. `npm run test` passes. Pure combat resolution functions — apply strike, apply evade, apply
    focus, apply enemy attack — are covered by unit tests, including edge cases: Strike that kills
    the enemy in one hit, Focus capped at max HP, Evade reducing a hit to 0, Evade buffer reset
    between turns.

## Scope / non-goals

- No boss combat — boss room entry is silent; boss encounter is a separate future feature.
- No enemy variety — only the Goblin. Room type `'enemy'` always spawns a Goblin.
- No loot or rewards on victory — the victory banner has no gold or item award.
- No HP recovery between rooms other than Focus during combat.
- No Yellow die (🟡) special behaviour — wild pips and rerolls are a future feature.
- No Purple die (🟣) — Magic is a later expansion.
- Immersive combat overlay (Idea 012 — combat camera zoom, map visible during combat) is deferred.
- Room surprises (Idea 001) are deferred.
- Meta-progression (upgrading the dice pool) is out of scope.

## Design detail

### State machine

```
[NAVIGATION — 'idle' or 'choosing']
        │
        │  Pip moves into an 'enemy' room (not cleared)
        ▼
[ENCOUNTER — 'awaiting-roll']
  Dice panel visible. Pool in 'idle'. Actions disabled.
  Status bar shows HP bars.
        │
        │  Player taps ROLL
        ▼
[ENCOUNTER — 'player-turn']
  Pool in 'rolled'. Pips shown. Actions enabled where affordable.
        │                            │
        │  Player uses action         │  Player taps ROLL again (end turn)
        │  (effect + pip deduct)      ▼
        │                    [Enemy attack fires]
        │                    damage = max(0, enemy.attack − evadeBuffer)
        │                    evadeBuffer = 0
        │                    pipHp −= damage
        │                         │                │
        │               pipHp ≤ 0                  │  pipHp > 0
        │                    ▼                      ▼
        │              ['defeat']          New roll animation plays
        │                                 Back to 'player-turn'
        │
        │  Strike brings enemy.hp ≤ 0
        ▼
['victory']
  Banner shown. Room marked cleared. On tap / 1.5 s → back to navigation 'idle'.
        │
['defeat']
  Banner shown. On tap / 2 s → transition to Main Menu.
```

### Run state additions to `game.ts`

`game.ts` already manages `DungeonState` locally. 006 adds two sibling values:

- `pipHp: number` — Pip's current HP; initialised to `pipMaxHp` when navigation starts.
- `pipMaxHp: number` — constant 10 for this feature; kept as a variable for future upgradeability.
- `combat: CombatState | null` — non-null while an encounter is active.

```
CombatState:
  enemy:        Enemy          ← current enemy (Goblin, live HP)
  phase:        'awaiting-roll' | 'player-turn' | 'victory' | 'defeat'
  evadeBuffer:  number         ← damage reduction queued by Evade; resets after enemy attacks

Enemy:
  id:      string   // 'goblin'
  name:    string   // 'Goblin'
  hp:      number   // current
  maxHp:   number   // starting (6)
  attack:  number   // damage per turn (2)
```

Only one `Enemy` constant is needed for this feature:

```
GOBLIN = { id: 'goblin', name: 'Goblin', hp: 6, maxHp: 6, attack: 2 }
```

### Encounter trigger

After any Pip movement (`movePip` or `placeRoom`), check if the new tile has `roomType === 'enemy'`
and `cleared !== true`. If so, create a fresh `CombatState` with a copy of `GOBLIN` and set it as
`combat`. The dungeon `uiState` is forced to `'idle'` (movement already completed).

### Action wiring

The 005 dice panel already deducts pips via `spendPips`. For 006, the panel's `onAction` callback
receives the action id (`'strike' | 'evade' | 'focus'`) after pips are deducted, and `game.ts`
applies the combat effect:

| Action | Pip cost | Effect |
|--------|----------|--------|
| Strike | 2 🔴 | `enemy.hp -= 2`; check for victory |
| Evade  | 2 🟢 | `evadeBuffer = Math.max(evadeBuffer, 2)` |
| Focus  | 1 🔵 | `pipHp = Math.min(pipHp + 1, pipMaxHp)` |

Victory is checked immediately after Strike deducts HP — not at turn end.

### Room clearing

`TileCell` gains `cleared?: boolean`. On victory, the cell at Pip's current position is updated:
`cell.cleared = true`. The encounter trigger check skips cells where `cleared === true`.

### Edge cases

- Player enters enemy room at 1 HP: combat starts, first roll still fires before enemy attacks;
  player has a chance to act before taking damage.
- Evade used, then player immediately ends turn with 0 remaining pips: evadeBuffer still applies
  to the enemy's attack.
- Focus used when Pip is already at max HP: pips are still spent; HP stays at max; log reads
  `"Focus — +0 HP (Pip: 10/10 full)"` or equivalent.
- Strike on a 1 HP Goblin: enemy HP becomes 0 or below — victory triggers regardless of any
  over-damage.
- Player taps ROLL rapidly during roll animation: the existing 005 debounce (ROLL disabled while
  `'rolling'`) handles this — no additional guard needed.

## Visual design

### Status bar — combat mode

During combat, the status bar replaces floor/depth info with HP bars. The "← Quit Run" link stays.

```
┌─────────────────────────────────────────┐  y 0–50
│ ← Quit Run   [Pip bar]    [Enemy bar]  │
└─────────────────────────────────────────┘
```

**Pip HP bar** (left-centre):
```
PIP  ████████░░  7/10
```
- Label: `"PIP"` — `bold 10px monospace`, `textMuted`
- Bar: filled segment colour `#c8941e` (gold), empty segment `#2a2a3a`; width ~90 px, height 8 px
- Text: `"7/10"` — `10px monospace`, `textPrimary`

**Enemy HP bar** (right-centre):
```
GOBLIN  ████░░  3/6
```
- Label: enemy name in caps — `bold 10px monospace`, colour `--room-enemy` (`#7a1a1a`)
- Bar: filled segment `#7a1a1a`, empty segment `#2a2a3a`; width ~80 px, height 8 px
- Text: `"3/6"` — `10px monospace`, `textPrimary`

Both bars update in real time as HP changes.

### Dice panel — combat mode

The dice panel layout is unchanged from 005 (same position, same die faces, same pip badges, same
ROLL button, same action buttons). No structural changes to `panel.ts` are needed.

The panel is shown only when `combat !== null` (instead of always in idle, as the 005 demo had it).

### Victory and defeat banners

Banners are full-panel overlays drawn over the panel zone (y ≈ 472 to bottom). They replace the
dice panel content.

**Victory banner:**

```
┌──────────────────────────────┐
│                              │
│   ── VICTORY ──              │  gold, bold 22px monospace, centred
│                              │
│   Goblin defeated!           │  textPrimary, 14px system-ui, centred
│                              │
│   Tap to continue            │  textMuted, italic 11px system-ui
│                              │
└──────────────────────────────┘
```

Background: `--surface` (`#14142a`); top corners rounded (8 px). Gold border line at panel top.

**Defeat banner:**

```
┌──────────────────────────────┐
│                              │
│   ── DEFEATED ──             │  #7a1a1a (room-enemy), bold 22px monospace, centred
│                              │
│   Pip has fallen…            │  textMuted, italic 14px system-ui, centred
│                              │
│   Tap to continue            │  textMuted, italic 11px system-ui
│                              │
└──────────────────────────────┘
```

Background: `#0d0d1a` (`--bg`); top border `#7a1a1a`.

"Tap to continue" fades in after 0.5 s (opacity animation on the text, not the whole banner).

### Color tokens

No new tokens are introduced. Existing tokens used:
- Pip HP bar fill: `gold` (`#c8941e`)
- Enemy HP bar fill: `--room-enemy` (`#7a1a1a`)
- HP bar empty: `--room-corridor` (`#2a2a3a`)
- Victory title: `gold`
- Defeat title: `--room-enemy`

### File structure

```
src/
├── combat/
│   ├── types.ts          ← new: Enemy, CombatState types; GOBLIN constant
│   ├── encounter.ts      ← new: pure functions (applyStrike, applyEvade, applyFocus, applyEnemyAttack)
│   ├── encounter.test.ts ← new: unit tests for all pure functions
│   └── panel.ts          ← new: combat panel renderer (HP bars in status bar; victory/defeat banners)
│                            imports and integrates src/dice/panel.ts from 005
├── map/
│   └── types.ts          ← modified: TileCell gains cleared?: boolean
├── navigation/
│   └── dungeon-state.ts  ← modified: no structural change needed; clearing is done via direct
│                            grid mutation in game.ts (same pattern as placeRoom)
└── screens/
    └── game.ts           ← modified: adds pipHp/pipMaxHp/combat to local state; encounter trigger
                             after movement; combat-mode draw/click/hover handlers
```

## Open questions

_(none — all choices above are actionable; balance of Focus heal and enemy stats may need tuning
after the first play-test, but this does not block the Engineer)_

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** · **PR:** #

### What was built

### Evidence

### Play-test
