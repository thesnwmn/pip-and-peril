# Item System — As Implemented

**Source:** `src/encounter/item-panel.ts`, `src/meta/` (item specs), `src/combat/encounter.ts`  
**Last updated:** 2026-06-11 (features 020, 021, 026, 048, 049, 050)

---

## Overview

Items are objects Pip carries in his Satchel. They are acquired from item rooms, chests, shops,
and NPC rewards. They are used either from the Satchel during navigation or from the ITEM action
button during combat. Their effects fire at specific **interjection windows** in the turn loop
(see `docs/decisions/item-interjection.md`).

---

## Item Data Model

```ts
interface Item {
  id: string;                  // stable identifier
  name: string;
  description: string;
  icon: string;                // emoji or short glyph
  kind: 'consumable';          // only kind currently implemented
  usableInNav: boolean;        // whether usable from Satchel during navigation
  usableInCombat: boolean;     // whether usable from combat ITEM panel
  window: ItemWindow;          // interjection window (see below)
  luckyClass: boolean;         // whether this item is eligible for Luck interrupt
  quantity?: number;           // stackable consumables
  charges?: number;            // limited-use items (mutually exclusive with quantity)
  deathPrevention?: boolean;   // passive: prevents death once
  passiveArmour?: number;      // passive: reduces all incoming damage
  effect: ItemEffect;          // discriminated union of effect variants
}
```

`quantity` and `charges` are mutually exclusive:
- `quantity`: stackable consumable, incremented by `acquireItem()` on duplicate pickup
- `charges`: limited-use item, decremented by `consumeItem()`, removed at 0; does not stack

---

## Item Effects

`ItemEffect` is a discriminated union:

| kind | Fields | When it fires |
|---|---|---|
| `heal` | `amount: number` | Immediately on use (nav or post-damage in combat) |
| `reroll-dice` | — | `on-roll-luck` window; full pool reroll |
| `flee-combat` | — | `during-allocation`; exits combat with free enemy hit |
| `reveal-fog` | `radius: number` | `navigation` window; reveals adjacent fog tiles |
| `passive-armour` | — | `on-enemy-hit`; auto-fires, reduces all incoming damage |
| `death-prevention` | — | `post-damage`; prevents HP ≤ 0 once |
| `berserker` | `turns: number` | `during-allocation`; 2× Strike, no dodge for N turns |
| `self-damage` | `amount: number` | `during-allocation`; deals self-damage + grants bonus pips |
| `passive-gold` | `perRoom: number`, `enemyBonus: number` | Passive (Stolen Idol); fires per room entry and on enemy damage dealt |

---

## Interjection Windows

Eight windows define when items fire in the combat loop. Full table in
`docs/decisions/item-interjection.md`. Brief reference:

| Window | When |
|---|---|
| `pre-roll` | Before the dice roll |
| `on-roll-luck` | After roll, before any pips spent — Luck interrupt window |
| `during-allocation` | After roll, while spending pips |
| `on-strike` | When a Strike action resolves |
| `post-spend-tenacity` | After all pips spent — Tenacity items grant second sequence |
| `on-enemy-hit` | When enemy damage would land — passive armour fires here |
| `post-damage` | After enemy action resolves — healing, death prevention fire here |
| `between-turns` | Turn end / turn start boundary — status ticks, buff expiry |

Items with `usableInNav: true` use a `navigation` pseudo-window and fire immediately on use.

---

## Luck Interrupt

When a `luckyClass: true` item is in Pip's inventory and a check fails:

1. The failure consequence is deferred.
2. An amber overlay appears: item name/icon + "Reroll?" + [Use] / [Pass] buttons.
3. A 3-second auto-dismiss timer starts (dismisses as Pass).
4. If Use: full pool reroll; item consumed via `consumeItem()`; outcome re-evaluated.
5. If Pass: original failure outcome proceeds.

**Combat gate**: Luck items are greyed (α=0.38) once `pipsSpentThisTurn` is true — they must be
used before any allocation begins.

---

## Acquiring Items

`acquireItem(inventory, item)` is the single entry point for adding items to the inventory:

- If the item `id` already exists and has `quantity`: increment quantity.
- If the item has `charges`: replace existing charges (recharge), not stack.
- Otherwise: append a new entry.

Items are acquired from:
- **Item rooms** (`itemId` stored on tile at placement; fixed on re-entry)
- **Chests** (loot table draw at chest-open time)
- **Shops** (purchased with gold; removed from shop stock permanently)
- **NPC rewards** (`NpcReward.item` from dialogue outcomes)

---

## Current Item Catalogue (~21 items)

### Consumables (nav + combat)
| Item | Effect | Window |
|---|---|---|
| Crumb of Cheese | +2 HP | `post-damage` |
| Wedge of Gouda | +5 HP | `post-damage` |

### Luck-class items (combat `on-roll-luck`)
| Item | Effect |
|---|---|
| Lucky Acorn | Full pool reroll once |
| Rabbit's Foot | Full pool reroll once |

### Combat-only consumables
| Item | Effect | Window |
|---|---|---|
| Smoke Pellet | Flee combat (takes free hit) | `during-allocation` |
| Tainted Mushroom | Self-damage 3 HP + 3 bonus pips of any colour | `during-allocation` |
| Berserker Draught | 3 turns: 2× Strike damage, no dodge | `during-allocation` |
| Tenacity Tonic | Second roll-and-spend sequence this turn | `post-spend-tenacity` |

### Navigation-only
| Item | Effect | Window |
|---|---|---|
| Glowstone Dust | Reveal fog radius 2 | `navigation` |

### Passive / charged items
| Item | Effect | Window |
|---|---|---|
| Padded Coat | −1 Green pip per roll (passive penalty offset by passive armour) | passive |
| Stolen Idol | +2 gold per room entered, +1 to all enemy damage dealt | passive |
| Stout Flask | +3 HP on use (chest tier) | `post-damage` |
| Iron Thimble | +2 passive armour | `on-enemy-hit` |
| Rabbit's Foot | Reroll once; Luck-class | `on-roll-luck` |
| Tenacity Stone | Charges: 3; Tenacity window | `post-spend-tenacity` |

_(Full catalogue in item spec files under `src/meta/` or `src/encounter/item-panel.ts`.)_

---

## Charged Item Display

Items with `charges` show a gold `Nc` suffix badge (10px monospace) in:
- The Satchel Pouch view
- The combat ITEM overlay

Items with `quantity` show a `×N` suffix in the same locations.

---

## Passive Items

Passive items (`deathPrevention`, `passiveArmour`, `Stolen Idol`-style effects) are checked on
every relevant event rather than being explicitly "used":

- `applyPassiveArmour(damage, inventory)` — scans inventory for `passiveArmour > 0` items;
  subtracts the sum from incoming damage before HP apply.
- `applyDeathPrevention(newHp, inventory)` — called when HP would drop to ≤ 0; if a death
  prevention item is present, returns 1 HP and removes the item.
- Stolen Idol gold increment fires in the room-entry handler and the Strike resolve handler.

Passive effects do not appear in the ITEM submenu (they are always-on, not player-activated).
