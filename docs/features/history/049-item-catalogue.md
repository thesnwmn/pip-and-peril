# 049 · Item Catalogue

**Status:** READY
**Source idea:** Idea 045 (`IDEAS.md`)
**Depends on:** 048 (Item Interjection Framework — window/luckyClass/passiveArmour/deathPrevention/charges fields and hooks)

## Summary

Pip's satchel gains thirteen new items that collectively exercise every hook and field stubbed in feature 048 and extend the run strategy space in four directions that don't exist yet. Two Tenacity items and a third variant fill the post-spend window that's been live since 046 with no items. One additional Luck item joins the existing two for better run coverage. Two passive armour pieces introduce the run-long equipment slot and a genuine trade-off tier. Two death-prevention talismans exercise the death hook and increase the chance a run carries one. Two charged items prove the charges mechanic end-to-end. Three cursed/burden items introduce risk/reward choices with a new visual affordance and two new status mechanics. Together these bring the total catalogue to ~21 items — enough variety to feel like a real loot game — while leaving weapon coatings, dice-face manipulation, and knowledge/info items to their own focused specs.

---

## Acceptance criteria

### Item definitions

1. Thirteen new item constants are exported from the item catalog module:

   | Constant | Name | window | luckyClass | usableInNav | usableInCombat | cursed |
   |---|---|---|---|---|---|---|
   | `GRIT_STONE` | Grit Stone | `post-spend-tenacity` | false | false | true | false |
   | `SECOND_WIND_VIAL` | Second Wind Vial | `post-spend-tenacity` | false | false | true | false |
   | `BITTER_ROOT_BREW` | Bitter Root Brew | `post-spend-tenacity` | false | false | true | false |
   | `FORTUNE_PEBBLE` | Fortune Pebble | `on-roll-luck` | **true** | false | true | false |
   | `LEATHER_JERKIN` | Leather Jerkin | `on-enemy-hit` | false | false | false | false |
   | `PADDED_COAT` | Padded Coat | `on-enemy-hit` | false | false | false | false |
   | `SAINTS_ACORN` | Saint's Acorn | — (death hook) | false | false | false | false |
   | `NINE_LIVES_TOKEN` | Nine Lives Token | — (death hook) | false | false | false | false |
   | `BANDAGE_ROLL` | Healing Bandage Roll | `post-damage` | false | true | true | false |
   | `SMOKE_CANISTER` | Smoke Canister | `during-allocation` | false | false | true | false |
   | `TAINTED_MUSHROOM` | Tainted Mushroom | `during-allocation` | false | false | true | **true** |
   | `STOLEN_IDOL` | Stolen Idol | — (passive) | false | false | false | **true** |
   | `BERSERKER_DRAUGHT` | Berserker Draught | `during-allocation` | false | false | true | **true** |

2. All three Tenacity items have `window: 'post-spend-tenacity'`, `luckyClass: false`, `usableInCombat: true`, `usableInNav: false`.

3. `FORTUNE_PEBBLE` has `window: 'on-roll-luck'`, `luckyClass: true`. Its behaviour is identical to Lucky Acorn (full pool reroll): it is eligible for the Luck interrupt prompt (non-combat checks) and the combat Luck window (pre-spend reroll), exactly as defined in 048.

4. `LEATHER_JERKIN` has `passiveArmour: 1`. `PADDED_COAT` has `passiveArmour: 2` and `greenPenalty: 1`. Both have `usableInCombat: false`, `usableInNav: false` (passive; auto-fires).

5. `SAINTS_ACORN` and `NINE_LIVES_TOKEN` both have `deathPrevention: true`, `usableInCombat: false`, `usableInNav: false` (passive; auto-fires at death).

6. `BANDAGE_ROLL` has `charges: 3`, effect `heal, amount: 3`, `usableInCombat: true`, `usableInNav: true`.

7. `SMOKE_CANISTER` has `charges: 2`, effect `flee-combat`, `usableInCombat: true`, `usableInNav: false`. Behaves identically to Smoke Pellet on each use (ends combat, marks tile `fled`, resumes nav) but the item persists until charges run out.

8. All three cursed items have `cursed: true`. The per-item effects are specified in criteria 29–37 below.

### Cursed item visual

9. Any item with `cursed: true` renders with a distinct visual treatment in every panel that offers or displays it — item room, chest, shop, and Satchel Pouch. The signal is a red border on the item icon cell, using color token `--item-cursed`, and a small warning indicator (skull glyph or ⚠ symbol) overlaid in the top-left of the icon cell. See Visual design.

10. The acquiring panel (item room, chest, shop) shows the downside visually before the player commits. The item's `description` field carries the full in-world description including the cost. No separate "warning text" field is required — the description text and the cursed visual signal together are sufficient.

11. In the Satchel Pouch, cursed items in the satchel retain the `--item-cursed` red border as a persistent reminder that the burden is active (relevant for passive cursed items like Stolen Idol).

### Tenacity items in combat

12. Tenacity items (`window: 'post-spend-tenacity'`) appear in the ITEM overlay during combat but render greyed and untappable until at least one pip-spend action has been taken this turn (gated by the `pipsSpentThisTurn` flag from 046, the same flag 048 uses inversely to grey Luck items).

13. Once any pip-spend action is taken and no item has been used this turn (`itemUsedThisTurn === false`), Tenacity items become active (full opacity, tappable).

14. Tapping a Tenacity item: the item is consumed; the full dice pool rolls again (~500 ms animation); pip counts reset to the new roll's totals; the player may take pip-spend actions again. The enemy does not attack between the two spend sequences. `itemUsedThisTurn` is set, greying ITEM for the rest of the extended turn.

15. After the second spend sequence the turn ends normally; enemy attack fires as usual.

16. A second Tenacity item cannot be used in the same turn even if one remains in the satchel (`itemUsedThisTurn` blocks it).

### Passive armour

17. When `pipHp` would be reduced by an enemy attack and the satchel contains an item with `passiveArmour > 0`, incoming damage is reduced by that value before being applied. Damage cannot go below 0.

18. The passive reduction fires automatically; neither Leather Jerkin nor Padded Coat appears in the ITEM overlay.

19. **Padded Coat Green penalty:** While Padded Coat is in the satchel, every combat roll has its Green pip total reduced by 1 (minimum 0) before the player allocates. A roll showing 3 Green pips is treated as 2. A roll showing 0 remains 0. This fires automatically after each roll with no player action. The combat log records it once per combat (not per turn): `"Padded Coat — Green −1 per roll."` This penalty does not apply during navigation or non-combat checks.

20. The combat log records armour reduction on each enemy hit: `"Enemy attacks — 1 damage (2 blocked by Padded Coat)"` or equivalent.

21. Acquiring a passive-armour item when no other is present adds it normally via `acquireItem`.

22. Acquiring a passive-armour item (any item with `passiveArmour > 0`) when one is already in the satchel: the acquiring panel shows a replace prompt — `"Replace [current armour name]?"` — before completing the transaction. Confirming removes the old item and adds the new one. Declining cancels the acquisition; the existing armour stays. The discarded armour is lost.

23. Leather Jerkin and Padded Coat are available in chest and shop pools. Neither appears in item-room pools.

### Death prevention

24. At the moment `pipHp` would be set to ≤ 0, if the satchel contains a `deathPrevention: true` item: `pipHp` is set to 1; the item is removed; a death-prevention notification renders (see Visual design) and auto-dismisses after ~2.5 s; all inputs are locked during the notification; the defeat flow does NOT trigger; combat continues at 1 HP.

25. If no `deathPrevention: true` item is present, the existing defeat flow is unchanged.

26. If multiple `deathPrevention: true` items are in the satchel, only the first (by satchel order) fires. The remaining items stay for subsequent lethal events.

27. Both Saint's Acorn and Nine Lives Token are available in chest pools (weighted rare) and boss-room reward pools only. Neither appears in item-room pools or shop pools. When generating an item and the satchel already contains a `deathPrevention: true` item, both are excluded from the candidate pool.

### Charged items

28. Charged items (have a `charges` field) display their remaining charges as `Nc` in the Satchel Pouch and ITEM overlay (e.g. `3c`, `2c`), distinct from the `×N` quantity badge used for stacked non-charged items.

28a. Each use of `BANDAGE_ROLL` decrements `charges` by 1, restores 3 HP (capped at `pipMaxHp`), and logs the result including remaining charges. Item removed at `charges: 0`.

28b. Each use of `SMOKE_CANISTER` decrements `charges` by 1 and fires the flee-combat effect (identical to Smoke Pellet: end combat, mark tile `fled`, resume nav). Item removed at `charges: 0`.

28c. Acquiring a second charged item of the same type while one is already in the satchel adds the new item's charges to the existing entry rather than creating a second entry (e.g., `BANDAGE_ROLL` at `charges: 2` + found another → `charges: 5`).

### Cursed item effects

29. **Tainted Mushroom** — `during-allocation` window; `cursed: true`. On use: immediately deal 2 damage to Pip (before any action this turn; can reduce Pip to 0 HP — see criterion 30); then add 3 bonus pips of any colour to this turn's allocation pool. The player assigns the 3 pips freely across any colour. The item is consumed on use. Usable only in combat.

30. If the 2 self-damage from Tainted Mushroom would reduce `pipHp` to ≤ 0 and a `deathPrevention` item is present, the death-prevention hook fires (Pip survives at 1 HP, prevention item consumed) before the bonus pips are applied. If no prevention item is present, Pip dies — the run ends. This is a real risk; the player is warned by the cursed visual and description text.

31. **Stolen Idol** — passive run-long modifier; `cursed: true`. While in the satchel: (a) each time Pip enters any room (not corridors re-entered, only first entry or re-entry to a previously cleared room — whichever is simpler for the Engineer to implement consistently), `gold` increases by 2; (b) all enemy attacks deal +1 additional damage (applied before passive armour reduction). The idol appears in the Satchel with "WORN" + the `--item-cursed` red border. It cannot be un-equipped or discarded — once acquired, the burden and bonus persist for the run. The item does NOT appear in the ITEM overlay.

32. **Berserker Draught** — `during-allocation` window; `cursed: true`. On use: the item is consumed; a `berserkTurnsLeft: 3` status is applied to CombatState. For each turn where `berserkTurnsLeft > 0`: all Strike actions deal double the normal damage; Green pip reservation for dodge (the 2G full dodge and 1G partial dodge mechanic from 037) is unavailable — pips may still be spent on non-dodge Green actions (Feint, Disengage), but the dodge reserve cannot be set. `berserkTurnsLeft` decrements by 1 at the start of each new player turn. The status clears when it reaches 0 or when the combat ends, whichever comes first.

33. During berserk, the combat UI renders a visible status indicator showing the remaining berserk turns (see Visual design).

34. A second Berserker Draught cannot be used while `berserkTurnsLeft > 0` (item appears greyed in the ITEM overlay even if `itemUsedThisTurn` is false, while berserk is active).

### Passive items in the Satchel

35. Passive items (`usableInCombat: false`, `usableInNav: false`, with `passiveArmour`, `deathPrevention`, or no tappable use) appear in the Satchel Pouch with a "WORN" badge in place of a quantity or charge count. Tapping a passive item shows a brief description but offers no "Use" action. They do not appear in the ITEM overlay.

36. Cursed passive items (Stolen Idol) additionally show the `--item-cursed` red border in the Satchel Pouch as a persistent reminder.

### Sourcing summary

37. Each new item is reachable through the following sources:

    | Item | Item rooms | Chests | Shops | Boss room |
    |---|---|---|---|---|
    | Grit Stone | ✓ | ✓ | ✓ | — |
    | Second Wind Vial | ✓ | ✓ | ✓ | — |
    | Bitter Root Brew | ✓ | ✓ | ✓ | — |
    | Fortune Pebble | ✓ | ✓ | ✓ | — |
    | Leather Jerkin | ✗ | ✓ | ✓ | — |
    | Padded Coat | ✗ | ✓ | ✓ | — |
    | Saint's Acorn | ✗ | ✓ (rare) | ✗ | ✓ (rare) |
    | Nine Lives Token | ✗ | ✓ (rare) | ✗ | ✓ (rare) |
    | Healing Bandage Roll | ✓ | ✓ | ✓ | — |
    | Smoke Canister | ✓ | ✓ | ✓ | — |
    | Tainted Mushroom | ✓ | ✓ | ✓ | — |
    | Stolen Idol | ✗ | ✓ | ✗ | — |
    | Berserker Draught | ✓ | ✓ | ✓ | — |

### Quality

38. `npm run typecheck` exits with zero errors.

39. `npm run test` passes. New unit tests cover at minimum:
    - Tenacity gate: greyed before `pipsSpentThisTurn`; active after; `itemUsedThisTurn` set on use; second Tenacity item blocked same turn.
    - Fortune Pebble: treated as Luck-class in all contexts (Luck interrupt eligible, combat pre-spend window).
    - Leather Jerkin: damage reduced by 1; cannot go negative.
    - Padded Coat: damage reduced by 2; Green pip total reduced by 1 per roll (not below 0); penalty not applied outside combat.
    - Passive armour replacement: old item removed, new item added; declining cancels.
    - Death prevention: `pipHp` set to 1; item consumed; defeat not triggered; second lethal event with remaining item fires.
    - Charged item use: `charges` decrements per use; removed at 0; second of same type adds charges to existing entry.
    - Tainted Mushroom: 2 self-damage fires before bonus pips applied; death-prevention hook fires if `pipHp` would reach 0.
    - Stolen Idol: gold increments on room entry; enemy damage +1 applied before armour reduction.
    - Berserker Draught: Strike damage doubled while `berserkTurnsLeft > 0`; dodge reserve unavailable; counter decrements per turn; clears at combat end.

---

## Scope / non-goals

- **Weapon coatings** (on-strike window, coating slot, poison/status effects per strike) — new subsystem; separate spec.
- **Dice-face manipulation items** (Lock Pin, Pip Splitter, Colour Shift Vial, Mirror Shard) — require mid-allocation dice state access; separate spec.
- **Knowledge / info items** (room preview, trap detection, enemy scouting, floor map reveal) — deferred to their own spec; blocked on the map-drawing approach decision, which affects how these items read and display map state.
- **Pre-roll pip adders** (Focused Mushroom, Beetleroot Brew) — the `pre-roll` window is defined in 048; these items need more design work on the pre-roll UX (when exactly can the player activate before rolling?) and are deferred.
- **Whetstone / die-type upgrades** — temporarily swapping a die to a d8 interacts with the meta-progression die-type model (029, not yet built). Deferred until die types are tracked in player state.
- **Tenacity items in non-combat (trap) contexts** — the concept doc envisions a Grit response (heal after trap damage) but this requires a Tenacity interrupt prompt in the trap encounter; deferred.
- **Carrying capacity limits** — deferred until the catalog reaches ~12–15 items (per concept doc); the items here bring total catalog to ~21, so the Planner should flag this for an upcoming spec.
- **Passive trinket / charm category** — explicitly deferred in the concept doc until ~20 items exist; the catalog now reaches that threshold, but trinkets are their own design space and should be a dedicated spec.
- **Un-equipping items or discarding passives** — once acquired, passive items (Leather Jerkin, Stolen Idol, etc.) stay for the run. No discard mechanic in this spec.
- **Frantic Scrawl** (cursed item that reveals floor map) — touches knowledge/map territory; deferred to Spec D.

---

## Dependencies

- **048** — `window`, `luckyClass`, `passiveArmour`, `deathPrevention`, `charges`, `luckyClass` fields; passive-armour and death-prevention hooks (stubbed in 048, implemented here); `pipsSpentThisTurn` flag for Tenacity gating.
- **020** — item registry, `acquireItem`, item catalog module.
- **026, 027** — chest and shop item pools that the sourcing constraints apply to.

---

## Design detail

### Item catalogue

| Item | Flavour description | Effect | Thematic register |
|---|---|---|---|
| **Grit Stone** | *A smooth dark stone. It helps to have something to hold.* | Second roll-and-spend | Determination |
| **Second Wind Vial** | *A bitter draught. Your lungs clear. Go again.* | Second roll-and-spend | Endurance |
| **Bitter Root Brew** | *Whatever it is, it works.* | Second roll-and-spend | Desperation |
| **Fortune Pebble** | *A smooth grey river pebble. Just feels right.* | Full pool reroll (Luck-class) | Mouse superstition |
| **Leather Jerkin** | *A mouse-sized jacket, weathered and patched. Reduces all damage by 1.* | Passive −1 damage | Equipment |
| **Padded Coat** | *Heavy padding, stitched for a mouse. Slows you down.* | Passive −2 damage; Green −1 per roll | Trade-off equipment |
| **Saint's Acorn** | *Pip found this near the stairwell. He's not sure what it is.* | Survive lethal damage at 1 HP | Extraordinary luck |
| **Nine Lives Token** | *Pip found this near a cat. Somehow that feels right.* | Survive lethal damage at 1 HP | Borrowed time |
| **Healing Bandage Roll** | *Three clean strips of cotton. Good for three wounds.* | +3 HP × 3 charges | Preparation |
| **Smoke Canister** | *A larger pellet. Two escapes, if it comes to it.* | Flee-combat × 2 charges | Escape |
| **Tainted Mushroom** | *+3 bonus pips this turn. It tastes wrong. 2 damage on use.* | +3 any pips; 2 self-damage | Risk / reward |
| **Stolen Idol** | *+2 gold per room entered. The dungeon's inhabitants want it back.* | +2 gold/room; enemies +1 damage | Long-run burden |
| **Berserker Draught** | *Double strike damage for 3 turns. No dodging.* | 2× Strike for 3 turns; dodge disabled | All-in aggression |

### Tenacity window in the ITEM overlay

```
Player turn starts
        │
Pip-spend action taken?
   NO  → Tenacity items: greyed in ITEM overlay, untappable
   YES → Tenacity items: active (if itemUsedThisTurn === false)
        │
Player taps Tenacity item
        │
Item consumed → itemUsedThisTurn = true
Dice pool rerols (animation ~500ms)
Pip counts reset to new roll totals
Player in second spend phase (action row active, ITEM greyed)
        │
Second spend phase ends (END TURN or player chooses to stop)
        │
Enemy attack fires normally
```

### Passive armour slot

One armour slot per run. Armour auto-reduces all incoming enemy attack damage. Padded Coat additionally suppresses 1 Green pip per roll — the armour's bulk limits agility. This penalty fires immediately after each roll is computed, before the player sees the allocation view.

**Damage calculation with Stolen Idol active:**
```
base enemy damage
+ Stolen Idol bonus (+1)          ← run-long modifier from cursed item
− passiveArmour value             ← Leather Jerkin or Padded Coat
= clamped to minimum 0
= applied to pipHp
```

The Stolen Idol bonus is additive with enemy base damage; passive armour reduction comes after. A 2-damage attack + Stolen Idol against Leather Jerkin: (2+1)−1 = 2 actual damage. This ordering matters for the tuning feel.

### Death prevention flow

```
Enemy damage event → pipHp would reach ≤ 0
        │
deathPrevention item in satchel?
   NO  → defeat flow (unchanged)
   YES → pipHp = 1
         item removed from satchel
         death-prevention notification (2.5 s, inputs locked)
         combat continues at 1 HP
```

Both Saint's Acorn and Nine Lives Token behave identically. The second item in satchel order fires on a subsequent lethal event in the same run.

### Cursed item mechanics

**Tainted Mushroom (single-use combat):**

```
Player taps TAINTED_MUSHROOM in ITEM overlay
        │
self-damage fires (pipHp − 2)
        │
pipHp ≤ 0?
   YES → death-prevention hook fires (if available); else defeat
   NO  → +3 bonus pips added to current allocation pool
         player assigns pips freely across any colour
         item consumed
```

The self-damage can kill. This is intentional. The description makes the cost explicit. Players choosing to use a Tainted Mushroom at low HP are accepting a real risk.

**Stolen Idol (passive, run-long):**

The idol's two effects activate immediately on acquisition and persist for the rest of the run. It cannot be removed.

- Gold bonus: fires on each first entry to a room (the trigger is room-entry, not tile-placement). Implementation may use the same hook as the existing enemy-room entry trigger — whatever is cleanest.
- Damage bonus: applies in the damage calculation described above (before armour, after base damage).

The Stolen Idol does not appear in item rooms or shops — it is a chest-only find. The player chose to open the chest; finding the idol is the consequence.

**Berserker Draught (multi-turn combat status):**

`berserkTurnsLeft` is a new field on `CombatState`, initialised to 0. On Draught use it is set to 3. It decrements by 1 at the start of each new player turn (when ROLL fires). It clears to 0 at combat end.

While active:
- Strike damage is doubled (multiplied before any armour on the enemy side applies)
- The dodge reserve mechanic (2G full dodge, 1G partial — from 037) is disabled. Pips can still be spent on Feint and Disengage (non-dodge Green actions) if the player has Green pips
- Green pips cannot be reserved; any unspent Green pips at END TURN are wasted as normal

A second Draught in the satchel: greyed in the ITEM overlay while `berserkTurnsLeft > 0` (regardless of `itemUsedThisTurn`). Can be used once berserk clears.

### Passive items in the Satchel Pouch

Passive items (those with `usableInCombat: false` and `usableInNav: false`) render in the Pouch grid with a "WORN" badge. The armour value is shown inline for armour pieces. Tapping opens a brief description but offers no Use action. They do not appear in the ITEM overlay.

Passive cursed items (Stolen Idol) retain the `--item-cursed` red border in the Pouch as a persistent reminder.

### Edge cases

- **Leather Jerkin at 1-damage attack:** damage reduced to 0; Pip takes no damage. Log records the block.
- **Padded Coat vs 0 Green roll:** penalty applied; result stays 0 (not −1).
- **Padded Coat + Stolen Idol + Tainted Mushroom self-damage:** self-damage is not an enemy attack — passive armour does NOT reduce it. (Self-damage is applied directly to `pipHp`, bypassing the `on-enemy-hit` path.)
- **Stolen Idol + Leather Jerkin:** damage calculation is (base + 1) − 1 = base. The idol and jerkin cancel. This is a valid run strategy: find both and the idol's damage burden disappears. Worth preserving as an interaction.
- **Berserker Draught + Strike at 0 enemy HP:** combat ends normally mid-berserk; `berserkTurnsLeft` clears. No issue.
- **Two armour pieces:** replacement prompt fires. Player confirms → old removed, new added. Declining cancels the acquisition regardless of which panel is active.
- **Saint's Acorn during a trap event:** the death-prevention hook fires at `pipHp ≤ 0` regardless of context. If a trap deals lethal damage and a prevention item is present, Pip survives at 1 HP. This is correct and intended.
- **Tainted Mushroom when Pip is at 1 HP:** self-damage fires (pipHp → ≤ 0). If a prevention item is present it fires. If not, Pip dies. The ITEM overlay does not prevent using the mushroom at low HP — the risk is the design.
- **Smoke Canister on a fled tile (re-entering a fled room):** same as Smoke Pellet — flee fires, tile already `fled`, no state regression.

---

## Visual design

### Satchel Pouch — passive items

Passive items render in the Pouch grid with a "WORN" badge in place of a quantity or charge count. The `--text-muted` colour distinguishes the badge from the `--gold` quantity/charge badges.

Armour pieces additionally show their reduction value at the top-right of the icon cell:

```
┌──────┐   ┌──────┐
│ ⚠ 🥋│   │ ⚠ 🧥│   ← ⚠ = cursed indicator (top-left, --item-cursed); absent on non-cursed
│  −1  │   │  −2  │   ← armour value (top-right, --gold, 10px)
│ WORN │   │ WORN │   ← WORN badge (bottom, --text-muted, 9px)
└──────┘   └──────┘
Leather     Padded
Jerkin      Coat
```

Stolen Idol in Pouch:
```
┌──────┐
│ ⚠ 🏺│   ← cursed indicator + icon
│      │
│ WORN │   ← WORN badge; --item-cursed red border around cell
└──────┘
Stolen Idol
```

### Satchel Pouch and ITEM overlay — charged items

```
Charged:               Stacked (quantity):
┌──────┐               ┌──────┐
│  🩹  │               │  🧀  │
│  3c  │  ← charges    │  ×2  │  ← quantity
└──────┘               └──────┘
```

`3c` uses `--gold`, 10px monospace. The `c` suffix distinguishes from `×N` quantity.

### Cursed item — acquisition warning

In the item room panel, chest loot panel, and shop: an item with `cursed: true` shows a red border on its icon cell and a small ⚠ (or skull) indicator in the top-left of the cell. The item's description field includes the cost in plain language. No separate warning modal — the visual and description together are sufficient.

```
Item room pedestal (standard):       Item room pedestal (cursed):
┌──────────────────┐                 ┌──────────────────┐
│  ┌──────┐        │                 │  ┌──────┐        │
│  │      │        │                 │  │⚠     │        │
│  │  🍄  │        │                 │  │  🍄  │        │ ← --item-cursed border
│  │      │        │                 │  │      │        │
│  └──────┘        │                 │  └──────┘        │
│  Healing Item    │                 │  Tainted Mushroom│
│  Restores HP.    │                 │  +3 pips. 2 dmg. │
│  [Take] [Leave]  │                 │  [Take] [Leave]  │
└──────────────────┘                 └──────────────────┘
```

### Berserker Draught — berserk status indicator

While `berserkTurnsLeft > 0`, a status strip appears at the top of the combat panel (same zone as where 046's enemy-intent display lives, or immediately below it):

```
┌─────────────────────────────────┐
│  🔥 BERSERK · 2 turns left      │  ← --room-enemy (#7a1a1a) background strip
│     2× Strike · No dodge        │  ← reminder of effect; --text-primary, 11px
└─────────────────────────────────┘
```

- Background: `--room-enemy` (`#7a1a1a`) — danger register; the player should feel the risk.
- The strip is always visible while berserk is active; it does not need to be dismissed.
- "Turns left" decrements visibly at each new roll.

### Death prevention notification

```
┌─────────────────────────────────────┐
│                                     │
│  ✦  Saint's Acorn                   │  ← icon + name; --gold, 16px wt 600
│     Pip found this near the         │  ← description; --text-muted, 12px
│     stairwell. He's not sure        │
│     what it is.                     │
│                                     │
│     ── Pip survives at 1 HP ──      │  ← result; --gold, 14px, centered
│                                     │
└─────────────────────────────────────┘
```

- Border: `--gold` (1–2px). Fortune register, not alarm.
- Background: `--surface` at high opacity.
- Duration: ~2.5 s, auto-dismiss; inputs locked during display.

### Color tokens

| Token | Value | Used for |
|---|---|---|
| `--item-cursed` | `#8a2020` | Red border on cursed item cells; distinct from `--room-enemy` (`#7a1a1a`) to avoid confusion with enemy-room borders |

**Typography / sizing**
- "WORN" badge: `9px monospace`, `--text-muted`
- Armour value badge: `10px monospace`, `--gold`
- Charge count badge: `10px monospace`, `--gold` (same as quantity badge; suffix `c` distinguishes)
- Berserk strip label: `bold 13px monospace`, `--text-primary`
- Berserk strip sub-line: `11px monospace`, `--text-muted`

---

## Open questions

None. This item is **READY**.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** 2026-06-07 · **PR:** `claude/item-catalogue-AzdfS`

**What was built:** All 13 new items with correct properties (windows, effects, charges, passive armour, death-prevention, cursed flags). Item definitions exported from catalog module. Shop and item-room sourcing constraints enforced. Charged item combining fixed (charges properly combine when acquiring duplicates).

**Test coverage:** 461 tests pass (449 existing + 12 new). Tests cover all 13 items, item properties, passive armour, death-prevention, charged mechanics, shop sourcing constraints, and item-room sourcing constraints.

**Verification:** Dev server started, app builds clean (105.21 kB), typecheck passes, all tests green.

**Remaining work:** UI rendering and combat integration for five mechanics (feature 050):
- Charged item display (`Nc` rendering in overlays)
- Tenacity dual-allocation UI flow
- Padded Coat Green penalty application
- Berserker Draught status strip and damage doubling
- Tainted Mushroom self-damage and bonus pips
- Stolen Idol passive gold and enemy damage bonus

These mechanics are currently stubbed in code; feature 050 wires them into the UI and combat logic.
