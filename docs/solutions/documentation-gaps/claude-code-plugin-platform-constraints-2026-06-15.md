---
title: Claude Code plugin platform constraints (status line, install, Pages)
date: 2026-06-15
category: documentation-gaps
module: dumbometer
problem_type: documentation_gap
component: tooling
severity: medium
applies_when:
  - Shipping a Claude Code plugin that needs a statusLine
  - Distributing a plugin via a GitHub marketplace repo (public or private)
  - Hosting plugin docs or a landing on GitHub Pages
tags: [claude-code, plugin, status-line, marketplace, github-pages, settings-json]
---

# Claude Code plugin platform constraints (status line, install, Pages)

## Context

When shipping dumbometer — a Claude Code plugin that gauges context-window fill in the status bar — we expected a straightforward path: declare a `statusLine` in `plugin.json`, maybe hook `settings.json` on install, host docs on GitHub Pages. All three assumptions were wrong. What follows is the gap map: what the platform actually allows vs. what you'd naturally assume, and exactly what we did instead.

## Guidance

### 1. Plugins cannot register `statusLine` — ship a `/setup` slash command instead

`plugin.json` carries plugin metadata (name, version, author, keywords, homepage) but does **not** let a plugin register a `statusLine`. Hooks also have no permission to write `~/.claude/settings.json`. The user must wire the status line themselves.

**Workaround:** ship a slash command (`commands/setup.md`) that instructs Claude Code to run a Node setup script. The script does all the dangerous work — atomically, safely:

```js
// scripts/setup.mjs (IO layer, abbreviated)
const settingsPath = join(homedir(), '.claude', 'settings.json');

// 1. Abort on unreadable or non-JSON settings (JSONC comments → data loss risk)
function readSettings(p) {
  if (!existsSync(p)) return {};
  const raw = readFileSync(p, 'utf8');
  try { return JSON.parse(raw); }
  catch {
    console.log(JSON.stringify({ ok: false, error: 'existing settings.json is not valid JSON (comments/JSONC?); aborting to avoid data loss' }));
    process.exit(1);
  }
}

// 2. Back up once (never overwrite the backup)
if (existsSync(settingsPath) && !existsSync(settingsPath + '.bak'))
  copyFileSync(settingsPath, settingsPath + '.bak');

// 3. Write atomically: temp file + rename (atomic on POSIX; best-effort on Windows)
const tmp = settingsPath + '.tmp';
writeFileSync(tmp, JSON.stringify(next, null, 2) + '\n');
renameSync(tmp, settingsPath);
```

The pure transform lives in `src/setup-core.js`:

```js
export function statusLineCommand(statuslinePath) {
  // Normalize Windows backslashes → forward slashes (Node accepts them everywhere;
  // backslashes are shell-dependent inside the status-line command string).
  const forward = statuslinePath.split('\\').join('/');
  if (forward.includes('"'))
    throw new Error('statusline path contains a double-quote; rename the directory');
  return `node "${forward}"`;
}

export function applySetup(settings, command) {
  return { ...settings, statusLine: { type: 'command', command } };
}
```

The resulting `settings.json` entry:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node \"/abs/path/to/statusline.js\""
  }
}
```

**Key invariants for the script:** idempotent (re-running is safe), atomic write (temp+rename), back up once (never overwrite `settings.json.bak`), abort on unparseable JSON (comments in JSONC files will look like parse failures — exit rather than clobber).

---

### 2. The statusLine command receives JSON on stdin — schema and runtime behavior

Claude Code pipes a JSON object to the `statusLine` command on stdin on every render. The status line runs on a **~300 ms debounce** (in-flight runs cancelled on new trigger). It costs **zero tokens** and runs locally. `$COLUMNS` / `$LINES` are available. ANSI color is supported.

**Verified field names** (captured from a live Opus 4.8 1M-context session, locked as a regression fixture):

```json
{
  "session_id": "...",
  "model": {
    "id": "claude-opus-4-8[1m]",
    "display_name": "Opus 4.8 (1M context)"
  },
  "context_window": {
    "total_input_tokens": 450324,
    "context_window_size": 1000000,
    "used_percentage": 45,
    "remaining_percentage": 55,
    "current_usage": {
      "input_tokens": 285,
      "output_tokens": 4,
      "cache_creation_input_tokens": 1113,
      "cache_read_input_tokens": 448926
    }
  },
  "exceeds_200k_tokens": true,
  "transcript_path": "...",
  "version": "2.1.177"
}
```

**Critical gotcha:** `context_window` (and `current_usage`) is **`null` before the first API call and immediately after `/compact`**. Every statusLine script must handle this "cold" reading — return a neutral fallback rather than crashing. `SessionStart` / `SessionEnd` hooks exist; there is no dedicated compact hook.

`context_window_size` is `200000` by default or `1000000` on extended-context models. `used_percentage` is provided directly; you can also compute it as `total_input_tokens / context_window_size * 100` if needed.

---

### 3. Single-plugin self-marketplace: `source: "./"` in `marketplace.json`

A public repo can act as its own marketplace entry. No external registry required. The `marketplace.json` in `.claude-plugin/` references the repo itself:

```json
{
  "name": "dumbometer",
  "plugins": [
    {
      "name": "dumbometer",
      "source": "./",
      "description": "...",
      "homepage": "https://github.com/MaximoCorrea1/dumbometer",
      "license": "MIT"
    }
  ]
}
```

Install sequence (three steps, no magic):

```
/plugin marketplace add MaximoCorrea1/dumbometer
/plugin install dumbometer
/dumbometer:setup
```

`plugin.json` carries metadata (name, version, keywords, homepage, author) but does not register any runtime behavior by itself — that all happens via the slash command triggered in step 3.

---

### 4. Private-repo distribution is the access gate — Claude Code has no license mechanism

Claude Code has **no built-in entitlement or license check**. If you want to restrict who can install a plugin (for paid distribution), the mechanism is simply: keep the repo private. Only users with git credentials that can clone the repo can install it.

Consequence for monetization: the Polar / Lemon Squeezy model (sell a GitHub repo invite or org seat) is the natural fit. Grant access → buyer clones → installs. Revoke access → they can no longer re-clone or get updates. There is no server-side license validation and no way to inject one through the plugin platform today.

---

### 5. GitHub Pages needs `.nojekyll` or Jekyll builds your markdown and 404s

When a repo's root contains a `README.md` (or any markdown) and you enable GitHub Pages without a `.nojekyll` file, GitHub runs Jekyll on the source, tries to process the markdown as a Jekyll site, and typically produces 404s or broken layouts for anything that doesn't follow Jekyll's conventions.

**Fix:** one empty file at the repo root:

```
touch .nojekyll
```

Commit it. Pages will then serve files as-is (static pass-through). This is especially easy to miss on plugin repos where the markdown is documentation for the plugin, not a Jekyll site.

---

### 6. Runtime config reaches a statusLine plugin only through environment variables

The statusLine command runs non-interactively on every render (JSON on stdin, no TTY, no flags), so the only channel for per-user configuration is **environment variables** the plugin reads from `process.env` (dumbometer uses `DUMBOMETER_THEME`, `DUMBOMETER_ROAST`, `DUMBOMETER_WIDTH`, ...). Claude Code spawns the command as a child process, so it inherits Claude Code's environment.

Set config persistently:
- macOS/Linux: export in your shell profile (`~/.zshrc`, `~/.bashrc`), then restart Claude Code.
- Windows: `setx DUMBOMETER_THEME matrix`, then restart Claude Code.

**Gotcha:** `setx` and profile exports only affect processes started *after* they run, so a Claude Code session that is already open will not see the new value. Start a fresh session (or terminal) for the statusLine to pick it up. Do not try to bake `VAR=value` into the `settings.json` statusLine command string: that syntax is shell-specific (POSIX `VAR=val cmd` vs Windows) and not portable. Environment plus restart is the reliable path.

## Why This Matters

Each constraint caused a real failure or unexpected rework:

- **statusLine not declarable in plugin.json** → we had to design and ship the `/dumbometer:setup` command + the entire `scripts/setup.mjs` + `src/setup-core.js` stack. Without knowing this upfront, a plugin author would ship `plugin.json` with a `statusLine` entry and have no clear path forward.
- **`context_window` null after `/compact`** → without the cold-reading guard, the statusLine script crashes or renders garbage after every compact. The "never break the status line" invariant requires explicit null handling on every render path.
- **Schema unverified from docs alone** → we captured a real payload and locked it as a regression fixture rather than trusting field names from memory. Skipping that would leave the parser brittle to any docs drift.
- **No license/entitlement mechanism** → if you plan to monetize before understanding this, you'll build a payment flow and then discover you have no way to enforce access. Private repo + git credentials is the only lever.
- **Missing `.nojekyll`** → the landing page 404'd on GitHub Pages until the file was added. It's a one-line fix that's invisible in docs unless you already know to look for it.

## When to Apply

- You are writing a Claude Code plugin and want to show data in the status line.
- You are designing the install UX for a plugin and need to understand what `plugin.json` can and cannot do automatically.
- You are distributing a plugin and considering monetization or access control.
- You are hosting a plugin landing page or documentation on GitHub Pages.
- You are writing a statusLine script and need the exact stdin schema and null-safety requirements.

## Examples

### Full install sequence

```
/plugin marketplace add MaximoCorrea1/dumbometer   # registers the marketplace source
/plugin install dumbometer                          # clones and registers the plugin
/dumbometer:setup                                   # runs setup.mjs → writes statusLine to settings.json
# Send one more message — status line re-renders:   Smart    ██░░░░░░░░░░░░ 20%
```

To remove: `/dumbometer:setup remove` (script calls `applyRemove`, which strips `statusLine` from settings).

### Minimal stdin JSON shape (what your script must handle)

```json
{
  "model": { "id": "claude-sonnet-4-5", "display_name": "Claude Sonnet 4.5" },
  "context_window": {
    "context_window_size": 200000,
    "used_percentage": 72,
    "total_input_tokens": 144000
  },
  "exceeds_200k_tokens": false
}
```

Cold reading (null context, must not crash):

```json
{
  "model": { "id": "claude-sonnet-4-5", "display_name": "Claude Sonnet 4.5" },
  "context_window": null,
  "exceeds_200k_tokens": false
}
```

### `.nojekyll` one-liner

```bash
touch .nojekyll && git add .nojekyll && git commit -m "fix: prevent Jekyll from processing repo for GitHub Pages"
```

## Related

- `../best-practices/unbreakable-claude-code-status-line-2026-06-15.md`
- `../best-practices/monetize-oss-plugin-private-repo-polar-2026-06-15.md`
