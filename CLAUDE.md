# CLAUDE.md — dumb-alert

Guidance for Claude working in this repo. See **VISION.md** (why), **DESIGN.md**
(how), **CONTEXT.md** (state & decisions).

## What this is

A Claude Code plugin: a status-line gauge that shows how close the current session is
to "going dumb" as the context window fills (**Smart → Dumb**). One fast Node script,
zero dependencies.

## Hard rules

- **No runtime dependencies.** Standard library only; `node` is the only assumed
  binary. (No dev dependencies either — tests use Node's built-in runner.)
- **The status line must never break.** Every path in `main()` resolves to safe
  output + `exit 0`. No uncaught throws; no stray stdout/stderr. This is the #1
  reliability requirement.
- **The hot path is cheap.** Synchronous, no network, no file IO per render.
- **Keep the core pure.** `parse` / `computeState` / `render` / `colorize` take
  inputs and return values — no global state, no side effects. Side effects live only
  in `main()`.

## Conventions

- Pure logic in `src/`; `statusline.js` is a thin entry that wires stdin → `main` →
  stdout.
- Match the surrounding file style; keep files small and single-purpose.

## Testing

- TDD: write the failing test first, then implement.
- Run with `node --test` (built-in `node:test`); fixtures are real captured payloads
  in `test/fixtures/`.
- Before any logic depends on the payload schema, **verify it against a live capture**
  (see the DESIGN "spike").

## Running it locally

- Simulate a render: `echo '<fixture json>' | node statusline.js`
- Install into Claude Code: `/dumb-alert:setup` (writes `statusLine` to settings.json).

## Compact instructions

If compacting a session about this project, preserve: the five locked decisions
(CONTEXT.md decision log), the "never break the status line" rule, and the
live-payload verification step.
