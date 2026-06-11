# 094 · Scholar Visitor

**Status:** READY
**Source idea:** Backlog item 092 (deferred from feature 051; originated in `docs/concept/meta-progression.md` — "The Visitor System")
**Depends on:** 051 (visitor framework, relationship loop, generation logic), 091 (skills system — `unlockSkill()` API, `SkillSpec`, `SKILL_LIBRARY`)

---

## Summary

The **Scholar** is a camp visitor who delivers skills through the NPC-gift channel — the path alongside
Marks of Descent that the skills system is built to support. When a Scholar visits, they offer to teach
Pip one skill he hasn't yet learned, for a modest scraps fee that falls to nothing at Regular tier. The
Scholar is how players who didn't earn a Mark still reach the scroll wall; the Scholar is also how
skills that don't require a specific combat achievement arrive at all. Once Pip's teachable pool is
exhausted, the Scholar pivots to enemy lore: a free flavour line that hints at what stirs below.

---

## Acceptance criteria

### SkillSpec extension (amends feature 091)

1. `SkillSpec` in `src/meta/skills.ts` gains one new boolean field:

   ```
   scholarTeachable: boolean
   ```

   `true` means the Scholar may offer this skill; `false` means it is exclusive to the Mark path (or
   other future channels). The five starting skills are assigned as follows:

   | ID | `scholarTeachable` |
   |---|---|
   | `careful-eye` | `true` |
   | `counter-strike` | `true` |
   | `desperate-swing` | `true` |
   | `battle-cry` | `true` |
   | `stout-heart` | `false` — `mark-no-healing` exclusive |

   Future skills appended to `SKILL_LIBRARY` must set this field explicitly.

### Visitor framework extension (amends feature 051)

2. A `scholar` type is added to the visitor type union. A `VisitorInstance` may now carry
   `type: 'scholar'`, alongside `'tinker'` and `'wounded-traveller'`.

3. `VisitorOffer.kind` gains two new variants:

   - **`scholar-lesson`** — offer to teach a specific skill:
     - `skillId: string` — the skill being offered.
     - `costScraps: number` — 0 at Regular tier; see tier scaling.
     - `offerLine: string` — generated at offer-resolution time (see Design detail).
     - `acceptLine: string` — shown briefly after accepting.

   - **`scholar-lore`** — free fallback when no teachable skills remain:
     - `costScraps: 0`
     - `loreLine: string` — one flavour sentence drawn from the lore bank.
     - `offerLine: string` — static, see Design detail.
     - `acceptLine: string` — the `loreLine` itself.

### Visitor generation

4. The eligible type pool in the visitor generation logic (feature 051, criterion 5) gains `scholar`.
   No additional gate — Scholars enter the pool as soon as this feature ships. Type weight relative to
   existing types is in `tuning.ts`.

5. `resolveOffer` for Scholar:
   - Build the **teachable pool**: all skills in `SKILL_LIBRARY` where `scholarTeachable === true` and
     `id` is **not** in `MetaState.unlockedSkillIds`.
   - If the teachable pool is **non-empty**: choose one skill (see tier scaling for selection
     heuristic); produce a `scholar-lesson` offer with scraps cost from tier scaling.
   - If the teachable pool is **empty**: produce a `scholar-lore` offer drawn uniformly from the lore
     bank (see Design detail).
   - Offers are resolved at generation time and frozen for the epoch, consistent with criterion 6 of
     feature 051.

### Tier scaling

6. Scholar offer tier scaling (thresholds match feature 051 criterion 16; values in `tuning.ts`):

   | Tier | Skill selection heuristic | Cost |
   |---|---|---|
   | **Stranger** (count 0–1) | Uniform random from teachable pool | 4 scraps |
   | **Familiar** (count 2–4) | Biased toward Pip's dominant colour (see Design detail) | 2 scraps |
   | **Regular** (count ≥5) | Dominant-colour bias; free | 0 scraps |

   Dominant-colour bias: if any skill in the teachable pool has an associated colour matching the
   colour Pip has the most dice of (in `MetaState.permanentPool`), weight those skills higher. If no
   colour match is found, fall back to uniform random. The association table is in Design detail.

### Accept behaviour

7. When Accept is tapped on a **`scholar-lesson`** offer:
   - Deduct `costScraps` from `MetaState.scraps`.
   - Call `unlockSkill(meta, skillId)` (feature 091 API) and persist the result synchronously.
   - Increment `visitorRelationships[individualId]` by 1.
   - Mark visitor `resolved: true`.
   - Show `acceptLine` for ~1.5 s before advancing the panel, consistent with criterion 11 of
     feature 051.

8. When Accept is tapped on a **`scholar-lore`** offer:
   - Show `loreLine` for ~1.5 s (displayed as the `acceptLine`).
   - Increment relationship.
   - Mark `resolved: true`.
   - No scraps transaction.

9. **Accept is disabled** (greyed, *"Not enough scraps"*) when `costScraps > MetaState.scraps`,
   consistent with criterion 12 of feature 051. The visitor remains unresolved.

10. **Send Away** on a Scholar offer behaves identically to other types: `resolved: true`, no effect,
    no relationship change.

### Roster

11. Two Scholar individuals are added to the visitor roster:

   | `individualId` | Name (shown ≥ Familiar) | Portrait tint |
   |---|---|---|
   | `scholar-nettle` | Nettle | `--visitor-scholar` (lighter) |
   | `scholar-oswin` | Oswin | `--visitor-scholar` (darker) |

### Tests

12. Unit tests cover:
    - `resolveOffer` for `scholar`: teachable pool correctly excludes already-unlocked skills;
      `stout-heart` (not `scholarTeachable`) is never in the pool.
    - `resolveOffer` for `scholar` with empty pool: yields `scholar-lore`.
    - Accept on `scholar-lesson`: `unlockSkill` is called; `unlockedSkillIds` gains the skill ID;
      `scraps` decremented by `costScraps`.
    - Accept on `scholar-lore`: no skill unlock, no scraps change; relationship incremented.

---

## Scope / non-goals

- **No colour-specific Scholar individuals.** Both `scholar-nettle` and `scholar-oswin` draw from the
  same pool. A future polish pass could bias Nettle toward Blue skills and Oswin toward Red — deferred.
- **No skill upgrade or ranked teaching.** Skills are binary (earned or not). The Scholar cannot
  improve a skill Pip already has.
- **Stout Heart remains mark-exclusive.** The Scholar has no access to it. Future mark-linked skills
  added to `SKILL_LIBRARY` must set `scholarTeachable: false` explicitly.
- **No Scholar at the skills exhaustion boundary.** A Scholar can appear when all Scholar-teachable
  skills are learned — they fall back to lore. They do not stop appearing. This is intentional: a
  named Regular Scholar who has nothing left to teach still feels like a relationship worth keeping.
- **Late-meta pool management is a calibration note, not a blocker.** With four teachable skills in
  v1, a player who builds the Scholar relationship can exhaust the pool within a moderate number of
  runs. Future skill additions should include `scholarTeachable: true` entries to keep the Scholar
  offer live in the late meta.

---

## Design detail

### Skill–colour association table

Used only for the Familiar+ dominant-colour bias. A manual table defined in the offer resolver or
`tuning.ts` — not part of `SkillSpec` (this is visitor-specific metadata, not a core skill property):

| Skill ID | Associated colour |
|---|---|
| `careful-eye` | `blue` — analytical, information-seeking |
| `counter-strike` | `green` — reactive speed |
| `desperate-swing` | `red` — force, pushing through Rattled |
| `battle-cry` | `red` — force, offensive momentum |

Pip's dominant colour is the colour appearing most in `MetaState.permanentPool`. At a tie, use the
first in the canonical colour order. If Pip has no dice of any associated colour (e.g. very early
meta, before Blue is unlocked), fall back to uniform random.

### Offer line templates

Generated at offer-resolution time. The `offerLine` is assembled from the skill offered and the tier:

**Stranger tier (4 scraps):**
> *"I could teach you [Skill Name] — worth knowing, for a mouse going where you go. Four scraps for the lesson."*

**Familiar tier (2 scraps):**
> *"[Skill Name]. You'd get use from it. Two scraps."*

**Regular tier (free):**
> *"[Skill Name]. You've earned it — no charge."*

**Lore fallback (any tier):**
> *"Nothing new to teach you. But I've been listening to what comes up from below..."*

`acceptLine` for `scholar-lesson` (any tier):
> *"[Scholar name] unrolls the scroll, traces a line with one claw, and nods."*

`acceptLine` for `scholar-lore` is the `loreLine` itself.

### Lore bank

A small set of flavour lines for the fallback offer, drawn uniformly at random. Engineer may extend:

- *"The adder's venom is slower in the cold. It hesitates before striking."*
- *"Weasels freeze when they lose sight of their quarry. Stand still and they doubt themselves."*
- *"The deeper you go, the older the stone. Old stone moves oddly."*
- *"Whatever claims that den below — it is not new here."*
- *"A creature that cannot be heard is louder than one that can."*
- *"There are things down there that have not been looked at in a very long time."*

### Panel display

The Scholar panel uses the same wireframe as all visitor types (feature 051, Design detail). No new
layout elements. The skill name in a `scholar-lesson` `offerLine` may be rendered in medium weight
(500) for scannability — the Engineer may do this without introducing a new style rule.

---

## Visual design

### Colour tokens

| Token | Value | Used for |
|---|---|---|
| `--visitor-scholar` | `#4a6e82` | Scholar portrait silhouette tint — cool blue-grey |

The Scholar's cooler tint (ink, parchment, water) distinguishes them from the Tinker's warm brown
(`#b0763a`) and the Wounded Traveller's muted green-grey (`#6a7a6a`) while staying in the same
low-saturation, lamp-lit register.

### Typography / sizing

No new text elements. The skill name in the offer line may use medium weight (500) within the
existing 14px offer-line style — the Engineer may do this if it aids scannability without introducing
a new size or colour token.

---

## Open questions

None blocking. The teachable pool, the `unlockSkill()` API, and the panel infrastructure are all
fully defined.

Decisions made that the manager may redirect:
- **Stout Heart mark-exclusive.** If the manager wants a Scholar path to Stout Heart (at a high
  scraps cost), this is a single `scholarTeachable: true` change in `SKILL_LIBRARY`. The design
  argument against: Stout Heart is specifically the reward for a demanding combat achievement; making
  it purchasable with scraps diminishes that.
- **Lore fallback vs. Scholars disappear.** An alternative: once Pip has learned all teachable
  skills, Scholars simply stop appearing in the generation pool. Simpler, but removes an established
  Regular from the visitor community. The lore fallback is preferred.

**Status: READY.**

---

> The section below is filled in by the **Engineer** when the feature ships.

## Shipped

**Date:** YYYY-MM-DD · **PR:** #NN

### What was built

### Evidence

### Play-test
