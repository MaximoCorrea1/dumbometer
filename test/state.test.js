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
