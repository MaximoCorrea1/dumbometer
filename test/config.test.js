import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, DEFAULTS } from '../src/config.js';

test('defaults when env is empty', () => {
  const c = loadConfig({});
  assert.equal(c.width, 10);
  assert.equal(c.color, true);
  assert.equal(c.levels.length, 5);
  assert.deepEqual(c.levels[0], { name: 'Smart',    min: 0,  color: 46  });
  assert.deepEqual(c.levels[1], { name: 'Coasting', min: 25, color: 118 });
  assert.deepEqual(c.levels[2], { name: 'Foggy',    min: 50, color: 226 });
  assert.deepEqual(c.levels[3], { name: 'Cooked',   min: 70, color: 208 });
  assert.deepEqual(c.levels[4], { name: 'Dumb',     min: 90, color: 196 });
});

test('DEFAULTS shape', () => {
  assert.equal(DEFAULTS.width, 10);
  assert.equal(DEFAULTS.color, true);
  assert.equal(DEFAULTS.levels.length, 5);
  assert.equal(DEFAULTS.levels[0].name, 'Smart');
  assert.equal(DEFAULTS.levels[4].name, 'Dumb');
});

test('valid width override', () => {
  assert.equal(loadConfig({ DUMBOMETER_WIDTH: '20' }).width, 20);
});

test('invalid width falls back to default', () => {
  assert.equal(loadConfig({ DUMBOMETER_WIDTH: 'abc' }).width, 10);
  assert.equal(loadConfig({ DUMBOMETER_WIDTH: '0' }).width, 10);
});

test('valid thresholds override (4 ascending ints 1–99)', () => {
  const c = loadConfig({ DUMBOMETER_THRESHOLDS: '20,45,65,88' });
  assert.equal(c.levels[0].min, 0);   // level 1 min always 0
  assert.equal(c.levels[1].min, 20);
  assert.equal(c.levels[2].min, 45);
  assert.equal(c.levels[3].min, 65);
  assert.equal(c.levels[4].min, 88);
});

test('non-monotonic thresholds rejected (keeps defaults)', () => {
  const c = loadConfig({ DUMBOMETER_THRESHOLDS: '80,60,40,20' });
  assert.deepEqual(c.levels.map((l) => l.min), DEFAULTS.levels.map((l) => l.min));
});

test('wrong count of thresholds rejected (3 instead of 4)', () => {
  const c = loadConfig({ DUMBOMETER_THRESHOLDS: '40,60,80' });
  assert.deepEqual(c.levels.map((l) => l.min), DEFAULTS.levels.map((l) => l.min));
});

test('threshold value 0 rejected (must be 1–99)', () => {
  const c = loadConfig({ DUMBOMETER_THRESHOLDS: '0,25,50,75' });
  assert.deepEqual(c.levels.map((l) => l.min), DEFAULTS.levels.map((l) => l.min));
});

test('threshold value 100 rejected (must be 1–99)', () => {
  const c = loadConfig({ DUMBOMETER_THRESHOLDS: '10,30,60,100' });
  assert.deepEqual(c.levels.map((l) => l.min), DEFAULTS.levels.map((l) => l.min));
});

test('valid labels override (exactly 5 non-empty)', () => {
  const c = loadConfig({ DUMBOMETER_LABELS: 'A,B,C,D,E' });
  assert.deepEqual(c.levels.map((l) => l.name), ['A', 'B', 'C', 'D', 'E']);
});

test('wrong count of labels rejected (4 instead of 5)', () => {
  const c = loadConfig({ DUMBOMETER_LABELS: 'A,B,C,D' });
  assert.deepEqual(c.levels.map((l) => l.name), DEFAULTS.levels.map((l) => l.name));
});

test('empty label name rejected', () => {
  const c = loadConfig({ DUMBOMETER_LABELS: 'A,,C,D,E' });
  assert.deepEqual(c.levels.map((l) => l.name), DEFAULTS.levels.map((l) => l.name));
});

test('NO_COLOR disables color', () => {
  assert.equal(loadConfig({ NO_COLOR: '1' }).color, false);
  assert.equal(loadConfig({ DUMBOMETER_NO_COLOR: '' }).color, false);
});

test('loadConfig does not mutate DEFAULTS.levels', () => {
  loadConfig({ DUMBOMETER_LABELS: 'A,B,C,D,E', DUMBOMETER_THRESHOLDS: '10,20,30,40' });
  assert.equal(DEFAULTS.levels[0].name, 'Smart');
  assert.equal(DEFAULTS.levels[0].min, 0);
});
