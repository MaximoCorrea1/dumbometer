import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeState } from '../src/state.js';
import { DEFAULTS } from '../src/config.js';

const cfg = DEFAULTS;
const label = (p) => computeState(p, cfg).label;
const color = (p) => computeState(p, cfg).color;

test('label boundaries — 5 levels', () => {
  // Smart: 0–24
  assert.equal(label(0),   'Smart');
  assert.equal(label(24),  'Smart');
  // Coasting: 25–49
  assert.equal(label(25),  'Coasting');
  assert.equal(label(49),  'Coasting');
  // Foggy: 50–69
  assert.equal(label(50),  'Foggy');
  assert.equal(label(69),  'Foggy');
  // Cooked: 70–89
  assert.equal(label(70),  'Cooked');
  assert.equal(label(89),  'Cooked');
  // Dumb: 90–100
  assert.equal(label(90),  'Dumb');
  assert.equal(label(100), 'Dumb');
});

test('color codes for each level', () => {
  assert.equal(color(0),   46);   // Smart    — bright green
  assert.equal(color(25),  118);  // Coasting — green
  assert.equal(color(50),  226);  // Foggy    — yellow
  assert.equal(color(70),  208);  // Cooked   — orange
  assert.equal(color(90),  196);  // Dumb     — red
});

test('clamps negative pct to Smart', () => {
  assert.equal(label(-5), 'Smart');
  assert.equal(color(-5), 46);
});

test('clamps > 100 pct to Dumb', () => {
  assert.equal(label(150), 'Dumb');
  assert.equal(color(150), 196);
});

test('uses config levels (custom thresholds and names)', () => {
  const c = {
    levels: [
      { name: 'A', min: 0,  color: 1 },
      { name: 'B', min: 40, color: 2 },
      { name: 'C', min: 60, color: 3 },
      { name: 'D', min: 80, color: 4 },
      { name: 'E', min: 95, color: 5 },
    ],
  };
  assert.equal(computeState(39, c).label, 'A');
  assert.equal(computeState(40, c).label, 'B');
  assert.equal(computeState(59, c).label, 'B');
  assert.equal(computeState(60, c).label, 'C');
  assert.equal(computeState(95, c).label, 'E');
  assert.equal(computeState(95, c).color, 5);
});
