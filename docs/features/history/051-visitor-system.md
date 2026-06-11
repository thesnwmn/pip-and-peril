# 051 · Visitor System

**Status:** READY
**Source idea:** Backlog item 051 (originated in `docs/concept/meta-progression.md` — "The Visitor System")
**Depends on:** 029 (camp screen, MetaState, run-pool composition), 090 (camp redesign — Visitor activity button + visitor stool), 053 (notice board — the sibling per-camp procedural element; pattern reuse only)

---

## Summary

Between runs, procedurally generated **visitors** arrive at Pip's camp — sometimes none, usually
one, occasionally two (rarely three). Each is assembled from a **type** (their function and offer),
a **condition** (a flavour line that situates them), and a concrete **offer** scaled to Pip's
**relationship** with them. The interaction is one tap-and-confirm: read the blurb, **Accept** or
**Send Away**, the panel descends. Over repeat visits a relationship counter turns an anonymous face
into a **named regular** — the tinker who remembers what Pip likes, the traveller Pip once helped who
returns recovered and grateful. This is Hades-style story texture produced by pure procedure: a
community of recognisable faces and small ongoing arcs, with no authored dialogue trees.

This feature ships the **visitor framework** (generation, persistence, the interaction panel, the
relationship/regulars loop) and **two founding types** — the **Tinker** (a recurring service
relationship) and the **Wounded Traveller** (a two-act gratitude relationship). The remaining four
concept types (Scholar, Trader, Scout, Trickster) are deferred until the systems they each need
exist (see Scope / non-goals); the data model is built so each later type is a data entry plus one
small effect.

---

## Acceptance criteria

### MetaState extension

1. `MetaState` (version 1, as defined in 029) is extended with three persisted fields, all
   backward-compatible (a saved state lacking them loads with the defaults below — no version bump,
   matching the 053 `runCount` migration):
   - `visitorRelationships: Record<string, number>` — relationship counter per visitor individual
     id. Default `{}`.
   - `currentVisitors: VisitorInstance[]` — the camp's current visitor set (see Design detail).
     Default `[]`.
   - `visitorEpoch: number` — the `runCount` value the current set was generated for. Default `-1`
     (forces generation on first camp load).
   - `pendingRunBoons: BoonDie[]` — dice granted by accepted visitor offers, to be folded into the
     next run's pool. Default `[]`.

2. Every mutation to these fields (a set generated, a visitor resolved, a relationship incremented,
   a boon added or consumed) is persisted synchronously before any navigation, consistent with 029.

### Visitor generation

3. When the camp screen initialises, the game checks whether `visitorEpoch === MetaState.runCount`.
   If it matches, the existing `currentVisitors` are reused as-is (a reload at camp does **not**
   reroll visitors). If it does not match, a **new visitor set is generated**, `visitorEpoch` is set
   to `runCount`, the set is persisted, and any previous unresolved visitors are discarded. This
   makes a fresh set arrive after each completed run and prevents reload-savescumming an offer.

4. The set size is drawn from a weighted distribution (weights in `src/camp/tuning.ts`):
   **0 visitors ≈ 25%, 1 ≈ 45%, 2 ≈ 25%, 3 ≈ 5%.** A set of size 0 is a valid, intentional outcome
   — Pip is alone with the dungeon. The Visitor activity button is dimmed in that case (criterion 14).

5. Each visitor slot is filled by: (a) choosing a **type** from the eligible type pool (weighted);
   (b) choosing an **individual** of that type from the roster, weighting individuals Pip already has
   a relationship with more heavily so regulars recur (see Design detail); (c) choosing a
   **condition** line at random; (d) resolving the individual's current **offer** from its type +
   relationship tier + per-individual state. No two visitors in one set may be the **same
   individual** (type repeats are allowed when the set is larger than the roster permits otherwise).

6. A generated `VisitorInstance` is fully self-contained for display: it carries the individual id,
   type, the resolved offer, the condition line, and `resolved: false`. Offers are resolved **at
   generation time** and frozen for the epoch — the offer does not change if Pip earns scraps or
   relationship after the set is generated.

### The visitor in the camp

7. The **Visitor activity button** (added dimmed by feature 090) becomes interactive whenever the
   set contains at least one **unresolved** visitor. It shows a small count **badge** (number of
   unresolved visitors) in its top-right. When zero unresolved visitors remain (empty set, or all
   resolved), the button reverts to the dimmed, non-interactive state defined in 090.

8. The **visitor stool** in the scene zone (feature 090) shows its seated-figure placeholder
   whenever at least one unresolved visitor is present, tinted with the **first** unresolved
   visitor's type tint. When none are present, the stool is empty (090 behaviour).

9. Tapping the active Visitor button rises the **visitor panel** from the screen bottom, using the
   090 sub-panel model (ease-out ~400 ms rise, ~300 ms sink, full-screen coverage, scrim over the
   scene). The panel opens on the **first unresolved** visitor in the set.

### The visitor panel

10. The visitor panel shows, top to bottom:
    - A **portrait** silhouette (~40×40 px, canvas-drawn) straddling the panel top edge, in the
      visitor's type tint — the same "portrait straddling the edge" motif as the NPC encounter (028).
    - The visitor's **name** if the relationship tier is **Familiar or higher**; otherwise a generic
      type label (e.g. *"A wandering tinker"*, *"A wounded traveller"*). The individual identity is
      stable across visits regardless of whether the name is shown, so the same portrait tint returns.
    - A **condition blurb** (1–2 lines, italic) — flavour only.
    - The **offer line** — one or two lines describing the deal, including its scraps cost or
      *"Free."*
    - An **✕** dismiss button (top-right, ≥44×44 px, per 090).
    - Two action buttons in the thumb zone: **[Accept]** and **[Send Away]**.

11. **[Accept]** applies the offer's effect (criteria 17–18), increments
    `visitorRelationships[individualId]` by 1, sets that visitor's `resolved = true`, persists
    MetaState, and advances the panel to the next unresolved visitor — or sinks the panel if none
    remain. A brief confirmation line (the offer's `acceptLine`) shows for ~1.5 s before advancing.

12. **[Accept]** is **disabled** (greyed, not tappable) when the offer has a scraps cost Pip cannot
    afford. A *"Not enough scraps"* note appears in place of the confirmation. The offer is not
    consumed; the visitor stays unresolved.

13. **[Send Away]** sets the visitor's `resolved = true` with **no** effect and **no** relationship
    change, persists, and advances to the next unresolved visitor (or sinks the panel). The
    individual's per-individual arc state (e.g. a Wounded Traveller's "helped" flag) is unchanged.

14. The **✕** button sinks the panel **without** resolving the current visitor — they remain
    unresolved and the panel can be reopened later. Tapping the scrim behaves the same as ✕.

15. Descending into a run with unresolved visitors still present is allowed; those visitors are
    simply lost when the next visitor set is generated after the run (neglect = they move on). No
    forced resolution, ever.

### Relationship and regulars

16. Relationship tiers are derived from `visitorRelationships[individualId]` (thresholds in
    `tuning.ts`):
    - **Stranger** (count 0–1): generic type label, base offer.
    - **Familiar** (count 2–4): name revealed, improved offer, warmer condition/greeting tone.
    - **Regular** (count ≥5): name + a subtle *"regular"* warmth marker, best offer.
    A relationship increments only on **Accept** (criterion 11) — declining or ignoring a visitor
    does not build relationship.

### Type: the Tinker

17. The **Tinker** is a recurring service type. Its offer is a single concrete **run boon die**
    (a `BoonDie` of a randomly chosen colour and a tier-scaled face count), granted for the next run
    only. Accepting:
    - deducts the offer's scraps cost (0 at Regular tier),
    - appends the `BoonDie` to `MetaState.pendingRunBoons`,
    - increments the relationship.
    Offer scaling by tier (values in `tuning.ts`): **Stranger** → +1 d4, cost 3 scraps;
    **Familiar** → +1 d6, cost 2 scraps; **Regular** → +1 d6, **free**.

### Type: the Wounded Traveller

18. The **Wounded Traveller** is a two-act gratitude type, gated by a per-individual `helped` flag
    stored alongside its relationship (see Design detail):
    - **Act 1 — not yet helped:** the offer is *"help me"* — a small scraps cost, **no immediate
      reward**. Accepting deducts the cost, sets `helped = true`, and increments the relationship.
    - **Act 2 — helped (recovered):** the offer is a free **gift** — a scraps reward (value in
      `tuning.ts`, e.g. +5 scraps) — *"You again. I never forgot."* Accepting adds the scraps and
      increments the relationship. The individual may return again to give further gifts.
    The Act-1 → Act-2 transition is the visible payoff of the gratitude loop; it requires no authored
    dialogue beyond the offer lines.

### Run boon consumption

19. On run start (the Descend → run composition in 029), every die in
    `MetaState.pendingRunBoons` is folded into the run pool **in addition to** the permanent pool and
    the weapon dice. `pendingRunBoons` is then cleared and persisted. The boon dice are visually
    indistinguishable from other run dice in the existing pool preview (029) and in combat.

20. If `pendingRunBoons` is non-empty when the weapon-selection pool preview renders (029), the boon
    dice appear in that preview alongside permanent and weapon dice, so "your dice this run" stays
    truthful.

---

## Scope / non-goals

- **Four concept types are deferred, each on a named blocker** (the framework is built to accept
  them as data + one effect):
  - **Scholar** — teaches a skill; **blocked on a skills system** (the camp scroll wall, skill
    library, and loadout do not exist yet). Note: feature 029's scope line "Skills screen … deferred
    to feature 051" conflated skills with visitors; the **skills system is its own feature**, not
    part of 051. See Open questions.
  - **Trader** — exchanges scraps for an in-run item Pip found last run; **blocked on cross-run item
    persistence** (items are cleared at run end today).
  - **Scout** — sells run information (floor bias, boss hint, item density); **blocked on run-gen
    exposing any of these at camp time** (the boss is drawn at run start; authored floors are 058).
    Also overlaps the shipped Notice Board (053) — when specced, the Scout must offer something the
    board does not.
  - **Trickster / Gambler** — great deals with hidden costs; **blocked on a gamble-safety rule**
    (Idea 074 flags this as load-bearing: the permadeath meta economy must never let a player gamble
    their build into a hole). Needs the unified **check panel** (028) for its dice beat.
- **Multiple simultaneous visitor stools / multiple activity buttons** — the set is presented as a
  **queue** through the single Visitor button and single stool (090). A richer multi-figure scene is
  out of scope.
- **Counter-offer / negotiation** — the concept wireframe shows a `[Counter]` button, but the same
  doc states "Visitors do not negotiate." This spec resolves the contradiction in favour of
  **no negotiation**: the actions are Accept / Send Away only.
- **Dice-check visitor offers** — no v1 offer uses a dice roll. The check panel (028) is reserved
  for the deferred Trickster.
- **The errand → visitor loop (Idea 068)** — seeding a visitor from an in-run NPC errand is a later
  spec; this feature provides the relationship machinery it will hook into.
- **Distinct portrait art per individual** — portraits are type-tinted geometric silhouettes (D8).
  Per-individual portrait variation beyond tint is a polish pass.
- **Visitor barks / ambient camp dialogue** — visitors are silent until tapped.

## Design detail

### MetaState extension

```
MetaState (version 1, amended by 051)
├── visitorRelationships: Record<string, number>   // individualId → accept-count; default {}
├── currentVisitors:      VisitorInstance[]         // current camp set; default []
├── visitorEpoch:         number                    // runCount the set was made for; default -1
└── pendingRunBoons:      BoonDie[]                  // dice for the next run; default []
```

A saved state lacking these fields loads with the defaults and is re-persisted (no version bump,
matching 053). The per-individual **`helped`** flag for the Wounded Traveller is not a separate
field: an individual is "helped" once `visitorRelationships[id] >= 1` (helping is the only way a
Wounded Traveller relationship reaches 1). This keeps the schema minimal.

```
VisitorInstance
├── individualId: string         // e.g. 'tinker-tussock'
├── type:         'tinker' | 'wounded-traveller'
├── condition:    string         // resolved flavour line
├── offer:        VisitorOffer    // resolved at generation, frozen for the epoch
└── resolved:     boolean

VisitorOffer
├── kind:        'tinker-boon' | 'traveller-help' | 'traveller-gift'
├── costScraps:  number          // 0 = free
├── boonDie?:    BoonDie         // present for tinker-boon
├── rewardScraps?: number        // present for traveller-gift
├── offerLine:   string          // shown in the panel
└── acceptLine:  string          // shown briefly on Accept

BoonDie { colour: DiceColour, faces: DiceFaces }
```

### The roster (v1)

Each type has two named individuals so a recurring face is recognisable and the camp feels like a
small community (the concept's "3–5 named regulars"). Portrait tint is stable from the first
appearance; the **name** is hidden until Familiar tier.

| individualId | type | Name (shown ≥ Familiar) | Portrait tint |
|---|---|---|---|
| `tinker-tussock` | tinker | Tussock | `--visitor-tinker` (lighter) |
| `tinker-pellam` | tinker | Pellam | `--visitor-tinker` (darker) |
| `traveller-marl` | wounded-traveller | Marl | `--visitor-traveller` (lighter) |
| `traveller-finch` | wounded-traveller | Finch | `--visitor-traveller` (darker) |

Type weights (both equal to start) and individual-recurrence weighting live in `tuning.ts`.
**Recurrence weighting:** when picking an individual of a chosen type, weight each candidate by
`1 + visitorRelationships[id]` so individuals Pip has engaged return more often (the relationship
compounds), while a stranger individual still has a baseline chance to appear.

### Condition bank (flavour only)

A shared, type-agnostic bank (Engineer may extend; these set the tone and the minimum):

- *"breathless and damp from the lower passages."*
- *"asleep on the stool when Pip returns."*
- *"eyeing the dungeon entrance nervously."*
- *"warming both paws at the fire."*
- *"carrying a bundle that clinks when it moves."*
- *"with mud to the knees and a story they won't tell."*
- *"humming something tuneless and old."*
- *"watching the dark as though it might watch back."*

The condition does not affect the offer.

### Generation flow

```
camp screen initialises
│
├─ if visitorEpoch === runCount → reuse currentVisitors (no reroll); done.
│
├─ else generate:
│   ├─ count ← weighted pick {0:25, 1:45, 2:25, 3:5}
│   ├─ for each slot (avoiding repeating an individual already chosen this set):
│   │    ├─ type       ← weighted pick from eligible types
│   │    ├─ individual ← weighted pick of that type's roster, weight = 1 + relationship[id]
│   │    ├─ tier       ← tierFor(relationship[id])
│   │    ├─ condition  ← uniform pick from the condition bank
│   │    └─ offer      ← resolveOffer(type, tier, individual state)
│   ├─ visitorEpoch ← runCount
│   └─ persist
```

`resolveOffer` produces the frozen `VisitorOffer`:
- **tinker:** `tinker-boon` with a random `BoonDie` colour and tier-scaled faces (d4 / d6 / d6) and
  tier-scaled cost (3 / 2 / 0).
- **wounded-traveller:** if `relationship[id] === 0` → `traveller-help` (cost from tuning, no
  reward); else → `traveller-gift` (free, `rewardScraps` from tuning).

### Panel queue behaviour

The panel always renders the **first `resolved === false`** visitor. Accept and Send Away both flip
the current visitor's `resolved` and re-render on the next unresolved one; when none remain the panel
sinks and the Visitor button reverts to dimmed. ✕ / scrim sink the panel without resolving. This is
the same single-surface rise/sink animation as every other 090 sub-panel — no bespoke transition.

### Boon injection at run start

029 composes the run pool as `permanentPool + weaponDice`. This feature appends
`pendingRunBoons` to that composition, then clears `pendingRunBoons` and persists. The boon dice are
ordinary run dice thereafter — no tagging, no special combat behaviour. If two Tinkers were accepted
in one camp set, both boons stack into the run.

### Edge cases

- **Empty set (size 0):** valid. Visitor button dimmed; stool empty. Persisted like any set so a
  reload doesn't reroll into a non-empty set.
- **Reload at camp:** `visitorEpoch === runCount` → same visitors, same offers, same resolved flags.
- **Accept a boon, then close the game without descending:** `pendingRunBoons` persists; it is
  consumed at the next run start whenever that happens.
- **Insufficient scraps:** Accept disabled (criterion 12); visitor stays unresolved; player may earn
  scraps elsewhere is N/A at camp, so in practice they Send Away or ✕.
- **Relationship at exactly a tier boundary:** `tierFor` uses the thresholds in criterion 16; the
  name appears the first visit *after* the count reaches 2.
- **Corrupted `currentVisitors` (unparseable or referencing an unknown individualId):** discard the
  set and regenerate for the current epoch; a console warning is sufficient (consistent with 029's
  corrupted-state handling).

## Visual design

**Temperature:** Warm — the same register as the NPC encounter (028) and the camp panels. The
visitor is a guest at the fire, not a threat.

### Visitor panel wireframe

```
                     ↑ scene dimmed (090 scrim)
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  ← panel rises (090 model, ~400 ms)
│ [portrait]              [✕] │  ← ~40×40 px type-tinted silhouette, straddles top edge
│  Tussock                    │  ← name (≥ Familiar) — else "A wandering tinker"
│  Tinker                     │  ← type label, --text-muted
│                             │
│  "warming both paws         │  ← condition blurb, italic, --text-muted
│   at the fire."             │
│                             │
│  "A spare red d6 — yours    │  ← offer line, --text-primary
│   for this run.  2 scraps." │     cost or "Free."
│                             │
│   [ Accept ]   [Send Away]  │  ← thumb zone; Accept greyed if unaffordable
└─────────────────────────────┘
```

On Accept, the offer line is replaced for ~1.5 s by the `acceptLine`
(e.g. *"Tussock presses the die into Pip's paw."*) before the panel advances or sinks.

### Visitor activity button (extends 090)

```
   ┌───────┐
   │  👤²  │   ← count badge top-right: --gold disc, --camp-bg numeral, 11px
   │Visitor│      shown only when ≥1 unresolved; button dimmed (090) when 0
   └───────┘
```

### Colour tokens

| Token | Value | Used for |
|---|---|---|
| `--visitor-tinker` | `#b0763a` | Tinker portrait silhouette tint (individuals vary lightness ±) |
| `--visitor-traveller` | `#6a7a6a` | Wounded Traveller portrait silhouette tint |

Reused: `--camp-surface` (panel), `--camp-border` (panel borders), `--camp-accent` (Accept CTA,
regular warmth marker), `--gold` (count badge, scraps cost/reward figures), `--text-primary`
(offer line, name), `--text-muted` (type label, condition blurb). Die-colour tokens
(`--room-enemy` etc.) render the boon die glyph in the offer line and the pool preview, consistent
with 029.

### Typography / sizing

Reuse the established scale (matches the NPC panel, 028):

| Element | Size | Weight | Colour |
|---|---|---|---|
| Visitor name | 15px | bold | `--text-primary` |
| Type label | 12px | regular | `--text-muted` |
| Condition blurb | 13px | italic | `--text-muted` |
| Offer line | 14px | regular | `--text-primary` |
| Scraps cost / reward figure | 14px | bold | `--gold` |
| Accept / Send Away labels | 16px | medium | `--text-primary` / `--camp-accent` |
| Count badge numeral | 11px | bold | `--camp-bg` on `--gold` |
| "Regular" warmth marker | 11px | regular | `--camp-accent` |

## Open questions

None blocking — the framework and the two founding types are fully buildable on shipped
dependencies, so this item is **READY**.

Decisions made that the manager may wish to redirect (a redirect changes scope but does not block
the core build):

- **Two types now, four deferred.** The recommendation is to ship the framework + Tinker + Wounded
  Traveller and defer Scholar / Trader / Scout / Trickster behind their named blockers. The
  alternative — build all six now — would require speccing a skills system, cross-run item
  persistence, run-gen-at-camp data, and a gamble-safety rule first; that is several features, not
  one. If the manager wants a third type in v1 sooner, the lowest-cost addition is a **Scout** as
  *flavour-only paid hints* (reusing the 053 template approach) — included here as a note, not specced,
  because paying scraps for text the Notice Board gives free is a weak deal until the hint points at
  something real.
- **Skills are not part of 051.** Feature 029's "Skills … deferred to 051" line is treated as a
  mis-reference. A standalone **skills system** backlog item should be created (it gates the Scholar
  visitor, the scroll wall, and the loadout). Flagged for the Planner.
- **Anti-savescum via persisted visitor set.** Visitors are frozen per run-epoch rather than
  regenerated on every camp load (unlike notices, which carry no economic weight). This is a
  deliberate divergence from 053 because visitor offers move scraps and dice.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** 2026-06-11 · **PR:** (pending)

### What was built

All acceptance criteria met. Shipped code spans five files:

- **`src/meta/state.ts`** — Extended `MetaState` with four backward-compatible fields (`visitorRelationships`, `currentVisitors`, `visitorEpoch`, `pendingRunBoons`). New types defined here (`BoonDie`, `VisitorType`, `VisitorOfferKind`, `VisitorOffer`, `VisitorInstance`) to avoid a circular dependency with `visitors.ts`.

- **`src/camp/visitors.ts`** — New module containing all visitor logic. Exports `tierFor`, `getDisplayName`, `getVisitorTint`, `resolveVisitorOffer`, `generateVisitors`, and all tuning constants. Full four-person roster (Tussock, Pellam, Marl, Finch). Eight-entry condition bank. Two founding types fully implemented: Tinker (tier-scaled cost 3/2/0, die faces d4/d6/d6) and Wounded Traveller (Act 1 traveller-help, Act 2 traveller-gift). Weighted count distribution {0:25, 1:45, 2:25, 3:5}. Individual-recurrence weighting `1 + relationship[id]`.

- **`src/screens/camp.ts`** — Visitor activity button with unresolved-count badge; visitor-stool silhouette drawn in scene when a visitor is present; `initVisitorState` epoch guard at camp creation; `drawVisitorPanel` (~100 lines) rendering portrait silhouette, name/tier/condition, offer line, and Accept/Send Away buttons in the thumb zone; `handleVisitorAccept` (scraps deduct, boon push, relationship increment, resolved flag); `handleVisitorResolve` (Send Away); `visitorFeedbackSubject` snapshot pattern so acceptLine renders under the accepted visitor's portrait rather than the next visitor's; boon dice folded into `getRunPoolDice`; `pendingRunBoons` cleared on descend (persistence) while `stateForRun` carries them into the run.

- **`src/screens/game.ts`** — `createRunPool` extended to include `pendingRunBoons` from `MetaState`.

- **`src/camp/notices.test.ts`** — Fixed `makeMeta` helper to use `getDefaultMetaState()` spread so it includes the new MetaState fields.

Three bugs caught and fixed during the inline Reviewer pass (before PR):
1. **Wrong visitor under feedback text** — `visitorFeedbackSubject` snapshot added; `drawVisitorPanel` uses it in preference to `getActiveVisitor()` when feedback is active.
2. **Buttons tappable during 400 ms slide-in** — `state.panelProgress >= 1` guard added to the visitor click branch.
3. **`rewardScraps` falsy-zero guard** — `&& offer.rewardScraps` replaced with `&& offer.rewardScraps !== undefined`.

### Evidence

- **617 tests passing** (`npm run test`), including **39 new visitor tests** in `src/camp/visitors.test.ts` covering `tierFor`, `getDisplayName`, `getVisitorTint`, `resolveVisitorOffer` (all type × tier combinations including Act 1/Act 2 boundary), and `generateVisitors` (structure, no-duplicate-individuals across 200 runs, count distribution, relationship-influenced offers).
- `npm run typecheck` clean (0 errors).
- `npm run build` produces `dist/` with no warnings.
- `bash init.sh` passes end-to-end.

### Play-test

1. Open the camp screen. Check the Visitor activity button in the activity bar — it should be **dimmed** if no visitors are present, or show a gold count badge (e.g. "1") if visitors are waiting.
2. When the badge is present, tap **Visitor**. The panel rises (~400 ms). Verify:
   - A silhouette portrait straddles the panel top edge in a warm tint (brown for Tinker, grey-green for Traveller).
   - The name shows as "A wandering tinker" or "A wounded traveller" on a first visit (stranger tier).
   - A condition blurb appears in italic below the type label.
   - The offer line describes cost/reward; Accept shows the scraps cost.
3. **Tinker — Accept** (if you have enough scraps): the accept line replaces the offer for ~1.5 s, scraps decrease, and a boon die is added to the pending pool. Descend — the die should appear in the run pool.
4. **Wounded Traveller — Act 1**: accept costs scraps and the Traveller is marked helped. On a subsequent camp visit with the same traveller, the offer switches to "traveller-gift" (free, +5 scraps on Accept).
5. **Send Away**: tapping Send Away dismisses the visitor without cost and moves to the next unresolved visitor. When all are resolved the panel sinks and the button dims.
6. **Tap ✕ or scrim** while the panel is open: panel sinks, visitors remain unresolved, button stays lit.
7. Reload the page at camp and reopen the visitor panel — the same visitor set and resolved state reappears (epoch guard working; note: since `saveMetaState` is a no-op, this will regenerate on reload — expected current limitation).
8. Visit the camp across multiple runs to observe a stranger becoming **Familiar** (name revealed at relationship ≥ 2) and then **Regular** (free service at ≥ 5).
