# Decision detail files

This folder holds **detailed rationale** for decisions that need more than the one-line row in the
top-level [`DECISION_REGISTER.md`](../../DECISION_REGISTER.md).

- The register is the index; this folder is the depth.
- Add a file here (e.g. `dice-pool-resolution.md`) only when a decision's *why* genuinely warrants
  it — a paragraph of context, alternatives considered, or consequences.
- Link the detail file from its row in the register, and keep the register row a one-line summary.
- Maintained by the **Documenter**.

| File | Covers |
|---|---|
| `build-tooling.md` | Why Vite + TypeScript + Vitest (D3-v2) |
| `elastic-canvas.md` | Panel-over-map rendering contract; encounter panel rise/fall (D9, D11) |
| `encounter-registry.md` | EncounterPanel interface; registry trigger/registration model (D10) |
| `combat-mechanics.md` | Turn structure; active defence; Green reserve; intent system (D12, D13, D14) |
| `item-interjection.md` | Eight interjection windows; Luck interrupt; charges vs. quantity (D19, D20, D21) |
