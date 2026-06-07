# 050 · Item Catalogue — Mechanics Integration

**Status:** NEEDS SPEC
**Source ideas:** 075–080 (charged UI rendering, Tenacity window, Padded Coat penalty, Berserker status, Tainted Mushroom self-damage, Stolen Idol passives)
**Depends on:** 049 (Item Catalogue item definitions — shipped), 037 (Combat Overhaul — logic framework already in place)

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

2. Charge display uses 10px monospace font, `--gold` colour (same as quantity badges), and the `c` suffix to distinguish from `×N` quantity indicators.

3. Each use of a charged item decrements `charges` by 1. Item is removed from satchel when `charges` reaches 0. Display updates immediately to reflect remaining uses.

4. Charged items do NOT display a quantity badge or `×` indicator — only charges or nothing.

### Tenacity Window

5. Tenacity items (Grit Stone, Second Wind Vial, Bitter Root Brew) have `window: 'post-spend-tenacity'` and only become usable after `pipsSpentThisTurn` is true.

6. While `pipsSpentThisTurn === false`, Tenacity items render greyed (low opacity, 40–50%) and are untappable in the ITEM overlay.

7. Once any Red pip-spend action fires (Strike, Heavy Strike, Exploit, Lucky Shot, Shove, etc.) and `itemUsedThisTurn === false`, Tenacity items become active (full opacity, tappable).

8. Tapping a Tenacity item: the item is consumed (decrements quantity or charges), the dice pool rerols with ~500ms roll animation, pip counts reset to the new roll's totals.

9. After reroll, the player enters a second pip-spend phase on the same turn. The dice pool is now rolling; the ITEM overlay is greyed (untappable) and STRIKES/DEFENDS are active.

10. After the second spend sequence, the turn ends normally. The enemy attacks as usual. `itemUsedThisTurn` is set, preventing a second Tenacity use this turn.

11. A second Tenacity item cannot be used in the same turn (blocked by `itemUsedThisTurn`), even if one remains in the satchel.

### Padded Coat Green Penalty

12. While Padded Coat is in the satchel, each time the dice pool rolls in combat, the Green pip total is reduced by 1 (minimum 0) **after** the roll computes but **before** the allocation UI renders.

13. A roll showing 3 Green pips becomes 2; a roll showing 1 Green becomes 0; a roll showing 0 stays 0.

14. The penalty applies once per roll and persists until the combat ends. It does NOT apply outside combat (navigation checks, traps, etc.).

15. The combat log records the penalty once per combat (not per turn): `"Padded Coat — Green −1 per roll."` or similar.

### Berserker Draught Status

16. When Berserker Draught is used, `berserkTurnsLeft` is set to 3 on CombatState.

17. While `berserkTurnsLeft > 0`, all Strike and Heavy Strike actions deal 2× normal damage (doubled before any enemy block or armour on the enemy side applies).

18. While `berserkTurnsLeft > 0`, the Green pip reservation mechanic is **disabled**. Green pips cannot be reserved (the 2G full dodge and 1G partial dodge actions from 037 are unavailable). Players can still spend Green on Feint, Disengage, or other non-dodge actions if available. Unspent Green at END TURN is wasted normally.

19. At the start of each new player turn (when ROLL fires), `berserkTurnsLeft` decrements by 1.

20. When `berserkTurnsLeft` reaches 0 or when combat ends, the status clears.

21. While `berserkTurnsLeft > 0`, a status indicator strip renders at the top of the combat panel (same zone as the enemy-intent display):
   ```
   ┌─────────────────────────────────┐
   │  🔥 BERSERK · 2 turns left      │
   │     2× Strike · No dodge        │
   └─────────────────────────────────┘
   ```
   Background: `--room-enemy` (#7a1a1a, danger register). Text: `--text-primary`, bold 13px monospace for label, 11px for reminder line. The strip is always visible while active; no dismiss interaction needed.

22. A second Berserker Draught in the satchel is greyed in the ITEM overlay while `berserkTurnsLeft > 0` (regardless of `itemUsedThisTurn`). It becomes usable once berserk clears.

### Tainted Mushroom Self-Damage & Bonus Pips

23. When Tainted Mushroom is used from the ITEM overlay in combat: self-damage fires immediately (pipHp − 2). The damage is applied directly to `pipHp`, not as an enemy attack, so passive armour does NOT reduce it.

24. After self-damage, if `pipHp ≤ 0`, the death-prevention hook fires (if a deathPrevention item exists in satchel). Pip survives at 1 HP and the prevention item is consumed. If no prevention item, Pip dies and the defeat flow triggers (run ends).

25. If `pipHp > 0` after self-damage (or after death prevention saves), +3 bonus pips are added to the current allocation pool (Red, Blue, Green, Yellow freely assigned by the player). The item is then consumed.

26. The bonus pips appear in the pool count; the player allocates them as they would any other pips this turn.

### Stolen Idol Passive Gold & Enemy Damage

27. When Stolen Idol is acquired, two passive effects activate immediately and persist for the rest of the run. Both are always active; the idol cannot be un-equipped.

28. **Gold bonus:** Each time Pip enters a room for the first time in that run (or first time after clearing and re-entering a previously-cleared room — implementation may choose the simpler trigger), `gold += 2`. The trigger hooks into the existing room-entry event (same hook as enemy-room gold tracking if possible).

29. **Enemy damage bonus:** All enemy attacks deal +1 additional damage. Damage calculation: (base enemy damage + 1) − passive armour reduction − other mitigations = final damage. The Stolen Idol bonus is applied *before* armour reduction, so armour can mitigate it. Example: 2-damage attack + Stolen Idol vs. Leather Jerkin (−1): (2+1)−1 = 2 actual damage.

30. Stolen Idol appears in the Satchel Pouch with a "WORN" badge and the `--item-cursed` red border as a persistent reminder that the burden is active.

31. Stolen Idol does NOT appear in the ITEM overlay (it is passive, not manually usable).

32. Interaction test case: Stolen Idol + Leather Jerkin in same satchel. Enemy deals 2 damage. Calculation: (2+1)−1 = 2. The burden and armour cancel. This is a valid run strategy and should be preserved.

---

## Quality

33. `npm run test` passes. New or updated tests cover:
    - Charged item display logic (charges render, not quantity)
    - Tenacity gating before/after pip-spend; dual-allocation flow
    - Padded Coat Green penalty applied once per roll, not outside combat
    - Berserker status: damage doubled, dodge disabled, counter decrements, clears at combat end
    - Tainted Mushroom: self-damage fires before bonus pips; death prevention hook fires if pipHp ≤ 0
    - Stolen Idol: gold increments on room entry; damage +1 applied before armour reduction; cannot be un-equipped

34. `npm run typecheck` exits with zero errors.

35. All user-facing text (status strips, log lines, penalties, etc.) uses consistent tone and capitalization per the design brief.

---

## Scope / Non-Goals

- **Weapon coatings** — separate spec; on-strike window; different mechanic class.
- **Dice-face manipulation** — separate spec; mid-allocation state access.
- **Knowledge / info items** — deferred to own spec; blocked on map-drawing decision.
- **Pre-roll pip adders** — separate spec; requires pre-roll UX design.
- **Visual polish on status strips** — animation, particle effects, etc. — deferred to polish phase.
- **Accessibility features** — high-contrast alternatives for greyed states, screen reader support — separate phase.

---

## Design Detail

### Charged Item Rendering

Charged items are rendered in the same grid as stacked quantities, but with a distinct visual indicator:
- **Quantity badge:** `×N` (e.g. `×2`), 10px monospace, `--gold` colour, bottom-right of icon cell
- **Charge badge:** `Nc` (e.g. `3c`), 10px monospace, `--gold` colour, bottom-right of icon cell

The `c` suffix distinguishes them at a glance. No quantity badge appears on charged items.

### Tenacity Flow Diagram

```
Player turn starts
      │
Pip-spend action taken?
   NO  → Tenacity items: greyed, untappable in ITEM
   YES → Tenacity items: active (if itemUsedThisTurn === false)
      │
Player taps Tenacity item
      │
Item consumed
Dice pool rerols (~500ms animation)
Pip totals reset to new roll
Player in second spend phase (action row active, ITEM greyed)
      │
Second spend sequence ends (END TURN or player stops)
      │
itemUsedThisTurn = true (blocks further item use this turn)
Turn ends → enemy attack fires
```

### Padded Coat Penalty Implementation

The penalty must fire **after** roll-completion but **before** the allocation UI renders. Pseudo-code:

```
roll completed
if (Padded Coat in satchel) {
  pool.totals.green = Math.max(0, pool.totals.green - 1)
  log once per combat: "Padded Coat — Green −1 per roll."
}
render allocation UI with reduced Green total
```

### Berserker Status Zone

The status indicator renders in the same zone as the enemy-intent display (top of combat panel), or immediately below if the intent display is present. It persists while active, no dismiss interaction.

### Stolen Idol Damage Order

The damage calculation prioritizes the Stolen Idol bonus *before* armour mitigation, so armour can reduce the idol's contribution:

```
damage = base attack
damage += (Stolen Idol in satchel ? 1 : 0)    // idol bonus first
damage -= (Leather Jerkin in satchel ? 1 : 0) // then armour
damage -= (Padded Coat in satchel ? 2 : 0)    // armour stacks
damage = Math.max(0, damage)                  // clamp to 0
```

This ordering is intentional and load-bearing for the interaction test case.

---

## Open Questions

1. **Tenacity reroll animation:** Should the reroll share the same ~500ms scramble animation as initial rolls, or use a distinct effect? Recommend: same animation, but with a subtle "rumble" or screen shake to signal the second chance.

2. **Padded Coat log line:** Should the "Green −1" penalty be logged as part of the standard roll log, or as a separate entry? Recommend: separate entry, but consolidated into a single line per combat, not per turn.

3. **Berserker status strip animation:** Should "turns left" decrement with a visible counter animation, or just update when the new turn starts? Recommend: update on turn start without animation; keeps the UI clean.

4. **Stolen Idol un-equipping:** Spec explicitly forbids un-equipping or discarding once acquired. Should there be UI affordance to *attempt* discard, with a confirmation message explaining why it can't be removed? Or silently disable discard? Recommend: disable discard button with a tooltip ("Cursed — cannot remove").

---

## Open decisions

None at designer review time. Implementation may surface additional UX decisions (e.g., exact positioning of status strips, animation timing). Those should be logged as they arise.

---

> The section below is filled in by the **Engineer** when the feature ships.

## Shipped

**Date:** — · **PR:** —
