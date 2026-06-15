import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../src/render.js';
import { DEFAULTS } from '../src/config.js';

// state objects: render only reads state.label
const st = (label) => ({ label });

test('renders word + bar + pct with stable column (bar starts at col 9)', () => {
  // labelWidth = 8 ("Coasting"); "Foggy" padEnd(8) = "Foggy   " + " " = bar at index 9
  const out = render({ usedPct: 58, cold: false }, st('Foggy'), DEFAULTS, 80);
  assert.equal(out, 'Foggy    ██████░░░░ 58%');
  assert.equal(out.indexOf('█'), 9); // 8-wide label + 1 space
});

test('short label pads so the bar still starts at col 9', () => {
  const out = render({ usedPct: 20, cold: false }, st('Smart'), DEFAULTS, 80);
  assert.equal(out, 'Smart    ██░░░░░░░░ 20%');
  assert.equal(out.indexOf('█'), 9);
});

test('cold reading shows muted placeholder with Smart label', () => {
  const out = render({ usedPct: 0, cold: true }, st('Smart'), DEFAULTS, 80);
  assert.equal(out, 'Smart    ░░░░░░░░░░ …');
});

test('narrow terminal drops the word, then the bar', () => {
  const r = { usedPct: 92, cold: false };
  assert.equal(render(r, st('Dumb'), DEFAULTS, 20), '█████████░ 92%');
  assert.equal(render(r, st('Dumb'), DEFAULTS, 10), '92%');
});

test('cold at columns:80 still yields full placeholder', () => {
  const out = render({ usedPct: 0, cold: true }, st('Smart'), DEFAULTS, 80);
  assert.equal(out, 'Smart    ░░░░░░░░░░ …');
});

test('cold at columns:5 truncates to ellipsis', () => {
  const out = render({ usedPct: 0, cold: true }, st('Smart'), DEFAULTS, 5);
  assert.equal(out, '…');
});

test('Coasting label pads correctly (same width as Coasting)', () => {
  const out = render({ usedPct: 30, cold: false }, st('Coasting'), DEFAULTS, 80);
  assert.equal(out, 'Coasting ███░░░░░░░ 30%');
  assert.equal(out.indexOf('█'), 9); // 8-wide label + 1 space
});
