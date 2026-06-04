# 020 · Item System: Consumables & Use

**Status:** READY
**Source idea:** manager request (backlog item)
**Depends on:** 016 (Item data model, Satchel Pouch UI, Inventory), 005 (Dice Pool System — reroll for Lucky Acorn), 006 (CombatState, combat phases), 034 (Encounter Registry — combat panel structure)

## Summary

Items are the currency of survival in Pip's dungeon. This feature turns the Satchel's empty Pouch into a live toolkit: it defines the **consumable item category**, the shared **acquire** function that item rooms, chests, and shops all call, and the act of **using** a consumable — both from the Satchel during navigation and from a new ITEM action in the combat panel. Five theme-appropriate starting items cover the situations a player will face: healing in and out of combat, dice manipulation, escape, and exploration. A new **fled tile state** supports the Smoke Pellet's escape mechanic and foreshadows a future raw-flee action (feature 036).

## Acceptance criteria

### Data model

1. The `Item` type from feature 016 gains three new fields: `kind: 'consumable'`, `usableInNav: boolean`, and `usableInCombat: boolean`. Existing usages of `Item` that omit these fields must be updated.

2. A discriminated `ItemEffect` type is defined with four variants: `heal` (restores N HP), `reroll-dice` (fresh dice-pool roll), `flee-combat` (exits combat, marks tile fled), and `reveal-fog` (uncovers tiles within a radius). See Design detail for full shapes.

3. Five item constants are exported from a catalog module: **Crumb of Cheese**, **Wedge of Gouda**, **Lucky Acorn**, **Smoke Pellet**, and **Glowstone Dust** — with the values specified in the Design detail section.

4. `TileCell` gains an optional `fled?: boolean` field.

### Acquire

5. A pure `acquireItem(inventory, item)` function is the single entry point for gaining items. If the inventory already contains an item with the same `id`, it increments that item's `quantity`; otherwise it appends a new entry. The function returns the updated inventory and has no side effects.

### Navigation use

6. In the Satchel Pouch tab during navigation, tapping a consumable with `usableInNav: true` fires its effect immediately, decrements the item's quantity, removes the entry if quantity reaches 0, and shows a contextual whisper-overlay message (e.g. `"Pip nibbles the crumb. +2 HP."`).

7. Items with `usableInCombat: true` and `usableInNav: false` render greyed (~40 % opacity) in the Pouch during navigation with a small "combat only" indicator. Tapping them has no effect.

8. Items with `usableInNav: true` and `usableInCombat: false` render normally in the Pouch; they do not appear in the combat ITEM overlay.

### Combat use

9. A fourth action button labelled **ITEM** appears in the combat panel when `inventory.items` contains at least one item with `usableInCombat: true`. The button is absent when no such items exist.

10. Tapping ITEM opens a compact item picker overlay listing only items where `usableInCombat: true`, each showing its icon, name, quantity, and one-line description. The overlay has a dismiss control (×) that closes it without using anything.

11. Tapping an item in the picker fires its effect, closes the overlay, decrements quantity (removes the entry if quantity reaches 0), and appends a combat log entry (e.g. `"Crumb of Cheese — +2 HP! (Pip: 5→7)"`).

12. Using an item via the ITEM overlay is a **free action**: it does not cost pips, does not end the turn, and does not prevent rolling or using other pip-cost actions afterwards. Only one item may be used per combat turn; after use, the ITEM button is greyed until the next turn begins (when ROLL fires next).

### Item effects

13. **Crumb of Cheese**: restores 2 HP to Pip, capped at `pipMaxHp`. Usable in nav and combat.

14. **Wedge of Gouda**: restores 5 HP to Pip, capped at `pipMaxHp`. Usable in nav and combat.

15. **Lucky Acorn**: triggers a fresh roll of the full dice pool — all die values are re-randomised, pip counts replaced with the new totals, and the roll animation plays (~500 ms). Enemy attack does **not** fire. Usable in combat only.

16. **Smoke Pellet**: ends the current combat immediately (Pip takes no free attack). The current tile gains `fled = true`. `CombatState` is cleared and navigation resumes with Pip standing in the enemy room, free to move in any direction. Usable in combat only.

17. **Glowstone Dust**: uncovers all fogged tiles within a 2-tile Chebyshev radius of Pip's current position, using the same reveal logic as normal movement. Usable in navigation only.

### Fled tile

18. A tile with `roomType: 'enemy'` and `fled === true` renders a small bright-red enemy marker on its face (top-right quadrant, ~12 × 12 px canvas area). The marker does not obscure doorways.

19. Entering a fled room triggers combat normally. The existing encounter trigger (`roomType === 'enemy'` and `cleared !== true`) already covers this — no logic change is required.

### Effects purity and quality

20. A pure `applyItemEffect` function (or set of pure functions, one per variant) is the sole place item effects are computed. `game.ts` or the relevant panel calls these and applies the result. No item effect is computed inline at the call site.

21. `npm run typecheck` exits zero errors.

22. `npm run test` passes. New unit tests cover at minimum:
    - `acquireItem`: stacking (same id increments quantity), new item (appended), removes entry at 0.
    - Heal effect: +2 HP normal case; +5 HP capped at `pipMaxHp`; +2 HP already at max (no change).
    - Reroll effect: after Lucky Acorn fires, pip totals change to the new roll values; enemy attack does not fire.
    - Flee effect: `fled` set on current tile; `combat` state cleared.
    - Fog reveal: tiles within radius are revealed; tiles outside radius stay fogged.

## Scope / non-goals

- **Equipment / passive gear** — worn slot and pool-modifying items are step ② per the backlog note. Separate spec.
- **Item Room encounter (021)** — provides the acquire engine; the room trigger and panel are a separate spec.
- **Shop (027) and Chest (026)** — those specs wire acquisition to their own flows.
- **Raw flee without an item** — a future combat action (feature 036) that takes a free enemy attack and pushes Pip to the previous tile. The fled tile state introduced here is shared.
- **Fled-room visual complexity** — the red marker covers the minimal signal. A pulsing glow, menacing animation, or "roaming enemy" behaviour are deferred.
- **Stack size / inventory size limits** — no caps in this feature; deferred.
- **Item detail / inspect view** — tapping an item for extended lore is deferred.
- **Lasting buff items** — no items in this set persist across room transitions or combat rounds as a status effect; deferred.
- **Item drops from enemies** — enemy loot is gold only (per 019). Item acquisition sources (rooms, chests, shops) are separate specs.
- **Placeholder seeding for play-test** — the Engineer may temporarily add items to starting inventory to exercise the UI during development; that code is removed before the PR opens.

## Design detail

### Item data model

Extends the `Item` shape from feature 016:

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Unique key. Unchanged from 016. |
| `name` | `string` | Display name. Unchanged. |
| `iconType` | `string` | Canvas renderer key. Unchanged. |
| `quantity` | `number` | Stackable count. Unchanged. |
| `description` | `string` | One-line in-world flavour. Unchanged. |
| `kind` | `'consumable'` | Discriminant for future equipment. **New.** |
| `usableInNav` | `boolean` | May be used from the Satchel. **New.** |
| `usableInCombat` | `boolean` | Appears in the combat ITEM overlay. **New.** |
| `effect` | `ItemEffect` | What happens on use. **New.** |

`ItemEffect` discriminated union:

| Variant `type` | Extra fields | Meaning |
|---|---|---|
| `'heal'` | `amount: number` | Restore HP, capped at `pipMaxHp` |
| `'reroll-dice'` | — | Fresh full pool roll, no enemy attack |
| `'flee-combat'` | — | End combat, mark tile `fled`, resume nav in room |
| `'reveal-fog'` | `radius: number` | Reveal fogged tiles within Chebyshev radius |

### Item catalog

| Constant | Name | Description | usableInNav | usableInCombat | Effect |
|---|---|---|---|---|---|
| `CHEESE_CRUMB` | Crumb of Cheese | *A mouthful for a mouse.* | ✓ | ✓ | `heal, amount: 2` |
| `GOUDA_WEDGE` | Wedge of Gouda | *A proper meal.* | ✓ | ✓ | `heal, amount: 5` |
| `LUCKY_ACORN` | Lucky Acorn | *Still warm from the oak.* | ✗ | ✓ | `reroll-dice` |
| `SMOKE_PELLET` | Smoke Pellet | *Light the fuse, run.* | ✗ | ✓ | `flee-combat` |
| `GLOWSTONE_DUST` | Glowstone Dust | *A pinch of cave light.* | ✓ | ✗ | `reveal-fog, radius: 2` |

### Acquire flow

```
acquireItem(inventory, item)
        │
        ├── item.id already in inventory.items?
        │       └── YES → increment quantity on existing entry
        │
        └── NO → append item (quantity: 1) to items array
        
Returns updated Inventory. Pure — no side effects.
```

Called by: item room panel (021), chest encounter (026), shop purchase (027). None of those features need to know about stacking logic.

### Navigation use flow

```
[Satchel open, Pouch tab active]
        │
        │  Player taps a Pouch cell
        ▼
Is item.usableInNav?
   NO  → no-op (item is greyed; tap is swallowed)
   YES → applyItemEffect(runState, item)
         decrement item.quantity (remove if 0)
         show whisper: context-appropriate line
         [Satchel remains open]
```

Whisper messages (written in Pip's in-world register):

| Item | Whisper text |
|---|---|
| Crumb of Cheese | `"Pip nibbles the crumb. +2 HP."` |
| Wedge of Gouda | `"A real meal. +5 HP."` |
| Glowstone Dust | `"The tunnel glows softly. Fog clears."` |

### Combat use flow

```
[Combat phase: 'player-turn', ITEM button visible]
        │
        │  Player taps ITEM
        ▼
[Item picker overlay opens]
  Lists items where usableInCombat: true
        │
        │  Player taps an item row
        ▼
applyItemEffect(combatState / runState, item)
decrement item.quantity (remove if 0)
append combat log entry
close overlay
set combatState.itemUsedThisTurn = true   → ITEM button greyed
        │
        │  Player taps ROLL (new turn starts)
        ▼
combatState.itemUsedThisTurn = false      → ITEM button active again
```

**Lucky Acorn reroll detail:**
The fresh roll replaces current pip counts with new randomly-generated values, exactly as if ROLL had been pressed at the start of a new turn. Any pips already spent this turn are not restored — the new roll sets totals from zero. Actions already taken (HP changes, evade buffer) are unaffected.

**Smoke Pellet exit path:**
```
[Combat phase: 'player-turn']
  Player uses Smoke Pellet
        │
        ▼
phase → 'fled'   (new phase variant)
tile.fled = true
CombatState cleared
Nav panel resumes in IDLE mode
Pip remains on the fled tile
```

The `'fled'` phase variant fires the FALLING transition (encounter panel slides down) and routes to navigation-idle, not to main menu. It follows the same victory-outcome path in the encounter registry, since both result in "encounter ends, navigation resumes." The distinction from `'victory'` is: room is NOT marked `cleared`; tile is marked `fled`.

### CombatState additions

| Field | Type | Initial | Resets |
|---|---|---|---|
| `itemUsedThisTurn` | `boolean` | `false` | On each new roll (turn start) |

### Edge cases

- **Heal at max HP**: HP stays at `pipMaxHp`. Pips/item are still consumed. No error.
- **Lucky Acorn with no remaining pips**: Fresh roll proceeds normally; player may get 0 on some dice.
- **Smoke Pellet on a tile that is also a doorway**: `fled = true` is set; combat ends. The tile's exit layout is unaffected.
- **Glowstone Dust at dungeon edge**: Tiles outside the generated grid are not revealed (no error — nothing to reveal).
- **ITEM tapped with only nav-only items in pouch**: ITEM button was already absent (AC 9). Not reachable.
- **Satchel opened after fleeing** (Pip is on a fled tile, in navigation): Satchel opens normally. The fled tile state is map state, not satchel state.
- **Re-entering a fled room**: Standard combat trigger fires. The `fled` flag is not cleared on combat start — if the player flees again, `fled` stays true (no state regression).
- **Using Gouda when healing would overshoot max**: HP is clamped. The log shows the actual change, not the requested amount.

## Visual design

### Combat panel — four-button action row

The ITEM button takes the fourth slot with no pip-cost badge (free action). Width is shared equally across all four buttons. After use this turn, ITEM renders at reduced opacity (~40 %), matching the appearance of unaffordable pip-cost actions.

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│  STRIKE     │   EVADE     │   FOCUS     │    ITEM     │
│    2🔴      │    2🟢      │    1🔵      │             │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### Item picker overlay (combat)

Slides up from the bottom of the encounter panel, anchored just above the action row. The list scrolls vertically if items overflow the overlay height (~3 rows visible without scroll).

```
┌──────────────────────────────────────┐
│  Use Item                        [×] │  ← header; [×] dismisses without use
│  ────────────────────────────────── │
│  ┌────┐  Crumb of Cheese       ×3   │  ← icon cell (32×32), name, quantity badge
│  │    │  A mouthful for a mouse.    │  ← description line
│  └────┘                             │
│  ┌────┐  Lucky Acorn           ×1   │
│  │    │  Reroll all dice once.      │
│  └────┘                             │
└──────────────────────────────────────┘
```

- Background: `--surface` (`#14142a`), rounded top corners (8 px), 1 px border in `--border`
- Header: `bold 12px monospace`, `--text-primary`; [×] is a 44 px tap target
- Item row: icon cell uses `--surface-raised` background; name `bold 12px monospace` `--text-primary`; quantity badge `10px monospace` `--gold`; description `italic 11px monospace` `--text-muted`
- Row tap target: full row width, min 48 px height
- Highlighted row (pointer hover): `--surface-raised` background tint

### Satchel Pouch — combat-only items during navigation

```
  ┌──────┐     ┌──────┐
  │      │     │      │  ← combat-only items at ~40% opacity
  │  🌰  │     │  💨  │
  └──────┘     └──────┘
  combat only  combat only    ← 9px monospace label below cell
```

### Fled tile — map face marker

```
 ┌───────────────────┐
 │                [!]│  ← red enemy marker, top-right, ~12×12 px
 │                   │     drawn as a bold exclamation or simple
 │                   │     enemy silhouette; colour --enemy-fled
 │                   │
 └───────────────────┘
```

The marker is drawn on top of the tile face art after the room tint pass. It does not occupy a doorway position.

### Color tokens

| Token | Value | Used for |
|---|---|---|
| `--enemy-fled` | `#c43030` | Red enemy marker on fled tiles |

### Typography / sizing

| Element | Size / weight | Colour |
|---|---|---|
| ITEM button label | same as Strike/Evade/Focus (matches existing action buttons) | `--text-primary` |
| Picker header "Use Item" | `bold 12px monospace` | `--text-primary` |
| Picker item name | `bold 12px monospace` | `--text-primary` |
| Picker item description | `italic 11px monospace` | `--text-muted` |
| Picker quantity badge | `10px monospace` | `--gold` |
| "Combat only" label in Pouch | `9px monospace` | `--text-muted` |
| Combat log item entry | same size as existing log lines | `--text-primary` |

## Open questions

None — all blocking questions resolved with the manager before this spec was written.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** 2026-06-04 · **PR:** [#59](https://github.com/thesnwmn/pip-and-peril/pull/59)

### What was built

- `src/items/types.ts` — extended `Item` type with `kind`, `usableInNav`, `usableInCombat`, `effect`; `ItemEffect` discriminated union (`heal`, `reroll-dice`, `flee-combat`, `reveal-fog`); `applyItemEffect` pure function
- `src/items/catalog.ts` — five item constants: `CHEESE_CRUMB`, `GOUDA_WEDGE`, `LUCKY_ACORN`, `SMOKE_PELLET`, `GLOWSTONE_DUST`
- `src/items/acquire.ts` — `acquireItem(inventory, item)` pure stacking function
- `src/combat/combat-panel.ts` — ITEM action button (hidden when no combat-usable items); item picker overlay with dismiss control; free-action once-per-turn guard via `itemUsedThisTurn`
- `src/satchel/pouch.ts` — nav-use flow (tap fires effect, whisper feedback); combat-only items rendered greyed with "combat only" label
- `src/navigation/dungeon-state.ts` — `TileCell.fled?: boolean` field; fled tile red enemy marker in map renderer
- `src/encounter/registry.ts` — new `'fled'` combat phase routes to navigation-idle (panel falls) without marking room cleared
- Unit tests covering `acquireItem`, all four `ItemEffect` variants, edge cases (heal at max HP, flee state propagation, fog reveal boundary)

### Evidence

`npm run test` and `npm run typecheck` both pass clean. All acceptance criteria verified.

### Play-test

1. Start a new run — open Satchel → Pouch tab; should be empty (no seeding items left in shipped code).
2. To test nav use: temporarily give Pip a Crumb of Cheese in starting inventory, open Satchel, tap it — whisper `"Pip nibbles the crumb. +2 HP."` should appear; item quantity decrements.
3. To test combat use: enter an enemy room with a combat-usable item — ITEM button appears in action row; tap opens picker; tap item fires effect and greys ITEM until next ROLL.
4. To test Smoke Pellet: use in combat — panel falls, Pip remains in room, red `!` marker appears on tile face; re-enter room to confirm combat restarts normally.
5. Glowstone Dust (nav only): use from Satchel — tiles within radius 2 reveal; item is absent from combat ITEM overlay.
