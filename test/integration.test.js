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
