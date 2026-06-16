---
title: Subagent-driven TDD plus adversarial review gates catch what happy-path TDD misses
date: 2026-06-15
category: workflow-issues
module: dumbometer
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - Building software where "never crashes" or hostile-input safety is a hard requirement
  - Using TDD and wanting to know what it structurally will not catch
tags: [tdd, code-review, adversarial-testing, subagents, epipe, prototype-pollution, workflow]
---

# Subagent-driven TDD plus adversarial review gates catch what happy-path TDD misses

## Context

The dumbometer plugin was built using subagent-driven TDD: a fresh implementer subagent per task, guided by a spec, with a quality-review subagent checking each unit before moving on. Tests were green. Code was clean. No lint errors. Two real defects still made it into the review gate — both invisible to the test suite because neither defect could be triggered by any input the test author thought to write.

## Guidance

TDD verifies the behaviors you *imagine*. It structurally misses inputs you didn't think to write a test for. The fix is not more tests of the same kind — it is a qualitatively different gate: an **adversarial review** whose explicit job is to construct hostile inputs and try to break the code. The reviewer is not checking whether the implementation matches the spec. The reviewer is trying to find a path to a crash or a corrupt render that no test covers.

For a tool with a hard "never crash the status line" requirement, that adversarial gate is where the claim actually gets verified — not the green test run.

The two-stage loop that worked here:

1. **Subagent TDD** — fresh implementer + spec + built-in `node:test`. Catches logic errors, wrong formulas, edge cases the spec author thought of.
2. **Adversarial review gate** (`ce:review`, reliability + correctness + security personas) — whole-repo read, hostile inputs, async failure modes. Catches the class of bug that requires inputs nobody imagined.

## Why This Matters

Both catches were real defects in production-bound code that green tests gave no signal about.

### 1. EPIPE crash

**Before** (simplified — `main()` without the guard):

```js
export async function main() {
  let out = '';
  try {
    out = buildLine(await readStdin(), process.env);
  } catch {
    out = '';
  }
  try {
    process.stdout.write(out);
  } catch {
    /* never crash the status line */
  }
}
```

**After** (current `src/main.js`):

```js
export async function main() {
  process.stdout.on('error', () => {}); // EPIPE: reader closed the pipe → swallow, never crash
  let out = '';
  try {
    out = buildLine(await readStdin(), process.env);
  } catch {
    out = '';
  }
  try {
    process.stdout.write(out);
  } catch {
    /* never crash the status line */
  }
}
```

**Why TDD missed it:** Unit tests call `buildLine()` directly or pipe a fixture through `main()` with stdout open. No test closes the read end of the pipe before `stdout.write()` returns. The EPIPE scenario is an async stream `'error'` event, not a thrown exception — the synchronous `try/catch` around `stdout.write()` does not intercept it. The defect only surfaces when a real shell pipeline (`node statusline.js | head -1`) closes the pipe early. Caught by a whole-repo reliability review.

---

### 2. Prototype pollution in env lookups

**Before** (plain object for THEMES, bracket lookup):

```js
// Unsafe version
const THEMES = { default: [46, 118, 226, 208, 196], /* ... */ };

if (env.DUMBOMETER_THEME && env.DUMBOMETER_THEME in THEMES) {
  const theme = THEMES[env.DUMBOMETER_THEME]; // "__proto__" → Object.prototype
  cfg.levels.forEach((lvl, i) => { lvl.color = theme[i]; }); // corrupts or throws
}
```

**After** (current `src/config.js`):

```js
// THEMES built with Object.create(null): prototype properties can never match a theme name
export const THEMES = Object.assign(Object.create(null), {
  default:   [46,  118, 226, 208, 196],
  matrix:    [46,  40,  34,  28,  22],
  vaporwave: [51,  45,  201, 198, 197],
  mono:      [252, 247, 242, 238, 196],
  hazard:    [46,  190, 226, 208, 196],
});

if (env.DUMBOMETER_THEME && Object.hasOwn(THEMES, env.DUMBOMETER_THEME)) {
  const theme = THEMES[env.DUMBOMETER_THEME];
  cfg.levels.forEach((lvl, i) => { lvl.color = theme[i]; });
}
```

**Before** (roast table keyed by label name — vulnerable to crafted `DUMBOMETER_LABELS`):

```js
const ROASTS = { 'Cooked': ' · /compact, champ', 'Dumb': " · it's over. /compact." };
// In render: ROASTS[state.label] — "toString" resolves to a function, not undefined
```

**After** (current `src/render.js` — keyed by level INDEX, not label string):

```js
// Roast keyed by level index (position in config.levels), not label name.
// Fires correctly even with custom DUMBOMETER_LABELS, and a crafted label like
// "toString" can no longer resolve to a native function. Index 3 = Cooked, 4 = Dumb.
const ROASTS = { 3: ' · /compact, champ', 4: " · it's over. /compact." };
```

**Why TDD missed it:** Every happy-path test uses `default`, `matrix`, or valid label strings — none uses `__proto__`, `constructor`, `toString`, or `valueOf` as an env-var value. A plain object lookup on a prototype-name key resolves to a live prototype property (an object, a function, or `undefined` depending on the key), corrupting the color array or the rendered string. No test asserted what happens when the theme name is a JS built-in identifier. Caught by `ce:review`'s correctness and security personas constructing hostile env inputs.

## When to Apply

- Any tool with a hard reliability contract ("never crashes", "always exits 0", "never corrupts output").
- Any code that reads from the environment, user input, or untrusted config — especially when keys are used as lookup keys into objects.
- Any async I/O path where the synchronous error model (`try/catch`) does not cover stream-level errors (`'error'` events, broken pipes, closed sockets).
- Whenever TDD is the primary quality gate and the spec was written by the same person who will write the tests — the blind spots are shared.

## Examples

See the two before/after pairs in **Why This Matters** above. The pattern in both cases is identical: the fix is one or two lines; the defect was invisible to the test suite because no test author thought to use a prototype-name string or a closed pipe as an input.

## Related

- `../best-practices/unbreakable-claude-code-status-line-2026-06-15.md`
