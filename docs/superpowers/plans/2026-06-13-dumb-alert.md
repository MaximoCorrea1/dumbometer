# dumb-alert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Claude Code plugin that renders a status-line gauge showing how close the current session is to "going dumb" (Smart → Dumb) as the context window fills.

**Architecture:** A single, dependency-free Node.js script invoked as a `statusLine` command. Claude Code pipes a JSON event on stdin; a pure pipeline (`parse → computeState → render → colorize`) turns it into one colored line on stdout. All logic is pure and unit-tested; the only side effects live in `main()` and the setup script. The status line must never crash (every path resolves to safe output + exit 0).

**Tech Stack:** Node.js (stdlib only — guaranteed present wherever Claude Code runs), ESM modules, Node's built-in `node:test` runner. Zero runtime and dev dependencies.

---

## Schema confidence

Fixtures are built from the Claude Code status-line JSON schema confirmed by **two independent doc lookups** (`context_window.used_percentage`, `context_window.context_window_size`, `model.display_name`, etc.). Task 9 captures a **live payload** to confirm before release; `parse()` is written defensively (prefers `used_percentage`, falls back to token math, degrades to a safe "cold" reading) so a minor schema surprise cannot break the gauge.

## File structure

```
<project root>/
├── .claude-plugin/plugin.json    # plugin manifest
├── package.json                  # {"type":"module"}, test script, no deps
├── statusline.js                 # entry: stdin → stdout (thin)
├── src/
│   ├── config.js                 # env → config (pure)
│   ├── parse.js                  # stdin text → reading (pure)
│   ├── state.js                  # usedPct → {label,severity} (pure)
│   ├── render.js                 # reading+state → bar string (pure)
│   ├── colorize.js               # text+severity → ANSI (pure)
│   ├── main.js                   # buildLine (pure) + main/readStdin (IO)
│   └── setup-core.js             # settings transforms (pure)
├── scripts/setup.mjs             # /setup IO: read/backup/write settings.json
├── commands/setup.md             # /dumb-alert:setup command (prompt)
├── tools/capture.js              # dev-only: capture a live payload
├── test/
│   ├── fixtures/*.json
│   └── *.test.js
├── README.md
└── VISION.md  DESIGN.md  CONTEXT.md  CLAUDE.md   (already present)
```

Each `src/*.js` file has one responsibility and no cross-dependencies except `main.js`, which composes them. This keeps every unit testable in isolation.

---

## Task 1: Scaffold + payload-capture tool

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `package.json`
- Create: `tools/capture.js`
- Create: `test/fixtures/low.json`, `mid.json`, `high.json`, `cold.json`, `tokens-only.json`

- [ ] **Step 1: Create the plugin manifest**

`.claude-plugin/plugin.json`:
```json
{
  "name": "dumb-alert",
  "displayName": "Dumb Alert",
  "version": "0.1.0",
  "description": "A minimal status-line gauge that shows when your Claude Code session is going dumb (Smart -> Dumb) as the context window fills.",
  "author": { "name": "Maximo Correa Rosas", "email": "maximocorrearosas@gmail.com" },
  "license": "MIT",
  "keywords": ["status-line", "context", "context-window", "monitoring", "dx"]
}
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "dumb-alert",
  "version": "0.1.0",
  "description": "A Claude Code status-line gauge that shows when a session is going dumb as context fills.",
  "type": "module",
  "scripts": { "test": "node --test" },
  "license": "MIT"
}
```

- [ ] **Step 3: Create the dev capture tool**

`tools/capture.js`:
```js
#!/usr/bin/env node
// tools/capture.js — DEV ONLY. Temporarily wire this as your statusLine command
// to capture a real payload into test/fixtures/captured-latest.json, then inspect it.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { data += c; });
process.stdin.on('end', () => {
  try {
    const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'test', 'fixtures');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'captured-latest.json'), data);
  } catch { /* ignore */ }
  process.stdout.write('capturing…');
});
```

- [ ] **Step 4: Create seed fixtures (from the confirmed schema)**

`test/fixtures/low.json`:
```json
{ "model": { "id": "claude-opus-4-8", "display_name": "Opus" },
  "context_window": { "used_percentage": 20, "remaining_percentage": 80, "context_window_size": 200000 } }
```
`test/fixtures/mid.json`:
```json
{ "model": { "id": "claude-opus-4-8", "display_name": "Opus" },
  "context_window": { "used_percentage": 58, "remaining_percentage": 42, "context_window_size": 200000 } }
```
`test/fixtures/high.json`:
```json
{ "model": { "id": "claude-opus-4-8", "display_name": "Opus" },
  "context_window": { "used_percentage": 92, "remaining_percentage": 8, "context_window_size": 200000 } }
```
`test/fixtures/cold.json`:
```json
{ "model": { "id": "claude-opus-4-8", "display_name": "Opus" }, "context_window": null }
```
`test/fixtures/tokens-only.json`:
```json
{ "model": { "id": "claude-opus-4-8", "display_name": "Opus" },
  "context_window": { "total_input_tokens": 150000, "context_window_size": 200000 } }
```

- [ ] **Step 5: Verify scaffold**

Run: `node --test` (no tests yet → exits 0) and `node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8'));console.log('manifest ok')"`
Expected: `manifest ok`, and `node --test` exits 0.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "scaffold: plugin manifest, package.json, fixtures, capture tool"
```

---

## Task 2: `config.js` — env → config (pure)

**Files:**
- Create: `src/config.js`
- Test: `test/config.test.js`

- [ ] **Step 1: Write the failing test**

`test/config.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, DEFAULTS } from '../src/config.js';

test('defaults when env is empty', () => {
  const c = loadConfig({});
  assert.equal(c.width, 10);
  assert.deepEqual(c.thresholds, { warming: 50, slipping: 70, dumb: 90 });
  assert.deepEqual(c.labels, { smart: 'Smart', warming: 'Warming', slipping: 'Slipping', dumb: 'Dumb' });
  assert.equal(c.color, true);
});

test('valid width override', () => {
  assert.equal(loadConfig({ DUMB_ALERT_WIDTH: '20' }).width, 20);
});

test('invalid width falls back to default', () => {
  assert.equal(loadConfig({ DUMB_ALERT_WIDTH: 'abc' }).width, 10);
  assert.equal(loadConfig({ DUMB_ALERT_WIDTH: '0' }).width, 10);
});

test('valid thresholds override', () => {
  assert.deepEqual(loadConfig({ DUMB_ALERT_THRESHOLDS: '40,60,80' }).thresholds,
    { warming: 40, slipping: 60, dumb: 80 });
});

test('non-monotonic thresholds rejected', () => {
  assert.deepEqual(loadConfig({ DUMB_ALERT_THRESHOLDS: '80,60,40' }).thresholds, DEFAULTS.thresholds);
});

test('labels override', () => {
  assert.deepEqual(loadConfig({ DUMB_ALERT_LABELS: 'A,B,C,D' }).labels,
    { smart: 'A', warming: 'B', slipping: 'C', dumb: 'D' });
});

test('NO_COLOR disables color', () => {
  assert.equal(loadConfig({ NO_COLOR: '1' }).color, false);
  assert.equal(loadConfig({ DUMB_ALERT_NO_COLOR: '' }).color, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/config.test.js`
Expected: FAIL — cannot find module `../src/config.js`.

- [ ] **Step 3: Write minimal implementation**

`src/config.js`:
```js
// Pure config: defaults + environment overrides.
export const DEFAULTS = {
  width: 10,
  thresholds: { warming: 50, slipping: 70, dumb: 90 },
  labels: { smart: 'Smart', warming: 'Warming', slipping: 'Slipping', dumb: 'Dumb' },
  color: true,
};

export function loadConfig(env = process.env) {
  const cfg = {
    width: DEFAULTS.width,
    thresholds: { ...DEFAULTS.thresholds },
    labels: { ...DEFAULTS.labels },
    color: DEFAULTS.color,
  };

  const w = parseInt(env.DUMB_ALERT_WIDTH, 10);
  if (Number.isInteger(w) && w >= 1 && w <= 100) cfg.width = w;

  if (env.DUMB_ALERT_THRESHOLDS) {
    const p = env.DUMB_ALERT_THRESHOLDS.split(',').map((s) => parseInt(s.trim(), 10));
    if (p.length === 3 && p.every((n) => Number.isInteger(n) && n >= 0 && n <= 100)
        && p[0] < p[1] && p[1] < p[2]) {
      cfg.thresholds = { warming: p[0], slipping: p[1], dumb: p[2] };
    }
  }

  if (env.DUMB_ALERT_LABELS) {
    const p = env.DUMB_ALERT_LABELS.split(',').map((s) => s.trim());
    if (p.length === 4 && p.every((s) => s.length > 0)) {
      cfg.labels = { smart: p[0], warming: p[1], slipping: p[2], dumb: p[3] };
    }
  }

  if (env.NO_COLOR !== undefined || env.DUMB_ALERT_NO_COLOR !== undefined) cfg.color = false;

  return cfg;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/config.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/config.js test/config.test.js
git commit -m "feat: config loader with env overrides"
```

---

## Task 3: `parse.js` — stdin text → reading (pure)

**Files:**
- Create: `src/parse.js`
- Test: `test/parse.test.js`

- [ ] **Step 1: Write the failing test**

`test/parse.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from '../src/parse.js';

const fx = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');

test('reads used_percentage', () => {
  const r = parse(fx('mid.json'));
  assert.equal(r.cold, false);
  assert.equal(r.usedPct, 58);
  assert.equal(r.windowSize, 200000);
  assert.equal(r.model, 'Opus');
});

test('computes from tokens when used_percentage absent', () => {
  const r = parse(fx('tokens-only.json'));
  assert.equal(r.cold, false);
  assert.equal(r.usedPct, 75);
});

test('null context_window → cold', () => {
  const r = parse(fx('cold.json'));
  assert.equal(r.cold, true);
  assert.equal(r.usedPct, 0);
  assert.equal(r.model, 'Opus');
});

test('malformed input → cold, never throws', () => {
  const r = parse('not json {{{');
  assert.equal(r.cold, true);
  assert.equal(r.usedPct, 0);
});

test('empty input → cold', () => {
  assert.equal(parse('').cold, true);
});

test('clamps out-of-range percentage', () => {
  assert.equal(parse('{"context_window":{"used_percentage":150}}').usedPct, 100);
  assert.equal(parse('{"context_window":{"used_percentage":-5}}').usedPct, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/parse.test.js`
Expected: FAIL — cannot find module `../src/parse.js`.

- [ ] **Step 3: Write minimal implementation**

`src/parse.js`:
```js
// Pure: raw stdin text -> normalized reading. Never throws.
export function parse(stdinText) {
  const cold = { usedPct: 0, windowSize: null, model: null, cold: true };

  let data;
  try { data = JSON.parse(stdinText); } catch { return cold; }
  if (!data || typeof data !== 'object') return cold;

  const model = (data.model && (data.model.display_name || data.model.id)) || null;
  const cw = data.context_window;
  if (!cw || typeof cw !== 'object') return { ...cold, model };

  const windowSize = typeof cw.context_window_size === 'number' ? cw.context_window_size : null;

  let usedPct = null;
  if (typeof cw.used_percentage === 'number') {
    usedPct = cw.used_percentage;
  } else if (typeof cw.total_input_tokens === 'number' && windowSize) {
    usedPct = (cw.total_input_tokens / windowSize) * 100;
  }

  if (usedPct === null || Number.isNaN(usedPct)) return { ...cold, windowSize, model };

  usedPct = Math.max(0, Math.min(100, usedPct));
  return { usedPct, windowSize, model, cold: false };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/parse.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/parse.js test/parse.test.js
git commit -m "feat: defensive payload parser"
```

---

## Task 4: `state.js` — usedPct → {label, severity} (pure)

**Files:**
- Create: `src/state.js`
- Test: `test/state.test.js`

- [ ] **Step 1: Write the failing test**

`test/state.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeState } from '../src/state.js';
import { DEFAULTS } from '../src/config.js';

const cfg = DEFAULTS;
const label = (p) => computeState(p, cfg).label;
const sev = (p) => computeState(p, cfg).severity;

test('label boundaries', () => {
  assert.equal(label(0), 'Smart');
  assert.equal(label(49), 'Smart');
  assert.equal(label(50), 'Warming');
  assert.equal(label(69), 'Warming');
  assert.equal(label(70), 'Slipping');
  assert.equal(label(89), 'Slipping');
  assert.equal(label(90), 'Dumb');
  assert.equal(label(100), 'Dumb');
});

test('severity mapping', () => {
  assert.equal(sev(10), 'green');
  assert.equal(sev(60), 'green');
  assert.equal(sev(75), 'yellow');
  assert.equal(sev(95), 'red');
});

test('uses config labels and thresholds', () => {
  const c = { thresholds: { warming: 40, slipping: 60, dumb: 80 },
              labels: { smart: 'A', warming: 'B', slipping: 'C', dumb: 'D' } };
  assert.equal(computeState(65, c).label, 'C');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/state.test.js`
Expected: FAIL — cannot find module `../src/state.js`.

- [ ] **Step 3: Write minimal implementation**

`src/state.js`:
```js
// Pure: usedPct + config -> { label, severity }.
export function computeState(usedPct, config) {
  const { thresholds, labels } = config;
  const pct = Math.max(0, Math.min(100, usedPct));
  if (pct >= thresholds.dumb) return { label: labels.dumb, severity: 'red' };
  if (pct >= thresholds.slipping) return { label: labels.slipping, severity: 'yellow' };
  if (pct >= thresholds.warming) return { label: labels.warming, severity: 'green' };
  return { label: labels.smart, severity: 'green' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/state.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/state.js test/state.test.js
git commit -m "feat: threshold-based state mapping"
```

---

## Task 5: `render.js` — bar string (pure)

**Files:**
- Create: `src/render.js`
- Test: `test/render.test.js`

- [ ] **Step 1: Write the failing test**

`test/render.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../src/render.js';
import { DEFAULTS } from '../src/config.js';

const st = (label, severity) => ({ label, severity });

test('renders word + bar + pct with stable column (bar starts at col 10)', () => {
  const out = render({ usedPct: 58, cold: false }, st('Warming', 'green'), DEFAULTS, 80);
  assert.equal(out, 'Warming  ██████░░░░ 58%');
  assert.equal(out.indexOf('█'), 9); // 8-wide label + 1 space
});

test('short label pads so the bar still starts at col 10', () => {
  const out = render({ usedPct: 20, cold: false }, st('Smart', 'green'), DEFAULTS, 80);
  assert.equal(out, 'Smart    ██░░░░░░░░ 20%');
  assert.equal(out.indexOf('█'), 9);
});

test('cold reading shows muted placeholder', () => {
  const out = render({ usedPct: 0, cold: true }, st('Smart', 'green'), DEFAULTS, 80);
  assert.equal(out, 'Smart    ░░░░░░░░░░ …');
});

test('narrow terminal drops the word, then the bar', () => {
  const r = { usedPct: 92, cold: false };
  assert.equal(render(r, st('Dumb', 'red'), DEFAULTS, 20), '█████████░ 92%');
  assert.equal(render(r, st('Dumb', 'red'), DEFAULTS, 10), '92%');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/render.test.js`
Expected: FAIL — cannot find module `../src/render.js`.

- [ ] **Step 3: Write minimal implementation**

`src/render.js`:
```js
// Pure: build the bar string. No color here (see colorize).
function bar(usedPct, width) {
  const filled = Math.max(0, Math.min(width, Math.round((usedPct / 100) * width)));
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

export function render(reading, state, config, columns = 80) {
  const labelWidth = Math.max(...Object.values(config.labels).map((l) => l.length));

  if (reading.cold) {
    const word = config.labels.smart.padEnd(labelWidth);
    return `${word} ${bar(0, config.width)} …`;
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

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/render.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/render.js test/render.test.js
git commit -m "feat: bar renderer with stable columns + width adaptation"
```

---

## Task 6: `colorize.js` — ANSI color (pure)

**Files:**
- Create: `src/colorize.js`
- Test: `test/colorize.test.js`

- [ ] **Step 1: Write the failing test**

`test/colorize.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colorize } from '../src/colorize.js';

const ESC = String.fromCharCode(27); // ANSI escape (0x1B)

test('wraps in ANSI for severity', () => {
  assert.equal(colorize('x', 'red', { color: true }), `${ESC}[31mx${ESC}[0m`);
  assert.equal(colorize('x', 'yellow', { color: true }), `${ESC}[33mx${ESC}[0m`);
  assert.equal(colorize('x', 'green', { color: true }), `${ESC}[32mx${ESC}[0m`);
});

test('no color when disabled', () => {
  assert.equal(colorize('x', 'red', { color: false }), 'x');
});

test('unknown severity is left plain', () => {
  assert.equal(colorize('x', 'blue', { color: true }), 'x');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/colorize.test.js`
Expected: FAIL — cannot find module `../src/colorize.js`.

- [ ] **Step 3: Write minimal implementation**

`src/colorize.js`:
```js
// Pure: wrap text in ANSI color for severity, unless disabled.
const ESC = String.fromCharCode(27); // ANSI escape (0x1B)
const CODES = { red: 31, yellow: 33, green: 32 };

export function colorize(text, severity, config) {
  if (!config.color) return text;
  const code = CODES[severity];
  if (!code) return text;
  return `${ESC}[${code}m${text}${ESC}[0m`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/colorize.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/colorize.js test/colorize.test.js
git commit -m "feat: ANSI colorizer with NO_COLOR support"
```

---

## Task 7: `main.js` + `statusline.js` — glue + unbreakable entry

**Files:**
- Create: `src/main.js`
- Create: `statusline.js`
- Test: `test/main.test.js`, `test/integration.test.js`

- [ ] **Step 1: Write the failing unit test for `buildLine`**

`test/main.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildLine } from '../src/main.js';

const fx = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');
const env = { NO_COLOR: '1', COLUMNS: '80' };

test('mid payload → Warming line', () => {
  assert.equal(buildLine(fx('mid.json'), env), 'Warming  ██████░░░░ 58%');
});

test('high payload → Dumb line', () => {
  assert.equal(buildLine(fx('high.json'), env), 'Dumb     █████████░ 92%');
});

test('cold payload → muted line', () => {
  assert.equal(buildLine(fx('cold.json'), env), 'Smart    ░░░░░░░░░░ …');
});

test('garbage never throws, yields safe cold line', () => {
  assert.equal(buildLine('totally not json {{{', env), 'Smart    ░░░░░░░░░░ …');
});

test('color is applied when enabled', () => {
  const out = buildLine(fx('high.json'), { COLUMNS: '80' });
  assert.ok(out.startsWith(String.fromCharCode(27) + '[31m')); // red
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/main.test.js`
Expected: FAIL — cannot find module `../src/main.js`.

- [ ] **Step 3: Write `src/main.js`**

```js
// Glue. buildLine is pure (text + env -> string). main/readStdin are the only IO.
import { parse } from './parse.js';
import { computeState } from './state.js';
import { render } from './render.js';
import { colorize } from './colorize.js';
import { loadConfig } from './config.js';

export function buildLine(stdinText, env = process.env) {
  const config = loadConfig(env);
  const reading = parse(stdinText);
  const state = computeState(reading.usedPct, config);
  const columns = parseInt(env.COLUMNS, 10) || 80;
  const text = render(reading, state, config, columns);
  return colorize(text, state.severity, config);
}

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) { resolve(''); return; }
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { data += c; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(data));
  });
}

export async function main() {
  let out = '';
  try {
    out = buildLine(await readStdin(), process.env);
  } catch {
    out = ''; // unbreakable: never crash the status line
  }
  process.stdout.write(out);
}
```

- [ ] **Step 4: Write `statusline.js` entry**

```js
#!/usr/bin/env node
import { main } from './src/main.js';
main();
```

- [ ] **Step 5: Write the integration test**

`test/integration.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (input) => execFileSync('node', [join(root, 'statusline.js')],
  { input, env: { ...process.env, NO_COLOR: '1', COLUMNS: '80' }, encoding: 'utf8' });

test('renders a line from a real-ish payload', () => {
  const out = run(readFileSync(join(root, 'test/fixtures/mid.json'), 'utf8'));
  assert.match(out, /Warming/);
  assert.match(out, /58%/);
});

test('exits 0 (never crashes) on garbage — execFileSync throws on non-zero exit', () => {
  const out = run('totally not json {{{');
  assert.equal(out, 'Smart    ░░░░░░░░░░ …');
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `node --test`
Expected: PASS (all suites green, including main + integration).

- [ ] **Step 7: Commit**

```bash
git add src/main.js statusline.js test/main.test.js test/integration.test.js
git commit -m "feat: status line entry point with unbreakable guard"
```

---

## Task 8: Setup command (`/dumb-alert:setup`)

**Files:**
- Create: `src/setup-core.js`
- Create: `scripts/setup.mjs`
- Create: `commands/setup.md`
- Test: `test/setup-core.test.js`

- [ ] **Step 1: Write the failing test for the pure core**

`test/setup-core.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusLineCommand, applySetup, applyRemove } from '../src/setup-core.js';

test('builds a quoted node command', () => {
  assert.equal(statusLineCommand('/abs/dir/statusline.js'), 'node "/abs/dir/statusline.js"');
});

test('applySetup adds statusLine, preserves other keys', () => {
  const next = applySetup({ theme: 'dark' }, 'node "x"');
  assert.deepEqual(next, { theme: 'dark', statusLine: { type: 'command', command: 'node "x"' } });
});

test('applySetup overwrites an existing statusLine', () => {
  const next = applySetup({ statusLine: { type: 'command', command: 'old' } }, 'new');
  assert.equal(next.statusLine.command, 'new');
});

test('applyRemove deletes statusLine, preserves other keys', () => {
  assert.deepEqual(applyRemove({ theme: 'dark', statusLine: { type: 'command', command: 'x' } }),
    { theme: 'dark' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/setup-core.test.js`
Expected: FAIL — cannot find module `../src/setup-core.js`.

- [ ] **Step 3: Write the pure core**

`src/setup-core.js`:
```js
// Pure settings transforms (no IO) so they are unit-testable.
export function statusLineCommand(statuslinePath) {
  return `node "${statuslinePath}"`;
}

export function applySetup(settings, command) {
  return { ...settings, statusLine: { type: 'command', command } };
}

export function applyRemove(settings) {
  const { statusLine, ...rest } = settings;
  return rest;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/setup-core.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the IO script**

`scripts/setup.mjs`:
```js
#!/usr/bin/env node
// Wire (or unwire) the dumb-alert status line into ~/.claude/settings.json.
// The pure transforms live in ../src/setup-core.js; this file is the thin IO layer.
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { statusLineCommand, applySetup, applyRemove } from '../src/setup-core.js';

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(here, '..');
const settingsPath = join(homedir(), '.claude', 'settings.json');

function readSettings(p) {
  if (!existsSync(p)) return {};
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return {}; }
}

const mode = process.argv[2] === 'remove' ? 'remove' : 'setup';
const current = readSettings(settingsPath);

mkdirSync(dirname(settingsPath), { recursive: true });
if (existsSync(settingsPath)) copyFileSync(settingsPath, settingsPath + '.bak');

const next = mode === 'remove'
  ? applyRemove(current)
  : applySetup(current, statusLineCommand(join(pluginRoot, 'statusline.js')));

writeFileSync(settingsPath, JSON.stringify(next, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, mode, path: settingsPath, statusLine: next.statusLine ?? null }));
```

- [ ] **Step 6: Write the command prompt**

`commands/setup.md`:
```markdown
---
description: Install or remove the dumb-alert context gauge in your Claude Code status line
---

# dumb-alert: setup

Wire the dumb-alert gauge into the user's Claude Code status line.

1. Run the bundled setup script with the Bash tool from the plugin directory:
   - Install: `node "${CLAUDE_PLUGIN_ROOT}/scripts/setup.mjs"`
   - Remove (only if the user asked to uninstall): `node "${CLAUDE_PLUGIN_ROOT}/scripts/setup.mjs" remove`
   If `${CLAUDE_PLUGIN_ROOT}` is not set in your shell, locate this plugin's `scripts/setup.mjs` and run it with `node`.
2. The script writes `~/.claude/settings.json` (backing up the old one to `settings.json.bak`) and prints a JSON result. Report to the user the settings path and what changed.
3. Tell the user to send one more message so Claude Code re-renders the status line; they should see e.g. `Smart ██░░░░░░░░ 20%`. To revert, run `/dumb-alert:setup` and ask to remove, or restore `settings.json.bak`.
```

- [ ] **Step 7: Commit**

```bash
git add src/setup-core.js scripts/setup.mjs commands/setup.md test/setup-core.test.js
git commit -m "feat: /dumb-alert:setup command + tested settings transforms"
```

---

## Task 9: README, validation, and live verification

**Files:**
- Create: `README.md`
- Modify: `test/fixtures/captured-latest.json` (generated, gitignored — see note)

- [ ] **Step 1: Write the README**

`README.md` (sections: what it is, the Smart→Dumb gauge with a sample line, install via marketplace, local dev via `--plugin-dir`, `/dumb-alert:setup`, configuration env vars table from DESIGN.md, uninstall). Keep it tight and copy-pasteable.

- [ ] **Step 2: Validate the plugin**

Run: `claude plugin validate .`
Expected: passes (manifest + command structure valid). Fix any reported issues.

- [ ] **Step 3: Capture and verify a LIVE payload**

- Temporarily set your status line to the capture tool, e.g. run `node scripts/setup.mjs` then edit the command to `node "<abs>/tools/capture.js"` (or set it manually), send a message, then inspect `test/fixtures/captured-latest.json`.
- Confirm `parse(capturedText)` returns a sensible `usedPct` (add a one-off assertion or run `node -e`).
- If field names differ from the seed fixtures, update `src/parse.js` + fixtures and re-run `node --test`.
- Restore the real status line: `node scripts/setup.mjs`.

- [ ] **Step 4: Dogfood end-to-end**

- With `claude --plugin-dir .`, run `/dumb-alert:setup`, send a message, and confirm the gauge appears and updates as context grows.
- Add `test/fixtures/captured-latest.json` to `.gitignore` (it is machine-specific).

- [ ] **Step 5: Final test run + commit**

Run: `node --test`
Expected: all green.
```bash
git add -A
git commit -m "docs: README + live-payload verification"
```

---

## Self-review

- **Spec coverage:** metric (Task 3), status-line surface + entry (Task 7), Smart→Dumb morphing word (Tasks 4–5), bar + color (Tasks 5–6), pure ambient behavior (no notification code — by omission, per spec), config/env overrides (Task 2), install UX (Task 8), error-handling/unbreakable (Task 7), testing strategy (every task), repo structure (Task 1), live-schema verification (Task 9). All DESIGN.md sections map to a task.
- **Placeholder scan:** all code steps contain complete code; the only deferred items are the live-capture values (Task 9, inherently runtime) and README prose (Step 1 lists exact sections). No TBDs in code.
- **Type consistency:** the `reading` shape `{usedPct, windowSize, model, cold}` is produced by `parse` and consumed identically by `render`/`buildLine`; `state` `{label, severity}` from `computeState` is consumed by `render`/`colorize`; `config` `{width, thresholds, labels, color}` is consistent across `config`/`state`/`render`/`colorize`. `statusLineCommand`/`applySetup`/`applyRemove` names match between core, tests, and `scripts/setup.mjs`.
