# 049 · Item Catalogue — Wave 1

**Status:** READY
**Source idea:** Idea 045 (`IDEAS.md`)
**Depends on:** 048 (Item Interjection Framework — window/luckyClass/passiveArmour/deathPrevention/charges fields and hooks)

## Summary

Feature 048 stubs three hooks — `passiveArmour`, `deathPrevention`, and `charges` — and formalises the Tenacity window, but ships no items that use any of them. This feature closes that gap. Five new items are added to the catalogue: two Tenacity consumables that grant a second roll-and-spend in combat (filling the long-empty Tenacity window), one run-long passive armour piece that auto-reduces incoming damage (exercising the `passiveArmour` hook), one death-prevention talisman that keeps Pip alive at 1 HP at the moment of death (exercising the `deathPrevention` hook), and one charged multi-use healing item (exercising the `charges` field and triggering its Satchel display). Together these items confirm the 048 plumbing is working end-to-end and widen the run strategy space without requiring new UI mechanics beyond a charges display and passive-item treatment in the Satchel.

---

## Acceptance criteria

### Item definitions

1. Five new item constants are exported from the item catalog module:

   | Constant | Name | window | luckyClass | usableInNav | usableInCombat |
   |---|---|---|---|---|---|
   | `GRIT_STONE` | Grit Stone | `post-spend-tenacity` | false | false | true |
   | `SECOND_WIND_VIAL` | Second Wind Vial | `post-spend-tenacity` | false | false | true |
   | `LEATHER_JERKIN` | Leather Jerkin | `on-enemy-hit` | false | false | false |
   | `SAINTS_ACORN` | Saint's Acorn | — (death hook) | false | false | false |
   | `BANDAGE_ROLL` | Healing Bandage Roll | `post-damage` | false | true | true |

2. `LEATHER_JERKIN` has `passiveArmour: 1`.

3. `SAINTS_ACORN` has `deathPrevention: true`.

4. `BANDAGE_ROLL` has `charges: 3` and effect `heal, amount: 3`.

### Tenacity items in combat

5. In the ITEM overlay during combat, Tenacity items (`window: 'post-spend-tenacity'`) render greyed and untappable when no pip-spend action has been taken this turn. The `pipsSpentThisTurn` flag (from 046) is the gate — the same flag 048 uses inversely to grey Luck items post-spend.

6. Once any pip-spend action is taken, Tenacity items in the ITEM overlay become active (full opacity, tappable) — provided no item has been used this turn yet.

7. Tapping a Tenacity item when active: the item is consumed; the full dice pool rolls again (animation plays, ~500 ms); pip counts reset to the new roll's totals; the player may spend pips again via the normal action row. The enemy does not attack between the two spend sequences. The `itemUsedThisTurn` flag is set, greying the ITEM button for the remainder of this extended turn.

8. After the second spend sequence, the turn ends normally (END TURN pressed, or the player uses whatever pips they choose). The enemy attack then fires as normal.

9. A second Tenacity item cannot be used in the same turn, even if one is still in the satchel. The `itemUsedThisTurn` flag from step 7 enforces this.

### Passive armour

10. When `pipHp` would be reduced by an enemy attack and the satchel contains an item with `passiveArmour > 0`, the incoming damage is reduced by that value before being applied. Damage cannot go below 0 (a 1-damage attack against 1-armour deals 0 damage; Pip's HP is unchanged).

11. The passive reduction fires automatically — no player action required. The Leather Jerkin does NOT appear in the ITEM overlay.

12. The combat log records the reduction: `"Enemy attacks — 1 damage (blocked by Leather Jerkin)"` or equivalent.

13. Acquiring a Leather Jerkin when no passive-armour item is already in the satchel adds it normally via `acquireItem`.

14. Acquiring a Leather Jerkin (or any `passiveArmour > 0` item) when a passive-armour item is already equipped: the acquiring panel (item room, chest, shop) shows a replace prompt — e.g. `"Replace Leather Jerkin?"` — before completing the transaction. Confirming removes the old armour and adds the new one. Declining cancels the acquisition; the existing armour stays. The old armour is lost — it cannot be recovered.

15. The Leather Jerkin is available in chest and shop item pools. It does NOT appear in item-room pools.

### Death prevention

16. At the moment `pipHp` would be set to ≤ 0 (during the damage calculation), if the satchel contains a `deathPrevention: true` item: `pipHp` is set to 1; the death-prevention item is removed from the satchel; a death-prevention notification renders (see Visual design); the defeat flow does NOT trigger; combat continues with Pip at 1 HP.

17. If no `deathPrevention: true` item is present, the existing defeat flow is unchanged.

18. If multiple `deathPrevention: true` items are in the satchel (possible if a future item is added), only the first (by satchel order) fires. The remaining items stay in the satchel for subsequent lethal events within the same run.

19. Saint's Acorn does NOT appear in item-room pools or shop pools. It appears only in chest pools and boss-room reward pools. Its rarity weight within those pools should be set to make it significantly rarer than any common item (specific weight values are the Engineer's tuning call; the intent is that finding one should feel like extraordinary luck).

20. When generating an item to offer and the player's satchel already contains a `deathPrevention: true` item, Saint's Acorn is excluded from the candidate pool.

### Charged items

21. A charged item (has `charges: number`) in the Satchel Pouch and in the ITEM overlay displays its remaining charge count distinctly from the quantity badge used for stacked items. Use the format `Nc` (e.g. `3c`, `2c`, `1c`) where `c` is a small glyph or label that distinguishes charges from item quantity. See Visual design.

22. Each use of the Healing Bandage Roll decrements `charges` by 1. When `charges` reaches 0, the item is removed from the satchel (same as `quantity: 0` removal for non-charged items).

23. Each use restores 3 HP to Pip, capped at `pipMaxHp`. The healing is the same in both nav (Satchel) and combat (ITEM overlay) contexts.

24. The combat log records each use: `"Healing Bandage Roll — +3 HP (Pip: X→Y) · 2 left"` or equivalent, showing remaining charges.

25. A nav whisper appears when the Bandage Roll is used from the Satchel: `"Pip binds the wound. +3 HP."` (or equivalent in-world phrasing).

### Sourcing summary

26. Each new item is reachable in play through the following sources:

    | Item | Item rooms | Chests | Shops | Boss room |
    |---|---|---|---|---|
    | Grit Stone | ✓ | ✓ | ✓ | — |
    | Second Wind Vial | ✓ | ✓ | ✓ | — |
    | Leather Jerkin | ✗ | ✓ | ✓ | — |
    | Saint's Acorn | ✗ | ✓ (rare) | ✗ | ✓ (rare) |
    | Healing Bandage Roll | ✓ | ✓ | ✓ | — |

### Quality

27. `npm run typecheck` exits with zero errors.

28. `npm run test` passes. New unit tests cover at minimum:
    - Tenacity gate: item unavailable before pip-spend flag set; available after; `itemUsedThisTurn` set on use.
    - Tenacity second-roll: pip totals change to new roll values; enemy HP / turn state unchanged mid-sequence.
    - Passive armour reduction: 3-damage attack reduced to 2; 1-damage attack reduced to 0 (no negative); no `passiveArmour` item → full damage lands.
    - Passive armour replacement: existing item removed before new one added; cancelling leaves old item unchanged.
    - Death prevention: `pipHp` set to 1 (not ≤ 0); item consumed; defeat not triggered; second lethal event with a second prevention item works.
    - Charged item use: `charges` decrements per use; item removed at 0; charge display format distinct from quantity.

---

## Scope / non-goals

- **Weapon coatings** (on-strike window, coating slot, poison ticker) — new data primitive plus status-effect machinery; separate spec.
- **Dice-face manipulation items** (Lock Pin, Pip Splitter, Colour Shift Vial, Mirror Shard) — require mid-allocation dice state access; highest complexity; separate spec.
- **Knowledge/info items** (room preview, trap detection, enemy scouting, floor map) — separate spec; not urgently missing from the current encounter set.
- **Cursed/burden items** — need a warning-UI affordance (red border on acquire) and a new data primitive for downsides; separate spec.
- **Third Luck item** — Lucky Acorn and Rabbit's Foot (already in the catalog from 020/026) cover the Luck class; no new Luck item in this wave.
- **Tenacity items in non-combat (trap/check) contexts** — the concept doc describes a "Grit response" (heal 2 HP post-trap-damage) but this requires a Tenacity interrupt prompt in the trap encounter, which is non-trivial. Deferred to a future item spec or a trap-encounter extension.
- **Equipment section in the Satchel UI** — passive items (Leather Jerkin, Saint's Acorn) appear in the existing Pouch tab with visual treatment; a dedicated "Equipped" compartment is deferred until multiple equipment slots exist.
- **Carrying capacity limits** — deferred per the concept doc until the catalog reaches ~12–15 items.
- **Passive trinket / charm category** — deferred per the concept doc until ~20 distinct items.
- **Charged Satchel display beyond minimum** — charge pips (mini icons per charge) are a nice future enhancement; a simple count badge is sufficient here.

---

## Dependencies

- **048** — `window`, `luckyClass`, `passiveArmour`, `deathPrevention`, `charges` fields on `ItemDefinition`; the passive-armour and death-prevention hooks (stubbed in 048 for implementation here); the `pipsSpentThisTurn` flag (from 046, referenced in 048) for Tenacity gating.
- **020** — item registry, `acquireItem`, `applyItemEffect` pattern.
- **026, 027** — chest and shop item pools that the sourcing constraints in criteria 15 and 19 apply to.

---

## Design detail

### Item catalogue

| Item | Description | Effect | Source | Notes |
|---|---|---|---|---|
| **Grit Stone** | *A smooth dark stone. It helps to have something to hold.* | Second full roll-and-spend (Tenacity) | Rooms, chests, shops | Common; thematic register: determination |
| **Second Wind Vial** | *A bitter draught. Your lungs clear. Go again.* | Second full roll-and-spend (Tenacity) | Rooms, chests, shops | Same mechanic as Grit Stone; different world-flavour |
| **Leather Jerkin** | *A mouse-sized jacket, weathered and patched. Reduces all damage by 1.* | −1 incoming damage per hit (passive, auto, run-long) | Chests, shops | One armour slot; replaces previous armour |
| **Saint's Acorn** | *Pip found this near the stairwell. He's not sure what it is.* | Survive lethal damage at 1 HP (once) | Chests (rare), boss room (rare) | Very rare; one at a time |
| **Healing Bandage Roll** | *Three clean strips of cotton. Good for three wounds.* | +3 HP per charge; 3 charges | Rooms, chests, shops | First charged item in catalog |

### Tenacity window in the ITEM overlay

The Tenacity window (from 046) fires post-spend. In the ITEM overlay, the gating logic is:

```
Player opens ITEM overlay
        │
For each item in satchel:
        │
  window === 'post-spend-tenacity'?
    YES → pipsSpentThisTurn === true AND itemUsedThisTurn === false?
                YES → show active (full opacity, tappable)
                NO  → show greyed (untappable)
    NO  → apply existing gating rules (usableInCombat, itemUsedThisTurn, etc.)
```

After a Tenacity item fires:
1. `itemUsedThisTurn = true` (standard free-action guard from 020 — no further items this turn)
2. Dice pool rerols (full animation)
3. Pip counts reset to new roll totals
4. Player is back in the normal spend phase — action row active, ITEM greyed

The turn ends after this second spend phase. Enemy attack fires as usual.

### Passive armour slot

The `passiveArmour: number` field on an item marks it as auto-reducing armour. It fires at the `on-enemy-hit` window with no player interaction.

**One armour slot:** a run can carry at most one active passive-armour piece. This is enforced at acquisition, not in the data model (the satchel could technically hold two if the check is skipped). The acquiring panel is responsible for detecting a collision and prompting replacement.

**Damage reduction calculation:**

```
enemy attack resolves (damage = N)
        │
passiveArmour item in satchel?
   YES → effective damage = max(0, N − passiveArmour)
   NO  → effective damage = N
        │
pipHp = pipHp − effective damage
```

The passive reduction is silent most of the time — the combat log line records it (criterion 12), but there is no dramatic animation. The Leather Jerkin is felt through its absence of damage, not through a fireworks moment.

**Satchel Pouch display:** Passive armour items appear in the Pouch tab with a "WORN" badge rather than a quantity or charge count. They cannot be tapped to use. Tapping shows the item description in a tooltip or brief overlay (same gesture as inspecting any item). During combat, the Pouch is inaccessible (Satchel blocked during combat — per 016), so no combat-specific passive-item interaction is needed in the Satchel.

### Death prevention flow

```
Enemy attack or damage event resolves
pipHp would be set to ≤ 0
        │
deathPrevention item in satchel?
   NO  → pipHp = 0 → defeat flow (unchanged)
   YES → pipHp = 1
         consume item (remove from satchel)
         show death-prevention notification (see Visual design)
         notification auto-dismisses after ~2.5 s
         combat continues at 1 HP
```

**Input lock:** While the notification is visible, all combat inputs are locked. The game resumes automatically on dismiss — no player action needed to continue.

**Emotional register:** This moment should feel weighty. The notification lingers longer than a normal log entry. The flavour text on the item ("*He's not sure what it is.*") is the mystery; the result ("Pip survives") is the miracle. Do not rush it.

**Sourcing enforcement:** Saint's Acorn is excluded from the item pool passed to item-room and shop generators. The Engineer should implement this as a filter condition — however is cleanest for the existing pool system — rather than hard-coding a room list. A field like `sources: ('item-room' | 'chest' | 'shop' | 'boss')[]` on the item definition is the cleanest approach, but any equivalent is acceptable.

### Charges UI

The `charges` field replaces quantity semantics for charged items. A charged item does not stack quantity — finding a second Healing Bandage Roll while one is in the satchel adds the charges to the existing entry (e.g., `charges: 3` + found another → `charges: 6`), rather than creating a separate entry. This preserves the `acquireItem` stacking behaviour while reading `charges` instead of `quantity`.

The Satchel Pouch and ITEM overlay display:
- Non-charged items: `×N` quantity badge (existing)
- Charged items: `Nc` charge badge where `c` is visually distinct (see Visual design)

### Edge cases

- **Leather Jerkin reduces damage to 0:** Pip takes 0 damage. The combat log line still appears (`"Enemy attacks — 0 damage (blocked)"`) so the player knows the armour fired.
- **Boss or trap attack while Leather Jerkin equipped:** Passive armour applies to all `on-enemy-hit` events — the source (enemy, boss, trap?) doesn't matter. Traps are a dice check with direct HP loss, not an `on-enemy-hit` event — passive armour does NOT reduce trap damage. Only incoming attacks from enemies in the combat encounter are reduced.
- **Saint's Acorn fires during a boss fight:** Same as any combat — combat continues at 1 HP. The boss does not reset.
- **Healing Bandage Roll used at max HP:** Restores 0 HP (capped). Charges still consumed. The log shows `"Pip is already at full health."` — the item is spent even at full HP, which creates a genuine decision: don't waste charges.
- **Tenacity item used, second roll is terrible:** Player may end the turn with no actions taken on the second roll. This is valid — the item was consumed and the second roll was the risk.
- **Acquiring a second Saint's Acorn when one exists in satchel:** Excluded from the candidate pool at generation time (criterion 20), so this should not arise in normal play. If it somehow occurs (debug/testing), `acquireItem` adds charges instead of a second entry — this is harmless since `deathPrevention` fires once per item removal, not per `quantity` or `charges`.

---

## Visual design

### Satchel Pouch — passive items

Passive items (Leather Jerkin, Saint's Acorn) render in the Pouch grid with a "WORN" badge in place of a quantity or charge count. The badge uses a muted amber (`--gold` at reduced opacity or `--text-muted`) to signal it is not a consumable. The item is not tappable for use; tapping shows a brief description overlay.

```
┌──────┐     ┌──────┐
│      │     │      │
│  🥋  │     │  🌰  │
│ WORN │     │ WORN │   ← "WORN" badge; --text-muted, 9px, below icon
└──────┘     └──────┘
Leather      Saint's
Jerkin       Acorn
```

Items with `passiveArmour` also show their reduction value inline:

```
┌──────┐
│  🥋  │
│ −1   │   ← reduction value; --gold, 10px, overlaid bottom-right of icon cell
│ WORN │
└──────┘
```

### Satchel Pouch and ITEM overlay — charged items

Charged items display their remaining charges with a `Nc` format (e.g. `3c`). Use `--gold` for the charge count, same colour as quantity badges, but the `c` suffix distinguishes the display type.

```
Charged item:               Stacked item:
┌──────┐                   ┌──────┐
│      │                   │      │
│  🩹  │                   │  🧀  │
│  3c  │  ← charges        │  ×2  │  ← quantity
└──────┘                   └──────┘
```

**Color tokens:** No new tokens. `--gold` for both charge count and charge suffix glyph.

**Typography/sizing:** Charge badge: `10px monospace`, `--gold`, same sizing as existing quantity badges. "WORN" badge: `9px monospace`, `--text-muted`.

### Death prevention notification

When `deathPrevention` fires, a brief overlay appears at the center of the combat panel, above the action row:

```
┌─────────────────────────────────────┐
│                                     │
│  ✦  Saint's Acorn                   │  ← item icon + name; --gold, 16px wt 600
│     Pip found this near the         │  ← item description; --text-muted, 12px
│     stairwell. He's not sure        │
│     what it is.                     │
│                                     │
│     ── Pip survives at 1 HP ──      │  ← result line; --gold, 14px, centered
│                                     │
└─────────────────────────────────────┘
```

- **Border:** `--gold` (1px or 2px); this is a fortune-register moment, not an alert.
- **Background:** `--surface` with slightly increased opacity so the combat panel is readable behind it.
- **Duration:** ~2.5 seconds; no dismiss control — it auto-clears.
- **Input lock:** all combat inputs disabled while the notification is visible.
- **Tone:** warm and quiet, not dramatic flashing. The weight comes from the text and the pause, not from animation.

**Color tokens:** No new tokens. Uses `--gold`, `--text-muted`, `--surface`.

---

## Open questions

None. This item is **READY**.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** — · **PR:** —
