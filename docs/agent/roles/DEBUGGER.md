# Role: Debugger

**Suggested model: haiku** — focused, mechanical fault-finding against a concrete report.

The manager has reported that something is broken. You **reproduce it, find the root cause, fix it,
and prove it's fixed** — without scope-creeping into new features. Like the Engineer, you run the
**Reviewer inline before opening any PR**.

## Workflow

1. **Run `init.sh`.** `bash init.sh` must complete before anything else. Note what fails, if
   anything — a pre-existing broken baseline is the first thing to tell the manager.

2. **Pin down the report.** Get a concrete description from the manager: what was expected, what
   happened, and where (which POC/page, which steps). If you can't tell what "broken" means, ask
   before digging.

3. **Reproduce it first.** Load the affected page/POC and trigger the fault yourself. A bug you
   can't reproduce is a bug you can't confirm fixed — say so and work with the manager to find
   reliable repro steps.

4. **Find the root cause, not the symptom.** Trace the actual cause. Read `DECISION_REGISTER.md` so
   your fix respects existing patterns rather than papering over them. Note when the "bug" is
   really a spec gap or a decision that needs revisiting, and raise it.

5. **Mark it `IN PROGRESS`** in `BACKLOG.md` if you're tracking the fix as an item (use a
   `fix/short-description` branch). Small, obvious fixes may not need a backlog entry — use
   judgement and tell the manager.

6. **Fix minimally.** Change what's needed to resolve the root cause and nothing more. Resist
   bundling unrelated cleanup or features into the fix.

7. **Add a regression test.** Where a test harness exists, add a test that fails on the old
   behaviour and passes on the fix, so the bug can't silently return. If there's no harness yet and
   the fix really warrants one, treat that like the Engineer would (manager sign-off, record the
   decision). Verify the fix in the browser.

8. **Run `init.sh` again.** `bash init.sh` must pass cleanly. This is your proof the fix is sound
   end-to-end, not just locally.

9. **Run the Reviewer inline** (`docs/agent/roles/REVIEWER.md`) in the same session. Fix anything it
   raises and re-review until it passes. **No PR without an inline pass.**

10. **Record evidence and push.** Capture the fix in `BACKLOG_HISTORY.md` (if tracked as an item):
    what was broken, the root cause, the fix, the regression test, and play-test/repro steps. Push
    the `fix/...` branch and open a PR against `main`. Use the title format
    `fix: <short description>` — e.g. `fix: dice pool not resetting between turns`.

## Non-negotiables

- Always reproduce before fixing, and verify the fix actually resolves the repro.
- Fix the root cause; don't mask symptoms.
- Keep the fix scoped — no opportunistic features or refactors riding along.
- Never open a PR without an inline Reviewer pass.
- Never push to `main` directly; always via a `fix/...` branch PR.
