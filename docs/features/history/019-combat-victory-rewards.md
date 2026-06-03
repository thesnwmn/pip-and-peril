# 019 · Combat Victory Rewards

**Status:** READY
**Source idea:** backlog item
**Depends on:** 006 (combat victory flow, `CombatState`), 016 (inventory data model, `gold` field)

## Summary

When Pip defeats an enemy in combat, she earns a random gold amount that is added to her
inventory and shown immediately on the victory banner. This is the first moment `inventory.gold`
becomes non-zero — turning the Satchel's Pouch from a placeholder into live run state. Each enemy
definition carries a gold reward range; on victory the game rolls within that range and credits
the result. The Goblin drops 2–4 gold.

## Acceptance criteria

1. The `Enemy` type gains two new fields: `goldMin: number` and `goldMax: number`. The `GOBLIN`
   constant is updated to `goldMin: 2, goldMax: 4`.
2. `CombatState` gains one new field: `goldAwarded: number` — initialised to `0` on encounter
   start, set to the rolled amount the moment phase transitions to `'victory'`.
3. On victory, gold is rolled as
   `Math.floor(Math.random() * (enemy.goldMax − enemy.goldMin + 1)) + enemy.goldMin`
   and the result is added to `inventory.gold`.
4. The victory banner displays a reward line `+ N gold ◈` (N = rolled amount) in `--gold` colour,
   centred below the enemy-defeated line. The line is visible immediately when the banner appears
   (no fade delay).
5. After the banner dismisses and navigation resumes, the Satchel Pouch tab reflects the updated
   gold total (this combat's award plus any previously accumulated gold from earlier combats).
6. Gold accumulates additively across multiple combats in a run; it is never reset mid-run.
7. A new pure function `rollGoldReward(enemy: Enemy): number` is exported from `encounter.ts`.
   It is the only place gold is rolled. `game.ts` calls it on victory and applies the result to
   `inventory.gold`.
8. `npm run typecheck` exits zero errors.
9. `npm run test` passes. New tests cover:
   - `rollGoldReward` called many times always returns an integer in [`goldMin`, `goldMax`].
   - `goldMin === goldMax` always returns that fixed value.
   - Simulated successive victories accumulate gold correctly in `inventory.gold`.

## Scope / non-goals

- **No item drops** — enemy loot is gold only. Item drop tables are deferred to 020.
- **No boss loot** — boss reward structure belongs to 023.
- **No "picked clean" surprise** — Idea 001 (enemy already dead on room entry) is deferred.
- **No gold counter in the status bar** — the Satchel Pouch is the gold source of truth; no
  mid-run HUD total.
- **No Tally entry for gold earned** — the Tally tab (016) shows depth, rooms, enemies felled;
  a gold-earned row is deferred.
- **No gold from non-combat sources** — chests (026), shops (027), and item rooms (021) each
  wire their own gold flows separately.

## Design detail

### Data / state changes

**`Enemy` (in `src/combat/types.ts`)**

Two fields added alongside the existing `attack`:

| Field | Type | Goblin value |
|---|---|---|
| `goldMin` | `number` | `2` |
| `goldMax` | `number` | `4` |

**`CombatState` (in `src/combat/types.ts`)**

One new field:

| Field | Type | Initial value |
|---|---|---|
| `goldAwarded` | `number` | `0` |

Set to the rolled amount when phase transitions to `'victory'`. The banner renderer reads this
field directly — it does not sum `inventory.gold` before and after.

### Reward flow

```
[ENCOUNTER — 'player-turn']
        │
        │  Strike brings enemy.hp ≤ 0
        ▼
[Roll gold reward]
  combat.goldAwarded = rollGoldReward(enemy)
  inventory.gold    += combat.goldAwarded
  combat.phase       → 'victory'
        │
        ▼
[ENCOUNTER — 'victory']
  Banner: "── VICTORY ──" / "Goblin defeated!" / "+ N gold ◈"
  On tap / 1.5 s → clear CombatState, resume navigation (unchanged from 006)
```

### Pure function

`rollGoldReward(enemy: Enemy): number`
- Returns `Math.floor(Math.random() * (enemy.goldMax − enemy.goldMin + 1)) + enemy.goldMin`
- Lives in `encounter.ts` alongside the other pure combat functions (`applyStrike`, etc.)
- No side effects — caller applies the result to inventory

### Edge cases

- **Minimum roll**: banner shows `+ 2 gold ◈` — no special handling.
- **Multiple combats in one run**: victories at 3, 2, 4 gold → `inventory.gold` becomes 9 after
  all three. Each combat adds independently.
- **`goldMin === goldMax`**: formula still works; used by future fixed-reward encounters.
- **Banner displays this combat's award only** (not the running total), so the player can
  distinguish what they just earned from what they accumulated earlier.

## Visual design

### Updated victory banner

The banner from 006 gains one line between "Goblin defeated!" and "Tap to continue":

```
┌──────────────────────────────┐
│                              │
│      ── VICTORY ──           │  --gold, bold 22px monospace, centred
│                              │
│      Goblin defeated!        │  --text-primary, 14px system-ui, centred
│                              │
│      + 3 gold  ◈             │  --gold, bold 14px monospace, centred
│                              │
│      Tap to continue         │  --text-muted, italic 11px system-ui, fades in at 0.5 s
│                              │
└──────────────────────────────┘
```

- `◈` is the same gold-coin glyph already established in the Satchel Pouch tab (016).
- The reward line appears immediately when the banner is drawn — no delay.
- N is `combat.goldAwarded`, not the running total.

### Color tokens

No new tokens. Existing token used:

| Token | Value | Used for |
|---|---|---|
| `--gold` | `#c8941e` | Reward line text (matches title and Satchel gold amount) |

### Typography / sizing

| Element | Size / weight | Colour |
|---|---|---|
| `+ N gold ◈` | bold 14px monospace | `--gold` |

Same weight and size as "Goblin defeated!" but in gold — visually distinct without a new scale step.

## Open questions

None. Gold range (2–4) and the decision to exclude item drops from this spec are manager-confirmed.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** 2026-06-03 · **PR:** #

### What was built

- `Enemy` gained `goldMin`/`goldMax` fields; `GOBLIN` set to `goldMin: 2, goldMax: 4`.
- `CombatState` gained `goldAwarded: number`, initialised to `0` on encounter start.
- `rollGoldReward(enemy)` pure function exported from `encounter.ts`; no side effects.
- Victory handler in `game.ts` calls `rollGoldReward`, credits `inventory.gold`, sets `combat.goldAwarded`.
- Victory banner in `panel.ts` gains a `+ N gold ◈` line in `--gold` bold 14 px monospace, appearing immediately (no fade). "Tap to continue" shifts down on victory only; defeat layout unchanged.
- Reviewer inline pass caught and fixed a layout regression: "Tap to continue" was shifted unconditionally — fixed to shift only when `isVictory`.

### Evidence

- 187 tests pass (`npm run test`), including 3 new `rollGoldReward` tests:
  - 200-iteration range check: always returns integer in [`goldMin`, `goldMax`].
  - Fixed-value case: `goldMin === goldMax` always returns that value.
  - Accumulation: three victories at 3 gold each sum to 9.
- `npm run typecheck` exits zero errors.

### Play-test

1. Start a new run from the Main Menu.
2. Navigate to an Enemy room and enter combat.
3. Roll dice and use Strike until the Goblin is defeated (6 HP, takes three 2-damage strikes).
4. The victory banner should show `── VICTORY ──`, then `Goblin defeated!`, then `+ N gold ◈` where N is 2, 3, or 4, then (after 0.5 s) `Tap to continue`. The gold line appears immediately in gold colour.
5. Tap the banner (or wait 1.5 s for auto-advance). Open the Satchel (bottom-right button) → Pouch tab. Gold total should equal N from step 4.
6. Fight a second Goblin. After victory, the Pouch gold should be the sum of both combat awards.
7. Confirm the defeat banner is unaffected: enter combat and let the Goblin reduce Pip to 0 HP. The `── DEFEATED ──` banner should show no gold line, and "Tap to continue" should appear at the same position as before this feature.
