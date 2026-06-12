# 095 · Trickster Visitor

**Status:** SHIPPED
**Source idea:** Backlog item 092 (deferred from feature 051); Idea 074 (The Gambler) — both
originated in `docs/concept/meta-progression.md` — "The Visitor System"
**Depends on:** 051 (visitor framework, relationship loop, generation logic), 028 (check panel —
`CheckPanel` module, four-band result model)

---

## Summary

The **Trickster** is a camp visitor who offers great deals with hidden risks — the push-your-luck
character in the visitor roster. Each visit, the Trickster proposes a scraps wager resolved by a
dice check against Pip's own pool: the outcome table is visible before the roll, but the offer text
downplays the failure case at Stranger tier, so inexperienced players underestimate the risk and
experienced players take the bet with clear eyes. The relationship loop gradually peels back the
Trickster's patter: a Regular-tier Trickster is honest about the odds and shaves the downside as a
sign of respect. All stakes are scraps-denominated — no permanent assets are ever on the table.

---

## Acceptance criteria

### Gamble-safety constraint (design rule, not a test)

1. Every Trickster offer must satisfy the following invariants:
   - **All stakes are scraps only.** No Trickster offer ever involves permanent dice, weapons,
     skills, or any non-scraps MetaState asset.
   - **Max downside per visit: 4 scraps.**
   - **Net expected value is non-negative** across the four outcome bands, assuming uniform
     distribution across bands. (Tuning will adjust this; the constraint is that the deal is
     legitimate when looked at honestly.)

   These invariants apply to all current and future Trickster offer kinds. They are the
   resolution of the gamble-safety question that blocked this type (see Scope / non-goals).

### Visitor framework extension (amends feature 051)

2. A `trickster` type is added to the visitor type union. A `VisitorInstance` may now carry
   `type: 'trickster'`, alongside existing types.

3. `VisitorOffer.kind` gains one new variant:

   - **`trickster-wager`** — a scraps bet resolved by a 🟡 dice check:
     - `checkColour: 'yellow'` — the check uses Yellow pips from the rolled pool.
     - `rewardCritical: number` — scraps earned on critical success.
     - `rewardSuccess: number` — scraps earned on success.
     - `rewardPartial: number` — scraps earned on partial success (≥ 0; small win).
     - `penaltyFailure: number` — scraps **lost** on failure (positive value; max 4, per AC 1).
     - `offerLine: string` — offer text; tier-dependent honesty (see Design detail).
     - `acceptLine: string` — shown after the check resolves (see Design detail).
     - `tier: RelationshipTier` — frozen at offer-resolution time, used to select offer text.

### Visitor generation

4. The eligible type pool in the visitor generation logic (feature 051, criterion 5) gains
   `trickster`. No additional gate. Type weight in `tuning.ts`.

5. `resolveOffer` for Trickster produces a `trickster-wager` with values from `tuning.ts` (see
   Design detail for starting values). Offers are frozen at generation time per criterion 6 of
   feature 051.

6. Tier scaling for the wager (values in `tuning.ts`):

   | Tier | `penaltyFailure` | Offer text tone |
   |---|---|---|
   | **Stranger** (count 0–1) | 4 scraps | Dismissive of failure case |
   | **Familiar** (count 2–4) | 4 scraps | Acknowledges failure is possible |
   | **Regular** (count ≥5) | 2 scraps | Frank; terms slightly better as a show of respect |

   Upside values (`rewardCritical`, `rewardSuccess`, `rewardPartial`) are the same at all tiers.

### Accept behaviour and check beat

7. **Accept** on a `trickster-wager` offer does **not** immediately apply a scraps effect. Instead,
   it triggers a **dice check** using the check panel (028):
   - The check panel rises over the visitor panel (or replaces its content — the Engineer chooses
     the appropriate panel layering given the 028 integration model).
   - The panel shows the stakes before the roll: the four outcome bands and their scraps values.
   - Pip rolls his pool. Yellow pips determine the band (pip thresholds in `tuning.ts`).
   - The check panel shows the result band and its effect for ~1.5 s, then descends.

8. After the check resolves:
   - Apply the scraps effect: add `rewardX` or subtract `penaltyFailure` from `MetaState.scraps`.
     Scraps cannot go below 0; if the penalty would push scraps negative, apply only to floor 0
     (the Trickster cannot leave Pip in debt).
   - Show the `acceptLine` for ~1.5 s (outcome-appropriate, see Design detail).
   - Increment `visitorRelationships[individualId]` by 1.
   - Mark visitor `resolved: true`.
   - Advance the panel to the next unresolved visitor (or sink the panel).

9. **Accept is disabled** (greyed) when `MetaState.scraps < penaltyFailure`. The Trickster's deal
   requires Pip to be able to cover the downside — a player who cannot afford to lose cannot play.
   The note shown is *"Not enough scraps to cover the risk."*

   This is a departure from the usual "not enough scraps" pattern (which applies to costs, not
   potential losses). The flavour justification: the Trickster won't take a bet from someone who
   can't honour it.

10. **Send Away** behaves identically to other types: `resolved: true`, no effect, no relationship
    change, no check fires.

### Roster

11. Two Trickster individuals:

   | `individualId` | Name (shown ≥ Familiar) | Portrait tint |
   |---|---|---|
   | `trickster-sloke` | Sloke | `--visitor-trickster` (lighter) |
   | `trickster-fenwick` | Fenwick | `--visitor-trickster` (darker) |

### Tests

12. Unit tests cover:
    - `resolveOffer` for `trickster`: yields `trickster-wager`; `penaltyFailure ≤ 4`; upside values
      satisfy non-negative EV across four equal-weight bands.
    - Failure-floor: applying a penalty to a `scraps` balance of 1 does not produce a negative balance.
    - Accept-disabled condition: `scraps < penaltyFailure` → Accept rendered greyed.
    - Accept-disabled: the panel does not trigger the check when Accept is disabled.

---

## Scope / non-goals

- **Permanent-asset stakes are out of scope permanently**, not just in v1. The gamble-safety rule
  (AC 1) is a design invariant for the Trickster type, not a temporary restriction. A future Trickster
  offer that puts a weapon or skill at risk would require revisiting this constraint explicitly.
- **No "hidden information" trap offers.** The outcome table is visible in full before the roll. The
  "hidden cost" is in the *offer text framing* (Stranger tier downplays failure) and the player's
  self-assessment of their Yellow pool — not in concealed mechanics.
- **No multiple wager kinds in v1.** A single `trickster-wager` offer kind ships. Future offer kinds
  (e.g. a flat barter with a concealed scraps debt to a future run) could extend the type; each must
  satisfy AC 1.
- **No counter-offer or negotiation.** Consistent with feature 051's "visitors do not negotiate"
  decision. Accept, Send Away, or close.
- **No other check colour.** The 🟡 check is fixed for this type. A Trickster variant that rolls 🔵
  (cunning the deal) is a design space worth exploring, but complicates the "signature colour"
  legibility and is deferred.

---

## Design detail

### Starting wager values

These are starting-point values for `tuning.ts`. They satisfy the EV constraint (AC 1) assuming
uniform band distribution (25% each):

| Band | Scraps effect | Prob. (assumed) |
|---|---|---|
| Critical | +9 | 25% |
| Success | +4 | 25% |
| Partial | +1 | 25% |
| Failure | −3 (Stranger/Familiar) or −2 (Regular) | 25% |

Expected value at Stranger/Familiar: (9 + 4 + 1 − 3) / 4 = +2.75 scraps (positive).
Expected value at Regular: (9 + 4 + 1 − 2) / 4 = +3.0 scraps (positive).

Actual pip-distribution probabilities depend on Pip's Yellow pool composition and will be playtested
by the Engineer. The constraint (AC 1) is EV ≥ 0 at all tier levels.

### Check colour and pip thresholds

The 🟡 check uses Yellow pips from the rolled pool. Pip thresholds for the four bands are in
`tuning.ts`. Starting suggestion (subject to Engineer calibration against the Yellow pool distribution):

| Band | Yellow pips threshold |
|---|---|
| Critical | ≥ 4 |
| Success | 2–3 |
| Partial | 1 |
| Failure | 0 |

With a single d4 Yellow die (early meta), 0 pips is a real outcome; with two Yellow dice, failure is
rare. This creates a natural arc: the Trickster is a harder bet early; an established Yellow build
makes the deal increasingly favourable. That is intentional — the Trickster rewards commitment to
the Fortune colour.

### Offer line templates (tier-dependent honesty)

**Stranger tier:**
> *"Barely any risk — roll your luck against mine. Mostly you'll come out ahead. Mostly."*

Outcome table shown in check panel: all four bands and their values. The offer text's breezy
dismissal of failure is the only "hidden" element — the numbers are visible.

**Familiar tier:**
> *"You've seen enough of me to know there's a catch. There is. Failure costs a few scraps. Worth it most days."*

**Regular tier (penaltyFailure −2):**
> *"You know the deal. I've shaved the edge off a little — call it professional respect. Roll."*

`acceptLine` variants (shown after the check resolves):

- Critical: *"[Trickster name] counts out the scraps with a grin that doesn't quite reach their eyes."*
- Success: *"[Trickster name] nods. Fair result. You played it straight."*
- Partial: *"'Nearly,' says [Trickster name], as if that helps."*
- Failure: *"[Trickster name] pockets the scraps without ceremony. 'Better luck below.'"*

### Check panel integration

The `trickster-wager` Accept triggers a dice check. The check panel (028) is designed as a reusable
module for non-combat dice beats (D30). The Trickster is the first non-NPC-encounter consumer of
this module. The Engineer should follow the 028 integration model (stakes-first, roll, result) and
confirm whether the check panel can be invoked from the visitor panel context — if not, the Trickster
may implement a lightweight in-panel version of the same four-band result display using the same
visual language (stakes card → roll button → result card).

The check panel's "stakes shown first" rule (028) maps cleanly: the outcome table (all four bands
and their scraps values) is shown as the stakes before the roll is triggered.

### Panel display

```
                     ↑ scene dimmed (090 scrim)
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│ [portrait]              [✕] │
│  Sloke                      │  ← name at ≥ Familiar; else "A shady traveller"
│  Trickster                  │  ← type label, --text-muted
│                             │
│  "warming both paws         │  ← condition blurb (shared bank, 051)
│   at the fire."             │
│                             │
│  "Barely any risk — roll    │  ← offerLine (tier-dependent honesty)
│   your luck against mine.   │
│   Mostly you'll come out    │
│   ahead. Mostly."           │
│                             │
│  🟡  Critical +9 · Win +4   │  ← outcome table (brief; all four bands)
│       Partial +1 · Fail −3  │
│                             │
│   [ Accept ]   [Send Away]  │  ← Accept greyed if scraps < penaltyFailure
└─────────────────────────────┘
```

The outcome table is a compact two-line summary below the offer text. It uses `--gold` for the
positive values and a muted warning colour for the failure penalty. It is always visible — not
hidden behind a reveal.

---

## Visual design

### Colour tokens

| Token | Value | Used for |
|---|---|---|
| `--visitor-trickster` | `#8a6a3a` | Trickster portrait silhouette tint — dusty amber-brown |
| `--outcome-penalty` | `#9a4a2a` | Failure penalty value in the outcome table — warm danger red |

The Trickster's amber-brown is warmer and dirtier than the Tinker's clean brown (`#b0763a`), and
hotter than the Scholar's cool blue-grey. Within the visitor colour vocabulary: Tinker is tool-warm,
Wounded Traveller is muted, Scholar is cool, Trickster is ambiguously warm — like firelight that
might also be something burning.

`--outcome-penalty` is used only in the Trickster's outcome table. It should not be the same red as
enemy/combat tokens — this is a scraps penalty, not a threat.

### Typography / sizing

Outcome table: two lines, 12px, regular weight. Positive values in `--gold`; the failure value in
`--outcome-penalty`. Band labels ("Critical", "Win", "Partial", "Fail") in `--text-muted` at 11px.
Consistent with how the check panel (028) renders result bands.

All other elements reuse the established visitor panel scale (feature 051, Visual design).

---

## Open questions

None blocking. The gamble-safety rule (AC 1) is a design constraint, not an open question.

Decisions made that the manager may redirect:
- **Yellow-only check.** Using 🟡 for the Trickster ties the deal to the Fortune colour. An
  alternative is a free-colour check (roll any colour; the highest pip count wins). The fixed colour
  is preferred: it gives the Trickster a mechanical signature and rewards Yellow-committed builds,
  consistent with the dice-as-personality direction.
- **Accept-disabled when scraps < penalty.** An alternative: Allow the wager regardless, and apply a
  "debt" flag that deducts from the *next run's* scraps rewards if the player fails. This preserves
  the ability to always engage but adds cross-run debt tracking. Not recommended — the simpler rule
  (can't bet what you can't cover) avoids persistence complexity and is honest to the Trickster's
  character: they don't extend credit.
- **Trickster condition bank.** The Trickster currently draws from the shared condition bank (051).
  A dedicated set of conditions would sharpen the type (*"watching the tunnel entrance with too much
  interest"*, *"counting coins that seem to multiply when unobserved"*) — deferred as a polish pass.

**Status: READY.**

---

> The section below is filled in by the **Engineer** when the feature ships.

## Shipped

**Date:** 2026-06-12 · **PR:** (pending)

### What was built

Three files changed, all new surface in `src/camp/visitors.ts` and `src/screens/camp.ts`:

- **`src/meta/state.ts`** — `trickster` added to `VisitorType`; `trickster-wager` added to
  `VisitorOfferKind`; `VisitorOffer` extended with optional trickster-wager fields
  (`checkColour`, `rewardCritical`, `rewardSuccess`, `rewardPartial`, `penaltyFailure`, `tier`).

- **`src/camp/visitors.ts`** — `TricksterBand` type (`critical | success | cost | failure`);
  tuning constants `TRICKSTER_YELLOW_CRITICAL/SUCCESS/PARTIAL`, `TRICKSTER_WAGER` (per-tier
  reward/penalty table), `TRICKSTER_OFFER_LINES`; roster entries `trickster-sloke` (Sloke) and
  `trickster-fenwick` (Fenwick); helpers `evaluateTricksterBand`, `canAffordTricksterWager`,
  `applyTricksterWager`, `getTricksterAcceptLine`; trickster branch in `resolveVisitorOffer`;
  trickster added to the generation type pool.

- **`src/screens/camp.ts`** — In-panel check flow (`roll → rolling 600 ms → outcome 1500 ms →
  completeTricksterCheck`); `drawTricksterOutcomeTable` helper renders the two-line stakes table
  in both the pre-accept offer view and the rolling phase; `completeTricksterCheck` applies the
  wager, increments the relationship, and feeds the outcome-appropriate `acceptLine` into the
  existing feedback banner; Accept affordability guard uses `canAffordTricksterWager`; "Not enough
  scraps to cover the risk." note shown when disabled.

- **`src/camp/visitors.test.ts`** — test suites covering AC 12.1 (EV ≥ 0, penaltyFailure ≤ 4,
  required fields), AC 12.2 (failure floor — penalty cannot take scraps below 0), AC 12.3 (Accept
  disabled when `scraps < penaltyFailure`), AC 12.4 (check not triggered when disabled),
  `evaluateTricksterBand` boundary table, `getDisplayName` for trickster stranger.

In-panel check was used instead of the full `createCheckPanel` module (028): the camp visitor panel
runs in a coordinate system incompatible with the game-screen check panel, and the spec explicitly
permits a lightweight in-panel implementation using the same visual language. The result is a
self-contained animation loop driven by `tricksterCheckPhase` state, consistent with the camp
screen's existing animation patterns.

### Evidence

- `npm run typecheck` — passes (no errors)
- `npm run test` — 687 tests, 32 files, all pass
- `npm run build` — builds cleanly

### Play-test

1. Start camp. Spend scraps to get below 4 if needed to test the disabled state.
2. Tap **Visitor** activity button. If a Trickster is in the visitor queue, their panel appears.
3. Verify the offer line matches the tier (Stranger: breezy dismissal; Regular: frank).
4. Verify the outcome table (Critical +9 · Win +4 / Partial +1 · Fail −3/−2) is visible.
5. With scraps < penaltyFailure: Accept is greyed and "Not enough scraps to cover the risk." appears.
6. With scraps ≥ penaltyFailure: tap Accept → "Rolling…" button for 600 ms → outcome card for
   1.5 s (band label + scraps delta + pip count) → acceptLine feedback banner → panel advances or
   sinks if no visitors remain.
7. Confirm scraps were updated correctly per the outcome band.
