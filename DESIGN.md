# dumb-alert — Design

> Technical specification. See **VISION.md** for *why*, **CONTEXT.md** for current
> state and platform facts.

## Overview

A single, fast, dependency-free Node.js script that Claude Code runs as its
`statusLine` command. On each render Claude Code pipes a JSON event to the script on
stdin; the script computes a "dumbness" level from context-window usage and prints
one colored line to stdout. Stateless, pure, no network.

## Why Node.js

`node` ships with Claude Code, so it is guaranteed present on every user's machine —
no install step, no dependency to break. Built-in `JSON.parse`, fast enough for the
~300 ms render debounce, cross-platform, and the core logic is pure (payload →
string), which makes it trivial to unit-test.

Alternatives considered and rejected:
- **POSIX shell + `jq`** — `jq` is not guaranteed installed; shell is fragile on
  Windows.
- **Compiled binary (Go/Rust)** — build toolchain plus per-platform artifacts, for
  something that just formats a string. Overkill.

## Data flow

```
stdin JSON ─▶ parse() ─▶ {usedPct, windowSize, model, cold}
                              │
                     computeState() ─▶ {label, severity}
                              │
              render() + colorize() ─▶ "Slipping ████████░░ 79%" ─▶ stdout (exit 0)
```

## Components

Each is a small, pure, independently testable unit.

### `parse(stdinText) → Reading`
Parse the JSON event and extract a normalized reading:
- `usedPct: number` — context-window % used (0–100).
- `windowSize: number` — max context tokens (e.g. 200000, 1000000).
- `model: string` — model id/name (display only, optional).
- `cold: boolean` — usage data not yet available.

Prefers a provided `context_window.used_percentage`; otherwise computes
`usedTokens / context_window.context_window_size * 100`. (Exact field names are
**verified against a live payload during the build spike** — see CONTEXT.md.)

Tolerates: empty/malformed input, and a missing/null `context_window` (null before
the first API response and immediately after `/compact`) → returns a neutral reading
(`usedPct: 0, cold: true`).

### `computeState(usedPct, config) → State`
Maps % to `{ label, severity }`:

| % used | label    | severity (color) |
|--------|----------|------------------|
| 0–49   | Smart    | green            |
| 50–69  | Warming  | green            |
| 70–89  | Slipping | yellow           |
| 90–100 | Dumb     | red              |

Pure; thresholds and labels come from config.

### `render(reading, state, config, columns) → string`
Builds `"<word> <bar> <pct>%"`:
- Bar: `width` cells (default 10); filled = `round(usedPct/100 * width)` using
  `█` / `░`.
- **Stable columns:** the word is right-padded to the widest label width
  (8 = "Slipping") so the bar never shifts horizontally as the word changes — no jitter.
- **Width-adaptive:** if `$COLUMNS` is narrow, shrink the bar, then drop the word,
  then drop the bar — degrade gracefully down to just `NN%`.
- **Cold state:** render a muted `Smart  …  0%` rather than a misleading full reading.

### `colorize(text, severity, config) → string`
Wraps text in ANSI color for the severity (green/yellow/red). No color when
`NO_COLOR` is set or `config.color === false`.

### `main()`
Glue: read stdin → parse → computeState → render → colorize → print. **Wrapped in a
top-level guard: any error prints a safe minimal fallback (empty or a single neutral
glyph) and exits 0.** Never throws; never writes diagnostics to stdout (that would
render as garbage in the bar).

## Configuration

Zero-config by default. Optional overrides via environment variables
(status-line-friendly; set in the `settings.json` command or the user's shell):

| Var | Effect | Default |
|-----|--------|---------|
| `DUMB_ALERT_WIDTH` | bar cells | `10` |
| `DUMB_ALERT_THRESHOLDS` | Warming,Slipping,Dumb start % | `50,70,90` |
| `DUMB_ALERT_LABELS` | the four words | `Smart,Warming,Slipping,Dumb` |
| `DUMB_ALERT_NO_COLOR` / `NO_COLOR` | disable color | unset |

No config file on the hot path (avoids file IO on every render).

## Install / activation

Claude Code plugins **cannot** auto-register a status line (only `agent` /
`subagentStatusLine` are plugin-configurable today). So the plugin ships the script
plus a setup command:

- **`/dumb-alert:setup`** — locates `~/.claude/settings.json` (or project
  `.claude/settings.json`), backs it up, and inserts:
  ```json
  { "statusLine": { "type": "command", "command": "node \"<abs>/statusline.js\"" } }
  ```
  Detects an existing `statusLine` and asks before replacing.
  `/dumb-alert:setup remove` restores the backup.
- **Manual fallback:** the README documents the one-line snippet.

## Error handling & performance

- **Unbreakable** is the top reliability requirement: the status line runs hundreds
  of times per session, so every failure path resolves to safe output + `exit 0`.
- **Fast:** synchronous, no network, no file IO on the hot path; work after Node
  startup is sub-millisecond.
- **Quiet:** nothing but the intended line on stdout; nothing on stderr in normal
  operation.

## Testing

- Pure functions → unit + golden-output (snapshot) tests using Node's built-in
  `node:test` (no test dependencies).
- Fixtures are **real captured payloads**: fresh/cold, 50%, 79%, 95%, null-context,
  1M-window model, `NO_COLOR`, narrow `$COLUMNS`.
- Thin integration test: pipe a fixture into the script, assert exact stdout.
- **First implementation step is a spike** to capture a real status-line payload and
  lock field names before any logic depends on them.

## Repo structure

```
<project root>/
├── .claude-plugin/plugin.json   # manifest (schema confirmed at build)
├── statusline.js                # entry: stdin → stdout
├── src/{parse,state,render,config}.js
├── test/{fixtures/*.json, *.test.js}
├── commands/setup.*             # /dumb-alert:setup
├── README.md
└── VISION.md  DESIGN.md  CONTEXT.md  CLAUDE.md
```

## Extensibility

The pure pipeline + config keeps additions cheap and non-disruptive:
- In-bar `· /compact?` hint at critical → an extra branch in `render`.
- Composite signal (turns since `/compact`, etc.) → a new reading field feeding
  `computeState`.
- Alternate styles (face, both-poles) → render strategies selected by config.
