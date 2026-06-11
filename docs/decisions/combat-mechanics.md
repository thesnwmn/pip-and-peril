# Combat Mechanics — Decision Detail

**Register entries:** D12, D13, D14  
**Introduced:** Features 037, 046, 023

---

## Active Defence Model (D12)

### Choice

Green pips are **reserved** (held for the enemy's turn), not spent for an immediate effect.
Two reserved Green = full dodge of one enemy hit. One reserved Green = −1 incoming damage.
Partial mitigation (1G) is deliberately less efficient than a full dodge (2G) — spending imprecise
Green to blunt rather than evade is a valid fallback but not optimal.

### Why

The design goal was genuine opportunity cost on every turn: *attack now, or survive the hit?*
Spending vs. reserving Green is the turn's primary question. Without a reserve mechanic, Green
would be spent offensively (Feint, Disengage) every turn and defence would be automatic — there
would be nothing to decide.

The 2G threshold for a full dodge was chosen over a binary shield because it creates a meaningful
comparison: 2G to negate incoming damage entirely vs. 2R for one Strike. The player who rolls
4G has a real choice; the player who rolls 1G cannot dodge cleanly and must decide whether partial
mitigation or an attack is worth more.

### Implementation note

Damage mitigation is a pure function: `damageToPip(intentValue, reservedGreen)`. It has no
side effects and is independently testable. All callers apply its result to HP; the function
does not mutate state.

### Flee interaction

Raw Flee (from feature 037) exits combat by taking one free enemy hit. This hit **ignores** the
Green reserve — Pip is fleeing, not dodging. The fleeing player accepts the damage unconditionally
as the cost of escape. Passive armour (`applyPassiveArmour`) still fires; the flee free-hit is
explicitly excluded from the `passiveArmour` reduction path.

---

## Turn Structure (D13)

### Choice

One full combat round in strict phase order:

```
[Pip's turn]
1. Intent revealed — enemy's current intent visible before Pip rolls.
2. Roll — Pip rolls all active dice.
3. Allocate and spend — pips distributed across offence actions, Green reserve, Blue/Yellow actions, items.
4. Offence resolves — attacks fire; enemy HP/block updated.
5. Tenacity window — if pips were spent this turn, Tenacity items may grant a second sequence.

[Enemy's turn]
6. Intent fires — enemy executes the telegraphed action.
7. Defence fires — reserved Green pips reduce incoming damage.
8. Damage lands — remaining damage hits Pip's HP.
9. Post-damage window — healing items; passive death prevention check; status ticks.
10. Between-turns window — poison ticks, empowered/disengaged flags clear or fire.
11. Intent refresh — enemy reveals next intent. New round begins.
```

### Why strict ordering

Item interjection windows are only unambiguous if turn phases have a fixed sequence. The eight
interjection windows map directly onto this turn structure (see `docs/decisions/item-interjection.md`).
A looser ordering would create edge cases: "does this item fire before or after the enemy's Guard
resolves?" The strict sequence eliminates the question.

### Intent telegraph before roll

The enemy reveals their intent before Pip rolls. This is essential: without prior information,
allocating pips between offence and defence is luck, not decision-making. The telegraph transforms
the roll from a resource-delivery moment into an information-response moment — the player rolls
knowing what is coming and must decide how to respond with whatever they got.

### Tenacity window (Feature 046)

The Tenacity window (step 5) is a defined phase even when no Tenacity items are present — it
is a named slot in the turn structure, not a conditional branch. This lets the item framework
(Feature 048) hook into it cleanly without requiring a special case in the main loop. Currently
pass-through when no Tenacity item is carried.

---

## Enemy Intent System (D14)

### Intent kinds

`Intent.kind` is a discriminated union:

| Kind | Effect |
|---|---|
| `attack` | Deal `value` damage to Pip; mitigated by reserved Green |
| `guard` | Gain `value` block (depletes before HP on Strike/Heavy Strike damage) |
| `empower` | Flag self; next `attack` or `lunge` deals double damage; cleared after it fires |
| `recover` | Heal `value` HP, capped at maxHp |
| `status` | Deal `value` damage + apply poison (`ticks: n`) on hit |
| `lunge` | Deal `value` damage (high); same Green mitigation as attack |

All intent kinds are available from Feature 046. Tier-1 enemies only draw from `['attack', 'guard']`
pools by design — they are teaching encounters, not full-complexity fights.

### Regular enemy intent pools

Each `EnemySpec` carries a weighted intent pool. The enemy draws from this pool each turn. The
pool composition is static per enemy (defined in `ENEMY_ROSTER`) but the draw is random, so
the same enemy can surprise the player with different sequences across encounters.

### Boss intent cycles (BossSpec)

Bosses use **fixed, deterministic intent cycles** rather than random pools. This is a deliberate
design choice: the boss is a learnable puzzle. On the first encounter, the player discovers the
pattern. On subsequent runs, they can anticipate it and plan.

`BossSpec` encodes:
- `phases: BossPhase[]` — each phase has a `cycle: BossIntent[]` array
- `enrageThreshold` — HP percentage that triggers the phase transition
- `cyclePosition` — resets to 0 on enrage

The Rat King's Phase 1 cycle (Attack → Guard → Empower → Attack × 2) and Phase 2 cycle
(Attack → Lunge → Attack) were designed so the enrage transition breaks the established rhythm,
forcing the player to re-read the pattern at a more dangerous pace.

### Tier escalation

Enemy tier is selected before the encounter by `enemyTierWeights[floor][depthPhase]` — a lookup
table in `DUNGEON_TUNING`. Tier determines intent pool complexity:

- **Tier 1**: attack / guard only — teaching fights
- **Tier 2**: adds empower / recover — forces prioritisation
- **Tier 3**: adds lunge / status — requires full pip management

A Tier-1 enemy on Floor 3 is still Tier 1 (its intent set does not escalate with floor depth).
The floor/depth table ensures the *proportion* of high-tier encounters increases as the run
progresses, but individual enemy specs are immutable.

### Two-turn telegraph (Feature 046)

When Pip uses the Analyse action (2B), the next intent after the current one is revealed as a
dimmed secondary icon. This is a strategic reward for Blue investment — planning two turns ahead
is only possible if Pip carries Blue dice. `CombatState.analysedThisCombat` persists across turns
(Analyse is a one-per-encounter investment, not repeatable); `analysedThisTurn` gates re-use
within a single allocation phase.
