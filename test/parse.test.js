import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from '../src/parse.js';

const fx = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');

test('reads used_percentage', () => {
  const r = parse(fx('mid.json'));
  assert.equal(r.cold, false);
  assert.equal(r.usedPct, 58);
  assert.equal(r.windowSize, 200000);
  assert.equal(r.model, 'Opus');
});

test('computes from tokens when used_percentage absent', () => {
  const r = parse(fx('tokens-only.json'));
  assert.equal(r.cold, false);
  assert.equal(r.usedPct, 75);
});

test('null context_window → cold', () => {
  const r = parse(fx('cold.json'));
  assert.equal(r.cold, true);
  assert.equal(r.usedPct, 0);
  assert.equal(r.model, 'Opus');
});

test('malformed input → cold, never throws', () => {
  const r = parse('not json {{{');
  assert.equal(r.cold, true);
  assert.equal(r.usedPct, 0);
});

test('empty input → cold', () => {
  assert.equal(parse('').cold, true);
});

test('clamps out-of-range percentage', () => {
  assert.equal(parse('{"context_window":{"used_percentage":150}}').usedPct, 100);
  assert.equal(parse('{"context_window":{"used_percentage":-5}}').usedPct, 0);
});

test('handles a real 1M-window payload, ignoring extra fields', () => {
  // Captured live from an Opus 4.8 (1M context) session — confirms the real schema.
  const r = parse(fx('real-1m.json'));
  assert.equal(r.cold, false);
  assert.equal(r.usedPct, 45);
  assert.equal(r.windowSize, 1000000);
  assert.equal(r.model, 'Opus 4.8 (1M context)');
});

// Fix 7: model.id fallback when display_name absent
test('uses model.id when display_name absent', () => {
  const r = parse('{"model":{"id":"claude-3"},"context_window":{"used_percentage":50}}');
  assert.equal(r.model, 'claude-3');
});
