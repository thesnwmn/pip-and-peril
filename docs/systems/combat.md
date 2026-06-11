# Combat System — As Implemented

**Source:** `src/combat/`  
**Key files:** `encounter.ts`, `panel.ts`, `roster.ts`, `intents.ts`, `overlay.ts`, `boss-panel.ts`  
**Last updated:** 2026-06-11 (features 037, 046, 023, 038, 048, 049, 050)

---

## Overview

Combat is a **turn-based dice-pool loop** triggered when Pip enters an enemy tile. The dungeon map
remains visible behind the panel; HP bars and intent icons are overlays on the map, not panel
elements. The panel hosts the dice pool and action controls only.

Entry point: `src/encounter/registry.ts` — combat is registered as an `EncounterPanel` and
triggered by the registry when Pip steps on an enemy tile. It completes via `onComplete('victory')`
or `onComplete('defeat')`.

---

## Turn Structure

One full combat round:

```
[Pip's turn]
1. Intent revealed     — enemy's current intent shown in overlay above enemy tile
2. Roll                — all active dice rolled
3. Allocate/spend      — pips assigned to actions or held as Green reserve
4. Offence resolves    — Strike/Heavy Strike fire; enemy HP/block updated
5. Tenacity window     — Tenacity items may grant a second roll-and-spend sequence

[Enemy's turn]
6. Intent fires        — enemy executes telegraphed action
7. Green reserve fires — reserved Green reduces incoming damage
8. Damage lands        — remaining damage applied to Pip's HP
9. Post-damage window  — healing items; death prevention check; passive armour
10. Between-turns      — poison ticks; empowered/disengaged flags resolve; intent advances
11. Intent refresh     — enemy reveals next intent; new round begins
```

See `docs/decisions/combat-mechanics.md` for the rationale behind this ordering.

---

## Active Defence

Green pips are **reserved** during allocation, not spent. They fire automatically on the enemy's
turn:

- **2G reserved** → full dodge (incoming damage negated entirely)
- **1G reserved** → −1 incoming damage (partial, less efficient)
- **0G reserved** → full damage lands

The mitigation calculation is `damageToPip(intentValue, reservedGreen)` — a pure function in
`src/combat/encounter.ts`. The flee free-hit bypasses this (Pip accepts the damage unconditionally
as the cost of escape), but passive armour still applies.

---

## Dice Pool

The active pool for a run is:

```
MetaState.permanentPool + activeWeapon.addedDice
```

Each die has a `colour` (Red/Green/Blue/Yellow) and a `faces` value (d4/d6/d8/d10/d12). The
roll produces one pip value per die; the player spends pips by selecting action buttons.

**Die colours and their primary roles:**
- 🔴 Red — offence (Strike, Heavy Strike, Shove)
- 🟢 Green — defence reserve + tactical actions (Feint, Disengage)
- 🔵 Blue — intelligence actions (Analyse, Exploit, Resist, Identify)
- 🟡 Yellow — conversion (2Y = 1 of any colour) + Lucky Shot (1Y, 1 damage, bypasses Guard)

---

## Actions

### Red actions
| Action | Cost | Effect |
|---|---|---|
| Strike | weapon-specific (1–3R) | Damage = weapon attack value; depletes enemy block first |
| Heavy Strike | 4R | Weapon damage +2 |
| Shove | 3R | Cancel enemy's current intent (does not deal damage) |

### Green actions
| Action | Cost | Effect |
|---|---|---|
| Reserve (dodge) | Hold 2G | Negate one enemy hit on enemy's turn |
| Reserve (partial) | Hold 1G | −1 incoming damage per pip |
| Feint | 2G spend | Reduce enemy current Guard value by 2 |
| Disengage | 3G spend | Cancel current intent; suppress enemy's next turn action |

### Blue actions
| Action | Cost | Effect |
|---|---|---|
| Analyse | 2B | Reveal next intent (two-turn telegraph); once per combat |
| Exploit | 2B | Damage bypassing Guard; requires prior Analyse this combat |
| Resist | 3B | Cancel one active status effect on Pip |
| Identify | 1B | Display exact remaining HP on enemy bar |

### Yellow actions
| Action | Cost | Effect |
|---|---|---|
| Convert | 2Y | Convert to 1 pip of any chosen colour |
| Lucky Shot | 1Y | Deal 1 damage; bypasses Guard entirely |

---

## Enemy Intents

Intent kinds currently implemented:

| Kind | Effect |
|---|---|
| `attack` | Deal `value` damage; mitigated by Green reserve |
| `guard` | Gain `value` block (depletes before HP on Strike/Heavy Strike) |
| `empower` | Flag self; next attack/lunge deals double damage |
| `recover` | Heal `value` HP, capped at maxHp |
| `status` | Deal `value` damage + apply poison (`ticks: n`) |
| `lunge` | Deal `value` damage (high); same Green mitigation as attack |

Enemy pools are defined per `EnemySpec` in `src/combat/roster.ts`. Regular enemies draw randomly
from their pool each turn. Bosses use fixed deterministic cycles (see Boss section below).

---

## Enemy Roster

12 creatures across three tiers in `ENEMY_ROSTER` (`src/combat/roster.ts`):

| Tier | Intent access | Role |
|---|---|---|
| 1 | attack, guard | Teaching fights — simple decisions, low HP |
| 2 | + empower, recover | Forces prioritisation — kill before empower fires, attack during recover |
| 3 | + lunge, status | Full pip management required — lunge may exceed full Green absorption |

Tier is selected at room placement via `DUNGEON_TUNING.enemyTierWeights[floor][depthPhase]`.
The enemy's `id` is stored on the tile at placement; the spec is looked up when combat starts.
Enemies respawn at full HP on re-entry (fled rooms prevent immediate re-entry via the `fled` tile flag).

---

## Boss Fight

Boss encounters are implemented in `src/combat/boss-panel.ts`. Bosses are enemies with:
- Fixed intent cycles (per-phase `BossPhase[]` array)
- An `enrageThreshold` (HP fraction) that triggers phase transition
- An intro sequence (~2.5s: camera pull-back → title card → camera tighten)

**Phase transition:**
1. HP drops to ≤ `enrageThreshold`
2. Phase switches to Phase 2
3. `cyclePosition` resets to 0
4. HP bar tint changes from `--room-boss` to `--boss-enraged`

The Rat King (Floor 3 boss):
- Phase 1: Attack 4 → Guard 3 → Empower → Attack 4 (doubled if empowered) — 4-intent patience cycle
- Phase 2: Attack 5 → Lunge 8 → Attack 5 — 3-intent aggression, no Guard or Empower

---

## Combat State

Key fields in `CombatState`:

| Field | Type | Purpose |
|---|---|---|
| `reservedGreen` | `number` | Pips held for defence this turn |
| `phase` | `'awaiting-roll' \| 'player-turn' \| 'victory' \| 'defeat'` | Current combat phase |
| `analysedThisCombat` | `boolean` | Whether Analyse has been used (once per combat) |
| `analysedThisTurn` | `boolean` | Gate: Analyse not repeatable within one allocation |
| `pipsSpentThisTurn` | `boolean` | Used to gate Luck items (must use before spending) |
| `itemUsedThisTurn` | `boolean` | Prevents multiple item uses per turn |
| `berserkTurnsLeft` | `number` | Berserker Draught active turns remaining |
| `bonusPipsRemaining` | `number` | Tainted Mushroom bonus pip assignment mode |
| `entryFrom` | `Position` | Pip's position before entering combat (flee retreat target) |

---

## Item Integration

Items interact with combat at interjection windows. See `docs/decisions/item-interjection.md`
for the full window table. Key hooks in the combat loop:

- **Luck interrupt**: fires between roll and allocation if a `luckyClass` item is carried and
  the roll was unfavourable
- **Passive armour**: `applyPassiveArmour(damage, inventory)` called before HP apply
- **Death prevention**: `applyDeathPrevention(newHp, inventory)` called when HP would reach ≤ 0;
  leaves Pip at 1 HP and removes the item
- **Tenacity**: after all pips spent, if a `post-spend-tenacity` item is present, a second
  roll-and-spend sequence is offered

---

## Map Overlays

While combat is active, the following are rendered as overlays on the map canvas (not in the panel):

- **Enemy HP bar** — beneath the enemy tile; fills from left; `--room-boss` tint for bosses
- **Pip HP bar** — beneath Pip's tile; colour shifts as HP falls
- **Intent icon** — above the enemy tile; current intent (bright) + next intent after Analyse (40% opacity, offset)
- **Enemy name** (bosses only) — rendered in the panel zone above the HP bar

See `src/combat/overlay.ts`.
