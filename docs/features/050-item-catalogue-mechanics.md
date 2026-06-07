# 050 · Item Catalogue — Mechanics Integration

**Status:** NEEDS SPEC
**Depends on:** 049 (Item Catalogue item definitions — shipped), 037 (Combat Overhaul — logic framework in place)

## Summary

Feature 049 shipped 13 new items with itemized properties (windows, effects, flags, charges, passives). The item **definitions** are complete and tested. This feature wires the **UI rendering and combat integration** for five mechanics that are currently stubbed or incomplete:

1. **Charged item display** — Bandage Roll (3c), Smoke Canister (2c) show remaining uses in Satchel and ITEM overlay
2. **Tenacity window** — Grit Stone, Second Wind Vial, Bitter Root Brew reroll after any pip-spend; flow with dual allocations
3. **Padded Coat Green penalty** — Each combat roll reduces Green pips by 1 before player allocates
4. **Berserker Draught status** — 3-turn status: 2× Strike damage, dodge disabled, status strip display
5. **Tainted Mushroom & Stolen Idol effects** — Self-damage + bonus pips; passive gold + enemy damage bonus

These are rendering and integration concerns, not new item definitions. The items themselves are shipped; this feature makes them *play*.

---

## Acceptance Criteria

### Charged Items Display

1. Items with a `charges` field (Bandage Roll, Smoke Canister) display charges as `Nc` in the Satchel Pouch and ITEM overlay, where `N` is the remaining number (e.g. `3c`, `1c`).

2. Charge display uses 10px monospace font, `--gold` colour, and the `c` suffix to distinguish from `×N` quantity indicators.

3. Each use of a charged item decrements `charges` by 1. Item is removed when `charges` reaches 0.

4. Charged items do NOT display a quantity badge or `×` indicator — only charges or nothing.

### Tenacity Window

5. Tenacity items (Grit Stone, Second Wind Vial, Bitter Root Brew) only become usable after `pipsSpentThisTurn` is true.

6. While `pipsSpentThisTurn === false`, Tenacity items render greyed and are untappable.

7. Once any pip-spend action fires and `itemUsedThisTurn === false`, Tenacity items become active.

8. Tapping a Tenacity item: consume it, reroll the dice pool, reset pip totals, player enters second spend phase.

9. After the second spend sequence, the turn ends normally and the enemy attacks.

10. `itemUsedThisTurn` is set, preventing a second Tenacity use this turn.

11. A second Tenacity item cannot be used in the same turn, even if one remains in the satchel.

### Padded Coat Green Penalty

12. While Padded Coat is in the satchel, each combat roll's Green total is reduced by 1 (minimum 0) **after** roll but **before** allocation UI renders.

13. A roll showing 3 Green becomes 2; a 0 stays 0.

14. The penalty applies once per roll and persists until combat ends. Does NOT apply outside combat.

15. The combat log records the penalty once per combat: `"Padded Coat — Green −1 per roll."`

### Berserker Draught Status

16. On use, set `berserkTurnsLeft: 3` on CombatState.

17. While `berserkTurnsLeft > 0`, all Strike and Heavy Strike actions deal 2× damage.

18. While active, Green pip reservation is **disabled**. Players can spend Green on non-dodge actions (Feint, Disengage) but cannot reserve for dodge.

19. `berserkTurnsLeft` decrements by 1 at the start of each new player turn.

20. Status clears when it reaches 0 or combat ends.

21. While active, a status indicator strip renders at combat panel top showing remaining turns and reminder text.

22. A second Draught is greyed while berserk is active, becomes usable once berserk clears.

### Tainted Mushroom Self-Damage & Bonus Pips

23. On use: self-damage fires immediately (pipHp − 2), applied directly (passive armour does NOT reduce it).

24. If `pipHp ≤ 0`, the death-prevention hook fires if available. If not, Pip dies.

25. Otherwise, +3 bonus pips are added to the allocation pool, freely assigned by player. Item is consumed.

### Stolen Idol Passive Gold & Enemy Damage

26. On acquisition, two effects activate immediately and persist for the run.

27. **Gold bonus:** Each room entry, `gold += 2`. Hooks into existing room-entry event.

28. **Enemy damage bonus:** All enemy attacks deal +1 additional damage. Calculation: (base + 1) − armour = final damage.

29. Appears in Satchel with "WORN" badge and `--item-cursed` red border. Cannot be un-equipped.

30. Does NOT appear in ITEM overlay. Interaction case: Stolen Idol + Leather Jerkin cancel (both effects) = valid strategy.

---

## Quality

31. `npm run test` passes. New/updated tests cover all five mechanics.
32. `npm run typecheck` exits clean.
33. All user-facing text uses consistent tone per design brief.

---

## Scope / Non-Goals

- Weapon coatings, dice-face manipulation, knowledge items — separate specs
- Visual polish, accessibility — deferred phases

---

> The section below is filled in by the **Engineer** when the feature ships.

## Shipped

**Date:** — · **PR:** —
