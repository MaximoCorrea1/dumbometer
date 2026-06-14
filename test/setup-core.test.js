import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusLineCommand, applySetup, applyRemove } from '../src/setup-core.js';

test('builds a quoted node command', () => {
  assert.equal(statusLineCommand('/abs/dir/statusline.js'), 'node "/abs/dir/statusline.js"');
});

test('applySetup adds statusLine, preserves other keys', () => {
  const next = applySetup({ theme: 'dark' }, 'node "x"');
  assert.deepEqual(next, { theme: 'dark', statusLine: { type: 'command', command: 'node "x"' } });
});

test('applySetup overwrites an existing statusLine', () => {
  const next = applySetup({ statusLine: { type: 'command', command: 'old' } }, 'new');
  assert.equal(next.statusLine.command, 'new');
});

test('applyRemove deletes statusLine, preserves other keys', () => {
  assert.deepEqual(applyRemove({ theme: 'dark', statusLine: { type: 'command', command: 'x' } }),
    { theme: 'dark' });
});
