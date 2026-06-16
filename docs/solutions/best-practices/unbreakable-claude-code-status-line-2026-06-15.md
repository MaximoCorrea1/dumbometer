---
title: Building an unbreakable Claude Code status-line plugin
date: 2026-06-15
category: best-practices
module: dumbometer
problem_type: best_practice
component: tooling
severity: medium
applies_when:
  - Writing a Claude Code statusLine command (or any program printing to a status line every render)
  - Building a zero-dependency Node CLI that must never crash its host
tags: [claude-code, status-line, nodejs, esm, never-crash, epipe, ansi-color]
---

# Building an unbreakable Claude Code status-line plugin

## Context

A Claude Code `statusLine` command runs on **every render** — every keystroke, every tool result, every token received. A crash produces a visible error banner; garbled output corrupts the status line for the rest of the session. There is no graceful retry. The contract is strict: **always emit valid text, always exit 0, never throw to the shell**.

This is the discipline used by [dumbometer](https://github.com/MaximoCorrea1/dumbometer), a 256-color context-window gauge (Smart → Coasting → Foggy → Cooked → Dumb). Every pattern below is load-bearing.

## Guidance

### 1. Keep the core pure — side effects only in `main()`

Structure the program as a pipeline of pure functions; all I/O lives in exactly one place.

```
stdin text → parse() → computeState() → render() → colorize() → stdout
```

`buildLine(stdinText, env)` in `src/main.js` wires the pipeline and is itself pure (takes inputs, returns a string). `main()` is the only function that touches `process.stdin`, `process.stdout`, or `process.env`. This makes every stage independently testable and ensures there are no surprise side effects inside the hot path.

### 2. Zero dependencies, Node ESM, built-in test runner

- No `package.json` `dependencies` or `devDependencies`. The only assumed binary is `node`.
- Use `"type": "module"` / ESM imports throughout.
- Tests run with `node --test` (built-in `node:test` + `node:assert/strict`). No Jest, no Vitest, no install step.

This means the plugin has no supply-chain surface, no lockfile drift, and installs in zero milliseconds.

### 3. The never-crash trifecta

Three separate failure modes require three separate guards. Applying only one or two leaves a gap.

**Guard A — EPIPE: register an error handler on stdout before any write**

```js
// src/main.js
process.stdout.on('error', () => {}); // EPIPE: reader closed the pipe → swallow, never crash
```

Why a synchronous `try/catch` around `process.stdout.write()` is not enough: Node's `stream.write()` emits an `'error'` event asynchronously when the downstream consumer (Claude Code) closes the pipe. That event fires outside the current call stack, so it cannot be caught synchronously. Without this handler, Node raises an unhandled `'error'` event and terminates the process with a non-zero exit code and a stack trace to stderr — exactly what you cannot afford.

**Guard B — top-level try/catch around all logic**

```js
export async function main() {
  process.stdout.on('error', () => {}); // register FIRST, before any write
  let out = '';
  try {
    out = buildLine(await readStdin(), process.env);
  } catch {
    out = ''; // safe fallback: emit nothing rather than crashing
  }
  try {
    process.stdout.write(out);
  } catch {
    /* never crash the status line */
  }
}
```

The `buildLine` try/catch catches synchronous errors from any stage of the pipeline (bad parse, unexpected data shape, render edge case). The second try/catch around `write()` is a last-resort belt for synchronous write errors.

**Guard C — safe fallback at the entrypoint**

```js
// statusline.js
#!/usr/bin/env node
import { main } from './src/main.js';
main().catch(() => {});
```

`main()` is async. `.catch(() => {})` ensures that if something escapes both inner try/catches and rejects the promise, it is swallowed. The process exits 0.

**Net result:** no code path can produce a non-zero exit or unexpected stdout output. When everything fails, the status line is simply blank — not broken.

### 4. 256-color ANSI via `String.fromCharCode(27)`

Never embed raw ESC bytes (0x1B) literally in source files. They survive in most editors but break in some terminals, diffs, and copy-paste. Instead:

```js
// src/colorize.js
const ESC = String.fromCharCode(27); // ANSI escape (0x1B)

export function colorize(text, color, config) {
  if (!config.color) return text;
  if (color == null) return text;
  return `${ESC}[38;5;${color}m${text}${ESC}[0m`;
}
```

The SGR sequence `\e[38;5;{n}m` selects xterm-256 foreground color `n`; `\e[0m` resets. This produces output like `\e[38;5;196mDumb     █████████████░ 92%\e[0m` for the "Dumb" state (color 196, red). Respects `NO_COLOR` and `DUMBOMETER_NO_COLOR` env vars by returning bare text.

### 5. Width-adaptive rendering + cold-start state

The renderer gracefully degrades when the terminal is narrow, and handles the case where no context data has arrived yet (cold start):

```js
// src/render.js
export function render(reading, state, config, columns = 80) {
  if (reading.cold) {
    const word = config.levels[0].name.padEnd(labelWidth);
    const full = `${word} ${bar(0, config.width)} …`;
    if (full.length <= columns) return full;
    const noWord = `${bar(0, config.width)} …`;
    if (noWord.length <= columns) return noWord;
    return '…';
  }

  const pct = Math.round(reading.usedPct);
  const word = state.label.padEnd(labelWidth);
  const full = `${word} ${bar(pct, config.width)} ${pct}%`;
  if (full.length <= columns) return full;

  const noWord = `${bar(pct, config.width)} ${pct}%`;
  if (noWord.length <= columns) return noWord;

  return `${pct}%`;
}
```

Three fallback tiers: full label + bar + percentage → bar + percentage → percentage only. `COLUMNS` is read from `env` in `buildLine`, validated as a positive integer, and defaults to 80 if absent or invalid:

```js
const parsedCols = parseInt(env.COLUMNS, 10);
const columns = Number.isInteger(parsedCols) && parsedCols > 0 ? parsedCols : 80;
```

### 6. Parse defensively — never throws, always returns a cold reading on bad input

```js
// src/parse.js
export function parse(stdinText) {
  const cold = { usedPct: 0, windowSize: null, model: null, cold: true };
  let data;
  try { data = JSON.parse(stdinText); } catch { return cold; }
  if (!data || typeof data !== 'object') return cold;
  // ... extract fields with type guards at every step ...
  if (usedPct === null || Number.isNaN(usedPct)) return { ...cold, windowSize, model };
  usedPct = Math.max(0, Math.min(100, usedPct));
  return { usedPct, windowSize, model, cold: false };
}
```

Every field access is guarded. Missing, null, wrong-typed, or NaN values all resolve to the cold reading rather than propagating an error.

## Why This Matters

Three distinct failure modes, each invisible without deliberate defense:

| Mode | What happens without the guard |
|---|---|
| **EPIPE** | Claude Code closes the pipe while `write()` is in flight → unhandled `'error'` event → Node prints stack trace to stderr and exits non-zero → status line shows an error |
| **Malformed stdin** | Claude Code sends unexpected JSON shape, empty string, or no data at all → `JSON.parse` throws or field access throws → uncaught exception → non-zero exit |
| **ANSI corruption** | Incomplete escape sequence (e.g. reset `\e[0m` not emitted on error path) → terminal color bleeds into subsequent output across the entire Claude Code UI |

EPIPE is the subtlest: it is a normal operating condition (not a bug), happens asynchronously, and is invisible in local testing because you typically run the script with your own terminal as consumer.

## When to Apply

- Any program registered as `statusLine` in Claude Code `settings.json`.
- Any CLI that writes to stdout and may be consumed by a pipe that closes early.
- Any Node script that must be safe to call from a shell hook, CI step, or parent process that doesn't want your crashes to propagate.
- Any plugin where "blank output" is a better failure mode than "error output."

## Examples

**Before (naive implementation):**

```js
// WRONG — three gaps in one function
async function main() {
  const text = await readStdin();
  const data = JSON.parse(text);              // throws on bad input
  const line = buildLine(data);
  process.stdout.write(colorize(line) + '\n'); // EPIPE crash possible
}
main();                                        // unhandled rejection propagates
```

**After (never-crash implementation):**

```js
// statusline.js — outer catch swallows any escaped rejection
import { main } from './src/main.js';
main().catch(() => {});

// src/main.js — three-layer defense
export async function main() {
  process.stdout.on('error', () => {});   // (1) EPIPE guard — must be first
  let out = '';
  try {
    out = buildLine(await readStdin(), process.env);  // (2) logic guard
  } catch {
    out = '';                             // safe fallback: blank, not broken
  }
  try {
    process.stdout.write(out);            // (3) write guard — belt+suspenders
  } catch { /* never crash */ }
}
```

**Test asserting the never-crash contract (real assertion from `test/main.test.js`):**

```js
test('garbage never throws, yields safe cold line', () => {
  assert.equal(buildLine('totally not json {{{', env), 'Smart    ░░░░░░░░░░░░░░ …');
});
```

No special "expect no throw" helper needed — if `buildLine` threw, the test would fail. The assertion on the return value simultaneously proves the function didn't throw AND produced the correct safe fallback output.

**Test asserting 256-color ANSI structure:**

```js
test('color is applied when enabled — 256-color SGR for Dumb (code 196)', () => {
  const ESC = String.fromCharCode(27);
  const out = buildLine(fx('high.json'), { COLUMNS: '80' });
  assert.equal(out, ESC + '[38;5;196m' + 'Dumb     █████████████░ 92%' + ESC + '[0m');
});
```

Constructing `ESC` the same way in tests as in production ensures the escape sequence round-trips correctly without any raw bytes in the test source.

## Related

- `../documentation-gaps/claude-code-plugin-platform-constraints-2026-06-15.md` — what Claude Code exposes and doesn't expose to statusLine plugins (payload schema, env vars, install).
- `../workflow-issues/subagent-tdd-adversarial-review-gates-2026-06-15.md` — the review gate that caught the EPIPE bug TDD missed.
