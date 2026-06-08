# 028 · NPC Encounter

**Status:** READY
**Source idea:** Manager request; Idea 070 (Unified Check Model); Idea 071 (NPC Social Checks)
**Depends on:** 005 (dice pool — roll mechanic), 004 (entry trigger), 030 (encounter panel
framework), 034 (encounter registry), 048 (item interjection — Luck interrupt on failed checks)

---

## Summary

The blue **NPC** room is dialogue-first and optional — the inverse of combat in feel and pacing.
Pip steps into a room with a living creature who has something to say, offer, or know; the player
reads the opening line and picks a response. Some responses are plain; others are **check-gated**:
a dice roll emerges inside the dialogue when the response calls for one, with the player first
choosing an **approach colour** (Force / Speed / Mind / Fortune) that expresses how Pip engages,
then rolling the full pool. Checks resolve in three bands — success, success-at-a-cost, failure —
so near-misses produce a story rather than a dead stop. Rewards are modest but meaningful: a hint
about what's ahead, a small item, a few coins, or simply a piece of world voice.

Three founding NPC archetypes cover the dungeon's social landscape: the wary **Rat Scavenger**,
the fearful **Frightened Mouse**, and the cryptic **Old Hermit**.

This feature also introduces the **unified check panel** — the reusable single-roll, approach-
colour, three-band module that all future non-combat dice moments (gates, errands, haggling) will
use as their structural foundation. The chest lock check (026) is not migrated here; that
reconciliation is a future pass.

---

## Acceptance criteria

### Core encounter

1. Entering an NPC tile with `npcState === 'active'` triggers the NPC encounter. The camera makes
   a moderate smooth zoom (~400–600 ms, easing) so the NPC is prominent in the map zone above the
   panel; the dialogue panel rises from the screen bottom simultaneously.

2. The NPC panel has **warm encounter temperature**: `--surface` background with a `--room-npc`
   top-edge border stripe (matching the room type colour). It is visually distinct from the
   dungeon-cold combat and trap panels.

3. An NPC portrait icon (a coloured silhouette matching the NPC archetype, ~36×36 px) sits at the
   panel's top edge, straddling the map/panel boundary.

4. The NPC's opening line appears in the panel — at most two lines of text, 16px, `--text-primary`.
   Below it, response buttons are shown (max 3, always including **[Leave]**).

5. Tapping **[Leave]** at any conversational node where it is available descends the panel, returns
   the camera to navigation zoom, and makes **no state change** to the tile. Re-entering presents
   the identical encounter; `npcState` stays `'active'`.

6. Tapping a **plain** (non-check) response advances the conversation to the next node immediately.
   The NPC's next line replaces the previous; new response buttons appear.

7. Tapping a **check-gated** response transitions the panel to **stakes state** (see criteria 10–17).

8. Once a conversation path reaches a terminal node — any node with `isTerminal: true` — the
   reward (if any) is shown in the panel, then after ~2 s the panel auto-descends, the camera
   returns to navigation zoom, and `npcState` is set to `'completed'`.

9. Re-entering a tile where `npcState === 'completed'`: the panel rises, a dismissal line from the
   archetype's dismissal pool is shown for ~2 s, the panel auto-descends. The camera sequence is
   identical to a normal encounter start and end — the player can tap the panel to dismiss early.
   No reward is available; re-entry is never blocked.

---

### The unified check panel

10. Tapping a check-gated response transitions the panel to **stakes state**. The stakes state
    displays:
    - A stakes summary: three short lines (`--text-muted`, 14px) labelled with symbols —
      `✓ [success outcome]`, `◑ [cost outcome]`, `✗ [failure outcome]`.
    - Approach buttons (2–3): each labelled `[die-glyph  Approach]` (e.g. `🔵 Reason`,
      `🟡 Charm`), styled with the die colour's border; arranged side-by-side.

    There is **no Back button** in the NPC encounter's stakes state. The player has already
    spoken the dialogue choice aloud — the NPC heard it; there is no undo. The check panel
    module supports a caller-supplied `allowBack` flag for contexts where declining *after*
    seeing stakes is a meaningful, consequential choice (e.g. a gate the player voluntarily
    approaches and can choose to skip). The NPC encounter always sets `allowBack: false`.

11. If Pip has zero dice of an approach colour, that approach button is shown but **disabled**
    (greyed, not tappable). Since every check offers 2–3 approaches and Pip's starting pool
    always includes Red and Green, no check is ever fully bricked by build.

12. Tapping an approach button locks the approach and transitions to **roll state**: the full dice
    pool is shown with chosen-colour dice highlighted; non-chosen dice are visible but greyed. The
    label `Needs [glyph] N pips` appears (14px, `--text-muted`). A **[Roll]** button appears in
    the thumb zone. There is no back button in roll state — once an approach is chosen, the player
    is committed to rolling.

13. Tapping **[Roll]** animates the full dice pool once. Only the **pips of the chosen approach
    colour** are summed and compared to the check `difficulty` value `D`. Non-chosen colours are
    rolled visually but their pips are not counted.

14. Result bands, where `pip` = sum of chosen-colour pips:

    | Band | Condition | Label shown |
    |---|---|---|
    | **Critical** | pip ≥ D + 2 | `[colour] N — Critical` |
    | **Success** | D ≤ pip < D + 2 | `[colour] N — Success` |
    | **Success-at-a-cost** | max(1, ⌊D/2⌋) ≤ pip < D | `[colour] N — Partial` |
    | **Failure** | pip < max(1, ⌊D/2⌋) | `[colour] N — Fail` |

    *Examples: D=2 → Cost window: pip 1; Failure: pip 0. D=3 → Cost: pip 1–2; Failure: pip 0.
    D=4 → Cost: pip 2–3; Failure: pip 0–1.*

15. **Outcome state**: the result band label appears alongside the outcome line from the check spec
    (`successLine`, `costLine`, or `failLine`). Both hold for ~1.5 s, then the panel transitions to
    the outcome node (the NPC's reaction).

16. If the result is **Failure** (band 4 only, not cost-band) and Pip has a Luck-class item in the
    satchel, the **Luck interrupt prompt** fires (per feature 048) before the failure outcome
    applies. Accepting it reruns the full pool roll once; the reroll is evaluated at the same bands.
    No further Luck prompt fires on a rerolled failure.

17. **Check difficulty scaling**: check difficulties are archetype-specific (see criterion 24).
    When feature 022 (multi-floor dungeon structure) is active, floor depth adds a light modifier:
    +0 on floor 1, +1 on floor 2, +1 on floor 3. The modifier is capped at +1 per check (a base
    difficulty of 3 caps at 4 on floors 2 and 3). Until 022 ships, floor 1 difficulty applies
    everywhere.

---

### Rewards

18. **Gold reward**: added to the pouch immediately. A `+N ◈` line appears in the panel for ~1.5 s
    before the terminal auto-advance.

19. **Item reward**: shown as a small item card in the panel (name + one-line description). A
    **[Take]** button appears; tapping it calls `acquireItem`. If the satchel is full, "Satchel
    full" is shown; the item is not acquired. The tile is **not** marked completed until the item
    is taken or the player taps **[Leave it]** (a secondary button that closes the panel and sets
    `npcState = 'completed'` without the item).

20. **Hint reward**: a short text string is shown in the panel (italic, `--text-muted`, centred)
    for ~3 s. It is appended to the Satchel Journal stub (feature 016) as a run log entry. Full
    hint text is authored per archetype (see criterion 24).

21. Nodes may carry no reward — a plain NPC reaction, then terminal. This is valid and common.

---

### Content — three founding archetypes

22. NPC type is selected at tile placement from a weighted distribution. Weights go in
    `src/dungeon/tuning.ts`:

    | Archetype | Weight |
    |---|---|
    | Rat Scavenger | 5 |
    | Frightened Mouse | 4 |
    | Old Hermit | 3 |

23. The NPC data file (`src/encounter/npc-scripts.ts` or equivalent) defines the three archetypes
    as conversation trees using the `NpcScript` shape (see Design detail).

24. **Archetype definitions** — each is specced as `[opening node] → [check] → [outcome nodes]`:

    ---

    **Rat Scavenger** — wary, self-interested; knows things, shares them for a price

    - Portrait: hunched rat silhouette, amber-grey tones.
    - Opening line: *"Oi, mouse. You've got that look — the one that says you're going the wrong
      way."*
    - Response A: `"What do you know?"` — check-gated
      - Approaches: 🔵 Reason (difficulty 2) OR 🟡 Charm (difficulty 2)
      - Stakes: ✓ He tells you something useful. ◑ He tells you something vague. ✗ He tells you
        nothing.
      - Success line: *"Fine. There's something in that direction worth your time."*
      - Cost line: *"Mm. Could be worse down the east passage. Or it couldn't."*
      - Fail line: *"Nothing, for you."*
      - Critical line: *"Not bad. Here — and this, in case you need it."*
      - Success → hint reward (floor-adjacent hint). Critical → hint + 2–4 ◈ gold.
      - Cost → hint (vague). Fail → terminal, no reward.
    - Response B: `"Never mind."` — Leave path.
    - Dismissal pool (3 lines, shown on completed re-entry):
      - *"We've talked already."*
      - *"I've nothing more for you."*
      - *"You've had your answer."*

    ---

    **Frightened Mouse** — fearful but grateful; has a little to give if reassured

    - Portrait: small crouching mouse silhouette, pale grey tones.
    - Opening line: *"Oh! Sorry — I didn't hear you. I've been hiding here a while."*
    - Response A: `[Reassure them]` — check-gated
      - Approaches: 🟡 Comfort (difficulty 2) OR 🟢 Calm (difficulty 2)
      - Stakes: ✓ They relax and share something. ◑ They calm a little, but have nothing left.
        ✗ They stay frightened and won't speak.
      - Success line: *"Oh. You're… you're kind. Here, take this — I won't need it now."*
      - Cost line: *"I… thank you. I've nothing left to give, but — thank you."*
      - Fail line: *"Sorry. I can't. I'm sorry."*
      - Critical line: *"You're the first kind voice in days. Take this, and — there's something
        you should know."*
      - Success → item reward (common consumable from NPC item pool). Critical → item + hint.
      - Cost → terminal, no reward (warm flavour). Fail → terminal, no reward.
    - Response B: `"Sorry to bother you."` — Leave path.
    - Dismissal pool:
      - *"You were kind before. I won't forget."*
      - *"I've calmed down now. I'll be all right."*
      - *"Still here. Still hiding. I'll move on soon."*

    ---

    **Old Hermit** — wise, eccentric, testing; shares deep knowledge when impressed

    - Portrait: elderly hooded figure silhouette, dark cool tones.
    - Opening line: *"You're the third one through here this moon. The others didn't ask the
      right questions."*
    - Response A: `"What are the right questions?"` — check-gated
      - Approaches: 🔵 Reason (difficulty 3) OR 🔴 Demand (difficulty 3)
      - Stakes: ✓ Something specific about what lies ahead. ◑ Something partial and cryptic.
        ✗ Nothing useful — they dismiss you.
      - Success line: *"Ah. Yes. That one."* [hint follows]
      - Cost line: *"Closer. Think about what casts a long shadow on the floor below."*
      - Fail line: *"That wasn't it."*
      - Critical line: *"Very good. Sit. I'll tell you what I know — and what to watch for."*
      - Success → hint reward (boss-related hint). Critical → hint + secondary hint.
      - Cost → vague hint (non-specific, atmospheric). Fail → terminal, no reward.
    - Response B: `"Interesting."` — Leave path.
    - Dismissal pool:
      - *"We've spoken. The rest is yours to find."*
      - *"I've given you what I can."*
      - *"You know what you know. Go use it."*

25. **NPC item pool** (used by Frightened Mouse item reward): drawn from the common consumable set.
    Weights in `tuning.ts`:

    | Item | Weight |
    |---|---|
    | Crumb of Cheese | 4 |
    | Lucky Acorn | 3 |
    | Smoke Pellet | 3 |
    | Glowstone Dust | 2 |

26. **Hint pool** — each archetype carries a pool of 3–5 short hint strings (one sentence each).
    Hints are atmospheric, world-voice, and never explicitly game-mechanical. Sample tone guidance:

    - Floor-adjacent: *"Something large moves on the floor below. I could hear it through the
      stone."*
    - Enemy-hint: *"The thing in the next chamber goes quiet when it hears you first. Don't let
      it hear you first."*
    - Boss-related (for Old Hermit): *"The one who rules this place keeps its guard close.
      Follow the bones — they'll point the way."*

    The Engineer authors the full hint pools within these tone constraints; 3 entries per archetype
    is sufficient for the initial build.

---

## Scope / non-goals

- **Migration of existing checks (026, 025)** — the unified check panel introduced here is a new
  module. The chest lock check and trap agility check retain their existing bespoke implementations.
  A future reconciliation pass may migrate them; that is not this feature's job.
- **Hostile-on-fail NPCs** — no founding archetype triggers combat on failure. A future hostile
  archetype (dungeon guard, territorial sentry) must loudly telegraph the combat risk in its stakes
  text (`✗ He attacks.`), must use the same check panel, and must be a separate spec or archetype
  addition. The blue room stays inviting.
- **Errand / sub-objective system** — in-run NPC errands (Idea 067) build on this feature as a
  dependency. They are a separate spec.
- **Biome-specific NPC archetypes** — the Scholar (Ancient Halls), the Inscription Panel, and
  other biome NPCs belong in their biome specs (084–087). This feature covers dungeon-biome NPCs.
- **Named recurring NPCs / relationship counters** — Hades-style named regulars live in the
  visitor system (051) and the errand-to-visitor loop (068).
- **Deep conversation trees** — founding archetypes have 2–3 nodes max. The data model supports
  deeper trees for future content; the Engineer should not add depth in this feature.
- **Pip or NPC full sprite art** — portraits are coloured silhouettes under the existing geometric
  art approach (D8). No sprite art decisions here.

---

## Design detail

### Tile data

```
npcType:  NpcArchetype    // 'rat-scavenger' | 'frightened-mouse' | 'old-hermit'
npcState: 'active' | 'completed'   // set to 'active' at placement
```

No check result or gold amount is pre-rolled — outcomes are session-transient and resolved at the
moment of interaction.

### Conversation tree model

```
NpcScript {
  archetypeId:    string
  portraitId:     PortraitId
  dismissalLines: string[]
  rootNode:       NodeId
  nodes:          Record<NodeId, NpcNode>
}

NpcNode {
  npcLine:    string            // NPC's spoken line; max 2 rendered lines
  responses:  NpcResponse[]     // max 3; [Leave] always included at root
}

NpcResponse {
  label:        string
  check?:       CheckSpec       // absent = plain response; advances immediately
  // plain response:
  next?:        NodeId          // advance to this node immediately
  // check response (all optional; absent = terminal for that band):
  nextSuccess?: NodeId
  nextCost?:    NodeId          // default: same as nextSuccess
  nextFail?:    NodeId          // default: terminal, no reward
  nextCrit?:    NodeId          // default: same as nextSuccess
  reward?:      NpcReward       // reward granted when entering this path's terminal
  isLeave?:     boolean         // panel descends; npcState unchanged
  isTerminal?:  boolean         // panel descends after reward shown; npcState = 'completed'
}

CheckSpec {
  approaches:   ApproachColour[]    // 2–3 of 'red' | 'green' | 'blue' | 'yellow'
  difficulty:   number              // pip threshold (before floor scaling)
  allowBack?:   boolean             // default false — show [← Back] in stakes state only
                                    // when the caller can meaningfully let the player
                                    // decline after seeing stakes (e.g. gate approach,
                                    // shop haggle). Never true for mid-dialogue checks.
  stakeSuccess: string              // ✓ line shown in stakes state
  stakeCost:    string              // ◑ line
  stakeFail:    string              // ✗ line
  successLine:  string              // outcome-zone line after roll
  costLine:     string
  failLine:     string
  critLine?:    string              // default: same as successLine
  critBonus?:   NpcReward           // extra on critical, on top of main reward
}

NpcReward {
  gold?:  number     // added to pouch
  item?:  ItemId     // drawn from NPC item pool at award time
  hint?:  string     // shown in panel + appended to journal stub
}

type ApproachColour = 'red' | 'green' | 'blue' | 'yellow'
```

### Check panel state machine

The check panel is a **separate, reusable module** (`src/encounter/check-panel.ts`). It takes a
`CheckSpec` and a callback `onResult(band)`, manages the internal state machine below, and calls
the callback when a band is determined. The NPC encounter panel instantiates it when a check-gated
response is tapped. Future features provide their own `CheckSpec` to the same module.

```
  STAKES STATE
  ─────────────────────────────────────────────────────────────────
  Shows: stakes summary (✓ / ◑ / ✗ lines) + approach buttons (2–3)
  If allowBack: true → [← Back] returns to caller; no state change.
  If allowBack: false (NPC encounter) → no back option; player must choose an approach.
  Player taps approach button
         │
         ▼
  ROLL STATE
  ─────────────────────────────────────────────────────────────────
  Shows: full pool; chosen colour lit; others greyed; "Needs N" label
  [Roll] in thumb zone. No back button.
  Player taps [Roll]
         │
         ▼
  OUTCOME STATE (automatic)
  ─────────────────────────────────────────────────────────────────
  Dice animate. Chosen colour pips summed → band evaluated.
  Luck interrupt fires here if Failure + Luck-class item present (048).
  Outcome label + outcome line hold ~1.5 s.
         │
         ▼
  callback: onResult(band)   →   NPC encounter panel advances conversation
```

### NPC encounter panel — full flow

```
Pip enters NPC tile (npcState === 'active')
         │
         ▼
Camera moderate zoom (~400–600 ms, easing)
Encounter panel RISES (~200 ms) (via registry from 034)
         │
         ▼
ROOT NODE displayed (opening line + responses)
         │
  ┌──────┴─────────────────────────────────────────────┐
  │ Plain response        │ Check-gated response        │ Leave
  │                       │                             │
  ▼                       ▼                             ▼
Next node             Check panel              Panel descends
(NPC reacts)         (stakes → roll → result)  npcState unchanged
                           │
              ┌────────────┼────────────┬──────────┐
           Critical     Success       Cost       Failure
              │             │           │           │
          Outcome        Outcome    Outcome     Outcome
           node           node       node        node
              │             │           │           │
              └─────────────┴─────────────┘         │
                            │                        │
                    TERMINAL NODE               TERMINAL NODE
                    reward shown                (no reward)
                    ~2 s then:                  ~2 s then:
                    panel descends              panel descends
                    npcState = 'completed'      npcState = 'completed'
                    camera returns              camera returns

Re-entry (npcState === 'completed'):
         │
Camera moderate zoom (~400–600 ms)
Panel RISES (~200 ms)
         │
Dismissal line shown ~2 s (auto-advance; tap to dismiss early)
Panel DESCENDS. Camera returns. npcState unchanged.
```

### Approach colour and pool visibility

All dice in the full pool are shown during roll state. Chosen-colour dice have their face rendered
at full brightness; non-chosen dice are greyed. All dice animate on roll. Only the chosen colour's
pips appear in the "N vs. D" summary label.

If Pip has zero dice of the chosen colour, the roll will produce 0 pips of that colour — the
attempt can still proceed but near-certain failure is the result. This is intentional: the player
is making a risky choice and the system does not prevent it. Every check offers a 2nd or 3rd
approach as the viable alternative.

### Hint delivery and journal

When a hint is awarded, it appears in the panel as a centred italic line (`--text-muted`, 14px)
below the NPC's outcome line. It fades naturally when the terminal auto-advances. The same string
is appended to the Satchel Journal stub (feature 016) as a run log entry; the journal does not
need to be displayed in this feature — the append is a side-effect only.

### Hostile NPCs — future pattern (not built here)

When a hostile archetype ships, the convention is:
- A `hostilesOnFail: true` flag on the check's fail path
- The `stakeFail` line must name the consequence: *"He attacks."*
- On failure, the NPC encounter panel signals `'hostileTriggered'` to the registry; the registry
  transitions directly into the combat encounter for the tile's enemy (treated as a newly-placed
  enemy room)
- This is not specced here; documented to establish the pattern

---

## Visual design

**Temperature:** Warm — between dungeon-hot and camp-cool. Same register as the shop encounter.
The NPC panel should feel inviting, not dangerous.

**Panel surface:** `--surface` background. `--room-npc` top-edge border stripe (the blue NPC room
colour, consistent with the approach-colour die identity). Not gold-tinted like the chest; not
parchment-warm like the shop — this is a creature in a dungeon, not a merchant's stall.

---

**Layout — dialogue state (root and non-check nodes):**

```
┌─────────────────────────┐
│  [status strip — thin]  │
├─────────────────────────┤
│                         │
│  Moderate zoom:         │
│  NPC prominent in room; │  ← map zone: NPC visible; Pip visible alongside, smaller
│  Pip beside them        │
│                         │
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  ← PANEL_TOP (--room-npc top border stripe)
│[portrait icon]          │  ← ~36×36px silhouette, straddles map/panel edge
│ "Opening line of        │  ← 16px, weight 400, --text-primary; max 2 lines
│  dialogue here…"        │
│                         │
│  [Option A            ] │  ← full-width response buttons, vertically stacked
│  [Option B            ] │     16px, weight 500; check-gated ones show die glyph prefix
│  [Leave               ] │     check-gated: e.g.  🔵 "What do you know?"
└─────────────────────────┘     Leave: --text-muted styled
```

---

**Layout — check: stakes state (NPC encounter — no Back):**

```
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│[portrait icon]           │
│ ✓ Success outcome line   │  ← 14px, --text-muted; one line each
│ ◑ Cost outcome line      │
│ ✗ Failure outcome line   │
│                          │
│  Choose approach:        │  ← 13px, --text-muted label
│ [🔵 Reason] [🟡 Charm]   │  ← approach buttons; coloured outline border per die colour
│                          │     disabled approaches: greyed border, not tappable
└──────────────────────────┘     no Back button — choice already spoken
```

*(When `allowBack: true` — future callers only — a `[← Back]` button appears in the thumb zone
below the approach buttons, styled `--text-muted`. Tapping it fires the caller's back callback
with no state change.)*

---

**Layout — check: roll state:**

```
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│[portrait icon]           │
│ ✓ … ◑ … ✗ …             │  ← stakes (condensed / smaller after approach locks)
│ Needs 🔵 3               │  ← 14px, --text-muted; approach + threshold label
│                          │
│ [d6🔵][d4🔵]  [d6🔴]··· │  ← full pool; chosen colour lit; others greyed
│                          │
│  [         Roll        ] │  ← primary CTA; thumb zone; 18px
└──────────────────────────┘
```

---

**Layout — check: outcome state:**

```
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│[portrait icon]           │
│ "Outcome line here,      │  ← 16px, italic, --text-primary; auto-advances ~1.5s
│  one or two sentences."  │
│ 🔵 4 vs. 3 — Success     │  ← 14px, --text-muted; result summary below outcome line
│                          │
└──────────────────────────┘
```

---

**Layout — terminal with reward:**

```
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│[portrait icon]           │
│ "NPC's closing line."    │
│                          │
│  + 3 ◈                  │  ← gold: small line, --gold, if gold reward
│ ┌──────────────────────┐ │
│ │🌿 Crumb of Cheese    │ │  ← item card, if item reward
│ │  "Heals 2 HP"        │ │
│ └──────────────────────┘ │
│  "A shadow moves         │  ← hint, if hint reward; italic, --text-muted, centred
│   through the floor      │
│   below…"               │
│  [Take]  [Leave it]      │  ← only shown if item reward present
└──────────────────────────┘
```

*(Gold and hint auto-advance after ~2 s; item reward waits for [Take] or [Leave it].)*

---

**Color tokens**

No new tokens required. Existing palette covers all elements:

| Existing token | Used for in this feature |
|---|---|
| `--room-npc` (`#1a2a7a`) | Panel top-edge border stripe |
| `--surface` | Panel background |
| Blue die colour (`#1a2a7a`) | Blue approach button border |
| Red die colour (`#7a1a1a`) | Red approach button border |
| Green die colour (`#1a6a2a`) | Green approach button border |
| Yellow die colour (`#7a6a00`) | Yellow approach button border |
| `--text-primary` | NPC dialogue, response labels, outcome lines |
| `--text-muted` | Stakes text, needs-N label, result summary, hints |
| `--gold` | Gold reward amount |

**Typography / sizing**

- NPC dialogue line: 16px, weight 400, `--text-primary`
- Response button text: 16px, weight 500, `--text-primary`
- Check-gated response prefix (die glyph): 14px, `--text-muted`
- Stakes text (✓ / ◑ / ✗ lines): 14px, `--text-muted`
- "Needs N" label: 14px, `--text-muted`
- Result band + summary: 14px, `--text-muted`, italic
- Outcome line (NPC reaction post-roll): 16px, italic, `--text-primary`
- Hint text: 14px, italic, `--text-muted`, centred
- Gold reward amount: 16px, `--gold`
- Item card name: 15px, weight 500, `--text-primary`
- Item card description: 13px, `--text-muted`

---

## Open questions

None. This item is **READY**.

---

> The section below is filled in by the **Engineer** when the feature ships. Everything above is
> the Designer's original spec.

## Shipped

**Date:** 2026-06-08 · **PR:** (pending)

### What was built

Complete NPC encounter system with dialogue-first gameplay and integrated dice checks:

- **Three founding archetypes**: Rat Scavenger (wary deal-maker), Frightened Mouse (fearful but grateful), Old Hermit (wise tester)
- **Unified check panel**: Reusable module for approach-colour dice checks with three-band outcomes (success, success-at-a-cost, failure)
- **Dialogue state machine**: Conversation trees with branching responses, check-gated outcomes, and reward terminals
- **Reward system**: Gold, consumable items, and hint rewards with journal integration hooks
- **Encounter registry integration**: NPC rooms trigger automatically on entry; completed state shows dismissal lines on re-entry

Files shipped:
- `src/encounter/npc-scripts.ts` — conversation tree definitions and NPC archetype data
- `src/encounter/check-panel.ts` — reusable unified check panel module
- `src/encounter/npc-panel.ts` — NPC encounter panel with dialogue flow
- Updated `src/screens/game.ts` — NPC encounter registration
- Updated `src/dungeon/tuning.ts` — archetype and item pool weights
- Updated `src/map/types.ts` — TileCell fields for npcType and npcState

### Evidence

**Type-checking**: `npm run typecheck` passes cleanly. All type signatures validated.

**Code review**: Medium-effort review (6 finding angles) identified and fixed bugs in item acquisition, reward state management, completion initialization, state immutability, and rendering. All findings addressed before ship.

**Encounter registry**: NPC encounters registered for both `npcState === 'active'` and `npcState === 'completed'` states, following existing encounter pattern (combat, chest, shop, trap, item).

### Play-test

**Setup**: Place an NPC tile in a room with `npcType === 'rat-scavenger'` and `npcState === 'active'`.

**Golden path**:
1. Enter NPC room → camera zooms (1.4× to NPC), panel rises from bottom
2. Read opening line: "Oi, mouse. You've got that look…"
3. Tap "What do you know?" → stakes state appears (✓ / ◑ / ✗ lines + approach buttons)
4. Tap "🔵 Reason" → roll state (full pool shown, chosen colour lit, others greyed)
5. Tap [Roll] → dice animate, pips of chosen colour summed, result band shown (~1.5s)
6. Band determines outcome node and any reward (hint, gold, etc)
7. Outcome line displayed (~2s), then panel auto-descends, camera returns, npcState → 'completed'
8. Re-enter same room → dismissal state (random line from dismissalLines, ~2s), auto-advance

**Edge cases**:
- Tap [Leave] at root → panel descends immediately, npcState unchanged, re-entry shows identical opening
- Choose approach with 0 dice of that colour → button disabled (greyed, not tappable)
- Cost band outcome (e.g., Partial result on difficulty 3 with 2 pips) → shows costLine, no reward
- Satchel full (6 items) when item reward earned → item not acquired (TODO: show feedback message)
