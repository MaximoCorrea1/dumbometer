import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colorize } from '../src/colorize.js';

const ESC = String.fromCharCode(27); // ANSI escape (0x1B)

test('wraps in ANSI for severity', () => {
  assert.equal(colorize('x', 'red', { color: true }), `${ESC}[31mx${ESC}[0m`);
  assert.equal(colorize('x', 'yellow', { color: true }), `${ESC}[33mx${ESC}[0m`);
  assert.equal(colorize('x', 'green', { color: true }), `${ESC}[32mx${ESC}[0m`);
});

test('no color when disabled', () => {
  assert.equal(colorize('x', 'red', { color: false }), 'x');
});

test('unknown severity is left plain', () => {
  assert.equal(colorize('x', 'blue', { color: true }), 'x');
});
