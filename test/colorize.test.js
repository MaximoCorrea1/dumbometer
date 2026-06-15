import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colorize } from '../src/colorize.js';

const ESC = String.fromCharCode(27); // ANSI escape (0x1B)

test('wraps in 256-color SGR when color enabled', () => {
  assert.equal(
    colorize('x', 196, { color: true }),
    ESC + '[38;5;196mx' + ESC + '[0m',
  );
  assert.equal(
    colorize('x', 46, { color: true }),
    ESC + '[38;5;46mx' + ESC + '[0m',
  );
  assert.equal(
    colorize('x', 118, { color: true }),
    ESC + '[38;5;118mx' + ESC + '[0m',
  );
});

test('no color when disabled', () => {
  assert.equal(colorize('x', 196, { color: false }), 'x');
});

test('null color returns text unchanged', () => {
  assert.equal(colorize('x', null, { color: true }), 'x');
});

test('undefined color returns text unchanged', () => {
  assert.equal(colorize('x', undefined, { color: true }), 'x');
});

test('uses String.fromCharCode(27) for ESC — not a raw byte', () => {
  const out = colorize('hello', 226, { color: true });
  assert.equal(out.charCodeAt(0), 27);
  assert.ok(out.includes('[38;5;226m'));
  assert.ok(out.endsWith('[0m'));
});
