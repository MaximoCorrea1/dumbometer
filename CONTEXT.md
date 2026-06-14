# dumb-alert — Context

> Living document: current state, decisions, and platform facts. Keep it updated as
> the project moves. (Fittingly, this is exactly the kind of durable context that
> fights the problem this tool measures.)

## Status

**Phase:** Built, reviewed, and **schema-verified** (v0.1.0) on branch
`feat/status-line-gauge` — 40 tests passing, `claude plugin validate` clean, final
whole-repo review passed.
**Schema verified (2026-06-14):** captured a live status-line payload from a 1M-window
Opus 4.8 session; the real field names match exactly — `context_window` provides
`used_percentage` (45), `context_window_size` (1000000), `total_input_tokens`, and
`model.display_name`. `parse()` reads them correctly, and the real-payload shape is now
locked in as a regression fixture (`test/fixtures/real-1m.json`).

## Decision log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-13 | Measure context-window **% used** | Only honest, available proxy for "going dumb"; provided directly by Claude Code |
| 2026-06-13 | Render in the **status line** | Native, always-visible, zero-cost, glanceable |
| 2026-06-13 | Scale = **Smart → Dumb** (morphing word) | Unambiguous (Dumb is clearly the bad end), dev-native, needs no decoding |
| 2026-06-13 | **Pure ambient gauge**, no interruptions | Spend zero "intrusion budget"; user opts in by looking |
| 2026-06-13 | **Node.js**, zero deps | `node` guaranteed present; built-in JSON; pure, testable core |

## Platform facts — Claude Code status line

Researched 2026-06-13 from the official docs (https://code.claude.com/docs/en/statusline.md).
**Treat the field names below as high-confidence-but-unverified until the build spike
captures a live payload.**

- Claude Code pipes JSON to the `statusLine` command on **stdin**. Reported relevant fields:
  - `context_window.used_percentage`, `context_window.remaining_percentage`
  - `context_window.context_window_size` (200000 default; 1000000 extended)
  - `context_window.total_input_tokens`,
    `context_window.current_usage.{input,output,cache_creation,cache_read}_tokens`
  - `exceeds_200k_tokens` (bool), `model.id` / `model.display_name`, `transcript_path`
- `context_window` / `current_usage` is **null before the first API call and right
  after `/compact`** — must be handled (the "cold" reading).
- Re-runs on new message, `/compact`, permission/vim changes; **debounced ~300 ms**;
  an in-flight run is cancelled when a new trigger fires. Optional `refreshInterval` (≥1 s).
- Runs locally — **no token cost**. `$COLUMNS` / `$LINES` available (v2.1.153+).
  ANSI color supported.
- **Plugins cannot register `statusLine`** — the user must wire `settings.json`
  (hence `/dumb-alert:setup`).
- No `PreCompact` / `PostCompact` hook; `SessionStart` / `SessionEnd` exist.

## Glossary

- **Context rot** — quality decay as the context window fills.
- **Cold reading** — a render where usage data isn't available yet (pre-first-call or
  post-compact).

## Open questions / parking lot

- Final plugin **name** (`dumb-alert` is the working name; alternatives: `dumbometer`,
  `dumbar`). "Alert" slightly implies notifications we deliberately don't do — revisit
  before publishing.
- Partial-block bar glyphs (`▏▎▍▌▋▊▉`) for smoother fill — optional polish, deferred.
- Distribution (plugin marketplace vs. plain git) — decide at ship.
