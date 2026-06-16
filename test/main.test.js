import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildLine } from '../src/main.js';

const fx = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');
const env = { NO_COLOR: '1', COLUMNS: '80' };
const ESC = String.fromCharCode(27);

test('mid payload (58%) → Foggy line', () => {
  assert.equal(buildLine(fx('mid.json'), env), 'Foggy    ████████░░░░░░ 58%');
});

test('high payload (92%) → Dumb line', () => {
  assert.equal(buildLine(fx('high.json'), env), 'Dumb     █████████████░ 92%');
});

test('cold payload → muted line', () => {
  assert.equal(buildLine(fx('cold.json'), env), 'Smart    ░░░░░░░░░░░░░░ …');
});

test('garbage never throws, yields safe cold line', () => {
  assert.equal(buildLine('totally not json {{{', env), 'Smart    ░░░░░░░░░░░░░░ …');
});

test('color is applied when enabled — 256-color SGR for Dumb (code 196)', () => {
  const out = buildLine(fx('high.json'), { COLUMNS: '80' });
  assert.equal(out, ESC + '[38;5;196m' + 'Dumb     █████████████░ 92%' + ESC + '[0m');
});

test('cooked range (75%) → Cooked line', () => {
  assert.equal(buildLine('{"context_window":{"used_percentage":75}}', env), 'Cooked   ███████████░░░ 75%');
});

test('low payload (20%) → Smart line', () => {
  assert.equal(buildLine(fx('low.json'), env), 'Smart    ███░░░░░░░░░░░ 20%');
});

// Fix 10: guard $COLUMNS to a positive integer
test('negative COLUMNS falls back to 80', () => {
  assert.equal(buildLine(fx('mid.json'), { NO_COLOR: '1', COLUMNS: '-5' }), 'Foggy    ████████░░░░░░ 58%');
});

test('non-numeric COLUMNS falls back to 80', () => {
  assert.equal(buildLine(fx('mid.json'), { NO_COLOR: '1', COLUMNS: 'abc' }), 'Foggy    ████████░░░░░░ 58%');
});

// Fix 11: round usedPct once so label and % agree
test('fractional percentage 69.6 rounds to 70, label and % agree', () => {
  const out = buildLine('{"context_window":{"used_percentage":69.6}}', { NO_COLOR: '1', COLUMNS: '80' });
  assert.ok(out.includes('Cooked'), `expected Cooked in: ${out}`);
  assert.ok(out.includes('70%'), `expected 70% in: ${out}`);
});
