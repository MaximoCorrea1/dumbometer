import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, DEFAULTS } from '../src/config.js';

test('defaults when env is empty', () => {
  const c = loadConfig({});
  assert.equal(c.width, 10);
  assert.deepEqual(c.thresholds, { warming: 50, slipping: 70, dumb: 90 });
  assert.deepEqual(c.labels, { smart: 'Smart', warming: 'Warming', slipping: 'Slipping', dumb: 'Dumb' });
  assert.equal(c.color, true);
});

test('valid width override', () => {
  assert.equal(loadConfig({ DUMB_ALERT_WIDTH: '20' }).width, 20);
});

test('invalid width falls back to default', () => {
  assert.equal(loadConfig({ DUMB_ALERT_WIDTH: 'abc' }).width, 10);
  assert.equal(loadConfig({ DUMB_ALERT_WIDTH: '0' }).width, 10);
});

test('valid thresholds override', () => {
  assert.deepEqual(loadConfig({ DUMB_ALERT_THRESHOLDS: '40,60,80' }).thresholds,
    { warming: 40, slipping: 60, dumb: 80 });
});

test('non-monotonic thresholds rejected', () => {
  assert.deepEqual(loadConfig({ DUMB_ALERT_THRESHOLDS: '80,60,40' }).thresholds, DEFAULTS.thresholds);
});

test('labels override', () => {
  assert.deepEqual(loadConfig({ DUMB_ALERT_LABELS: 'A,B,C,D' }).labels,
    { smart: 'A', warming: 'B', slipping: 'C', dumb: 'D' });
});

test('NO_COLOR disables color', () => {
  assert.equal(loadConfig({ NO_COLOR: '1' }).color, false);
  assert.equal(loadConfig({ DUMB_ALERT_NO_COLOR: '' }).color, false);
});
