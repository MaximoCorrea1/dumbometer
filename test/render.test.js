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
