# Item Interjection Framework — Decision Detail

**Register entries:** D19, D20, D21  
**Introduced:** Feature 048

---

## The Eight Windows

Every item fires at exactly one point in the game loop. The Designer's first question when
speccing a new item is: *which window does this sit in?*

| Window | `ItemWindow` value | Timing | Example items |
|---|---|---|---|
| Pre-roll | `pre-roll` | Before Pip rolls, at turn start | Scouting items; items that add bonus pips before the roll |
| On-roll (Luck) | `on-roll-luck` | After roll, before any spending; usable only before pips are spent | Lucky Acorn, Rabbit's Foot |
| During allocation | `during-allocation` | After roll, while spending pips | Smoke Pellet (flee), dice-manipulation items |
| On-strike | `on-strike` | When a Strike action resolves | Weapon coatings (future) |
| Post-spend Tenacity | `post-spend-tenacity` | After all pips spent this turn | Tenacity items (grant second roll-and-spend) |
| On-enemy-hit | `on-enemy-hit` | When enemy damage would land | Passive armour; shield items |
| Post-damage | `post-damage` | After enemy action resolves | Healing items (Crumb of Cheese, Wedge of Gouda) |
| Between-turns | `between-turns` | Turn end / turn start boundary | Status tick sources; buff expiry |

There is also a `navigation` window for items usable outside combat (Glowstone Dust, healing
consumables from the Satchel). Navigation items are not in the combat interjection model — they
fire immediately on use and have no turn-phase constraint.

## Why exactly one window per item

Items that could fire at multiple windows create ambiguity for both the player and the Engineer.
"Use before rolling for a full reroll" is the Luck item. "Use after spending pips to get another
turn" is the Tenacity item. The distinct windows give each item class a distinct feel and prevent
two items from competing for the same dramatic moment.

When the Engineer implements an item, the window determines exactly which code path triggers it.
There is no need to check "is this item usable right now?" in multiple places — the window field
is the answer.

## Luck interrupt (D20)

### Pattern

1. A non-combat check fails, or a combat roll resolves unfavourably.
2. Before the failure consequence lands, check if Pip carries any `luckyClass: true` item.
3. If yes, fire the Luck interrupt prompt: an amber overlay showing the item and "Reroll?".
4. Player taps Use or Pass (or the 3-second auto-dismiss fires as Pass).
5. If Use: full pool reroll, item consumed; outcome re-evaluated.
6. If Pass: original failure outcome proceeds.

### Why a timed auto-dismiss

The Luck interrupt is a dramatic save moment. Auto-dismiss prevents it from becoming a blocking
gate that disrupts flow when the player has already mentally accepted the failure. 3 seconds is
long enough to read and decide; short enough that it does not feel like a forced pause.

### Gating in combat

In combat, Luck items are greyed (α=0.38) once any pips have been spent this turn
(`pipsSpentThisTurn` flag). This enforces the `on-roll-luck` window contract: Luck items must be
used immediately after the roll, before allocation begins. Using a Luck item after spending pips
would invalidate already-committed decisions.

## Charges vs. quantity (D21)

Two separate fields on `Item`:

- **`quantity: number`** — for stackable single-use consumables. `acquireItem()` increments this
  when the same item ID is picked up again. Using the item decrements quantity; reaching 0 removes
  the entry.
- **`charges: number`** — for limited-use items that do not stack. Each use decrements charges;
  reaching 0 removes the item. `consumeItem()` handles the decrement.

The distinction matters for display: a `quantity: 3` item shows "×3" in the Satchel; a
`charges: 3` item shows "3c" (indicating remaining uses, not copies). Players perceive these
differently — three cheese wedges vs. a flask with three sips.

Internally, `acquireItem()` checks `item.charges` to decide whether to increment quantity or
add a new entry. A charged item picked up a second time replaces the existing entry (recharge),
not stack — this is intentional, as charged items represent persistent tools, not consumables.

## Item data model fields added in Feature 048

All existing items were retroactively given `window` and `luckyClass` fields:

| Item | Window | luckyClass |
|---|---|---|
| Crumb of Cheese | `post-damage` | false |
| Wedge of Gouda | `post-damage` | false |
| Lucky Acorn | `on-roll-luck` | true |
| Smoke Pellet | `during-allocation` | false |
| Glowstone Dust | `navigation` | false |
| Rabbit's Foot | `on-roll-luck` | true (reclassified from combat-only) |
| Stout Flask | `post-damage` | false |

Future items must include both fields. The `luckyClass` flag drives Luck interrupt eligibility;
`window` drives when the item's effect fires in the turn loop.
