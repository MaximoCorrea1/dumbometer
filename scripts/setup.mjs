#!/usr/bin/env node
// Wire (or unwire) the dumb-alert status line into ~/.claude/settings.json.
// The pure transforms live in ../src/setup-core.js; this file is the thin IO layer.
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { statusLineCommand, applySetup, applyRemove } from '../src/setup-core.js';

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(here, '..');
const settingsPath = join(homedir(), '.claude', 'settings.json');

function readSettings(p) {
  if (!existsSync(p)) return {};
  let raw;
  try {
    raw = readFileSync(p, 'utf8');
  } catch (e) {
    // OS-level read error (EACCES, EISDIR, etc.) — abort without writing.
    console.log(JSON.stringify({
      ok: false,
      error: `could not read settings.json: ${e.message}`,
      path: p,
    }));
    process.exit(1);
  }
  try {
    return JSON.parse(raw);
  } catch {
    // File exists but is not valid JSON (e.g. JSONC with comments).
    // Abort immediately — do NOT overwrite; data loss is unacceptable.
    console.log(JSON.stringify({
      ok: false,
      error: 'existing settings.json is not valid JSON (comments/JSONC?); aborting to avoid data loss — fix or back it up, then retry',
      path: p,
    }));
    process.exit(1);
  }
}

const mode = process.argv[2] === 'remove' ? 'remove' : 'setup';
const current = readSettings(settingsPath);

mkdirSync(dirname(settingsPath), { recursive: true });
if (existsSync(settingsPath) && !existsSync(settingsPath + '.bak')) copyFileSync(settingsPath, settingsPath + '.bak');

let next;
try {
  next = mode === 'remove'
    ? applyRemove(current)
    : applySetup(current, statusLineCommand(join(pluginRoot, 'statusline.js')));

  const DATA = JSON.stringify(next, null, 2) + '\n';
  const tmp = settingsPath + '.tmp';
  writeFileSync(tmp, DATA);
  renameSync(tmp, settingsPath);
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e.message, path: settingsPath }));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, mode, path: settingsPath, statusLine: next.statusLine ?? null }));
