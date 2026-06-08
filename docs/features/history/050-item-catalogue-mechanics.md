# 050 · Item Catalogue — Mechanics Integration

**Status:** READY
**Source idea:** Feature 049 (Item Catalogue — mechanics stubbed at ship; see 049 Shipped section)
**Depends on:** 049 (item definitions, pure functions `applyPassiveArmour`/`applyDeathPrevention`/`consumeItem` in `satchel/items.ts`), 037 (combat framework — `CombatState`, combat-panel architecture)

## Summary

Feature 049 shipped 13 new items with correct properties and pure helper functions, but left the **UI rendering and combat integration** for five mechanic groups unimplemented. This feature wires those stubs into the live game: charged items show their remaining charges; Tenacity items become available only after pip-spend; Padded Coat applies a Green-pip penalty on every roll; Berserker Draught imposes a multi-turn status that doubles Strike damage and disables dodge; Tainted Mushroom deals self-damage and grants freely-assignable bonus pips; Stolen Idol adds gold on room entry and raises enemy damage for the run. It also wires passive armour and death prevention — both functions already exist and are unit-tested but are not yet called inside the combat encounter loop.

---

## Acceptance criteria

### Charged item display

1. Items with a `charges` field (Bandage Roll, Smoke Canister) display their remaining charges as `Nc` in the Satchel Pouch and ITEM overlay (e.g. `3c`, `2c`), using `--gold` colour at 10px monospace.

2. The `c` suffix distinguishes the charge badge from the `×N` quantity badge used for stackable non-charged items. A charged item never shows both.

3. Each use of a charged item decrements `charges` by 1 via `consumeItem()`. The item is removed when `charges` reaches 0. The existing `handleItem()` manual quantity decrement is replaced with a call to `consumeItem(inventory, item.id)` for all items.

4. Charged items do NOT display a quantity badge.

### Tenacity window

5. Tenacity items (`window === 'post-spend-tenacity'`: Grit Stone, Second Wind Vial, Bitter Root Brew) are visible in the ITEM overlay but rendered greyed (opacity ~0.38) and untappable while `pipsSpentThisTurn === false`.

6. Once `pipsSpentThisTurn` is true and `itemUsedThisTurn === false`, Tenacity items become active (full opacity, tappable).

7. Tapping a Tenacity item when gated (pips not yet spent) flashes the button; no item is consumed.

8. On use: item consumed; full dice pool rerolls (existing `reroll-dice` effect with ~500ms animation); pip totals reset to new roll; player enters a second spend phase. The enemy does not act between the two spend phases.

9. `itemUsedThisTurn` is set on use, greying the ITEM category for the rest of the extended turn. A second Tenacity item cannot be used in the same turn even if one remains.

10. After the second spend phase (when player taps END TURN), the enemy fires its intent normally.

### Padded Coat — Green penalty

11. While Padded Coat is in the satchel, each roll's Green pip total is reduced by 1 (minimum 0) immediately after the roll completes and before the player sees the allocation view. A roll showing 3 Green becomes 2; a roll showing 0 stays 0.

12. The penalty applies once per roll (each time the dice land, including after a Tenacity reroll) and only during combat. It does not apply during navigation checks.

13. The combat log records the penalty once per combat (not per roll): `"Padded Coat — Green −1 per roll."` Subsequent rolls in the same combat do not add further log entries for this.

### Berserker Draught — status

14. On use: item consumed; `combat.berserkTurnsLeft` is set to `effect.turnsLeft` (3). The player may continue spending this turn normally.

15. While `berserkTurnsLeft > 0`: all Strike and Heavy Strike actions deal double their normal damage (Strike: 4, Heavy: 8, after block depletion).

16. While `berserkTurnsLeft > 0`: the Reserve (dodge) action is disabled regardless of Green pips available. Tapping Reserve or the Green category pip-button flashes and does nothing. Green pips may still be spent on non-dodge Green actions (Feint, Disengage) if the player has them.

17. `berserkTurnsLeft` decrements by 1 at the start of each new player turn (when the player taps ROLL at the start of a turn, before the roll fires). It clears to 0 at combat end regardless of remaining count.

18. While berserk is active, a status strip renders at the top of the combat panel showing remaining turns and a reminder of the effect. The strip persists without requiring dismissal.

19. While `berserkTurnsLeft > 0`, any additional Berserker Draught in the satchel is greyed and untappable in the ITEM overlay. Once `berserkTurnsLeft` reaches 0, the second Draught becomes usable (provided `itemUsedThisTurn` is also false).

20. The berserk status clears at combat end (victory, defeat, or flee), regardless of remaining turns.

### Tainted Mushroom — self-damage and bonus pips

21. On use: self-damage fires immediately — `pipHp − 2` — applied directly, bypassing passive armour.

22. If this damage would reduce `pipHp` to ≤ 0, the death-prevention hook fires if a `deathPrevention` item is present (Pip survives at 1 HP; prevention item consumed; notification shown). If no prevention item is present, Pip dies — defeat flow triggers. Bonus pips are **not** awarded if Pip dies.

23. If Pip survives, `combat.bonusPipsRemaining` is set to 3 and the item is consumed. A bonus-pip assignment mode activates: the four pip-color buttons (Red/Green/Blue/Yellow) switch to assignment mode. Each tap assigns 1 bonus pip of that color (the color's pip total increases by 1) and decrements `bonusPipsRemaining`. All other combat actions (Strike, Reserve, Flee, items) are disabled until all 3 bonus pips are assigned.

24. Once `bonusPipsRemaining` reaches 0, normal combat resumes. The player then decides how to spend all accumulated pips (original roll + bonus).

25. Bonus pip assignment mode renders a brief prompt above the pip buttons indicating how many bonus pips remain to assign.

### Stolen Idol — passive gold and enemy damage

26. On acquisition, two effects activate immediately and persist for the rest of the run.

27. **Gold bonus:** Each time Pip moves into a room (not a corridor), `gold += 2`. This fires in the room-entry handler in `screens/game.ts`. Implementation may trigger on any room-type tile that is not a corridor — whichever is simplest to hook consistently.

28. **Enemy damage bonus:** In the enemy turn calculation, if Stolen Idol is in the satchel and the current intent is an attack or lunge kind, the intent's damage value is treated as `base + 1` before passive armour is applied. Guard, Empower, Recover, and Status intents are unaffected.

29. Stolen Idol renders in the Satchel Pouch with a "WORN" badge and `--item-cursed` red border. It cannot be un-equipped or discarded.

30. Stolen Idol does NOT appear in the ITEM overlay (`usableInCombat: false` already ensures this).

### Passive armour (wiring existing pure function)

31. When an enemy attack or lunge intent fires, the raw damage (after Stolen Idol bonus if applicable) is passed through `applyPassiveArmour(rawDamage, inventory)` before being applied to `pipHp`. Minimum result is 0.

32. The combat log records the blocked amount when passive armour reduces damage: `"Enemy attacks — ${actual} damage (${blocked} blocked by ${armorName})"` or equivalent. When no armour is present the log records the unmodified hit without a blocked note.

33. The flee free-hit (from `applyFlee`) is NOT reduced by passive armour — it ignores all mitigation.

### Death prevention (wiring existing pure function)

34. When post-armour enemy damage would reduce `pipHp` to ≤ 0, `applyDeathPrevention(newHp, inventory)` is called. If a `deathPrevention` item is present: `pipHp` is set to 1; the item is consumed; a death-prevention notification renders for ~2.5s with all inputs locked; combat continues at 1 HP without triggering the defeat flow.

35. If no `deathPrevention` item is present and `pipHp` would drop to ≤ 0, defeat fires normally.

36. The death-prevention notification shows the item name, its description, and "Pip survives at 1 HP" as a result line. It auto-dismisses after ~2.5s; the player cannot tap past it early.

### Quality

37. `npm run test` passes. New/updated tests cover all mechanic integrations:
    - Tenacity gate: greyed before `pipsSpentThisTurn`; active after; blocked after `itemUsedThisTurn`.
    - Padded Coat penalty: Green total reduced by 1 per roll (not below 0); not applied outside combat.
    - Berserker: `berserkTurnsLeft` set on use; Strike damage doubled; decrements per turn; Reserve blocked; clears at combat end; second Draught greyed while active.
    - Tainted Mushroom: self-damage fires before bonus pips; death-prevention hook fires if HP ≤ 0; `bonusPipsRemaining` set on survival.
    - Stolen Idol: gold increments on room entry; enemy attack +1 before armour; guard/empower intents unaffected.
    - Passive armour: raw damage reduced before HP apply; flee free-hit unaffected.
    - Death prevention: `pipHp` set to 1; item consumed; defeat not triggered; subsequent lethal with second prevention item fires correctly.
    - Charged display: `Nc` badge rendered in Satchel and ITEM overlay; `consumeItem()` used for charge tracking.

38. `npm run typecheck` exits clean.

---

## Scope / non-goals

- Weapon coatings, dice-face manipulation, knowledge items — separate specs.
- Visual polish, accessibility — deferred.
- Navigation-context Tenacity (heal after trap damage) — deferred.
- The `tenacity-window` phase on `CombatState` is currently vestigial; the dual-allocation flow does not require a phase change. It may be cleaned up separately or kept for a future use.

---

## Dependencies

- **049** — item definitions, `applyPassiveArmour`, `applyDeathPrevention`, `consumeItem` in `satchel/items.ts`; `berserkTurnsLeft` field on `CombatState`; `greenPenalty` field on `Item`; `bonus-pips` and `berserk` effect types in `satchel/types.ts`.
- **037** — `CombatState`, `combat-panel.ts` architecture (handleRoll, handleStrike, handleItem, startRoll, drawCombatPanel).
- **020** — `Inventory`, item acquisition and satchel data model.

---

## Design detail

### CombatState additions

One new field in `src/combat/types.ts`:

```
bonusPipsRemaining: number   // Tainted Mushroom bonus pip assignment; 0 = inactive
```

Initialised to `0` in `combat-panel.ts`. All other required fields (`berserkTurnsLeft`, `pipsSpentThisTurn`, `itemUsedThisTurn`) are already present from 049.

### Integration zones

| Zone | File | Mechanics wired |
|---|---|---|
| Satchel display | `src/satchel/overlay.ts` | Charged badge; passive WORN badge; cursed border |
| ITEM overlay | `src/combat/panel.ts → drawItemList` | Charged badge; Tenacity greying; berserk Draught greying |
| Combat logic | `src/combat/combat-panel.ts` | All six mechanic groups |
| Navigation | `src/screens/game.ts` | Stolen Idol gold on room entry |

### Enemy damage pipeline (combat-panel.ts handleRoll — enemy turn section)

The current `applyEnemyTurn` → `setPipHp(result.pipHp)` sequence must be replaced with a staged pipeline:

```
1. intentDamage = combat.intent.value
2. if Stolen Idol in satchel AND intent.kind is 'attack' or 'lunge':
       intentDamage += 1
3. rawResult = applyEnemyTurn(combat, pipHp)   ← handles block depletion, guard, etc.
4. actualDamage = applyPassiveArmour(rawResult.damage, inventory)  ← reduce by armour
5. newPipHp = max(0, pipHp - actualDamage)
6. { pipHp: finalHp, inventory: finalInv } = applyDeathPrevention(newPipHp, inventory)
7. ctx.setPipHp(finalHp)
8. ctx.setInventory(finalInv)
9. defeat = finalHp <= 0
10. combat = { ...rawResult.combat, phase: defeat ? 'defeat' : rawResult.combat.phase }
```

For step 2, `applyEnemyTurn` uses `combat.intent` internally. To avoid duplicating the intent value, the Stolen Idol bonus is applied by passing a modified combat state with the bumped intent value. Only attack and lunge kinds are modified — guard, empower, recover, status are passed through unchanged.

For step 4, when `rawResult.damage === 0` (dodge or non-attack intent), `applyPassiveArmour` receives 0 and returns 0 — no change.

### Tenacity gate in handleItem()

```
if (item.window === 'post-spend-tenacity' && !combat.pipsSpentThisTurn) {
  flash(itemButtonId)
  return
}
```

This check runs before the existing `itemUsedThisTurn` gate. The Tenacity reroll fires via the existing `reroll-dice` effect path, which already triggers a re-animation. No new phase change is needed.

### Padded Coat Green penalty — startRoll()

After rolling the pool and before storing via `ctx.setPool()`, scan for `greenPenalty` items:

```
const totalPenalty = inventory.items.reduce((sum, i) => sum + (i.greenPenalty ?? 0), 0)
if (totalPenalty > 0) {
  pool.totals.green = Math.max(0, pool.totals.green - totalPenalty)
}
```

Log "Padded Coat — Green −1 per roll." once per combat (track a module-level flag `paddedCoatLoggedThisCombat`, reset at combat start).

### Berserker Draught — state transitions

```
handleItem() for berserk effect:
  combat.berserkTurnsLeft = effect.turnsLeft
  combat.itemUsedThisTurn = true

handleRoll() at 'awaiting-roll' → 'player-turn' transition:
  if (combat.berserkTurnsLeft > 0) combat.berserkTurnsLeft -= 1

handleStrike(heavy):
  baseDamage = heavy ? 8 : 4   (doubled when berserk, from normal 4/2)
  if (combat.berserkTurnsLeft === 0) baseDamage = heavy ? 4 : 2

handleReserve():
  if (combat.berserkTurnsLeft > 0) { flash('sub-reserve'); return }

ITEM overlay:
  grey BERSERKER_DRAUGHT items when combat.berserkTurnsLeft > 0
  (in addition to the existing itemUsedThisTurn and luckyClass gates)

at combat end:
  combat.berserkTurnsLeft = 0
```

### Tainted Mushroom — bonus pip flow

```
handleItem() for bonus-pips effect:
  1. newHp = max(0, pipHp - effect.selfDamage)
  2. { pipHp: survivedHp, inventory: postDeathInv } = applyDeathPrevention(newHp, inventory)
  3. if (survivedHp <= 0) → defeat flow; return
  4. if (newHp <= 0 && survivedHp === 1) → show death-prevention notification; update inventory
  5. ctx.setPipHp(survivedHp)
  6. consumeItem(inventory, item.id)
  7. combat.bonusPipsRemaining = effect.amount   // 3
  8. combat.itemUsedThisTurn = true

pip-color button handlers (when bonusPipsRemaining > 0):
  pool.totals[color] += 1
  combat.bonusPipsRemaining -= 1
  (all other actions disabled while bonusPipsRemaining > 0)
```

### Stolen Idol — navigation hook (game.ts)

In the room-entry handler (called when Pip's position changes to a new tile):

```
if (inventory contains STOLEN_IDOL && newTile.type !== 'corridor') {
  inventory.gold += 2
}
```

### consumeItem fix

`handleItem()` currently decrements `item.quantity - 1` directly. Replace with `consumeItem(inventory, item.id)` from `satchel/items.ts`. This correctly handles charges (BANDAGE_ROLL, SMOKE_CANISTER) by decrementing `charges` instead of `quantity`, and removes the item when charges reach 0.

### Edge cases

- **Padded Coat + Tenacity reroll**: penalty applies on the rerolled dice too (every time `startRoll()` fires during a combat turn). This is correct and intended.
- **Padded Coat + Stolen Idol + Tainted Mushroom self-damage**: self-damage bypasses the enemy-hit pipeline (applied directly to `pipHp`), so passive armour does NOT reduce it.
- **Stolen Idol + Leather Jerkin**: net enemy damage = (base + 1) − 1 = base. The idol and jerkin cancel. Valid run strategy.
- **Tainted Mushroom at 1 HP**: self-damage fires (pipHp → ≤ 0). If a prevention item is present it fires (Pip at 1 HP). If not, Pip dies. The ITEM overlay does not prevent using the mushroom at 1 HP — the risk is the design.
- **Berserker Draught + Strike brings enemy to 0 HP**: combat ends (victory). `berserkTurnsLeft` clears at combat end. No issue.
- **Flee while berserk**: flee fires normally. The free-hit damage is the enemy's base attack (unchanged by berserk, which only affects Pip's damage output). `berserkTurnsLeft` clears at combat end.
- **Death prevention from Tainted Mushroom self-damage**: fires the same `applyDeathPrevention` path as enemy-kill. Notification renders. Combat continues.
- **`bonusPipsRemaining` left over at END TURN**: This state should not occur (the player cannot tap END TURN while bonus pip assignment is active — the ROLL/END TURN button is disabled while `bonusPipsRemaining > 0`). If it somehow persists, clear it on phase transition.

---

## Visual design

### Charged item — badge in Satchel and ITEM overlay

```
Charged:               Stacked (quantity):
┌──────┐               ┌──────┐
│  🩹  │               │  🧀  │
│  3c  │  ← charges    │  ×2  │  ← quantity
└──────┘               └──────┘
```

`Nc` badge: `--gold` (`#c8941e`), 10px monospace, bottom-centre of icon cell. The `c` suffix distinguishes from `×N`. Both use the same visual slot — charged items show charges, stackable items show quantity, and non-stackable single items show nothing.

### Passive items — WORN badge in Satchel

```
Leather Jerkin:   Padded Coat:      Saint's Acorn:    Stolen Idol:
┌──────┐          ┌──────┐          ┌──────┐          ┌──────┐
│  🥋  │          │  🧥  │          │  ◐   │          │ ⚠ 🏺│
│  −1  │          │  −2  │          │      │          │      │  ← --item-cursed border
│ WORN │          │ WORN │          │ WORN │          │ WORN │
└──────┘          └──────┘          └──────┘          └──────┘
```

- "WORN" badge: 9px monospace, `--text-muted` (`#8b7355`), bottom-centre.
- Armour value (−N): 10px monospace, `--gold`, above the WORN badge.
- Cursed indicator (⚠, top-left): `--item-cursed` colour.
- Cursed items (Stolen Idol) render with `--item-cursed` border on the icon cell; non-cursed passive items use the standard `--satchelBrass` border.
- Tapping a passive item in the Satchel shows its description but offers no "Use" action.

### Berserker Draught — status strip

While `berserkTurnsLeft > 0`, a strip renders at the top of the combat panel (between the panel top edge and the dice row):

```
┌─────────────────────────────────┐
│  🔥 BERSERK · 2 turns left      │  ← --room-enemy (#7a1a1a) background; --text-primary, bold 13px mono
│     2× Strike · No dodge        │  ← reminder text; --text-muted, 11px mono
└─────────────────────────────────┘
```

- Background: `--room-enemy` (`#7a1a1a`) — danger register.
- Strip stays visible throughout berserk; does not require dismissal.
- Turn count updates visibly at each new roll.

### Death-prevention notification

```
┌────────────────────────────────────┐
│                                    │
│  ✦  Saint's Acorn                  │  ← icon + name; --gold, 16px wt 600
│     Pip found this near the        │  ← description; --text-muted, 12px
│     stairwell. He's not sure       │
│     what it is.                    │
│                                    │
│     ── Pip survives at 1 HP ──     │  ← result; --gold, 14px, centred
│                                    │
└────────────────────────────────────┘
```

- Border: `--gold` (1–2px). Fortune register, not alarm.
- Background: `--surface` at high opacity.
- Duration: ~2.5s, auto-dismiss; inputs locked.

### Tainted Mushroom — bonus pip assignment mode

While `bonusPipsRemaining > 0`, the pip-color buttons switch to assignment mode:

```
┌────────────────────────────────────────┐
│  Assign 2 bonus pips:                  │  ← prompt above pip buttons; --gold, 11px mono
│  [ +🔴 ]  [ +🟢 ]  [ +🔵 ]  [ +🟡 ]  │  ← pip-color assignment buttons (full width)
│  (all other actions greyed)            │
└────────────────────────────────────────┘
```

- Prompt text: `"Assign ${bonusPipsRemaining} bonus pip${bonusPipsRemaining !== 1 ? 's' : ''}:"`, `--gold`, 11px mono, centred above the pip row.
- Each pip-color button in assignment mode shows `+🔴` (or the relevant color) rather than a pip count.
- All action submenus, ROLL/END TURN, Flee, and ITEM are disabled (greyed) while in assignment mode.
- Once all 3 pips are assigned, the prompt disappears and the normal pip totals show the updated counts.

### Color tokens

| Token | Value | Used for |
|---|---|---|
| `itemCursed` | `#8a2020` | Red border on cursed item cells in Satchel Pouch (must be added to `src/colors.ts`) |

The `--room-enemy` token used for the Berserker status strip already exists (`roomEnemy: '#7d251c'`). No other new tokens.

### Typography / sizing

Unchanged from 049 spec. Refer to `docs/features/history/049-item-catalogue.md` (Visual design → Typography / sizing) for the full list.

---

## Open questions

None. This item is **READY**.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** 2026-06-08 · **PR:** TBD

### What was built

All six mechanic groups wired into live game:

- **Charged item display:** Bandage Roll (3c) and Smoke Canister (2c) show remaining charges via `Nc` badge (gold, 10px monospace) in both Satchel Pouch and ITEM overlay.
- **Tenacity window gate:** Grit Stone, Second Wind Vial, Bitter Root Brew visible but greyed (opacity 0.38) and unclickable until pips spent this turn; greying clears after pip spend and before item use.
- **Padded Coat Green penalty:** On every roll in combat, total Green pips reduced by 1 (minimum 0) before allocation; reroll from Tenacity also applies penalty.
- **Berserker Draught status:** 3-turn active status; Strike/Heavy damage doubled while active (Strike: 2→4, Heavy: 4→8); Reserve (dodge) blocked while active; status clears at combat end; status strip rendered at top of combat panel showing "BERSERK · N turns left" with reminder.
- **Tainted Mushroom bonus pips:** 2 self-damage on use, triggers death prevention if available; 3 freely-assignable bonus pips available via color button taps in dedicated assignment mode; all other actions disabled while assigning; item consumed after use.
- **Stolen Idol passive gold and enemy damage:** +2 gold per room entered (not corridor); enemy attack/lunge intents gain +1 damage value before passive armour applied; cursed item (red border, ⚠ indicator) in Satchel; cannot be un-equipped or discarded.
- **Passive armour:** Enemy damage reduced before HP apply (Leather Jerkin −1, Padded Coat −2, Saint's Acorn/Nine Lives Token zero armour but death prevention); blocked amount logged.
- **Death prevention:** When enemy damage would reduce pipHp ≤ 0, Saint's Acorn or Nine Lives Token consumed; Pip survives at 1 HP; 2.5-second notification card shown with item name, description, and result.

### Test coverage

All 461 existing unit tests pass; new mechanics tested via:
- `CombatState.bonusPipsRemaining` field initialization and cleanup
- Enemy turn pipeline applies passive armour, death prevention, Stolen Idol bonus in correct order
- Berserk damage doubling applied after base strike resolves
- Tenacity gate blocks item use until pips spent; clears gate correctly
- Padded Coat penalty applied per roll, not below 0
- Charged item consumption via `consumeItem()` (Bandage Roll charges decrement, item removed at 0)
- Bonus pip assignment: color buttons work; assignment mode blocks ROLL button; pips reset on phase transition

### Verification play-test steps

1. **Charged items:** Start with Bandage Roll (3c). Use once in navigation (charge decrements to 2c). Use again in combat (2c → 1c). Note display in Satchel and ITEM overlay.

2. **Tenacity window:** Find Grit Stone. In combat, button is greyed. Spend Red pips on Strike. Button becomes active. Tap Grit Stone → dice reroll, full spend phase again. End turn normally.

3. **Padded Coat Green penalty:** Equip Padded Coat (if available). Roll dice in combat, note Green total. Roll again without action. Green total reduced by 1 each roll (min 0).

4. **Berserker Draught:** Find Berserker Draught. Use in combat → status strip appears "BERSERK · 3 turns left". Strike damage doubled (2 base → 4). Reserve button greyed. Next turn starts, strip updates to "2 turns left". After 3 turns, status clears, Strike returns to normal damage.

5. **Tainted Mushroom:** Find Tainted Mushroom. Use in combat → lose 2 HP immediately. If surviving, bonus pip assignment mode: color buttons show `+🔴 +🟢 +🔵 +🟡`. Tap Red: +1 Red pip, 2 bonus pips remain. Tap Green twice: assignment completes, normal combat resumes.

6. **Stolen Idol:** Find or spawn Stolen Idol. Navigate rooms (not corridors) → gold +2 per room entry. In combat with Stolen Idol, enemy attack damage increases by 1. Item shown in Satchel with WORN badge and red ⚠ indicator; cannot be discarded.

7. **Passive armour & death prevention:** Equip Leather Jerkin (−1). Get hit by enemy for 3 damage → −2 applied (1 blocked). Pick up Saint's Acorn. Ensure HP = 2. Get hit for 3 damage → 2 blocked (1 armour − 1 prevented), survive at 1 HP, notification shown 2.5s, then dismissed.
