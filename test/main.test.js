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
